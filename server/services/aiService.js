const Category = require('../models/Category');
const { rankProviders } = require('./rankingService');

const hasGemini = () => Boolean(process.env.GEMINI_API_KEY);
const hasOpenAI = () => Boolean(process.env.OPENAI_API_KEY);

const RANKING_FACTORS = [
  { key: 'rating', label: 'Rating' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'price', label: 'Price fit' },
  { key: 'experience', label: 'Experience' },
  { key: 'location', label: 'Location' },
  { key: 'trust', label: 'Verification' },
  { key: 'relevance', label: 'Keyword match' },
];

const heuristicParse = (query, categories = []) => {
  const text = String(query || '').toLowerCase();
  const result = {
    category: null,
    categorySlug: null,
    city: null,
    area: null,
    maxBudget: null,
    keywords: [],
  };

  const cities = [
    'lahore',
    'karachi',
    'islamabad',
    'rawalpindi',
    'faisalabad',
    'multan',
    'peshawar',
    'quetta',
  ];

  for (const city of cities) {
    if (text.includes(city)) {
      result.city = city.charAt(0).toUpperCase() + city.slice(1);
      break;
    }
  }

  const areas = [
    'johar town',
    'dha',
    'gulberg',
    'model town',
    'bahria',
    'clifton',
    'defence',
    'saddar',
    'township',
    'cantt',
    'f-10',
    'f-7',
    'g-11',
    'g-9',
    'd ground',
    'north nazimabad',
    'gulshan',
  ];
  for (const area of areas) {
    if (text.includes(area)) {
      result.area = area
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      break;
    }
  }

  // Infer city from well-known areas when the user only named a neighborhood
  if (!result.city && result.area) {
    const AREA_TO_CITY = {
      'johar town': 'Lahore',
      gulberg: 'Lahore',
      'model town': 'Lahore',
      township: 'Lahore',
      cantt: 'Lahore',
      clifton: 'Karachi',
      'gulshan-e-iqbal': 'Karachi',
      gulshan: 'Karachi',
      'north nazimabad': 'Karachi',
      'f-10': 'Islamabad',
      'f-7': 'Islamabad',
      'g-11': 'Islamabad',
      'g-9': 'Islamabad',
      'd ground': 'Faisalabad',
      bahria: 'Rawalpindi',
    };
    const inferred = AREA_TO_CITY[String(result.area).toLowerCase()];
    if (inferred) result.city = inferred;
  }

  const budgetMatch = text.match(
    /(?:under|below|less than|upto|up to|max)?\s*(?:pkr|rs\.?|rupees?)?\s*(\d[\d,]*)/i
  );
  if (budgetMatch) {
    result.maxBudget = Number(budgetMatch[1].replace(/,/g, ''));
  }

  for (const cat of categories) {
    const name = cat.name.toLowerCase();
    if (text.includes(name) || text.includes(cat.slug.replace(/-/g, ' '))) {
      result.category = cat.name;
      result.categorySlug = cat.slug;
      break;
    }
  }

  // Synonym hints when category name isn't typed exactly
  if (!result.categorySlug) {
    const synonyms = [
      { slugHint: 'electrician', words: ['wiring', 'electric', 'switch', 'socket'] },
      { slugHint: 'plumber', words: ['pipe', 'leak', 'tap', 'drain', 'water'] },
      { slugHint: 'tutor', words: ['tuition', 'math', 'physics', 'english class'] },
      { slugHint: 'cleaner', words: ['cleaning', 'maid', 'deep clean'] },
      { slugHint: 'carpenter', words: ['furniture', 'wood', 'cabinet'] },
      { slugHint: 'ac-technician', words: ['ac ', 'air conditioner', 'cooling'] },
      { slugHint: 'mobile-repair', words: ['mobile', 'phone screen', 'iphone', 'android'] },
      { slugHint: 'computer-repair', words: ['laptop', 'pc repair', 'computer'] },
      { slugHint: 'mechanic', words: ['car service', 'oil change', 'brake'] },
      { slugHint: 'painter', words: ['paint', 'painting', 'wall paint'] },
      { slugHint: 'photographer', words: ['photo', 'photoshoot', 'wedding shoot'] },
    ];
    for (const syn of synonyms) {
      if (syn.words.some((w) => text.includes(w))) {
        const matched = categories.find(
          (c) =>
            c.slug.includes(syn.slugHint) ||
            c.name.toLowerCase().includes(syn.slugHint.replace('-', ' '))
        );
        if (matched) {
          result.category = matched.name;
          result.categorySlug = matched.slug;
          break;
        }
      }
    }
  }

  const stop = new Set([
    'i',
    'need',
    'an',
    'a',
    'the',
    'for',
    'near',
    'under',
    'pkr',
    'rs',
    'with',
    'and',
    'to',
    'in',
    'my',
    'me',
    'please',
    'looking',
    'want',
    'someone',
  ]);
  result.keywords = text
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !stop.has(w))
    .slice(0, 8);

  return result;
};

