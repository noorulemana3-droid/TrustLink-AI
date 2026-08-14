import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../services/api';
import ProviderCard from '../components/ProviderCard';
import ProviderCardSkeleton from '../components/ProviderCardSkeleton';

export default function Home() {
  const [providers, setProviders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/providers', { params: { limit: 6 } }),
      api.get('/categories'),
      api.get('/stats').catch(() => ({ data: null })),
    ])
      .then(([p, c, s]) => {
        setProviders(p.data.providers || []);
        setCategories((c.data.categories || []).slice(0, 8));
        setStats(s.data || null);
        setLoadError('');
      })
      .catch(() => {
        setProviders([]);
        setCategories([]);
        setStats(null);
        setLoadError('Something went wrong. Please try again.');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <section className="relative min-h-[88vh] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(105deg, rgba(11,31,36,0.92) 0%, rgba(15,122,107,0.72) 52%, rgba(15,122,107,0.28) 100%), url('https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1800&q=80')",
          }}
        />
        <div className="page-shell relative flex min-h-[88vh] flex-col justify-end pb-16 pt-28 text-sand md:justify-center md:pb-0">
          <p className="animate-rise text-xs font-bold uppercase tracking-[0.22em] text-sea-bright">
            Community marketplace
          </p>
          <p className="animate-rise mt-3 font-display text-5xl font-extrabold leading-[0.95] tracking-tight md:text-7xl lg:text-8xl">
            TrustLink AI
          </p>
          <h1
            className="animate-rise mt-5 max-w-xl text-xl font-medium text-mist md:text-2xl"
            style={{ animationDelay: '0.1s' }}
          >
            Connecting Communities with Trusted Local Services.
          </h1>
          <p
            className="animate-rise mt-4 max-w-lg text-sm text-mist/85 md:text-base"
            style={{ animationDelay: '0.18s' }}
          >
            Find verified electricians, plumbers, tutors, and more — ranked by
            reviews, price fit, and AI recommendations.
          </p>
          <div
            className="animate-rise mt-8 flex flex-wrap gap-3"
            style={{ animationDelay: '0.26s' }}
          >
            <Link to="/providers" className="btn btn-primary">
              Find a provider
            </Link>
            <Link
              to="/ai"
              className="btn border border-white/30 bg-white/10 text-sand backdrop-blur"
            >
              Ask AI
            </Link>
          </div>
        </div>
      </section>

      {stats && (stats.categories > 0 || stats.verifiedProviders > 0 || stats.reviews > 0) && (
        <section className="page-shell pt-14">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              stats.categories > 0 && ['Service Categories', stats.categories],
              stats.verifiedProviders > 0 && ['Verified Providers', stats.verifiedProviders],
              stats.reviews > 0 && ['Community Reviews', stats.reviews],
              stats.averageRating != null && ['Average Rating', `${stats.averageRating}★`],
            ]
              .filter(Boolean)
              .map(([label, value]) => (
                <div key={label} className="surface rounded-2xl p-4 text-center">
                  <p className="font-display text-2xl font-extrabold text-sea">{value}</p>
                  <p className="mt-1 text-sm font-semibold text-ink-soft">{label}</p>
                </div>
              ))}
          </div>
        </section>
      )}

      <section className="page-shell py-14">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-sea">
          How it works
        </p>
        <h2 className="font-display mt-2 text-3xl font-bold">How TrustLink AI Works</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['1. Find', 'Search for local professionals based on your needs.'],
            ['2. Compare', 'Check ratings, reviews, pricing, and verification.'],
            ['3. Get Matched', 'Use AI to find the provider that best fits your requirements.'],
            ['4. Request', 'Send a service request directly to the provider.'],
          ].map(([title, text]) => (
            <div key={title} className="surface rounded-2xl p-5">
              <h3 className="font-display text-lg font-bold">{title}</h3>
              <p className="mt-2 text-sm text-ink-soft">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="page-shell pb-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-sea">
              Categories
            </p>
            <h2 className="font-display mt-2 text-3xl font-bold">
              What do you need today?
            </h2>
          </div>
          <Link to="/providers" className="text-sm font-bold text-sea">
            View all →
          </Link>
        </div>
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="surface h-16 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <p className="text-sm text-ink-soft">
            No categories yet. Run <code className="font-semibold">npm run seed</code>{' '}
            in the server folder.
          </p>
        ) : (
          <div className="stagger grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {categories.map((cat) => (
              <Link
                key={cat._id}
                to={`/providers?category=${cat.slug}`}
                className="surface animate-rise rounded-2xl px-4 py-5 font-semibold transition hover:border-sea hover:shadow-md"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="page-shell pb-20">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-sea">
            Featured
          </p>
          <h2 className="font-display mt-2 text-3xl font-bold">
            Trusted nearby professionals
          </h2>
        </div>
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <ProviderCardSkeleton key={i} />
            ))}
          </div>
        ) : loadError ? (
          <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {loadError}
            <button
              type="button"
              className="ml-2 font-bold underline"
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
          </div>
        ) : providers.length === 0 ? (
          <p className="text-sm text-ink-soft">No trusted providers found.</p>
        ) : (
          <div className="stagger grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {providers.map((provider) => (
              <div key={provider._id} className="animate-rise">
                <ProviderCard provider={provider} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
