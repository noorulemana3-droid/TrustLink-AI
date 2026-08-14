import { useState } from 'react';
import { Link } from 'react-router-dom';
import ProviderCard from '../components/ProviderCard';
import { EmptyState } from '../components/ui';
import { recommendProviders } from '../services/ai';
import { useToast } from '../context/ToastContext';
import Button from '../components/Button';
import { formatPkr } from '../utils/money';

const EXAMPLES = [
  'I need an electrician for home wiring under PKR 5000 near Johar Town',
  'Plumber in Gulberg for a leaking tap under 3000',
  'Math tutor in Lahore under PKR 4000',
  'AC technician near DHA Karachi',
  'Mobile repair in Faisalabad under 2000',
];

const MODE_LABEL = {
  heuristic: 'Smart match · offline',
  hybrid: 'Smart match · AI+',
};

function matchPercent(score, topScore) {
  const top = Number(topScore) || 0;
  const value = Number(score) || 0;
  if (top <= 0) return 0;
  return Math.max(1, Math.min(100, Math.round((value / top) * 100)));
}

function displayReasons(provider, filters) {
  const reasons = [];
  const breakdown = provider.scoreBreakdown || {};
  const rating = Number(provider.ratingAvg || 0);
  const reviews = Number(provider.ratingCount || 0);
  const experience = Number(provider.experienceYears || provider.experience || 0);
  const approved =
    provider.verified || provider.status === 'approved' || provider.isApproved;

  if (breakdown.price > 0 && filters?.maxBudget) reasons.push('Fits your budget');
  if (rating >= 4 && reviews > 0) reasons.push('Highly rated');
  if (breakdown.location > 0 && (filters?.city || filters?.area)) {
    reasons.push('Near your location');
  }
  if (experience >= 5) reasons.push('Relevant experience');
  if (approved) reasons.push('Admin verified');
  if (typeof provider.responseRate === 'number' && provider.responseRate >= 85) {
    reasons.push(`${provider.responseRate}% response rate`);
  }

  for (const reason of provider.matchReasons || []) {
    if (reasons.length >= 4) break;
    if (!reasons.includes(reason)) reasons.push(reason);
  }

  return reasons.slice(0, 4);
}

function ScoreBar({ percent }) {
  const pct = Math.max(8, Math.min(100, Number(percent) || 0));
  return (
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-mist">
      <div
        className="h-full rounded-full bg-sea transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function BreakdownPills({ breakdown }) {
  if (!breakdown) return null;
  const items = [
    { key: 'rating', label: 'Rating' },
    { key: 'location', label: 'Location' },
    { key: 'price', label: 'Price' },
    { key: 'trust', label: 'Trust' },
    { key: 'relevance', label: 'Keywords' },
    { key: 'experience', label: 'Experience' },
  ]
    .map((item) => ({ ...item, value: Number(breakdown[item.key]) || 0 }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);

  if (!items.length) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item.key}
          className="rounded-md bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-ink-soft"
          title={`+${item.value} to match score`}
        >
          {item.label} +{Math.round(item.value)}
        </span>
      ))}
    </div>
  );
}

