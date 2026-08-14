import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listCategories } from '../services/categories';
import { listProviders } from '../services/providers';
import ProviderCard from '../components/ProviderCard';
import ProviderCardSkeleton from '../components/ProviderCardSkeleton';
import Button from '../components/Button';
import { EmptyState } from '../components/ui';
import useDebounce from '../hooks/useDebounce';
import { formatPkrRange } from '../utils/money';

const PRICE_PRESETS = [
  { label: 'Any price', minPrice: '', maxPrice: '' },
  { label: 'Under Rs 1,000', minPrice: '', maxPrice: '1000' },
  { label: 'Rs 1,000–3,000', minPrice: '1000', maxPrice: '3000' },
  { label: 'Rs 3,000–5,000', minPrice: '3000', maxPrice: '5000' },
  { label: 'Above Rs 5,000', minPrice: '5000', maxPrice: '' },
];

const SORT_OPTIONS = [
  { value: 'rating', label: 'Top rated' },
  { value: 'price-asc', label: 'Lowest price' },
  { value: 'price-desc', label: 'Highest price' },
  { value: 'experience', label: 'Most experienced' },
  { value: 'newest', label: 'Newest' },
];

const RATING_OPTIONS = [
  { value: '', label: 'Any' },
  { value: '4', label: '4★+' },
  { value: '3', label: '3★+' },
  { value: '2', label: '2★+' },
];

