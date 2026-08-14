const express = require('express');
const Category = require('../models/Category');
const Provider = require('../models/Provider');
const Review = require('../models/Review');

const router = express.Router();

/** Public platform counts from the live database — no fake marketing numbers. */
router.get('/', async (req, res, next) => {
  try {
    const [categories, verifiedProviders, reviews, ratingAgg] = await Promise.all([
      Category.countDocuments(),
      Provider.countDocuments({ status: 'approved' }),
      Review.countDocuments(),
      Provider.aggregate([
        { $match: { status: 'approved', ratingCount: { $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: '$ratingAvg' }, n: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      categories,
      verifiedProviders,
      reviews,
      averageRating:
        ratingAgg[0]?.n > 0 ? Math.round(ratingAgg[0].avg * 10) / 10 : null,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