export default function AIAssistant() {
  const { toast } = useToast();
  const [query, setQuery] = useState(EXAMPLES[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const ask = async (e) => {
    e?.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length < 8) {
      setError('Please describe what you need in a bit more detail.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await recommendProviders(trimmed);
      setResult(data);
      toast(
        data.providers?.length
          ? `Found ${data.providers.length} match${data.providers.length === 1 ? '' : 'es'}`
          : 'No strong matches — try adjusting your request',
        data.providers?.length ? 'success' : 'info'
      );
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Something went wrong. Please try again.';
      setError(msg);
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell py-10">
      <div className="animate-rise mx-auto max-w-3xl text-center">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-sea">
          AI Assistant
        </p>
        <h1 className="font-display mt-3 text-4xl font-extrabold md:text-5xl">
          Describe the help you need
        </h1>
        <p className="mt-4 text-ink-soft">
          We explain every match — rating, budget fit, area, and verification —
          so you know why someone ranked first.
        </p>
      </div>

      <form
        onSubmit={ask}
        className="surface animate-rise mx-auto mt-8 max-w-3xl rounded-3xl p-5"
      >
        <label className="mb-2 block text-sm font-semibold text-ink-soft">
          Your request
        </label>
        <textarea
          className="input min-h-28"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. plumber in Gulberg under 3000"
          required
          maxLength={500}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              className="rounded-full border border-line/80 bg-white px-3 py-1.5 text-left text-xs font-medium text-ink-soft transition hover:border-sea hover:text-sea"
              onClick={() => setQuery(ex)}
            >
              {ex.length > 48 ? `${ex.slice(0, 48)}…` : ex}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? 'Finding matches…' : 'Get recommendations'}
          </Button>
          <p className="text-xs text-ink-soft">{query.trim().length}/500</p>
        </div>
      </form>

      {error && (
        <p className="mx-auto mt-4 max-w-3xl rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      )}

      {loading && (
        <div className="mx-auto mt-10 max-w-3xl space-y-3">
          <div className="surface h-28 animate-pulse rounded-3xl" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="surface h-48 animate-pulse rounded-3xl" />
            ))}
          </div>
        </div>
      )}

      {!loading && result && (
        <div className="mt-10">
          <div className="surface rounded-3xl p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="font-display text-2xl font-bold">Why these matches</h2>
              <div className="flex flex-wrap gap-2">
                {result.widened && (
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
                    Widened search
                  </span>
                )}
                <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-ink-soft">
                  {MODE_LABEL[result.mode] || MODE_LABEL.heuristic}
                </span>
              </div>
            </div>
            {result.widenedNote && (
              <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950">
                {result.widenedNote}
              </p>
            )}
            <p className="mt-3 leading-relaxed text-ink-soft">{result.explanation}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
              {result.filters?.category && (
                <span className="rounded-full bg-mist px-3 py-1">
                  Category: {result.filters.category}
                </span>
              )}
              {result.filters?.city && (
                <span className="rounded-full bg-mist px-3 py-1">
                  City: {result.filters.city}
                </span>
              )}
              {result.filters?.area && (
                <span className="rounded-full bg-mist px-3 py-1">
                  Area: {result.filters.area}
                </span>
              )}
              {result.filters?.maxBudget && (
                <span className="rounded-full bg-mist px-3 py-1">
                  Budget: {formatPkr(result.filters.maxBudget)}
                </span>
              )}
            </div>
            {result.rankingFactors?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  How we rank
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {result.rankingFactors.map((factor) => (
                    <span
                      key={factor}
                      className="rounded-lg border border-line/70 bg-white px-2.5 py-1 text-xs font-medium text-ink-soft"
                    >
                      {factor}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {result.providers?.length ? (
            <div className="stagger mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {result.providers.map((provider, index) => {
                const topScore = result.providers[0]?.matchScore;
                const percent = matchPercent(provider.matchScore, topScore);
                const reasons = displayReasons(provider, result.filters);
                return (
                <div key={provider._id} className="animate-rise min-w-0">
                  <div className="mb-2 flex items-center justify-between gap-2 px-1">
                    <span className="text-xs font-bold uppercase tracking-wide text-sea">
                      {index === 0 ? '🏆 Best Match' : `#${index + 1} match`}
                    </span>
                    <span className="text-xs font-semibold text-ink-soft">
                      {percent}% Match
                    </span>
                  </div>
                  <ScoreBar percent={percent} />
                  <BreakdownPills breakdown={provider.scoreBreakdown} />
                  <div className="mt-3">
                    <ProviderCard provider={provider} />
                  </div>
                  <div className="mt-3 px-1">
                    <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                      Why this match
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {(reasons.length ? reasons : ['Ranked by overall fit']).map(
                        (reason) => (
                        <li
                          key={reason}
                          className="flex gap-2 text-xs leading-snug text-ink-soft"
                        >
                          <span className="mt-0.5 shrink-0">✓</span>
                          <span>{reason}</span>
                        </li>
                      )
                      )}
                    </ul>
                  </div>
                  <Link
                    to={`/providers/${provider._id}`}
                    className="mt-2 inline-block px-1 text-sm font-bold text-sea"
                  >
                    View profile →
                  </Link>
                </div>
              );
              })}
            </div>
          ) : (
            <div className="mt-8">
              <EmptyState
                title="No trusted providers found."
                text="Try another city, category, or increase the budget."
              />
              <div className="mt-4 flex justify-center">
                <Link to="/providers">
                  <Button variant="secondary">Browse all providers</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
