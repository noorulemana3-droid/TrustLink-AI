import { Link, NavLink, Outlet } from 'react-router-dom';

export default function DashboardLayout({ title, links }) {
  return (
    <div className="page-shell py-8">
      <div className="mb-8 animate-rise">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-sea">Workspace</p>
        <h1 className="font-display mt-2 text-3xl font-extrabold md:text-4xl">{title}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="surface h-fit rounded-2xl p-3">
          <nav className="flex flex-col gap-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={Boolean(link.end)}
                className={({ isActive }) =>
                  [
                    'rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                    isActive
                      ? 'bg-sea text-white shadow-sm'
                      : 'text-ink-soft hover:bg-mist hover:text-ink',
                  ].join(' ')
                }
              >
                {link.label}
              </NavLink>
            ))}
            <Link
              to="/"
              className="mt-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-sea hover:bg-mist/60"
            >
              ← Back home
            </Link>
          </nav>
        </aside>
        <section className="min-w-0">
          <Outlet />
        </section>
      </div>
    </div>
  );
}
