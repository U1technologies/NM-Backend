const AffiliateNetworkCredential = require('../models/affiliateNetworkCredentialModel');
const { NETWORKS, findNetwork, NetworkError } = require('../utils/affiliateNetworks');
const { encryptJson, decryptJson } = require('../utils/credentialCipher');
const logActivity = require('../utils/activityLogger');

const MAX_CREDENTIAL_LENGTH = 512;
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 25;
const CURSOR_PATTERN = /^[A-Za-z0-9_]{1,64}$/;

const handleError = (res, error) => {
  if (error instanceof NetworkError) return res.status(error.status).json({ success: false, message: error.message, data: null });
  console.error('Affiliate network error:', error.message);
  return res.status(500).json({ success: false, message: 'Something went wrong', data: null });
};

const loadCredentials = async (network) => {
  const record = await AffiliateNetworkCredential.findOne({ network: network.id });
  if (!record) throw new NetworkError(`${network.label} is not connected yet`, 400);
  try {
    return decryptJson(record.encryptedCredentials);
  } catch {
    throw new NetworkError(`Saved ${network.label} credentials can no longer be read. Please reconnect.`, 400);
  }
};

// @desc List supported networks and whether each is connected (never returns credential values)
const listNetworks = async (req, res) => {
  try {
    const records = await AffiliateNetworkCredential.find({}, 'network updatedAt');
    const connected = new Map(records.map((r) => [r.network, r.updatedAt]));
    const data = NETWORKS.map(({ id, label, fields }) => ({ id, label, fields, configured: connected.has(id), updatedAt: connected.get(id) || null }));
    return res.status(200).json({ success: true, message: 'Networks fetched', data });
  } catch (error) {
    return handleError(res, error);
  }
};

// @desc Save (replace) a network's credentials after verifying they work with a 1-item call
const saveCredentials = async (req, res) => {
  try {
    const network = findNetwork(req.params.network);
    const credentials = {};
    for (const { name, label } of network.fields) {
      const value = req.body[name];
      if (typeof value !== 'string' || !value.trim()) throw new NetworkError(`${label} is required`, 400);
      if (value.length > MAX_CREDENTIAL_LENGTH) throw new NetworkError(`${label} is too long`, 400);
      credentials[name] = value.trim();
    }

    await network.listOffers(credentials, { limit: 1 });

    await AffiliateNetworkCredential.findOneAndUpdate(
      { network: network.id },
      { encryptedCredentials: encryptJson(credentials), updatedBy: req.currentUser?.email || '' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    logActivity({ req, action: 'affiliateNetwork.connect', targetType: 'AffiliateNetwork', targetLabel: network.label });
    return res.status(200).json({ success: true, message: `${network.label} connected`, data: null });
  } catch (error) {
    return handleError(res, error);
  }
};

// @desc Remove a network's saved credentials
const deleteCredentials = async (req, res) => {
  try {
    const network = findNetwork(req.params.network);
    await AffiliateNetworkCredential.deleteOne({ network: network.id });
    logActivity({ req, action: 'affiliateNetwork.disconnect', targetType: 'AffiliateNetwork', targetLabel: network.label });
    return res.status(200).json({ success: true, message: `${network.label} disconnected`, data: null });
  } catch (error) {
    return handleError(res, error);
  }
};

// @desc Fetch a page of offers from a connected network
const getNetworkOffers = async (req, res) => {
  try {
    const network = findNetwork(req.params.network);
    const { limit, cursor, category } = req.query;
    if (limit !== undefined && !(Number.isInteger(Number(limit)) && Number(limit) >= 1 && Number(limit) <= MAX_LIMIT)) {
      throw new NetworkError(`limit must be a whole number between 1 and ${MAX_LIMIT}`, 400);
    }
    if (cursor !== undefined && !CURSOR_PATTERN.test(cursor)) throw new NetworkError('cursor is invalid', 400);
    if (category !== undefined && (typeof category !== 'string' || category.length > 64)) throw new NetworkError('category is invalid', 400);

    const credentials = await loadCredentials(network);
    const data = await network.listOffers(credentials, { limit: Number(limit) || DEFAULT_LIMIT, cursor, category });
    return res.status(200).json({ success: true, message: 'Offers fetched', data });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = { listNetworks, saveCredentials, deleteCredentials, getNetworkOffers };
