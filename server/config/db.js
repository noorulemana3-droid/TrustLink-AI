const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set');
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
    family: 4, // prefer IPv4 — avoids some Windows DNS/SRV Atlas failures
  });

  console.log(`MongoDB connected: ${mongoose.connection.host}`);
};

module.exports = connectDB;
