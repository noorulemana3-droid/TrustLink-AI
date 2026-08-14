import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import AuthLayout from '../components/AuthLayout';
import Input from '../components/Input';
import Button from '../components/Button';
import { getDashboardPath } from '../utils/auth';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const { token: pathToken } = useParams();
  const token = useMemo(() => {
    const fromQuery = params.get('token') || '';
    const raw = (fromQuery || pathToken || '').trim();
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }, [params, pathToken]);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { setSession } = useAuth();
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const validate = () => {
    const next = {};
    if (!token) next.form = 'Reset token is missing. Request a new link.';
    else if (!/^[a-f0-9]{64}$/i.test(token)) {
      next.form =
        'This reset link looks incomplete or damaged. Go back and request a new one.';
    }
    if (!form.password) next.password = 'Password is required';
    else if (form.password.length < 8) next.password = 'At least 8 characters';
    if (!form.confirmPassword) next.confirmPassword = 'Confirm your password';
    else if (form.password !== form.confirmPassword) {
      next.confirmPassword = 'Passwords do not match';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setBusy(true);
    try {
      const { data } = await api.post('/auth/reset-password', {
        token,
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      setSession(data.token, data.user);
      toast('Password updated — you are signed in');
      navigate(getDashboardPath(data.user.role), { replace: true });
    } catch (err) {
      const message = err.response?.data?.message || 'Reset failed';
      setErrors({ form: message });
      toast(message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Reset password"
      subtitle="Choose a new password for your TrustLink account"
      footer={
        <>
          <Link to="/forgot-password" className="font-bold text-sea">
            Request a new link
          </Link>
          {' · '}
          <Link to="/login" className="font-bold text-sea">
            Login
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {errors.form && (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errors.form}
          </p>
        )}
        {!token && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
            No token found in the URL. Use{' '}
            <Link to="/forgot-password" className="font-bold text-sea">
              Forgot password
            </Link>{' '}
            to get a fresh link.
          </p>
        )}
        <Input
          label="New password"
          type="password"
          name="password"
          autoComplete="new-password"
          value={form.password}
          error={errors.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <Input
          label="Confirm password"
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          value={form.confirmPassword}
          error={errors.confirmPassword}
          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
        />
        <Button type="submit" loading={busy} className="w-full" disabled={!token}>
          Update password
        </Button>
      </form>
    </AuthLayout>
  );
}
