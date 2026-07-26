// utils/flattenContent.js
// Flattens a post's structured content blocks + FAQs into a single plain-text string,
// stored on BlogPost.searchText so full-text search can reach inside block content
// (tables, callouts, quotes, etc.) without needing per-block-type query logic.
const TEXT_FIELDS_BY_BLOCK_TYPE = {
  paragraph: ['text'],
  heading: ['text'],
  quote: ['text', 'author'],
  callout: ['title', 'text'],
  richtext: ['html'],
  statsCard: ['title'],
  codeBlock: ['caption'],
  image: ['alt', 'caption'],
  video: ['caption'],
};

const stripHtml = (value) => String(value || '').replace(/<[^>]*>/g, ' ');

const blockToText = (block) => {
  if (!block || typeof block !== 'object') return '';

  const fields = TEXT_FIELDS_BY_BLOCK_TYPE[block.type];
  if (fields) {
    return fields.map((field) => stripHtml(block[field])).join(' ');
  }

  if (block.type === 'list' || block.type === 'checklist') {
    return (block.items || []).map((item) => stripHtml(item.text || item)).join(' ');
  }

  if (block.type === 'table' || block.type === 'comparisonTable') {
    const headerText = (block.headers || []).join(' ');
    const rowText = (block.rows || []).map((row) => row.join(' ')).join(' ');
    return `${headerText} ${rowText}`;
  }

  if (block.type === 'prosCons') {
    return `${(block.pros || []).join(' ')} ${(block.cons || []).join(' ')}`;
  }

  if (block.type === 'statsCard') {
    return (block.items || []).map((item) => `${item.label} ${item.value}`).join(' ');
  }

  return '';
};

const flattenContentToText = (contentBlocks = [], faqs = []) => {
  const blocksText = (contentBlocks || []).map(blockToText).join(' ');
  const faqsText = (faqs || []).map((faq) => `${faq.question} ${faq.answer}`).join(' ');
  return `${blocksText} ${faqsText}`.replace(/\s+/g, ' ').trim();
};

module.exports = { flattenContentToText };
