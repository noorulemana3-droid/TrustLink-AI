const express = require('express');
const {
  listReviews,
  getReview,
  getMyReviewForProvider,
  createReview,
  updateReview,
  deleteReview,
  listMyProviderReviews,
  reportReview,
} = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/mine/provider', protect, listMyProviderReviews);
router.get('/mine/provider/:providerId', protect, getMyReviewForProvider);
router.get('/provider/:providerId', listReviews);

router.post('/', protect, upload.array('images', 3), createReview);
router.post(
  '/provider/:providerId',
  protect,
  upload.array('images', 3),
  createReview
);

router.post('/:id/report', protect, reportReview);

router.get('/:id', getReview);
router.put('/:id', protect, upload.array('images', 3), updateReview);
router.delete('/:id', protect, deleteReview);

module.exports = router;
