const Provider = require('../models/Provider');
const Category = require('../models/Category');
const User = require('../models/User');
const Review = require('../models/Review');
const Request = require('../models/Request');
const { uploadMany } = require('../services/cloudinaryService');
const { normalizePaymentMethods } = require('../utils/payments');

const parseMaybeJson = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const parseServices = (value) => {
  const parsed = parseMaybeJson(value, value);
  if (Array.isArray(parsed)) return parsed.filter(Boolean);
  return String(parsed || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

const escapeRegex = (value = '') =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const resolveSort = (sort) => {
  switch (String(sort || 'rating')) {
    case 'price':
    case 'price-asc':
    case 'lowest-price':
      return { 'priceRange.min': 1, ratingAvg: -1 };
    case 'price-desc':
    case 'highest-price':
      return { 'priceRange.min': -1, ratingAvg: -1 };
    case 'experience':
    case 'most-experienced':
      return { experienceYears: -1, ratingAvg: -1 };
    case 'newest':
      return { createdAt: -1 };
    case 'rating':
    case 'highest-rated':
    default:
      return { ratingAvg: -1, ratingCount: -1 };
  }
};

const buildProviderFilter = async (query) => {
  const filter = { status: 'approved' };
  const and = [];

  const city = String(query.city || '').trim();
  if (city) {
    // Partial match on city or area — exact ^City$ was dropping valid results
    const cityRe = new RegExp(escapeRegex(city), 'i');
    and.push({
      $or: [{ city: cityRe }, { area: cityRe }, { address: cityRe }],
    });
  }

  const categoryValue = String(query.category || query.categorySlug || '').trim();
  if (categoryValue) {
    if (/^[a-f\d]{24}$/i.test(categoryValue)) {
      filter.category = categoryValue;
    } else {
      const category = await Category.findOne({
        $or: [
          { slug: categoryValue.toLowerCase() },
          { name: new RegExp(`^${escapeRegex(categoryValue)}$`, 'i') },
        ],
      });
      if (category) {
        filter.category = category._id;
      } else {
        // Unknown category → mark so listProviders can return empty cleanly
        filter.category = null;
      }
    }
  }

  if (query.minRating) {
    const minRating = Number(query.minRating);
    if (!Number.isNaN(minRating) && minRating > 0) {
      filter.ratingAvg = { $gte: minRating };
    }
  }

  if (query.maxPrice) {
    const maxPrice = Number(query.maxPrice);
    if (!Number.isNaN(maxPrice) && maxPrice > 0) {
      and.push({ 'priceRange.min': { $lte: maxPrice } });
    }
  }

  if (query.minPrice) {
    const minPrice = Number(query.minPrice);
    if (!Number.isNaN(minPrice) && minPrice > 0) {
      and.push({
        $or: [
          { 'priceRange.max': { $gte: minPrice } },
          { 'priceRange.min': { $gte: minPrice } },
        ],
      });
    }
  }

  if (query.available === 'true' || query.isAvailable === 'true') {
    filter.available = true;
  }

  const search = String(query.search || query.q || '').trim();
  if (search) {
    const re = new RegExp(escapeRegex(search), 'i');
    const matchingCats = await Category.find({ name: re }).select('_id');
    and.push({
      $or: [
        { businessName: re },
        { description: re },
        { services: re },
        { city: re },
        { area: re },
        { category: { $in: matchingCats.map((c) => c._id) } },
      ],
    });
  }

  if (and.length) filter.$and = and;
  return filter;
};

const listProviders = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    let filter = await buildProviderFilter(req.query);
    let widened = false;
    let widenedNote = null;

    // Invalid category name → empty result set
    if (Object.prototype.hasOwnProperty.call(filter, 'category') && filter.category === null) {
      return res.json({
        providers: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalProviders: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
        widened: false,
      });
    }

    const sort = resolveSort(req.query.sort);
    let totalProviders = await Provider.countDocuments(filter);

    // Soften if nothing matched: drop city, then price, then rating
    if (totalProviders === 0) {
      const city = String(req.query.city || '').trim();
      const hasPrice = req.query.minPrice || req.query.maxPrice;
      const hasRating = req.query.minRating;

      if (city) {
        const relaxedQuery = { ...req.query, city: '' };
        filter = await buildProviderFilter(relaxedQuery);
        if (filter.category !== null) {
          totalProviders = await Provider.countDocuments(filter);
          if (totalProviders > 0) {
            widened = true;
            widenedNote = `No providers matched “${city}” — showing results in other cities.`;
          }
        }
      }

      if (totalProviders === 0 && hasPrice) {
        const relaxedQuery = { ...req.query, city: city || '', minPrice: '', maxPrice: '' };
        filter = await buildProviderFilter(relaxedQuery);
        if (filter.category !== null) {
          totalProviders = await Provider.countDocuments(filter);
          if (totalProviders > 0) {
            widened = true;
            widenedNote =
              'No providers in that price range — showing other price ranges.';
          }
        }
      }

      if (totalProviders === 0 && hasRating) {
        const relaxedQuery = {
          ...req.query,
          minRating: '',
          minPrice: hasPrice ? '' : req.query.minPrice,
          maxPrice: hasPrice ? '' : req.query.maxPrice,
        };
        filter = await buildProviderFilter(relaxedQuery);
        if (filter.category !== null) {
          totalProviders = await Provider.countDocuments(filter);
          if (totalProviders > 0) {
            widened = true;
            widenedNote = 'No providers at that rating — showing all ratings.';
          }
        }
      }
    }

    if (Object.prototype.hasOwnProperty.call(filter, 'category') && filter.category === null) {
      return res.json({
        providers: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalProviders: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
        widened: false,
      });
    }

    const providers = await Provider.find(filter)
      .populate('category', 'name slug icon description')
      .populate('owner', 'name email phone')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalProviders / limit) || 0;

    res.json({
      providers,
      pagination: {
        currentPage: page,
        totalPages,
        totalProviders,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      widened,
      widenedNote,
    });
  } catch (error) {
    next(error);
  }
};

