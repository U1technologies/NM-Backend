const { requestJson } = require('./errors');

const BASE_URL = 'https://api.awin.com';

// Field names follow Awin's docs; verify against a live response after connecting.
const normalize = (programme) => ({
  externalId: String(programme.id),
  name: programme.name || '',
  description: programme.description || '',
  logoUrl: programme.logoUrl || '',
  website: programme.displayUrl || programme.clickThroughUrl || '',
  category: programme.primarySector || '',
  country: programme.primaryRegion?.name || programme.primaryRegion?.countryCode || '',
  payout: '', // commission lives on a separate Awin endpoint
});

module.exports = {
  id: 'awin',
  label: 'Awin',
  fields: [
    { name: 'publisherId', label: 'Publisher ID' },
    { name: 'apiToken', label: 'API token' },
  ],

  // Awin returns every programme at once, so the cursor is a numeric offset into that list.
  async listOffers({ publisherId, apiToken }, { limit, cursor }) {
    const list = await requestJson('Awin', `${BASE_URL}/publishers/${encodeURIComponent(publisherId)}/programmes?relationship=joined`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    const offset = Number(cursor) || 0;
    const next = offset + limit;
    return { items: list.slice(offset, next).map(normalize), nextCursor: next < list.length ? String(next) : null };
  },
};
