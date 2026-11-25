const { requestJson } = require('./errors');

const BASE_URL = 'https://api.partnerstack.com/api/v2';
const LOGO_BASE_URL = 'https://company-images.partnerstack.com';

const formatPayout = (offers = []) => {
  const first = offers.find(Boolean);
  return first?.base_rate ? [first.base_rate, first.currency].filter(Boolean).join(' ') : '';
};

const normalize = (program) => ({
  externalId: program.key,
  name: program.name || '',
  description: program.description || '',
  logoUrl: program.logo ? `${LOGO_BASE_URL}/${program.logo}` : '',
  website: program.website || '',
  category: Array.isArray(program.category) ? program.category.join(', ') : program.category || '',
  country: program.country || '',
  payout: formatPayout(program.offers),
});

module.exports = {
  id: 'partnerstack',
  label: 'PartnerStack',
  fields: [{ name: 'apiKey', label: 'Partner API key' }],

  // cursor = key of the last item already shown
  async listOffers({ apiKey }, { limit, cursor, category }) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set('starting_after', cursor);
    if (category) params.set('category', category);
    const body = await requestJson('PartnerStack', `${BASE_URL}/marketplace/programs?${params}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const { items = [], has_more: hasMore } = body.data || {};
    return { items: items.map(normalize), nextCursor: hasMore && items.length ? items[items.length - 1].key : null };
  },
};
