import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import AuthLayout from '../components/AuthLayout';
import Input from '../components/Input';
import Button from '../components/Button';
import { getDashboardPath, isValidEmail } from '../utils/auth';

export default function Register() {
  const { register } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'customer',
    city: '',
    phone: '',
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Full name is required';
    if (!form.email.trim()) next.email = 'Email is required';
    else if (!isValidEmail(form.email)) next.email = 'Enter a valid email';
    if (!form.password) next.password = 'Password is required';
    else if (form.password.length < 8) next.password = 'Password must be at least 8 characters';
    if (!form.confirmPassword) next.confirmPassword = 'Confirm your password';
    else if (form.password !== form.confirmPassword) {
      next.confirmPassword = 'Passwords do not match';
    }
    if (!form.phone.trim()) next.phone = 'Phone is required';
    else if (!/^(\+92|0)?3\d{9}$/.test(form.phone.replace(/[\s-]/g, ''))) {
      next.phone = 'Use a valid mobile number (03XXXXXXXXX)';
    }
    if (!['customer', 'provider'].includes(form.role)) next.role = 'Select a role';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setBusy(true);
    try {
      const { confirmPassword, ...payload } = form;
      const user = await register({
        ...payload,
        name: form.name.trim(),
        email: form.email.trim(),
      });
      toast('Account created successfully');
      navigate(
        user.role === 'provider'
          ? '/dashboard/provider/profile'
          : getDashboardPath(user.role)
      );
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed';
      setErrors({ form: message });
      toast(message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Join TrustLink AI"
      subtitle="Create your community account"
      footer={
        <>
          Already registered?{' '}
          <Link to="/login" className="font-bold text-sea">
            Login
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {errors.form && (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{errors.form}</p>
        )}

        <Input
          label="Full name"
          name="name"
          value={form.name}
          error={errors.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Input
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          value={form.email}
          error={errors.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Password"
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
        </div>
        <Input
          label="I am a"
          as="select"
          name="role"
          value={form.role}
          error={errors.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
        >
          <option value="customer">Customer</option>
          <option value="provider">Provider</option>
        </Input>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="City"
            name="city"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
          <Input
            label="Phone"
            name="phone"
            value={form.phone}
            error={errors.phone}
            placeholder="03XXXXXXXXX"
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <Button type="submit" loading={busy} className="w-full">
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
