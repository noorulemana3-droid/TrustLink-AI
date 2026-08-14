const { cloudinary, configured } = require('../config/cloudinary');

const uploadBuffer = (buffer, folder = 'trustlink') =>
  new Promise((resolve, reject) => {
    if (!configured) {
      reject(new Error('Cloudinary is not configured'));
      return;
    }

    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );

    stream.end(buffer);
  });

const uploadMany = async (files = [], folder = 'trustlink') => {
  if (!files.length) return [];
  if (!configured) {
    return files.map(
      (_, index) =>
        `https://placehold.co/800x600/1a3a4a/e8f0f2?text=Image+${index + 1}`
    );
  }

  return Promise.all(files.map((file) => uploadBuffer(file.buffer, folder)));
};

module.exports = { uploadBuffer, uploadMany, configured };
