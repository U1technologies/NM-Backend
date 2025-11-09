// api/index.js
const app = require('../app');

// Vercel uses this exported function as the request handler
module.exports = (req, res) => {
  app(req, res);
};
