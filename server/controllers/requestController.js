const Request = require('../models/Request');
const Provider = require('../models/Provider');
const {
  PAYMENT_METHODS,
  normalizePaymentMethod,
} = require('../utils/payments');

const populateRequest = (query) =>
  query
    .populate('customer', 'name email phone city')
    .populate({
      path: 'provider',
      populate: { path: 'category', select: 'name slug icon' },
    });

const transitions = {
  pending: ['accepted', 'rejected', 'cancelled'],
  accepted: ['completed'],
  rejected: [],
  completed: [],
  cancelled: [],
};

const canTransition = (from, to) => (transitions[from] || []).includes(to);

const createRequest = async (req, res, next) => {
  try {
    const {
      provider: providerField,
      providerId: providerIdAlias,
      service = '',
      description,
      preferredDate,
      preferredTime = '',
      location = '',
      customerPhone = '',
      budget = 0,
      paymentMethod: paymentMethodRaw = '',
    } = req.body || {};
    const providerId = providerField || providerIdAlias;

    if (!providerId || !String(description || '').trim()) {
      return res
        .status(400)
        .json({ message: 'Provider and description are required' });
    }

    if (String(description).trim().length < 10) {
      return res
        .status(400)
        .json({ message: 'Description must be at least 10 characters' });
    }

    const providerDoc = await Provider.findById(providerId);
    if (!providerDoc || providerDoc.status !== 'approved') {
      return res.status(404).json({ message: 'Provider not found' });
    }

    if (String(providerDoc.owner) === String(req.user._id)) {
      return res
        .status(400)
        .json({ message: 'You cannot request a service from your own business' });
    }

    const accepted = (providerDoc.paymentMethods || []).filter(Boolean);
    let paymentMethod = normalizePaymentMethod(paymentMethodRaw);
    if (paymentMethod && !PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({
        message: 'Choose JazzCash, EasyPaisa, card, or cash',
      });
    }
    if (paymentMethod && accepted.length && !accepted.includes(paymentMethod)) {
      return res.status(400).json({
        message: 'This provider does not accept that payment method',
      });
    }
    if (!paymentMethod && accepted.length) {
      paymentMethod = accepted[0];
    }

    const request = await Request.create({
      customer: req.user._id,
      provider: providerId,
      service: service || providerDoc.category?.name || '',
      description: String(description).trim(),
      preferredDate: preferredDate || null,
      preferredTime,
      location: location || req.user.city || '',
      customerPhone: customerPhone || req.user.phone || '',
      budget: Number(budget) || 0,
      status: 'pending',
      paymentStatus: 'unpaid',
      paymentMethod: paymentMethod || '',
      paymentAmount: Number(budget) || 0,
    });

    const populated = await populateRequest(Request.findById(request._id));
    res.status(201).json({ request: populated });
  } catch (error) {
    next(error);
  }
};

const myRequests = async (req, res, next) => {
  try {
    const filter = { customer: req.user._id };
    if (req.query.status) filter.status = req.query.status;

    const requests = await populateRequest(Request.find(filter)).sort({
      createdAt: -1,
    });
    res.json({ requests });
  } catch (error) {
    next(error);
  }
};

const providerRequests = async (req, res, next) => {
  try {
    const provider = await Provider.findOne({ owner: req.user._id });
    if (!provider) return res.json({ requests: [] });

    const filter = { provider: provider._id };
    if (req.query.status) filter.status = req.query.status;

    const requests = await populateRequest(Request.find(filter)).sort({
      createdAt: -1,
    });
    res.json({ requests });
  } catch (error) {
    next(error);
  }
};

const listAllRequests = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const requests = await populateRequest(Request.find(filter)).sort({
      createdAt: -1,
    });
    res.json({ requests });
  } catch (error) {
    next(error);
  }
};

