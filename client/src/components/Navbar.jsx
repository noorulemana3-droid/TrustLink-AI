import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getDashboardPath } from '../utils/auth';
import Button from './Button';
import BrandMark from './BrandMark';

const linkClass = ({ isActive }) =>
  `block text-sm font-semibold transition md:inline ${
    isActive ? 'text-sea' : 'text-ink-soft hover:text-sea'
  }`;

export default function Navbar() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const dashboardPath = getDashboardPath(user?.role);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const onLogout = () => {
    logout();
    setOpen(false);
    toast('Logged out', 'info');
    navigate('/login', { replace: true });
  };

  const close = () => setOpen(false);

  const navLinks = (
    <>
      <NavLink to="/providers" className={linkClass} onClick={close}>
        Search
      </NavLink>
      {user && (
        <>
          <NavLink to="/favorites" className={linkClass} onClick={close}>
            Favorites
          </NavLink>
          <NavLink to="/requests" className={linkClass} onClick={close}>
            Requests
          </NavLink>
        </>
      )}
      <NavLink to="/ai" className={linkClass} onClick={close}>
        AI Assistant
      </NavLink>
      <NavLink to="/about" className={linkClass} onClick={close}>
        About
      </NavLink>
      {user && (
        <NavLink to={dashboardPath} className={linkClass} onClick={close}>
          Dashboard
        </NavLink>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur-md">
      <div className="page-shell flex items-center justify-between gap-4 py-3.5">
        <Link
          to="/"
          className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight text-ink sm:text-2xl"
          onClick={close}
        >
          <BrandMark className="h-8 w-8 shrink-0" />
          Trust<span className="text-sea">Link</span> AI
        </Link>

        <nav className="hidden items-center gap-6 md:flex">{navLinks}</nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden text-sm text-ink-soft sm:inline">
                {user.name?.split(' ')[0]}
              </span>
              <Button variant="secondary" className="!py-2 !text-sm" onClick={onLogout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost !py-2 !text-sm" onClick={close}>
                Login
              </Link>
              <Link to="/register" className="btn btn-primary !py-2 !text-sm" onClick={close}>
                Join
              </Link>
            </>
          )}

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line/80 bg-white text-ink md:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">Menu</span>
            <span className="flex flex-col gap-1.5">
              <span className={`block h-0.5 w-5 bg-ink transition ${open ? 'translate-y-2 rotate-45' : ''}`} />
              <span className={`block h-0.5 w-5 bg-ink transition ${open ? 'opacity-0' : ''}`} />
              <span className={`block h-0.5 w-5 bg-ink transition ${open ? '-translate-y-2 -rotate-45' : ''}`} />
            </span>
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-line bg-white px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-4">{navLinks}</nav>
        </div>
      )}
    </header>
  );
}
