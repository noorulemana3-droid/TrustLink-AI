import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import AuthLayout from '../components/AuthLayout';
import Input from '../components/Input';
import Button from '../components/Button';
import { getDashboardPath, isValidEmail } from '../utils/auth';

export default function Login() {
  const { login, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate(getDashboardPath(user.role), { replace: true });
  }, [user, navigate]);

  const validate = () => {
    const next = {};
    if (!form.email.trim()) next.email = 'Email is required';
    else if (!isValidEmail(form.email)) next.email = 'Enter a valid email';
    if (!form.password) next.password = 'Password is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setBusy(true);
    try {
      const logged = await login(form.email.trim(), form.password);
      toast('Welcome back!');
      navigate(getDashboardPath(logged.role));
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed';
      setErrors({ form: message });
      toast(message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to TrustLink AI"
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-bold text-sea">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {errors.form && (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{errors.form}</p>
        )}
        <Input
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          value={form.email}
          error={errors.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Input
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          value={form.password}
          error={errors.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <div className="text-right">
          <Link to="/forgot-password" className="text-sm font-semibold text-sea">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" loading={busy} className="w-full">
          Login
        </Button>
      </form>
    </AuthLayout>
  );
}
