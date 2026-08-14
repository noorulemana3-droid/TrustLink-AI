import { Link } from 'react-router-dom';
import ProviderCard from '../components/ProviderCard';
import Button from '../components/Button';
import { EmptyState } from '../components/ui';
import { useEffect, useState } from 'react';
import { listFavorites, removeFavorite } from '../services/favorites';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ProviderCardSkeleton from '../components/ProviderCardSkeleton';

export default function FavoritesPage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listFavorites();
      setFavorites(data.favorites || []);
    } catch {
      setFavorites([]);
      toast('Could not load favorites', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) load();
    else setLoading(false);
  }, [user]);

  const remove = async (providerId) => {
    try {
      await removeFavorite(providerId);
      await refreshUser();
      toast('Removed from favorites');
      await load();
    } catch {
      toast('Could not remove favorite', 'error');
    }
  };

  if (!user) {
    return (
      <div className="page-shell py-16">
        <EmptyState title="Login required" text="Sign in to view your saved providers." />
        <div className="mt-4 flex justify-center">
          <Link to="/login">
            <Button>Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell py-10">
      <div className="mb-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-sea">Saved</p>
        <h1 className="font-display mt-2 text-4xl font-extrabold">Favorite providers</h1>
      </div>

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <ProviderCardSkeleton key={i} />
          ))}
        </div>
      ) : favorites.length === 0 ? (
          <EmptyState
            title="No favorite providers yet."
            text="Save providers you trust to find them quickly later."
          >
            <Link to="/providers">
              <Button>Explore Providers</Button>
            </Link>
          </EmptyState>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((provider) => (
            <div key={provider._id}>
              <ProviderCard provider={provider} onFavoriteChange={load} />
              <button
                type="button"
                className="mt-2 text-sm font-semibold text-rose-600"
                onClick={() => remove(provider._id)}
              >
                Remove Favorite
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
