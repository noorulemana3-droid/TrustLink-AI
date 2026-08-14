import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import AuthLayout from '../components/AuthLayout';
import Input from '../components/Input';
import Button from '../components/Button';
import { isValidEmail } from '../utils/auth';

export default function ForgotPassword() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [smtpReady, setSmtpReady] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/health', { timeout: 8000 });
        if (!cancelled) setSmtpReady(Boolean(data?.email?.configured));
      } catch {
        if (!cancelled) setSmtpReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Enter a valid email');
      return;
    }

    setBusy(true);
    setError('');
    setResult(null);
    try {
      const { data } = await api.post('/auth/forgot-password', {
        email: email.trim(),
      });
      setResult(data);
      toast(
        data.message ||
          'If an account exists for that email, we sent a password reset link',
        'success'
      );
    } catch (err) {
      const message = err.response?.data?.message || 'Request failed';
      setError(message);
      toast(message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Forgot password?"
      subtitle="Enter your email and we'll send a reset link"
      footer={
        <>
          Remembered it?{' '}
          <Link to="/login" className="font-bold text-sea">
            Back to sign in
          </Link>
        </>
      }
    >
      {!smtpReady && (
        <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Password reset email is not configured yet. Ask your admin to set the
          mail sender in <code className="font-semibold">server/.env</code> and
          restart the API.
        </p>
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {error && (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        )}
        <Input
          label="Email address"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
        />
        <Button type="submit" loading={busy} className="w-full" disabled={!smtpReady}>
          {busy ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>

      {result && (
        <div className="mt-5 space-y-2 rounded-2xl border border-sea/30 bg-sea/10 p-4 text-sm text-ink-soft">
          <p className="font-semibold text-ink">{result.message}</p>
          <p>
            Check inbox and spam. The link expires in {result.expiresInMinutes || 60}{' '}
            minutes.
          </p>
        </div>
      )}
    </AuthLayout>
  );
}
