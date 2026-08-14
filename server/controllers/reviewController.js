const mongoose = require('mongoose');
const Review = require('../models/Review');
const Provider = require('../models/Provider');
const { uploadMany } = require('../services/cloudinaryService');

const recalcProviderRating = async (providerId) => {
  const id =
    typeof providerId === 'string'
      ? new mongoose.Types.ObjectId(providerId)
      : providerId;

  const stats = await Review.aggregate([
    { $match: { provider: id } },
    {
      $group: {
        _id: '$provider',
        avg: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  const ratingAvg = stats[0] ? Math.round(stats[0].avg * 10) / 10 : 0;
  const ratingCount = stats[0]?.count || 0;

  await Provider.findByIdAndUpdate(id, { ratingAvg, ratingCount });
};

const validateReviewInput = ({ rating, comment }) => {
  const errors = [];
  const num = Number(rating);
  if (!rating || Number.isNaN(num) || num < 1 || num > 5) {
    errors.push('Rating must be between 1 and 5');
  }
  const text = String(comment || '').trim();
  if (text.length < 10) errors.push('Comment must be at least 10 characters');
  if (text.length > 1000) errors.push('Comment cannot exceed 1000 characters');
  return errors;
};

const populateReview = (query) =>
  query.populate('user', 'name avatar').populate('provider', 'businessName');

const listReviews = async (req, res, next) => {
  try {
    const filter = {};
    if (req.params.providerId) filter.provider = req.params.providerId;
    if (req.query.provider) filter.provider = req.query.provider;

    const reviews = await populateReview(Review.find(filter)).sort({
      createdAt: -1,
    });

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      distribution[r.rating] = (distribution[r.rating] || 0) + 1;
    });

    res.json({ reviews, distribution });
  } catch (error) {
    next(error);
  }
};

const getReview = async (req, res, next) => {
  try {
    const review = await populateReview(Review.findById(req.params.id));
    if (!review) return res.status(404).json({ message: 'Review not found' });
    res.json({ review });
  } catch (error) {
    next(error);
  }
};

const getMyReviewForProvider = async (req, res, next) => {
  try {
    const review = await populateReview(
      Review.findOne({
        provider: req.params.providerId,
        user: req.user._id,
      })
    );
    res.json({ review });
  } catch (error) {
    next(error);
  }
};

const createReview = async (req, res, next) => {
  try {
    const { rating, comment = '' } = req.body;
    const providerId = req.params.providerId || req.body.provider;

    if (!providerId) {
      return res.status(400).json({ message: 'Provider is required' });
    }

    const errors = validateReviewInput({ rating, comment });
    if (errors.length) {
      return res.status(400).json({ message: errors[0] });
    }

    const provider = await Provider.findById(providerId);
    if (!provider || provider.status !== 'approved') {
      return res.status(404).json({ message: 'Provider not found' });
    }

    if (String(provider.owner) === String(req.user._id)) {
      return res.status(400).json({ message: 'You cannot review your own business' });
    }

    const existing = await Review.findOne({
      provider: providerId,
      user: req.user._id,
    });
    if (existing) {
      return res.status(400).json({
        message: 'You already reviewed this provider. Edit your existing review instead.',
        reviewId: existing._id,
      });
    }

    let images = req.body.images || [];
    if (req.files?.length) {
      images = await uploadMany(req.files, 'trustlink/reviews');
    }

    const review = await Review.create({
      provider: providerId,
      user: req.user._id,
      rating: Number(rating),
      comment: String(comment).trim(),
      images,
    });

    await recalcProviderRating(provider._id);

    const populated = await populateReview(Review.findById(review._id));
    res.status(201).json({ review: populated });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: 'You already reviewed this provider' });
    }
    next(error);
  }
};

const updateReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    if (String(review.user) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const rating = req.body.rating ?? review.rating;
    const comment = req.body.comment ?? review.comment;
    const errors = validateReviewInput({ rating, comment });
    if (errors.length) {
      return res.status(400).json({ message: errors[0] });
    }

    review.rating = Number(rating);
    review.comment = String(comment).trim();

    if (req.files?.length) {
      const uploaded = await uploadMany(req.files, 'trustlink/reviews');
      review.images = [...review.images, ...uploaded].slice(0, 5);
    }

    await review.save();
    await recalcProviderRating(review.provider);

    const populated = await populateReview(Review.findById(review._id));
    res.json({ review: populated });
  } catch (error) {
    next(error);
  }
};

const deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    const isOwner = String(review.user) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const providerId = review.provider;
    await review.deleteOne();
    await recalcProviderRating(providerId);

    res.json({ message: 'Review deleted' });
  } catch (error) {
    next(error);
  }
};

const listMyProviderReviews = async (req, res, next) => {
  try {
    const provider = await Provider.findOne({ owner: req.user._id });
    if (!provider) return res.json({ reviews: [] });

    const reviews = await populateReview(
      Review.find({ provider: provider._id })
    ).sort({ createdAt: -1 });

    res.json({ reviews });
  } catch (error) {
    next(error);
  }
};

const REPORT_REASONS = [
  'Fake or spam',
  'Abusive language',
  'Off-topic',
  'Conflict of interest',
  'Other',
];

const reportReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (String(review.user) === String(req.user._id)) {
      return res.status(400).json({ message: 'You cannot report your own review' });
    }

    const already = (review.reports || []).some(
      (r) => String(r.user) === String(req.user._id)
    );
    if (already) {
      return res.status(400).json({ message: 'You already reported this review' });
    }

    let reason = String(req.body?.reason || 'Inappropriate or fake review').trim();
    if (reason.length < 3) reason = 'Inappropriate or fake review';
    if (reason.length > 300) reason = reason.slice(0, 300);

    review.reports.push({
      user: req.user._id,
      reason,
      createdAt: new Date(),
    });
    await review.save();

    const populated = await populateReview(Review.findById(review._id));
    res.json({
      message: 'Thanks — admins will review this report',
      review: populated,
      reportCount: (review.reports || []).length,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listReviews,
  getReview,
  getMyReviewForProvider,
  createReview,
  updateReview,
  deleteReview,
  listMyProviderReviews,
  reportReview,
  REPORT_REASONS,
  recalcProviderRating,
};