const LLM_TIMEOUT_MS = 8000;

const fetchWithTimeout = async (url, options = {}, ms = LLM_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

const callGemini = async (prompt) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini error: ${response.status}`);
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
};

const callOpenAI = async (prompt) => {
  const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI error: ${response.status}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || '';
};

const callLLM = async (prompt) => {
  try {
    if (hasGemini()) return await callGemini(prompt);
    if (hasOpenAI()) return await callOpenAI(prompt);
  } catch (err) {
    console.warn('LLM unavailable, using heuristic:', err.message);
  }
  return null;
};

const extractJson = (text) => {
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
};

const parseQuery = async (query) => {
  const categories = await Category.find().lean();
  const fallback = heuristicParse(query, categories);

  const prompt = `Extract service search filters from this user request for a Pakistan local services marketplace.
Return ONLY JSON with keys: category (string|null), city (string|null), area (string|null), maxBudget (number|null), keywords (string array).
Known categories: ${categories.map((c) => c.name).join(', ')}.
User: """${query}"""`;

  try {
    const raw = await callLLM(prompt);
    const parsed = extractJson(raw);
    if (!parsed) return { ...fallback, source: 'heuristic' };

    const categoryName = parsed.category || fallback.category;
    const matched = categories.find(
      (c) =>
        c.name.toLowerCase() === String(categoryName || '').toLowerCase() ||
        c.slug === String(categoryName || '').toLowerCase().replace(/\s+/g, '-')
    );

    return {
      category: matched?.name || fallback.category,
      categorySlug: matched?.slug || fallback.categorySlug,
      city: parsed.city || fallback.city,
      area: parsed.area || fallback.area,
      maxBudget:
        typeof parsed.maxBudget === 'number'
          ? parsed.maxBudget
          : fallback.maxBudget,
      keywords: Array.isArray(parsed.keywords)
        ? parsed.keywords
        : fallback.keywords,
      source: hasGemini() || hasOpenAI() ? 'llm' : 'heuristic',
    };
  } catch {
    return { ...fallback, source: 'heuristic' };
  }
};

const buildHeuristicExplanation = (query, ranked, filters = {}) => {
  const top = ranked.slice(0, 3);
  if (!top.length) {
    const hints = [];
    if (filters.city) hints.push('try a nearby city');
    if (filters.maxBudget) hints.push('raise the budget slightly');
    if (filters.category) hints.push('widen the service type');
    const tip = hints.length ? ` Tip: ${hints.join(', ')}.` : '';
    return `No strong matches for “${query}”.${tip} Browse all providers or rephrase with city and budget.`;
  }

  const parts = [];
  const understood = [];
  if (filters.category) understood.push(filters.category.toLowerCase());
  if (filters.city) understood.push(`in ${filters.city}`);
  if (filters.area) understood.push(`near ${filters.area}`);
  if (filters.maxBudget) {
    understood.push(`under Rs ${Number(filters.maxBudget).toLocaleString('en-PK')}`);
  }

  if (understood.length) {
    parts.push(`We understood: ${understood.join(' ')}.`);
  } else {
    parts.push(`Matched your request against rating, price, location, and trust signals.`);
  }

  const lead = top[0];
  const leadWhy = (lead.matchReasons || []).slice(0, 2).join('; ');
  parts.push(
    `#1 is ${lead.businessName}${leadWhy ? ` — ${leadWhy}` : ''}${
      top.length > 1
        ? `. Also consider ${top
            .slice(1)
            .map((p) => p.businessName)
            .join(' and ')}.`
        : '.'
    }`
  );

  return parts.join(' ');
};

const explainRecommendations = async (query, ranked, filters = {}) => {
  const top = ranked.slice(0, 3);
  const template = buildHeuristicExplanation(query, ranked, filters);

  if (!top.length || (!hasGemini() && !hasOpenAI())) {
    return template;
  }

  const prompt = `Write 2 short sentences explaining why these Pakistan local service providers match the user request.
