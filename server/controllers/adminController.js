const User = require('../models/User');
const Provider = require('../models/Provider');
const Review = require('../models/Review');
const Request = require('../models/Request');
const Category = require('../models/Category');
const { recalcProviderRating } = require('./reviewController');

const getStats = async (req, res, next) => {
  try {
    const [users, providers, reviews, requests, categories, pendingProviders] =
      await Promise.all([
        User.countDocuments({ role: { $ne: 'admin' } }),
        Provider.countDocuments(),
        Review.countDocuments(),
        Request.countDocuments(),
        Category.countDocuments(),
        Provider.countDocuments({ status: 'pending' }),
      ]);

    res.json({
      stats: {
        users,
        providers,
        reviews,
        requests,
        categories,
        pendingProviders,
      },
    });
  } catch (error) {
    next(error);
  }
};

const listUsers = async (req, res, next) => {
  try {
    const users = await User.find({ role: { $ne: 'admin' } })
      .select('-passwordHash')
      .sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (role && !['customer', 'provider'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { ...(role && { role }) },
      { new: true }
    ).select('-passwordHash');

    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Cannot delete admin' });
    }

    await Provider.deleteMany({ owner: user._id });
    await Review.deleteMany({ user: user._id });
    await Request.deleteMany({ customer: user._id });
    await user.deleteOne();

    res.json({ message: 'User deleted' });
  } catch (error) {
    next(error);
  }
};

const listAllProviders = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const providers = await Provider.find(filter)
      .populate('category', 'name slug')
      .populate('owner', 'name email')
      .sort({ createdAt: -1 });

    res.json({ providers });
  } catch (error) {
    next(error);
  }
};

const updateProviderStatus = async (req, res, next) => {
  try {
    const { status, verified } = req.body;
    const allowed = ['pending', 'approved', 'rejected'];
    if (status && !allowed.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const provider = await Provider.findById(req.params.id);
    if (!provider) return res.status(404).json({ message: 'Provider not found' });

    if (status) provider.status = status;
    if (verified !== undefined) provider.verified = Boolean(verified);
    if (status === 'approved') {
      provider.verified = verified !== undefined ? Boolean(verified) : true;
      await User.findByIdAndUpdate(provider.owner, { role: 'provider' });
    }

    await provider.save();
    await provider.populate('category', 'name slug');
    await provider.populate('owner', 'name email');

    res.json({ provider });
  } catch (error) {
    next(error);
  }
};

const listAllReviews = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.reported === 'true') {
      filter['reports.0'] = { $exists: true };
    }

    const reviews = await Review.find(filter)
      .populate('user', 'name email')
      .populate('reports.user', 'name email')
      .populate({
        path: 'provider',
        select: 'businessName',
      })
      .sort(
        req.query.reported === 'true'
          ? { 'reports.createdAt': -1, createdAt: -1 }
          : { createdAt: -1 }
      );
    res.json({ reviews });
  } catch (error) {
    next(error);
  }
};

const adminClearReports = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    review.reports = [];
    await review.save();
    res.json({ message: 'Reports cleared', review });
  } catch (error) {
    next(error);
  }
};

const adminDeleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    const providerId = review.provider;
    await review.deleteOne();
    await recalcProviderRating(providerId);

    res.json({ message: 'Review deleted' });
  } catch (error) {
    next(error);
  }
};

const adminDeleteProvider = async (req, res, next) => {
  try {
    const provider = await Provider.findById(req.params.id);
    if (!provider) return res.status(404).json({ message: 'Provider not found' });

    await Review.deleteMany({ provider: provider._id });
    await Request.deleteMany({ provider: provider._id });
    await User.updateMany({}, { $pull: { favorites: provider._id } });
    await provider.deleteOne();

    res.json({ message: 'Provider deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStats,
  listUsers,
  updateUser,
  deleteUser,
  listAllProviders,
  updateProviderStatus,
  adminDeleteProvider,
  listAllReviews,
  adminDeleteReview,
  adminClearReports,
};
