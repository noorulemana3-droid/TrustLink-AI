import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import Input from '../../components/Input';
import Button from '../../components/Button';

export default function Profile() {
  const { user, refreshUser, setSession } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    city: '',
  });
  const [pw, setPw] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [busy, setBusy] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        phone: user.phone || '',
        city: user.city || '',
      });
    }
  }, [user]);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.put('/auth/profile', form);
      await refreshUser();
      toast('Profile updated');
    } catch (err) {
      toast(err.response?.data?.message || 'Update failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    if (!pw.currentPassword || !pw.newPassword) {
      setPwError('Enter your current and new password');
      return;
    }
    if (pw.newPassword.length < 8) {
      setPwError('New password must be at least 8 characters');
      return;
    }
    if (pw.newPassword !== pw.confirmPassword) {
      setPwError('New passwords do not match');
      return;
    }

    setPwBusy(true);
    try {
      const { data } = await api.put('/auth/change-password', pw);
      if (data.token) setSession(data.token, data.user);
      setPw({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast('Password changed');
    } catch (err) {
      const message = err.response?.data?.message || 'Could not change password';
      setPwError(message);
      toast(message, 'error');
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
      <div className="surface rounded-3xl p-6 shadow-md shadow-ink/5">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-sea">Account</p>
        <h2 className="font-display mt-2 text-2xl font-bold">Your profile</h2>
        <dl className="mt-6 space-y-3 text-sm">
          <div>
            <dt className="text-ink-soft">Name</dt>
            <dd className="mt-1 font-semibold">{user?.name}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Email</dt>
            <dd className="mt-1 font-semibold">{user?.email}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Role</dt>
            <dd className="mt-1 font-semibold capitalize">{user?.role}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Phone</dt>
            <dd className="mt-1 font-semibold">{user?.phone || '—'}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">City</dt>
            <dd className="mt-1 font-semibold">{user?.city || '—'}</dd>
          </div>
        </dl>
      </div>

      <div className="space-y-5">
        <form onSubmit={save} className="surface rounded-3xl p-6 shadow-md shadow-ink/5">
          <h3 className="font-display text-xl font-bold">Edit details</h3>
          <div className="mt-4 space-y-4">
            <Input
              label="Full name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <Input
              label="Phone"
              value={form.phone}
              placeholder="03XXXXXXXXX"
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Input
              label="City"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </div>
          <Button type="submit" loading={busy} className="mt-5">
            Save changes
          </Button>
        </form>

        <form onSubmit={changePassword} className="surface rounded-3xl p-6 shadow-md shadow-ink/5">
          <h3 className="font-display text-xl font-bold">Change password</h3>
          <p className="mt-1 text-sm text-ink-soft">
            Use a strong password you do not reuse elsewhere.
          </p>
          {pwError && (
            <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{pwError}</p>
          )}
          <div className="mt-4 space-y-4">
            <Input
              label="Current password"
              type="password"
              autoComplete="current-password"
              value={pw.currentPassword}
              onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}
            />
            <Input
              label="New password"
              type="password"
              autoComplete="new-password"
              value={pw.newPassword}
              onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
            />
            <Input
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              value={pw.confirmPassword}
              onChange={(e) => setPw({ ...pw, confirmPassword: e.target.value })}
            />
          </div>
          <Button type="submit" loading={pwBusy} className="mt-5">
            Update password
          </Button>
        </form>
      </div>
    </div>
  );
}
