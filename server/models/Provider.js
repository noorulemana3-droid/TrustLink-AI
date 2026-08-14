const mongoose = require('mongoose');

const providerSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    businessName: { type: String, required: true, trim: true },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    description: { type: String, default: '' },
    city: { type: String, required: true, trim: true },
    area: { type: String, default: '' },
    address: { type: String, default: '' },
    experienceYears: { type: Number, default: 0, min: 0 },
    priceRange: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 },
    },
    ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    profileImage: { type: String, default: '' },
    images: [{ type: String }],
    services: [{ type: String }],
    workingHours: {
      from: { type: String, default: '09:00' },
      to: { type: String, default: '18:00' },
    },
    contactPhone: { type: String, default: '' },
    contactEmail: { type: String, default: '' },
    paymentMethods: {
      type: [
        {
          type: String,
          enum: ['jazzcash', 'easypaisa', 'card', 'cash'],
        },
      ],
      default: () => ['jazzcash', 'easypaisa', 'card', 'cash'],
    },
    verified: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    available: { type: Boolean, default: true },
    /** % of requests that got a provider response (accept/reject) */
    responseRate: { type: Number, default: 0, min: 0, max: 100 },
    lastActiveAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

providerSchema.virtual('experience').get(function experience() {
  return this.experienceYears;
});

providerSchema.virtual('averageRating').get(function averageRating() {
  return this.ratingAvg;
});

providerSchema.virtual('totalReviews').get(function totalReviews() {
  return this.ratingCount;
});

providerSchema.virtual('isApproved').get(function isApproved() {
  return this.status === 'approved';
});

providerSchema.virtual('isAvailable').get(function isAvailable() {
  return this.available;
});

providerSchema.virtual('galleryImages').get(function galleryImages() {
  return this.images;
});

providerSchema.virtual('phone').get(function phone() {
  return this.contactPhone;
});

providerSchema.virtual('email').get(function email() {
  return this.contactEmail;
});

providerSchema.index({ city: 1, status: 1, ratingAvg: -1 });
providerSchema.index({
  businessName: 'text',
  description: 'text',
  services: 'text',
});

module.exports = mongoose.model('Provider', providerSchema);
