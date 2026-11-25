const mongoose = require('mongoose');

// One document per affiliate network. `encryptedCredentials` is an AES-GCM blob (see
// utils/credentialCipher.js); the plain values are never stored or returned by the API.
const affiliateNetworkCredentialSchema = mongoose.Schema(
  {
    network: { type: String, required: true, unique: true, index: true },
    encryptedCredentials: { type: String, required: true },
    updatedBy: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AffiliateNetworkCredential', affiliateNetworkCredentialSchema);
