import { Link } from 'react-router-dom';
import Button from '../components/Button';

export default function About() {
  return (
    <div className="page-shell py-14">
      <div className="animate-rise max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-sea">About</p>
        <h1 className="font-display mt-3 text-4xl font-extrabold md:text-5xl">
          Connecting Communities with Trusted Local Services.
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-ink-soft">
          TrustLink AI helps people discover reliable local service providers
          without digging through WhatsApp groups or Facebook posts. Customers
          search and book with confidence. Providers grow through verified
          profiles and reviews. Admins keep the marketplace clean.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/providers">
            <Button>Find providers</Button>
          </Link>
          <Link to="/ai">
            <Button variant="secondary">Try AI Assistant</Button>
          </Link>
        </div>

        <div className="surface mt-10 rounded-3xl p-6">
          <h2 className="font-display text-xl font-bold">Live demo</h2>
          <p className="mt-3 text-sm text-ink-soft">
            This app is live. Open it, create an account, and try search, AI
            recommendations, and service requests.
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <span className="font-semibold text-ink">Website: </span>
              <a
                href="https://trustlink-ai.vercel.app"
                className="font-semibold text-sea break-all"
                target="_blank"
                rel="noreferrer"
              >
                https://trustlink-ai.vercel.app
              </a>
            </li>
            <li>
              <span className="font-semibold text-ink">API docs: </span>
              <a
                href="https://trustlink-ai-api-production.up.railway.app/api/docs"
                className="font-semibold text-sea break-all"
                target="_blank"
                rel="noreferrer"
              >
                https://trustlink-ai-api-production.up.railway.app/api/docs
              </a>
            </li>
            <li>
              <span className="font-semibold text-ink">GitHub: </span>
              <a
                href="https://github.com/noorulemana3-droid/TrustLink-AI"
                className="font-semibold text-sea break-all"
                target="_blank"
                rel="noreferrer"
              >
                https://github.com/noorulemana3-droid/TrustLink-AI
              </a>
            </li>
          </ul>
        </div>

        <div className="mt-12">
          <h2 className="font-display text-2xl font-bold">How it works</h2>
          <ol className="mt-4 space-y-3 text-ink-soft">
            <li>
              <span className="font-semibold text-ink">1. Search</span> — filter by
              city, category, price, and availability.
            </li>
            <li>
              <span className="font-semibold text-ink">2. Trust</span> — read reviews,
              ratings, and AI summaries before you hire.
            </li>
            <li>
              <span className="font-semibold text-ink">3. Request</span> — send a
              service request and track accept → complete.
            </li>
          </ol>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            ['Customers', 'Search, review, favorite, and request services.'],
            ['Providers', 'Publish profiles, manage requests, build reputation.'],
            ['AI layer', 'Natural-language recommendations with transparent ranking.'],
          ].map(([title, text]) => (
            <div key={title} className="surface rounded-2xl p-5">
              <h2 className="font-display text-xl font-bold">{title}</h2>
              <p className="mt-2 text-sm text-ink-soft">{text}</p>
            </div>
          ))}
        </div>

        <div className="surface mt-10 rounded-3xl p-6">
          <h2 className="font-display text-xl font-bold">Built with</h2>
          <p className="mt-3 text-sm text-ink-soft">
            React (Vite) · Tailwind · Express · MongoDB · JWT · Hybrid AI ranking
            (works offline of LLM keys with a heuristic fallback).
          </p>
        </div>
      </div>
    </div>
  );
}
