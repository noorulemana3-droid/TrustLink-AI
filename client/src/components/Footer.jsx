import { Link } from 'react-router-dom';
import BrandMark from './BrandMark';

export default function Footer() {
  return (
    <footer className="mt-20 bg-ink text-sand">
      <div className="page-shell grid gap-8 py-12 md:grid-cols-3">
        <div>
          <p className="flex items-center gap-2 font-display text-2xl font-bold">
            <BrandMark className="h-8 w-8" />
            TrustLink AI
          </p>
          <p className="mt-3 max-w-sm text-sm text-mist/90">
            Connecting Communities with Trusted Local Services.
          </p>
        </div>
        <div className="text-sm">
          <p className="font-bold">Explore</p>
          <div className="mt-3 flex flex-col gap-2 text-mist/90">
            <Link to="/providers">Find providers</Link>
            <Link to="/ai">Ask AI</Link>
            <a
              href="https://trustlink-ai-api-production.up.railway.app/api/docs"
              target="_blank"
              rel="noreferrer"
            >
              API docs
            </a>
            <Link to="/about">About</Link>
            <Link to="/login">Login</Link>
          </div>
        </div>
        <div className="text-sm">
          <p className="font-bold">Account</p>
          <div className="mt-3 flex flex-col gap-2 text-mist/90">
            <Link to="/register">Create account</Link>
            <Link to="/forgot-password">Forgot password</Link>
            <Link to="/requests">My requests</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-mist/70">
        © {new Date().getFullYear()} TrustLink AI · Trusted local services
      </div>
    </footer>
  );
}
