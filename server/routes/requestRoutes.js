const express = require('express');
const {
  createRequest,
  myRequests,
  providerRequests,
  listAllRequests,
  getRequest,
  updateRequestStatus,
  cancelRequest,
  acceptRequest,
  rejectRequest,
  completeRequest,
  payRequest,
} = require('../controllers/requestController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, createRequest);
router.get('/mine', protect, myRequests);
router.get('/my', protect, myRequests);
router.get('/provider', protect, providerRequests);
router.get('/', protect, authorize('admin'), listAllRequests);

router.put('/:id/cancel', protect, cancelRequest);
router.put('/:id/accept', protect, acceptRequest);
router.put('/:id/reject', protect, rejectRequest);
router.put('/:id/complete', protect, completeRequest);
router.post('/:id/pay', protect, payRequest);
router.patch('/:id/status', protect, updateRequestStatus);

router.get('/:id', protect, getRequest);

module.exports = router;
