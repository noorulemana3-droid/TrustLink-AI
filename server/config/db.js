const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set');
  }

  mongoose.set('strictQuery', true);

  const options = {
    serverSelectionTimeoutMS: 15000,
  };
  // Windows-only: force IPv4. On Railway/Linux this can block Atlas SRV.
  if (process.platform === 'win32') {
    options.family = 4;
  }

  await mongoose.connect(uri, options);

  console.log(`MongoDB connected: ${mongoose.connection.host}`);
};

module.exports = connectDB;
