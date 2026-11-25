const { requestJson } = require('./errors');

const BASE_URL = 'https://api.impact.com';

// Field names follow impact.com's docs; verify against a live response after connecting.
// CampaignLogoUri needs authenticated access (not a public image URL), so logoUrl stays empty.
const normalize = (campaign) => ({
  externalId: String(campaign.CampaignId ?? campaign.Id ?? ''),
  name: campaign.CampaignName || campaign.AdvertiserName || '',
  description: campaign.CampaignDescription || '',
  logoUrl: '',
  website: campaign.CampaignUrl || '',
  category: '',
  country: '',
  payout: '',
});

module.exports = {
  id: 'impact',
  label: 'Impact',
  fields: [
    { name: 'accountSid', label: 'Account SID' },
    { name: 'authToken', label: 'Auth token' },
  ],

  // cursor = page number
  async listOffers({ accountSid, authToken }, { limit, cursor }) {
    const page = Number(cursor) || 1;
    const basic = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const body = await requestJson('Impact', `${BASE_URL}/Mediapartners/${encodeURIComponent(accountSid)}/Campaigns?Page=${page}&PageSize=${limit}`, {
      headers: { Authorization: `Basic ${basic}` },
    });
    const totalPages = Number(body['@numpages']) || page;
    return { items: (body.Campaigns || []).map(normalize), nextCursor: page < totalPages ? String(page + 1) : null };
  },
};
