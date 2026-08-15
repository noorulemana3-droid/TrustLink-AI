const mongoose = require('mongoose');

let lastError = '';

const sanitize = (msg) =>
  String(msg || '')
    .replace(/mongodb(\+srv)?:\/\/[^@\s]+@/gi, 'mongodb$1://***@')
    .slice(0, 240);

const connectDB = async () => {
  const uri = String(process.env.MONGODB_URI || '')
    .trim()
    .replace(/^['"]|['"]$/g, '');

  if (!uri) {
    lastError = 'MONGODB_URI is not set';
    throw new Error(lastError);
  }

  mongoose.set('strictQuery', true);

  const options = {
    serverSelectionTimeoutMS: 20000,
  };
  if (process.platform === 'win32') {
    options.family = 4;
  }

  await mongoose.connect(uri, options);
  lastError = '';
  console.log(`MongoDB connected: ${mongoose.connection.host}`);
};

const getDbError = () => lastError;

const setDbError = (err) => {
  lastError = sanitize(err && err.message ? err.message : err);
};

module.exports = { connectDB, getDbError, setDbError };