const getRequest = async (req, res, next) => {
  try {
    const request = await populateRequest(Request.findById(req.params.id));
    if (!request) return res.status(404).json({ message: 'Request not found' });

    const providerDoc = await Provider.findById(
      request.provider._id || request.provider
    );
    const isCustomer =
      String(request.customer._id || request.customer) === String(req.user._id);
    const isProvider =
      providerDoc && String(providerDoc.owner) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';

    if (!isCustomer && !isProvider && !isAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    res.json({ request });
  } catch (error) {
    next(error);
  }
};

const applyStatus = async ({
  requestId,
  user,
  nextStatus,
  providerMessage,
  actor,
}) => {
  const request = await Request.findById(requestId);
  if (!request) {
    const err = new Error('Request not found');
    err.statusCode = 404;
    throw err;
  }

  const provider = await Provider.findById(request.provider);
  if (!provider) {
    const err = new Error('Provider not found');
    err.statusCode = 404;
    throw err;
  }

  const isCustomer = String(request.customer) === String(user._id);
  const isProvider = String(provider.owner) === String(user._id);
  const isAdmin = user.role === 'admin';

  if (actor === 'customer' && !isCustomer && !isAdmin) {
    const err = new Error('Forbidden');
    err.statusCode = 403;
    throw err;
  }
  if (actor === 'provider' && !isProvider && !isAdmin) {
    const err = new Error('Forbidden');
    err.statusCode = 403;
    throw err;
  }

  if (!canTransition(request.status, nextStatus) && !isAdmin) {
    const err = new Error(
      `Cannot change status from ${request.status} to ${nextStatus}`
    );
    err.statusCode = 400;
    throw err;
  }

  request.status = nextStatus;
  if (providerMessage !== undefined) {
    request.providerMessage = providerMessage;
    request.providerNote = providerMessage;
  }
  if (nextStatus === 'completed' && request.paymentStatus === 'paid') {
    request.paymentStatus = 'released';
    request.releasedAt = new Date();
  }
  await request.save();

  // Trust signals: last active + response rate when provider acts
  if (actor === 'provider' || (isAdmin && ['accepted', 'rejected', 'completed'].includes(nextStatus))) {
    const all = await Request.find({ provider: provider._id }).select('status');
    const total = all.length;
    const responded = all.filter((r) =>
      ['accepted', 'rejected', 'completed'].includes(r.status)
    ).length;
    const responseRate = total ? Math.round((responded / total) * 100) : 0;
    await Provider.findByIdAndUpdate(provider._id, {
      lastActiveAt: new Date(),
      responseRate,
    });
  }

  return populateRequest(Request.findById(request._id));
};

const updateRequestStatus = async (req, res, next) => {
  try {
    const body = req.body || {};
    const { status, providerNote = '', providerMessage } = body;
    const message = providerMessage || providerNote || '';

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    let actor = 'provider';
    if (status === 'cancelled') actor = 'customer';

    const request = await applyStatus({
      requestId: req.params.id,
      user: req.user,
      nextStatus: status,
      providerMessage: message,
      actor,
    });

    res.json({ request });
  } catch (error) {
    next(error);
  }
};

const cancelRequest = async (req, res, next) => {
  try {
    const existing = await Request.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Request not found' });
    }
    if (existing.status !== 'pending' && req.user.role !== 'admin') {
      return res.status(400).json({
        message: 'Only pending requests can be cancelled',
      });
    }

    const request = await applyStatus({
      requestId: req.params.id,
      user: req.user,
      nextStatus: 'cancelled',
      actor: 'customer',
    });
    res.json({ request });
  } catch (error) {
    next(error);
  }
};

const acceptRequest = async (req, res, next) => {
  try {
    const body = req.body || {};
    const request = await applyStatus({
      requestId: req.params.id,
      user: req.user,
      nextStatus: 'accepted',
      providerMessage: body.providerMessage || body.providerNote || '',
      actor: 'provider',
    });
    res.json({ request });
  } catch (error) {
    next(error);
  }
};

const rejectRequest = async (req, res, next) => {
  try {
    const body = req.body || {};
    const request = await applyStatus({
      requestId: req.params.id,
      user: req.user,
      nextStatus: 'rejected',
      providerMessage: body.providerMessage || body.providerNote || '',
      actor: 'provider',
    });
    res.json({ request });
  } catch (error) {
    next(error);
  }
};

const completeRequest = async (req, res, next) => {
  try {
    const body = req.body || {};
    const request = await applyStatus({
      requestId: req.params.id,
      user: req.user,
      nextStatus: 'completed',
      providerMessage: body.providerMessage || body.providerNote || '',
      actor: 'provider',
    });
    res.json({ request });
  } catch (error) {
    next(error);
  }
};

const METHODS = new Set(PAYMENT_METHODS);

const payRequest = async (req, res, next) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const isCustomer = String(request.customer) === String(req.user._id);
    if (!isCustomer && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only the customer can pay' });
    }

    if (!['pending', 'accepted'].includes(request.status)) {
      return res.status(400).json({
        message: 'Payment is only available for pending or accepted requests',
      });
    }

    if (request.paymentStatus === 'paid' || request.paymentStatus === 'released') {
      return res.status(400).json({ message: 'This request is already paid' });
    }

    const method = String(req.body?.method || 'demo').toLowerCase();
    if (!METHODS.has(method)) {
      return res.status(400).json({
        message: 'Choose JazzCash, EasyPaisa, card, cash, or demo',
      });
    }

    const amount = Number(req.body?.amount || request.budget || request.paymentAmount || 0);
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'A valid payment amount is required' });
    }

    request.paymentStatus = 'paid';
    request.paymentMethod = method;
    request.paymentAmount = amount;
    request.paymentRef = `TL-${Date.now().toString(36).toUpperCase()}`;
    request.paidAt = new Date();
    await request.save();

    const populated = await populateRequest(Request.findById(request._id));
    res.json({
      request: populated,
      demo: true,
      message: 'Demo payment recorded. No real money was charged.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
