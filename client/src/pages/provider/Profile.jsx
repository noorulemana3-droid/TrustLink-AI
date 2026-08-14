import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  createProvider,
  deleteMyProvider,
  getMyProvider,
  updateMyProvider,
} from '../../services/providers';
import { listCategories } from '../../services/categories';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { StatusBadge } from '../../components/ui';
import { formatWorkingHours } from '../../utils/time';
import { PAYMENT_METHODS, formatPaymentMethods } from '../../utils/payments';

const empty = {
  businessName: '',
  category: '',
  description: '',
  city: '',
  area: '',
  address: '',
  experienceYears: 0,
  priceMin: 0,
  priceMax: 0,
  services: '',
  contactPhone: '',
  contactEmail: '',
  profileImage: '',
  galleryUrls: '',
  from: '09:00',
  to: '18:00',
  available: true,
  paymentMethods: ['jazzcash', 'easypaisa', 'card', 'cash'],
};

export default function ProviderProfile() {
  const { refreshUser } = useAuth();
  const { toast } = useToast();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(empty);
  const [existing, setExisting] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [cats, me] = await Promise.all([listCategories(), getMyProvider()]);
    setCategories(cats.categories || []);
    const p = me.provider;
    if (p) {
      setExisting(p);
      setForm({
        businessName: p.businessName || '',
        category: p.category?._id || p.category || '',
        description: p.description || '',
        city: p.city || '',
        area: p.area || '',
        address: p.address || '',
        experienceYears: p.experienceYears || 0,
        priceMin: p.priceRange?.min || 0,
        priceMax: p.priceRange?.max || 0,
        services: (p.services || []).join(', '),
        contactPhone: p.contactPhone || '',
        contactEmail: p.contactEmail || '',
        profileImage: p.profileImage || '',
        galleryUrls: (p.images || []).join('\n'),
        from: p.workingHours?.from || '09:00',
        to: p.workingHours?.to || '18:00',
        available: p.available !== false,
        paymentMethods:
          Array.isArray(p.paymentMethods) && p.paymentMethods.length
            ? p.paymentMethods
            : ['jazzcash', 'easypaisa', 'card', 'cash'],
      });
    }
  };

  useEffect(() => {
    load().catch(() => toast('Could not load provider profile', 'error'));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        businessName: form.businessName,
        category: form.category,
        description: form.description,
        city: form.city,
        area: form.area,
        address: form.address,
        experienceYears: Number(form.experienceYears) || 0,
        priceRange: { min: Number(form.priceMin) || 0, max: Number(form.priceMax) || 0 },
        services: form.services.split(',').map((s) => s.trim()).filter(Boolean),
        contactPhone: form.contactPhone,
        contactEmail: form.contactEmail,
        profileImage: form.profileImage,
        galleryImages: form.galleryUrls
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        workingHours: { from: form.from, to: form.to },
        available: form.available,
        paymentMethods: form.paymentMethods,
      };

      const data = existing
        ? await updateMyProvider(payload)
        : await createProvider(payload);

      setExisting(data.provider);
      await refreshUser();
      toast(existing ? 'Profile updated' : 'Profile created — awaiting admin approval');
    } catch (err) {
      toast(err.response?.data?.message || 'Save failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!existing || !confirm('Delete your business profile permanently?')) return;
    setBusy(true);
    try {
      await deleteMyProvider();
      setExisting(null);
      setForm(empty);
      toast('Provider profile deleted', 'info');
    } catch (err) {
      toast(err.response?.data?.message || 'Delete failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {existing && (
        <div className="surface flex flex-wrap items-center justify-between gap-3 rounded-3xl p-5">
          <div>
            <p className="font-display text-xl font-bold">{existing.businessName}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={existing.status} />
              <span className="text-sm text-ink-soft">
                {existing.available ? 'Available' : 'Unavailable'}
                {existing.workingHours?.from
                  ? ` · ${formatWorkingHours(existing.workingHours.from, existing.workingHours.to)}`
                  : ''}
                {formatPaymentMethods(existing.paymentMethods)
                  ? ` · ${formatPaymentMethods(existing.paymentMethods)}`
                  : ''}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {existing.status === 'approved' && (
              <Link to={`/providers/${existing._id}`}>
                <Button variant="secondary">Preview public profile</Button>
              </Link>
            )}
            <Button variant="ghost" onClick={remove} disabled={busy}>
              Delete profile
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={save} className="surface rounded-3xl p-6 shadow-md shadow-ink/5">
        <h2 className="font-display text-2xl font-bold">
          {existing ? 'Edit business profile' : 'Create business profile'}
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          Image URLs for now — Cloudinary can be plugged in later without redesign.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Input
            className="md:col-span-2"
            label="Business name"
            required
            value={form.businessName}
            onChange={(e) => setForm({ ...form, businessName: e.target.value })}
          />
          <Input
            label="Category"
            as="select"
            required
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            <option value="">Select</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </Input>
          <Input
            label="Phone"
            value={form.contactPhone}
            onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            value={form.contactEmail}
            onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
          />
          <Input
            label="City"
            required
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
          <Input
            label="Area"
            value={form.area}
            onChange={(e) => setForm({ ...form, area: e.target.value })}
          />
          <Input
            className="md:col-span-2"
            label="Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <Input
            className="md:col-span-2"
            label="Description"
            as="textarea"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Input
            label="Experience (years)"
            type="number"
            value={form.experienceYears}
            onChange={(e) => setForm({ ...form, experienceYears: e.target.value })}
          />
          <Input
            label="Services (comma separated)"
            value={form.services}
            onChange={(e) => setForm({ ...form, services: e.target.value })}
          />
          <Input
            label="Price min (PKR)"
            type="number"
            value={form.priceMin}
            onChange={(e) => setForm({ ...form, priceMin: e.target.value })}
          />
          <Input
            label="Price max (PKR)"
            type="number"
            value={form.priceMax}
            onChange={(e) => setForm({ ...form, priceMax: e.target.value })}
          />
          <Input
            label="Hours from"
            type="time"
            value={form.from}
            onChange={(e) => setForm({ ...form, from: e.target.value })}
          />
          <Input
            label="Hours to"
            type="time"
            value={form.to}
            onChange={(e) => setForm({ ...form, to: e.target.value })}
          />
          <div className="md:col-span-2 rounded-2xl border border-line/80 bg-mist/40 p-4">
            <p className="font-semibold">Payment methods</p>
            <p className="mt-1 text-sm text-ink-soft">
              Customers can choose one of these when they request a service.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {PAYMENT_METHODS.map((method) => {
                const checked = form.paymentMethods.includes(method.id);
                return (
                  <label
                    key={method.id}
                    className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-sm font-semibold"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[var(--color-sea)]"
                      checked={checked}
                      onChange={() => {
                        const next = checked
                          ? form.paymentMethods.filter((id) => id !== method.id)
                          : [...form.paymentMethods, method.id];
                        setForm({
                          ...form,
                          paymentMethods: next.length ? next : [method.id],
                        });
                      }}
                    />
                    {method.label}
                  </label>
                );
              })}
            </div>
          </div>
          <div className="md:col-span-2 rounded-2xl border border-line/80 bg-mist/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">Availability</p>
                <p className="mt-1 text-sm text-ink-soft">
                  Customers see {form.available ? 'Available' : 'Unavailable'} · Hours{' '}
                  {formatWorkingHours(form.from, form.to)}
                </p>
              </div>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-[var(--color-sea)]"
                  checked={form.available}
                  onChange={(e) => setForm({ ...form, available: e.target.checked })}
                />
                Open for bookings
              </label>
            </div>
          </div>
          <Input
            className="md:col-span-2"
            label="Profile image URL"
            value={form.profileImage}
            onChange={(e) => setForm({ ...form, profileImage: e.target.value })}
            placeholder="https://..."
          />
          <Input
            className="md:col-span-2"
            label="Gallery image URLs (one per line)"
            as="textarea"
            value={form.galleryUrls}
            onChange={(e) => setForm({ ...form, galleryUrls: e.target.value })}
          />
        </div>

        <Button type="submit" loading={busy} className="mt-6">
          {existing ? 'Save changes' : 'Create profile'}
        </Button>
      </form>
    </div>
  );
}
