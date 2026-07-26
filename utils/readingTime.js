// utils/readingTime.js
// Estimates reading time (minutes, min 1) from a blog post's structured content blocks.
// Only fields that actually hold reader-facing prose are counted.
const WORDS_PER_MINUTE = 200;

const TEXT_FIELDS_BY_BLOCK_TYPE = {
  paragraph: ['text'],
  heading: ['text'],
  quote: ['text', 'author'],
  callout: ['title', 'text'],
  richtext: ['html'],
  statsCard: ['title'],
};

const wordCount = (value) => {
  if (!value || typeof value !== 'string') return 0;
  const stripped = value.replace(/<[^>]*>/g, ' ');
  const words = stripped.trim().split(/\s+/).filter(Boolean);
  return words.length;
};

const blockWordCount = (block) => {
  if (!block || typeof block !== 'object') return 0;

  const fields = TEXT_FIELDS_BY_BLOCK_TYPE[block.type];
  if (fields) {
    return fields.reduce((sum, field) => sum + wordCount(block[field]), 0);
  }

  if (block.type === 'list' || block.type === 'checklist') {
    return (block.items || []).reduce((sum, item) => sum + wordCount(item.text || item), 0);
  }

  if (block.type === 'faq') {
    return (block.items || []).reduce((sum, item) => sum + wordCount(item.question) + wordCount(item.answer), 0);
  }

  if (block.type === 'prosCons') {
    const pros = (block.pros || []).reduce((sum, item) => sum + wordCount(item), 0);
    const cons = (block.cons || []).reduce((sum, item) => sum + wordCount(item), 0);
    return pros + cons;
  }

  return 0;
};

const estimateReadingTime = (contentBlocks = [], faqs = []) => {
  const blocksWordCount = (contentBlocks || []).reduce((sum, block) => sum + blockWordCount(block), 0);
  const faqsWordCount = (faqs || []).reduce((sum, faq) => sum + wordCount(faq.question) + wordCount(faq.answer), 0);
  const totalWords = blocksWordCount + faqsWordCount;
  return Math.max(1, Math.round(totalWords / WORDS_PER_MINUTE));
};

module.exports = { estimateReadingTime };