const resolveExperience = (body) =>
  Number(body.experienceYears ?? body.experience ?? 0) || 0;

const applyBodyToProvider = async (provider, body, files = []) => {
  const businessName = body.businessName;
  const category = body.category;
  const description = body.description;
  const city = body.city;
  const area = body.area;
  const address = body.address ?? body.area;
  const contactPhone = body.contactPhone ?? body.phone;
  const contactEmail = body.contactEmail ?? body.email;
  const profileImage = body.profileImage;

  if (businessName !== undefined) provider.businessName = businessName;
  if (category !== undefined) {
    const cat = await Category.findById(category);
    if (!cat) {
      const err = new Error('Invalid category');
      err.statusCode = 400;
      throw err;
    }
    provider.category = category;
  }
  if (description !== undefined) provider.description = description;
  if (city !== undefined) provider.city = city;
  if (area !== undefined) provider.area = area;
  if (address !== undefined) provider.address = address;
  if (body.experienceYears !== undefined || body.experience !== undefined) {
    provider.experienceYears = resolveExperience(body);
  }
  if (contactPhone !== undefined) provider.contactPhone = contactPhone;
  if (contactEmail !== undefined) provider.contactEmail = contactEmail;
  if (profileImage !== undefined) provider.profileImage = profileImage;

  if (body.priceRange) {
    const priceRange = parseMaybeJson(body.priceRange, {});
    provider.priceRange = {
      min: Number(priceRange.min) || 0,
      max: Number(priceRange.max) || 0,
    };
  }

  if (body.services !== undefined) {
    provider.services = parseServices(body.services);
  }

  if (body.workingHours) {
    const workingHours = parseMaybeJson(body.workingHours, {});
    provider.workingHours = {
      from: workingHours.from || provider.workingHours?.from || '09:00',
      to: workingHours.to || provider.workingHours?.to || '18:00',
    };
  }

  if (body.paymentMethods !== undefined) {
    provider.paymentMethods = normalizePaymentMethods(body.paymentMethods);
  }

  if (body.available !== undefined || body.isAvailable !== undefined) {
    const raw = body.available ?? body.isAvailable;
    provider.available = raw === true || raw === 'true' || raw === 'on';
    provider.lastActiveAt = new Date();
  }

  let gallery = body.galleryImages ?? body.images;
  if (gallery !== undefined) {
    gallery = parseMaybeJson(gallery, gallery);
    if (typeof gallery === 'string') {
      gallery = gallery
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (Array.isArray(gallery)) provider.images = gallery.slice(0, 8);
  }

  if (files?.length) {
    const uploaded = await uploadMany(files, 'trustlink/providers');
    provider.images = [...(provider.images || []), ...uploaded].slice(0, 8);
    if (!provider.profileImage && uploaded[0]) {
      provider.profileImage = uploaded[0];
    }
  }

  if (!provider.profileImage && provider.images?.[0]) {
    provider.profileImage = provider.images[0];
  }
};

const getProvider = async (req, res, next) => {
  try {
    const provider = await Provider.findById(req.params.id)
      .populate('category', 'name slug icon description')
      .populate('owner', 'name email phone city');

    if (!provider) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    const isOwner =
      req.user && String(provider.owner._id || provider.owner) === String(req.user._id);
    const isAdmin = req.user?.role === 'admin';

    if (provider.status !== 'approved' && !isOwner && !isAdmin) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    res.json({ provider });
  } catch (error) {
    next(error);
  }
};

const getMyProvider = async (req, res, next) => {
  try {
    const provider = await Provider.findOne({ owner: req.user._id }).populate(
      'category',
      'name slug icon description'
    );
    res.json({ provider });
  } catch (error) {
    next(error);
  }
};

const createProvider = async (req, res, next) => {
  try {
    const existing = await Provider.findOne({ owner: req.user._id });
    if (existing) {
      return res.status(400).json({ message: 'Provider profile already exists' });
    }

    const businessName = req.body.businessName;
    const category = req.body.category;
    const city = req.body.city;

    if (!businessName || !category || !city) {
      return res
        .status(400)
        .json({ message: 'businessName, category and city are required' });
    }

    const provider = new Provider({
      owner: req.user._id,
      businessName,
      category,
      city,
      status: 'pending',
      contactEmail: req.body.contactEmail || req.body.email || req.user.email,
      contactPhone: req.body.contactPhone || req.body.phone || req.user.phone || '',
    });

    await applyBodyToProvider(provider, req.body, req.files);
    await provider.save();

    if (req.user.role === 'customer') {
      await User.findByIdAndUpdate(req.user._id, { role: 'provider' });
    }

    const populated = await Provider.findById(provider._id).populate(
      'category',
      'name slug icon description'
    );

    res.status(201).json({ provider: populated });
  } catch (error) {
    next(error);
  }
};

const updateMyProvider = async (req, res, next) => {
  try {
    const provider = await Provider.findOne({ owner: req.user._id });
    if (!provider) {
      return res.status(404).json({ message: 'Provider profile not found' });
    }

    await applyBodyToProvider(provider, req.body, req.files);
    await provider.save();
    await provider.populate('category', 'name slug icon description');
    res.json({ provider });
  } catch (error) {
    next(error);
  }
};

const updateProviderById = async (req, res, next) => {
  try {
    const provider = await Provider.findById(req.params.id);
    if (!provider) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    const isOwner = String(provider.owner) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await applyBodyToProvider(provider, req.body, req.files);

    if (isAdmin && req.body.status) {
      const allowed = ['pending', 'approved', 'rejected'];
      if (!allowed.includes(req.body.status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      provider.status = req.body.status;
      if (req.body.status === 'approved') {
        provider.verified = true;
        await User.findByIdAndUpdate(provider.owner, { role: 'provider' });
      }
    }

    await provider.save();
    await provider.populate('category', 'name slug icon description');
    res.json({ provider });
  } catch (error) {
    next(error);
  }
};

const deleteProviderById = async (req, res, next) => {
  try {
    const provider = await Provider.findById(req.params.id);
    if (!provider) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    const isOwner = String(provider.owner) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await Review.deleteMany({ provider: provider._id });
    await Request.deleteMany({ provider: provider._id });
    await User.updateMany({}, { $pull: { favorites: provider._id } });
    await provider.deleteOne();

    res.json({ message: 'Provider deleted' });
  } catch (error) {
    next(error);
  }
};

const deleteMyProvider = async (req, res, next) => {
  try {
    const provider = await Provider.findOne({ owner: req.user._id });
    if (!provider) {
      return res.status(404).json({ message: 'Provider profile not found' });
    }

    req.params.id = String(provider._id);
    return deleteProviderById(req, res, next);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listProviders,
  getProvider,
  getMyProvider,
  createProvider,
  updateProvider: updateMyProvider,
  updateProviderById,
  deleteProviderById,
  deleteMyProvider,
};
