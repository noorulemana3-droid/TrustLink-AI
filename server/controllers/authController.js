const crypto = require('crypto');
const User = require('../models/User');
const { signToken, getPublicClientUrl } = require('../utils/helpers');
const { sendPasswordResetEmail, canSendEmail } = require('../services/emailService');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const toPublicUser = (user) => {
  if (typeof user.toSafeJSON === 'function') return user.toSafeJSON();
  return {
    id: user._id,
    _id: user._id,
    name: user.name,
    fullName: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    city: user.city,
    avatar: user.avatar,
    profileImage: user.avatar,
    isVerified: user.isVerified,
    favorites: user.favorites,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

const register = async (req, res, next) => {
  try {
    const {
      name,
      fullName,
      email,
      password,
      role = 'customer',
      phone: phoneRaw = '',
      city = '',
    } = req.body;

    const displayName = (name || fullName || '').trim();

    if (!displayName || !email || !password) {
      return res
        .status(400)
        .json({ message: 'Full name, email and password are required' });
    }

    if (!EMAIL_RE.test(String(email).toLowerCase())) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    if (String(password).length < 8) {
      return res
        .status(400)
        .json({ message: 'Password must be at least 8 characters' });
    }

    const phone = String(phoneRaw || '').trim();
    if (phone && !/^(\+92|0)?3\d{9}$/.test(phone.replace(/[\s-]/g, ''))) {
      return res.status(400).json({
        message: 'Enter a valid Pakistani mobile number (e.g. 03XXXXXXXXX)',
      });
    }

    const allowedRoles = ['customer', 'provider'];
    const safeRole = allowedRoles.includes(role) ? role : 'customer';

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      name: displayName,
      email,
      passwordHash,
      role: safeRole,
      phone,
      city,
      isVerified: false,
    });

    const token = signToken(user);
    res.status(201).json({
      token,
      user: toPublicUser(user),
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select(
      '+passwordHash'
    );
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = signToken(user);
    res.json({
      token,
      user: toPublicUser(user),
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'favorites',
      populate: { path: 'category', select: 'name slug icon' },
    });

    res.json({
      user: {
        ...toPublicUser(user),
        favorites: user.favorites,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { name, fullName, phone, city, avatar, profileImage } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        ...((name !== undefined || fullName !== undefined) && {
          name: name || fullName,
        }),
        ...(phone !== undefined && { phone }),
        ...(city !== undefined && { city }),
        ...((avatar !== undefined || profileImage !== undefined) && {
          avatar: avatar || profileImage,
        }),
      },
      { new: true }
    );
    res.json({ user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
};

const createResetUrl = async (user) => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: new Date(Date.now() + 60 * 60 * 1000),
      },
    }
  );
  const clientUrl = getPublicClientUrl();
  return `${clientUrl}/reset-password/${encodeURIComponent(rawToken)}`;
};

const forgotPassword = async (req, res, next) => {
  try {
    const email = String(req.body.email || '')
      .toLowerCase()
      .trim();

    if (!email || !EMAIL_RE.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({
        message:
          'If an account exists for that email, a password reset link has been sent. Check your inbox and spam folder.',
        sent: false,
      });
    }

    const resetUrl = await createResetUrl(user);
    const isDemoInbox = email.endsWith('@trustlink.ai');
    const mailReady = canSendEmail() && !isDemoInbox;

    if (mailReady) {
      const delivery = await sendPasswordResetEmail({
        to: user.email,
        resetUrl,
        name: user.name,
      });
      if (delivery.sent) {
        return res.json({
          message:
            'If an account exists for that email, a password reset link has been sent. Check your inbox and spam folder.',
          sent: true,
          expiresInMinutes: 60,
        });
      }
    }

    res.json({
      message: isDemoInbox
        ? `Demo accounts cannot receive email. Open this reset link (valid 60 minutes): ${resetUrl}`
        : `Email could not be sent from this server. Open this reset link (valid 60 minutes): ${resetUrl}`,
      sent: false,
      resetUrl,
      expiresInMinutes: 60,
    });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Reset token is required' });
    }

    if (!password || String(password).length < 8) {
      return res
        .status(400)
        .json({ message: 'Password must be at least 8 characters' });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    const rawToken = String(token).trim();
    if (!/^[a-f0-9]{64}$/i.test(rawToken)) {
      return res.status(400).json({
        message: 'This reset link looks incomplete. Request a new one from Forgot password.',
      });
    }

    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    }).select('+passwordHash +resetPasswordToken +resetPasswordExpires');

    if (!user) {
      return res.status(400).json({
        message:
          'Invalid or expired reset link. Request a new link — only the latest one works.',
      });
    }

    const passwordHash = await User.hashPassword(password);
    await User.updateOne(
      { _id: user._id },
      {
        $set: { passwordHash },
        $unset: { resetPasswordToken: 1, resetPasswordExpires: 1 },
      }
    );

    const fresh = await User.findById(user._id);
    const authToken = signToken(fresh);
    res.json({
      message: 'Password updated successfully',
      token: authToken,
      user: toPublicUser(fresh),
    });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: 'Current password and new password are required',
      });
    }

    if (String(newPassword).length < 8) {
      return res
        .status(400)
        .json({ message: 'New password must be at least 8 characters' });
    }

    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        message: 'New password must be different from the current password',
      });
    }

    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!user || !(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.passwordHash = await User.hashPassword(newPassword);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    const token = signToken(user);
    res.json({
      message: 'Password changed successfully',
      token,
      user: toPublicUser(user),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  forgotPassword,
  resetPassword,
  changePassword,
};
