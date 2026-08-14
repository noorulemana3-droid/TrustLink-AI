const { uploadMany, configured } = require('../services/cloudinaryService');

const uploadImages = async (req, res, next) => {
  try {
    if (!req.files?.length) {
      return res.status(400).json({ message: 'No images uploaded' });
    }

    const urls = await uploadMany(req.files, 'trustlink/uploads');
    res.json({
      urls,
      cloudinary: configured,
      message: configured
        ? 'Uploaded to Cloudinary'
        : 'Cloudinary not configured; placeholder URLs returned',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { uploadImages };
