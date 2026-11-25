// Registry of affiliate network adapters. To add a network:
//   1. Create utils/affiliateNetworks/<name>.js exporting { id, label, fields, listOffers }.
//      `fields` lists the credentials the admin must enter; listOffers(credentials, { limit, cursor,
//      category }) returns { items, nextCursor } with items shaped
//      { externalId, name, description, logoUrl, website, category, country, payout }.
//   2. Add it to NETWORKS below. The admin screen and API pick it up automatically.
const partnerstack = require('./partnerstack');
const awin = require('./awin');
const impact = require('./impact');
const { NetworkError } = require('./errors');

const NETWORKS = [partnerstack, awin, impact];

const findNetwork = (id) => {
  const network = NETWORKS.find((n) => n.id === id);
  if (!network) throw new NetworkError('Unknown affiliate network', 404);
  return network;
};

module.exports = { NETWORKS, findNetwork, NetworkError };
