import { Link } from 'react-router-dom';
import Button from '../components/Button';

export default function NotFound() {
  return (
    <div className="page-shell flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-sea">404</p>
      <h1 className="font-display mt-3 text-4xl font-extrabold md:text-5xl">Page not found</h1>
      <p className="mt-4 max-w-md text-ink-soft">
        That link doesn’t exist. Head back home or find a trusted local provider.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/">
          <Button>Go home</Button>
        </Link>
        <Link to="/providers">
          <Button variant="secondary">Search providers</Button>
        </Link>
        <Link to="/ai">
          <Button variant="ghost">Ask AI</Button>
        </Link>
      </div>
    </div>
  );
}