Lead with the #1 match by name and one concrete reason (rating, area, budget, or verification).
User request: ${query}
Understood filters: ${JSON.stringify({
    category: filters.category,
    city: filters.city,
    area: filters.area,
    maxBudget: filters.maxBudget,
  })}
Providers: ${JSON.stringify(
    top.map((p) => ({
      name: p.businessName,
      city: p.city,
      area: p.area,
      rating: p.ratingAvg,
      price: p.priceRange,
      reasons: p.matchReasons,
    }))
  )}
Be concise and practical. No markdown. Use Rs for money.`;

  try {
    const text = await callLLM(prompt);
    return (text || template).trim();
  } catch {
    return template;
  }
};

const extractThemes = (reviews) => {
  const positives = [
    'professional',
    'on time',
    'punctual',
    'friendly',
    'clean',
    'reliable',
    'affordable',
    'fair price',
    'quality',
    'recommend',
    'helpful',
    'quick',
    'honest',
    'transparent',
    'neat',
    'polite',
  ];
  const concerns = [
    'late',
    'expensive',
    'delay',
    'delayed',
    'rude',
    'poor',
    'slow',
    'overcharge',
    'incomplete',
  ];

  const blob = reviews
    .map((r) => String(r.comment || '').toLowerCase())
    .join(' ');

  const foundPos = positives.filter((w) => blob.includes(w)).slice(0, 4);
  const foundNeg = concerns.filter((w) => blob.includes(w)).slice(0, 3);

  return { foundPos, foundNeg };
};

const summarizeReviews = async (provider, reviews) => {
  if (!reviews.length) {
    return {
      summary:
        'No customer reviews yet. Check verification, response rate, and message them on WhatsApp before booking.',
      source: 'heuristic',
      themes: { strengths: [], concerns: [] },
    };
  }

  const avg =
    reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  const { foundPos, foundNeg } = extractThemes(reviews);
  const fiveStars = reviews.filter((r) => r.rating >= 5).length;
  const lowStars = reviews.filter((r) => r.rating <= 2).length;

  let template = `${provider.businessName} averages ${avg.toFixed(1)}/5 from ${reviews.length} review${
    reviews.length === 1 ? '' : 's'
  }`;
  if (fiveStars) {
    template += ` (${fiveStars} five-star)`;
  }
  template += '.';

  if (foundPos.length) {
    template += ` Customers often highlight ${foundPos.join(', ')}.`;
  } else {
    template += ' Feedback leans toward overall service quality and reliability.';
  }
  if (foundNeg.length) {
    template += ` A few mentions note ${foundNeg.join(' and ')} — worth confirming details when you book.`;
  } else if (lowStars === 0 && avg >= 4) {
    template += ' No repeated red flags in recent comments.';
  }

  if (!hasGemini() && !hasOpenAI()) {
    return {
      summary: template,
      source: 'heuristic',
      themes: { strengths: foundPos, concerns: foundNeg },
    };
  }

  const prompt = `Summarize these customer reviews for ${provider.businessName} in 2-3 sentences for a Pakistan services marketplace.
Start with the overall rating impression, then strengths, then any repeated concerns if present.
Do not invent issues. No markdown.
Reviews: ${JSON.stringify(
    reviews.slice(0, 15).map((r) => ({ rating: r.rating, comment: r.comment }))
  )}`;

  try {
    const text = await callLLM(prompt);
    return {
      summary: (text || template).trim(),
      source: 'llm',
      themes: { strengths: foundPos, concerns: foundNeg },
    };
  } catch {
    return {
      summary: template,
      source: 'heuristic',
      themes: { strengths: foundPos, concerns: foundNeg },
    };
  }
};

const recommend = async (query, providers, preParsedFilters = null) => {
  const filters = preParsedFilters || (await parseQuery(query));
  const ranked = rankProviders(providers, filters);
  const explanation = await explainRecommendations(query, ranked, filters);

  return {
    query,
    filters,
    explanation,
    rankingFactors: RANKING_FACTORS.map((f) => f.label),
    rankingFactorKeys: RANKING_FACTORS,
    mode: hasGemini() || hasOpenAI() ? 'hybrid' : 'heuristic',
    providers: ranked.slice(0, 8),
  };
};

module.exports = {
  parseQuery,
  recommend,
  summarizeReviews,
  heuristicParse,
  RANKING_FACTORS,
};