function Chip({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 rounded-full px-3.5 py-2 text-sm font-semibold transition ${
        active
          ? 'bg-ink text-[#f3f7f6] shadow-sm'
          : 'border border-line bg-white text-ink-soft hover:border-sea hover:text-sea'
      }`}
    >
      {children}
    </button>
  );
}

export default function Providers() {
  const [params, setParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [providers, setProviders] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [widenedNote, setWidenedNote] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [searchInput, setSearchInput] = useState(params.get('search') || params.get('q') || '');
  const [cityInput, setCityInput] = useState(params.get('city') || '');

  const debouncedSearch = useDebounce(searchInput, 400);
  const debouncedCity = useDebounce(cityInput, 400);

  const filters = useMemo(
    () => ({
      search: params.get('search') || params.get('q') || '',
      city: params.get('city') || '',
      category: params.get('category') || params.get('categorySlug') || '',
      minRating: params.get('minRating') || '',
      minPrice: params.get('minPrice') || '',
      maxPrice: params.get('maxPrice') || '',
      available: params.get('available') || '',
      sort: params.get('sort') || 'rating',
      page: params.get('page') || '1',
    }),
    [params]
  );

  const setFilter = useCallback(
    (key, value, { resetPage = true } = {}) => {
      const next = new URLSearchParams(params);
      if (!value) next.delete(key);
      else next.set(key, value);

      if (key === 'search') next.delete('q');
      if (key === 'category') next.delete('categorySlug');

      if (resetPage && key !== 'page') next.set('page', '1');
      if (key === 'page' && (!value || value === '1')) next.delete('page');

      setParams(next);
    },
    [params, setParams]
  );

  const applyHeroSearch = (e) => {
    e?.preventDefault?.();
    const next = new URLSearchParams(params);
    if (searchInput.trim()) next.set('search', searchInput.trim());
    else next.delete('search');
    next.delete('q');
    if (cityInput.trim()) next.set('city', cityInput.trim());
    else next.delete('city');
    next.set('page', '1');
    setParams(next);
    setFiltersOpen(false);
  };

  const clearFilters = () => {
    setSearchInput('');
    setCityInput('');
    setParams(new URLSearchParams());
  };

  const setPricePreset = (minPrice, maxPrice) => {
    const next = new URLSearchParams(params);
    if (minPrice) next.set('minPrice', minPrice);
    else next.delete('minPrice');
    if (maxPrice) next.set('maxPrice', maxPrice);
    else next.delete('maxPrice');
    next.set('page', '1');
    setParams(next);
  };

  const activeFilterChips = useMemo(() => {
    const chips = [];
    if (filters.category) {
      const cat = categories.find((c) => c.slug === filters.category);
      chips.push({
        key: 'category',
        label: cat?.name || filters.category,
        clear: () => setFilter('category', ''),
      });
    }
    if (filters.city) {
      chips.push({
        key: 'city',
        label: filters.city,
        clear: () => {
          setCityInput('');
          setFilter('city', '');
        },
      });
    }
    if (filters.minRating) {
      chips.push({
        key: 'minRating',
        label: `${filters.minRating}★+`,
        clear: () => setFilter('minRating', ''),
      });
    }
    if (filters.minPrice || filters.maxPrice) {
      const preset = PRICE_PRESETS.find(
        (p) => p.minPrice === filters.minPrice && p.maxPrice === filters.maxPrice
      );
      chips.push({
        key: 'price',
        label: preset?.label || formatPkrRange(filters.minPrice || 0, filters.maxPrice || ''),
        clear: () => setPricePreset('', ''),
      });
    }
    if (filters.available === 'true') {
      chips.push({
        key: 'available',
        label: 'Available',
        clear: () => setFilter('available', ''),
      });
    }
    if (filters.sort && filters.sort !== 'rating') {
      const sort = SORT_OPTIONS.find((s) => s.value === filters.sort);
      chips.push({
        key: 'sort',
        label: sort?.label || filters.sort,
        clear: () => setFilter('sort', 'rating'),
      });
    }
    return chips;
  }, [filters, categories, setFilter]);

  useEffect(() => {
    listCategories()
      .then((data) => setCategories(data.categories || []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (debouncedSearch === filters.search) return;
    setFilter('search', debouncedSearch.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  useEffect(() => {
    if (debouncedCity === filters.city) return;
    setFilter('city', debouncedCity.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedCity]);

  useEffect(() => {
    if (!filtersOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [filtersOpen]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    const query = {
      search: filters.search || undefined,
      city: filters.city || undefined,
      category: filters.category || undefined,
      minRating: filters.minRating || undefined,
      minPrice: filters.minPrice || undefined,
      maxPrice: filters.maxPrice || undefined,
      available: filters.available || undefined,
      sort: filters.sort || 'rating',
      page: filters.page || 1,
      limit: 9,
    };

    listProviders(query)
      .then((data) => {
        if (!active) return;
        setProviders(data.providers || []);
        setPagination(data.pagination || null);
        setWidenedNote(data.widened && data.widenedNote ? data.widenedNote : '');
      })
      .catch((err) => {
        if (!active) return;
        setProviders([]);
        setPagination(null);
        setWidenedNote('');
        setError('Something went wrong. Please try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filters, refreshTick]);

  const FilterFields = ({ mobile = false }) => (
    <div className="space-y-5">
      <div>
        <p className="label">Category</p>
        <div className="flex flex-wrap gap-2">
          <Chip active={!filters.category} onClick={() => setFilter('category', '')}>
            All
          </Chip>
          {categories.map((c) => (
            <Chip
              key={c._id}
              active={filters.category === c.slug}
              onClick={() => setFilter('category', c.slug)}
            >
              {c.name}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <p className="label">Minimum rating</p>
        <div className="flex flex-wrap gap-2">
          {RATING_OPTIONS.map((opt) => (
            <Chip
              key={opt.value || 'any'}
              active={filters.minRating === opt.value}
              onClick={() => setFilter('minRating', opt.value)}
            >
              {opt.label}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <p className="label">Budget</p>
        <div className="flex flex-wrap gap-2">
          {PRICE_PRESETS.map((p) => (
            <Chip
              key={p.label}
              active={p.minPrice === filters.minPrice && p.maxPrice === filters.maxPrice}
              onClick={() => setPricePreset(p.minPrice, p.maxPrice)}
            >
              {p.label}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <p className="label">Sort by</p>
        {mobile ? (
          <div className="flex flex-wrap gap-2">
            {SORT_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                active={filters.sort === opt.value}
                onClick={() => setFilter('sort', opt.value)}
              >
                {opt.label}
              </Chip>
            ))}
          </div>
        ) : (
          <select
            className="input min-h-11"
            value={filters.sort}
            onChange={(e) => setFilter('sort', e.target.value)}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
        <input
          type="checkbox"
          className="h-5 w-5 accent-[var(--color-sea)]"
          checked={filters.available === 'true'}
          onChange={(e) => setFilter('available', e.target.checked ? 'true' : '')}
        />
        Available only
      </label>

      {!mobile && (
        <Button variant="secondary" className="w-full min-h-11" onClick={clearFilters}>
          Clear all filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="page-shell py-8 md:py-10">
      <div className="animate-rise mb-6 max-w-3xl md:mb-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-sea">Discover</p>
        <h1 className="font-display mt-2 text-3xl font-extrabold sm:text-4xl md:text-5xl">
          Find Trusted Local Services
        </h1>
        <p className="mt-3 text-sm text-ink-soft sm:text-base">
          Search verified professionals by service, city, rating, and budget.
        </p>
      </div>

      <form
        onSubmit={applyHeroSearch}
        className="surface mb-4 grid gap-3 rounded-3xl p-3 shadow-md shadow-ink/5 sm:p-4 md:grid-cols-[1.4fr_1fr_auto]"
      >
        <input
          className="input min-h-12 text-base"
          placeholder="What service do you need?"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          enterKeyHint="search"
        />
        <input
          className="input min-h-12 text-base"
          placeholder="Enter your city"
          value={cityInput}
          onChange={(e) => setCityInput(e.target.value)}
          enterKeyHint="search"
        />
        <Button type="submit" className="min-h-12 w-full md:w-auto">
          Search
        </Button>
      </form>

      {activeFilterChips.length > 0 && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {activeFilterChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.clear}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-sea/10 px-3 py-2 text-sm font-semibold text-sea"
            >
              {chip.label}
              <span aria-hidden>×</span>
            </button>
          ))}
          <button
            type="button"
            onClick={clearFilters}
            className="shrink-0 rounded-full px-3 py-2 text-sm font-semibold text-ink-soft underline"
          >
            Clear all
          </button>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
        <p className="text-sm font-semibold text-ink-soft">
          {pagination ? `${pagination.totalProviders} providers` : 'Providers'}
        </p>
        <Button
          variant="secondary"
          className="relative !min-h-11 !px-4 !py-2 !text-sm"
          onClick={() => setFiltersOpen(true)}
        >
          Filters
          {activeFilterChips.length > 0 && (
            <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-sea px-1.5 text-[11px] font-bold text-[#f3f7f6]">
              {activeFilterChips.length}
            </span>
          )}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="surface hidden h-fit rounded-3xl p-5 lg:block">
          <FilterFields />
        </aside>

        <section>
          {error && (
            <div className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error || 'Something went wrong. Please try again.'}
              <button
                type="button"
                className="ml-2 font-bold underline"
                onClick={() => setRefreshTick((n) => n + 1)}
              >
                Try Again
              </button>
            </div>
          )}

          {!error && widenedNote && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              {widenedNote}
            </div>
          )}

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <ProviderCardSkeleton key={i} />
              ))}
            </div>
          ) : providers.length === 0 ? (
            <EmptyState
              title="No trusted providers found"
              text="Try changing your search or filters."
            />
          ) : (
            <div className="stagger grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
              {providers.map((provider) => (
                <div key={provider._id} className="animate-rise">
                  <ProviderCard provider={provider} />
                </div>
              ))}
            </div>
          )}

          {!loading && providers.length === 0 && (
            <div className="mt-4 flex justify-center">
              <Button variant="secondary" className="min-h-11" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="secondary"
                className="!min-h-11 !px-4 !text-sm"
                disabled={
                  !(
                    pagination.hasPreviousPage ??
                    Number(pagination.currentPage) > 1
                  )
                }
                aria-label="Previous page"
                onClick={() =>
                  setFilter('page', String(Number(pagination.currentPage) - 1), {
                    resetPage: false,
                  })
                }
              >
                Previous
              </Button>
              <span className="text-sm font-semibold text-ink-soft">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              <Button
                variant="secondary"
                className="!min-h-11 !px-4 !text-sm"
                disabled={
                  !(
                    pagination.hasNextPage ??
                    Number(pagination.currentPage) < Number(pagination.totalPages)
                  )
                }
                aria-label="Next page"
                onClick={() =>
                  setFilter('page', String(Number(pagination.currentPage) + 1), {
                    resetPage: false,
                  })
                }
              >
                Next
              </Button>
            </div>
          )}
        </section>
      </div>

      {filtersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/45"
            aria-label="Close filters"
            onClick={() => setFiltersOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 flex max-h-[88vh] flex-col rounded-t-3xl bg-[#f7fbfa] shadow-2xl">
            <div className="flex justify-center pt-3">
              <span className="h-1.5 w-12 rounded-full bg-line" />
            </div>
            <div className="flex items-center justify-between px-5 py-3">
              <h2 className="font-display text-xl font-bold">Filters</h2>
              <button
                type="button"
                className="min-h-11 px-2 text-sm font-bold text-sea"
                onClick={() => setFiltersOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-4">
              <FilterFields mobile />
            </div>
            <div className="safe-bottom grid grid-cols-2 gap-3 border-t border-line/70 bg-white/95 px-5 py-3 backdrop-blur">
              <Button variant="secondary" className="min-h-12" onClick={clearFilters}>
                Clear
              </Button>
              <Button className="min-h-12" onClick={() => setFiltersOpen(false)}>
                Show results
                {pagination?.totalProviders != null ? ` (${pagination.totalProviders})` : ''}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
