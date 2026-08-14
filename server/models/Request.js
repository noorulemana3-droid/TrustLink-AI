const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
    },
    service: { type: String, default: '', trim: true },
    description: { type: String, required: true, trim: true },
    budget: { type: Number, default: 0 },
    preferredDate: { type: Date },
    preferredTime: { type: String, default: '' },
    location: { type: String, default: '' },
    customerPhone: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
      default: 'pending',
    },
    providerMessage: { type: String, default: '' },
    // legacy alias field kept in sync when saving provider messages
    providerNote: { type: String, default: '' },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'released', 'refunded'],
      default: 'unpaid',
    },
    paymentMethod: {
      type: String,
      enum: ['', 'jazzcash', 'easypaisa', 'card', 'cash', 'demo'],
      default: '',
    },
    paymentAmount: { type: Number, default: 0 },
    paymentRef: { type: String, default: '' },
    paidAt: { type: Date },
    releasedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

module.exports = mongoose.model('Request', requestSchema);
