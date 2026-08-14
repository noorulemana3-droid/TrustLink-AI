const formatBudget = (n) =>
  typeof n === 'number' && n > 0 ? `Rs ${n.toLocaleString('en-PK')}` : '';

const scoreProvider = (provider, filters = {}) => {
  let score = 0;
  const fitReasons = [];
  const qualityReasons = [];
  const breakdown = {
    rating: 0,
    reviews: 0,
    experience: 0,
    price: 0,
    location: 0,
    trust: 0,
    relevance: 0,
  };

  const rating = provider.ratingAvg || 0;
  const reviews = provider.ratingCount || 0;
  const experience = provider.experienceYears || 0;

  breakdown.rating = Math.round(rating * 18 * 10) / 10;
  score += breakdown.rating;
  if (rating >= 4.5 && reviews > 0) {
    qualityReasons.push(
      `${rating.toFixed(1)}★ from ${reviews} review${reviews === 1 ? '' : 's'}`
    );
  } else if (rating >= 4 && reviews > 0) {
    qualityReasons.push(`Strong ${rating.toFixed(1)}★ rating (${reviews} reviews)`);
  } else if (reviews > 0) {
    qualityReasons.push(
      `${rating.toFixed(1)}★ · ${reviews} review${reviews === 1 ? '' : 's'}`
    );
  }

  breakdown.reviews = Math.round(Math.min(reviews, 40) * 0.8 * 10) / 10;
  score += breakdown.reviews;
  if (reviews >= 10) qualityReasons.push('Lots of customer feedback');

  breakdown.experience = Math.round(Math.min(experience, 20) * 1.5 * 10) / 10;
  score += breakdown.experience;
  if (experience >= 10) qualityReasons.push(`${experience}+ years in the field`);
  else if (experience >= 5) qualityReasons.push(`${experience}+ years experience`);

  if (provider.verified) {
    breakdown.trust += 12;
    score += 12;
    qualityReasons.push('TrustLink verified');
  }

  if (provider.available) {
    breakdown.trust += 5;
    score += 5;
  }

  const responseRate = provider.responseRate;
  if (typeof responseRate === 'number' && responseRate >= 85) {
    breakdown.trust += 4;
    score += 4;
    qualityReasons.push(`${responseRate}% response rate`);
  }

  if (filters.city) {
    const cityMatch =
      String(provider.city || '').toLowerCase() ===
      String(filters.city).toLowerCase();
    if (cityMatch) {
      breakdown.location += 12;
      score += 12;
      fitReasons.push(`Serves ${provider.city}`);
    }
  }

  if (filters.area) {
    const areaNeedle = String(filters.area).toLowerCase();
    const areaHaystack = [
      provider.area,
      provider.address,
      provider.description,
      provider.city,
    ]
      .join(' ')
      .toLowerCase();

    if (areaHaystack.includes(areaNeedle)) {
      breakdown.location += 14;
      score += 14;
      fitReasons.push(`Near ${provider.area || filters.area}`);
    }
  }

  const maxBudget = filters.maxBudget;
  if (typeof maxBudget === 'number' && maxBudget > 0) {
    const minPrice = provider.priceRange?.min ?? 0;
    const maxPrice = provider.priceRange?.max ?? minPrice;
    const budgetLabel = formatBudget(maxBudget);
    if (minPrice <= maxBudget) {
      breakdown.price += 15;
      score += 15;
      if (maxPrice <= maxBudget) {
        breakdown.price += 5;
        score += 5;
        fitReasons.push(`Full range fits under ${budgetLabel}`);
      } else {
        fitReasons.push(`Starting price fits under ${budgetLabel}`);
      }
    } else {
      breakdown.price -= 20;
      score -= 20;
      fitReasons.push(`Priced above ${budgetLabel}`);
    }
  }

  if (filters.keywords?.length) {
    const haystack = [
      provider.businessName,
      provider.description,
      ...(provider.services || []),
    ]
      .join(' ')
      .toLowerCase();

    const hits = filters.keywords.filter((k) =>
      haystack.includes(String(k).toLowerCase())
    );
    breakdown.relevance = hits.length * 4;
    score += breakdown.relevance;
    if (hits.length) {
      fitReasons.push(`Matches “${hits.slice(0, 3).join('”, “')}”`);
    }
  }

  // Query fit first, then quality — so users see why it matched their ask
  const uniqueReasons = [];
  for (const r of [...fitReasons, ...qualityReasons]) {
    if (!uniqueReasons.includes(r)) uniqueReasons.push(r);
  }

  return {
    score: Math.round(score * 10) / 10,
    reasons: uniqueReasons.slice(0, 5),
    breakdown,
  };
};

const rankProviders = (providers, filters = {}) =>
  providers
    .map((provider) => {
      const plain =
        typeof provider.toObject === 'function' ? provider.toObject() : provider;
      const { score, reasons, breakdown } = scoreProvider(plain, filters);
      return {
        ...plain,
        matchScore: score,
        matchReasons: reasons,
        scoreBreakdown: breakdown,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);

module.exports = { scoreProvider, rankProviders };
