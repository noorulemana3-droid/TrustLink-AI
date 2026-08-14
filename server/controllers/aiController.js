const Provider = require('../models/Provider');
const Review = require('../models/Review');
const Category = require('../models/Category');
const aiService = require('../services/aiService');

const escapeRegex = (value = '') =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Progressive filter relaxation so users rarely see a hard empty set.
 * Returns { providers, widened, widenedNote }.
 */
const findProvidersForRecommend = async (filters) => {
  const base = { status: 'approved' };
  const steps = [];

  const categoryId = filters.categorySlug
    ? (await Category.findOne({ slug: filters.categorySlug }))?._id
    : null;

  // Step 1: category + city/area + budget
  const strict = { ...base };
  if (categoryId) strict.category = categoryId;
  if (filters.city) {
    const cityRe = new RegExp(escapeRegex(filters.city), 'i');
    strict.$or = [{ city: cityRe }, { area: cityRe }, { address: cityRe }];
  }
  if (filters.area && !filters.city) {
    const areaRe = new RegExp(escapeRegex(filters.area), 'i');
    strict.$or = [{ area: areaRe }, { city: areaRe }, { address: areaRe }];
  }
  if (filters.maxBudget) {
    strict['priceRange.min'] = { $lte: filters.maxBudget };
  }
  steps.push({ filter: strict, note: null });

  // Step 2: drop budget
  if (filters.maxBudget) {
    const noBudget = { ...base };
    if (categoryId) noBudget.category = categoryId;
    if (filters.city) {
      const cityRe = new RegExp(escapeRegex(filters.city), 'i');
      noBudget.$or = [{ city: cityRe }, { area: cityRe }, { address: cityRe }];
    } else if (filters.area) {
      const areaRe = new RegExp(escapeRegex(filters.area), 'i');
      noBudget.$or = [{ area: areaRe }, { city: areaRe }, { address: areaRe }];
    }
    steps.push({
      filter: noBudget,
      note: 'Widened search: budget filter relaxed so nearby matches still show.',
    });
  }

  // Step 3: category only (any city)
  if (categoryId && (filters.city || filters.area)) {
    steps.push({
      filter: { ...base, category: categoryId },
      note: 'Widened search: showing this category across all cities.',
    });
  }

  // Step 4: all approved
  steps.push({
    filter: base,
    note: 'Widened search: no exact filter match — ranking all approved providers by fit.',
  });

  let widened = false;
  let widenedNote = null;
  let providers = [];

  for (let i = 0; i < steps.length; i += 1) {
    const step = steps[i];
    providers = await Provider.find(step.filter)
      .populate('category', 'name slug icon')
      .limit(50);
    if (providers.length) {
      widened = i > 0;
      widenedNote = step.note;
      break;
    }
  }

  return { providers, widened, widenedNote };
};

const recommend = async (req, res, next) => {
  try {
    const query = String(req.body?.query || '').trim();

    if (!query) {
      return res.status(400).json({ message: 'Query is required' });
    }
    if (query.length < 8) {
      return res
        .status(400)
        .json({ message: 'Please describe what you need in a bit more detail' });
    }
    if (query.length > 500) {
      return res.status(400).json({ message: 'Query is too long (max 500 characters)' });
    }

    const filters = await aiService.parseQuery(query);
    const { providers, widened, widenedNote } = await findProvidersForRecommend(filters);
    const result = await aiService.recommend(query, providers, filters);

    if (widened && widenedNote) {
      result.widened = true;
      result.widenedNote = widenedNote;
      result.explanation = `${widenedNote} ${result.explanation || ''}`.trim();
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
};

const parseQuery = async (req, res, next) => {
  try {
    const query = String(req.body?.query || req.query?.q || '').trim();
    if (!query) {
      return res.status(400).json({ message: 'Query is required' });
    }
    const filters = await aiService.parseQuery(query);
    res.json({
      filters,
      rankingFactors: aiService.RANKING_FACTORS.map((f) => f.label || f),
    });
  } catch (error) {
    next(error);
  }
};

const reviewSummary = async (req, res, next) => {
  try {
    const provider = await Provider.findById(req.params.providerId);
    if (!provider) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    const reviews = await Review.find({ provider: provider._id })
      .sort({ createdAt: -1 })
      .limit(30);

    const result = await aiService.summarizeReviews(provider, reviews);
    res.json({
      summary: result.summary,
      source: result.source,
      themes: result.themes,
      reviewCount: reviews.length,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { recommend, reviewSummary, parseQuery };
