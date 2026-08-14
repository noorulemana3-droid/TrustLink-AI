const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // Stored hashed only — never select by default, never return to clients
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['customer', 'provider', 'admin'],
      default: 'customer',
    },
    phone: { type: String, default: '' },
    city: { type: String, default: '' },
    avatar: { type: String, default: '' },
    isVerified: { type: Boolean, default: false },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Provider' }],
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

userSchema.virtual('fullName').get(function fullName() {
  return this.name;
});

userSchema.methods.comparePassword = async function comparePassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.statics.hashPassword = async function hashPassword(password) {
  return bcrypt.hash(password, 12);
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id,
    _id: this._id,
    name: this.name,
    fullName: this.name,
    email: this.email,
    role: this.role,
    phone: this.phone,
    city: this.city,
    avatar: this.avatar,
    profileImage: this.avatar,
    isVerified: this.isVerified,
    favorites: this.favorites,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model('User', userSchema);
