// scripts/seedBlogModule.js
// Replaces the blog-related collections (BlogCategory, BlogTag, BlogAuthor, BlogPost) with
// fresh demo content. Does NOT touch Offer or any other collection.
//
// Run with: node scripts/seedBlogModule.js
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const BlogCategory = require('../models/blogCategoryModel');
const BlogTag = require('../models/blogTagModel');
const BlogAuthor = require('../models/blogAuthorModel');
const BlogPost = require('../models/blogPostModel');

const { toSlug, uniqueSlug } = require('../utils/slugify');

const authorsData = require('./seedData/blogAuthors');
const categoriesData = require('./seedData/blogCategories');
const tagsData = require('./seedData/blogTags');
const postsData = require('./seedData/blogPosts');

const slugExists = (Model) => async (slug) => Model.exists({ slug });

const run = async () => {
  await connectDB();

  console.log('Clearing existing blog collections...');
  await Promise.all([
    BlogCategory.deleteMany({}),
    BlogTag.deleteMany({}),
    BlogAuthor.deleteMany({}),
    BlogPost.deleteMany({}),
  ]);

  console.log('Seeding categories, tags, authors...');
  const [categories, tags, authors] = await Promise.all([
    BlogCategory.insertMany(categoriesData),
    BlogTag.insertMany(tagsData),
    BlogAuthor.insertMany(authorsData),
  ]);

  const categoryIdBySlug = new Map(categories.map((c) => [c.slug, c._id]));
  const tagIdBySlug = new Map(tags.map((t) => [t.slug, t._id]));
  const authorIdBySlug = new Map(authors.map((a) => [a.slug, a._id]));

  console.log(`Seeded ${categories.length} categories, ${tags.length} tags, ${authors.length} authors.`);

  console.log('Seeding blog posts...');
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;

  const postsToCreate = [];
  for (const post of postsData) {
    const { categorySlug, tagSlugs, authorSlug, publishDateOffsetDays, ...rest } = post;

    const categoryId = categoryIdBySlug.get(categorySlug);
    const authorId = authorIdBySlug.get(authorSlug);
    if (!categoryId) throw new Error(`Post "${post.title}" references unknown categorySlug "${categorySlug}"`);
    if (!authorId) throw new Error(`Post "${post.title}" references unknown authorSlug "${authorSlug}"`);

    const tagIds = (tagSlugs || []).map((slug) => {
      const id = tagIdBySlug.get(slug);
      if (!id) throw new Error(`Post "${post.title}" references unknown tagSlug "${slug}"`);
      return id;
    });

    const baseSlug = toSlug(post.title);
    const slug = await uniqueSlug(baseSlug, slugExists(BlogPost));

    postsToCreate.push({
      ...rest,
      slug,
      category: categoryId,
      tags: tagIds,
      author: authorId,
      publishDate: new Date(now - (publishDateOffsetDays || 0) * DAY_MS),
    });
  }

  // Model.create() (not insertMany) so the pre-save hook computes readingTime/searchText per post.
  const createdPosts = await BlogPost.create(postsToCreate);
  console.log(`Seeded ${createdPosts.length} blog posts.`);

  console.log('Blog module seed complete.');
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
