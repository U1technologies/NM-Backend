const mongoose = require('mongoose');
require('dotenv').config();

let connectionPromise = null;

// Safe to call repeatedly (per request on serverless, once on a long-running server): the same
// in-flight/finished connection is reused. On failure the cache is cleared so the next call retries,
// and the error is thrown to the caller instead of killing the process.
const connectDB = () => {
  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose.connection);
  if (!connectionPromise) {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) return Promise.reject(new Error('MONGODB_URI is not set'));
    connectionPromise = mongoose
      .connect(uri)
      .then((mongooseInstance) => {
        console.log('MongoDB connected');
        return mongooseInstance.connection;
      })
      .catch((error) => {
        connectionPromise = null;
        console.error('Database connection failed:', error.message);
        throw error;
      });
  }
  return connectionPromise;
};

module.exports = connectDB;
