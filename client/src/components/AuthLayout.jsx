import { Link } from 'react-router-dom';
import BrandMark from './BrandMark';

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="page-shell flex min-h-[75vh] items-center justify-center py-12">
      <div className="surface animate-rise w-full max-w-lg rounded-3xl p-8 shadow-md shadow-ink/5">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-extrabold text-ink">
          <BrandMark className="h-8 w-8" />
          Trust<span className="text-sea">Link</span> AI
        </Link>
        <h1 className="font-display mt-5 text-3xl font-extrabold">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-ink-soft">{subtitle}</p>}
        <div className="mt-6">{children}</div>
        {footer && <div className="mt-5 text-center text-sm text-ink-soft">{footer}</div>}
      </div>
    </div>
  );
}
