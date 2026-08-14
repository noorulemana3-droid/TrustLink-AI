const express = require('express');
const {
  recommend,
  reviewSummary,
  parseQuery,
} = require('../controllers/aiController');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/recommend', optionalAuth, recommend);
router.post('/parse', optionalAuth, parseQuery);
router.get('/reviews/:providerId/summary', reviewSummary);

module.exports = router;
