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
    if (email.trim().toLowerCase().endsWith('@trustlink.ai')) {
      setError(
        'Demo accounts like customer@trustlink.ai are not real inboxes. Register with your Gmail (or any real email), then request a reset link.'
      );
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
        data.sent
          ? 'Reset email sent — check inbox and spam'
          : 'No account found for that email. Register first, then try again.',
        data.sent ? 'success' : 'error'
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
      <p className="mb-4 rounded-xl bg-mist px-3 py-2 text-sm text-ink-soft">
        Use the same real email you registered with (Gmail, Outlook, Yahoo). Demo
        logins such as <code className="font-semibold">customer@trustlink.ai</code>{' '}
        cannot receive mail.{' '}
        <Link to="/register" className="font-semibold text-sea">
          Create an account
        </Link>{' '}
        first if you have not already.
      </p>
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
          {result.sent ? (
            <p>
              Check inbox and spam for an email from TrustLink AI. The link expires
              in {result.expiresInMinutes || 60} minutes. If the button does not
              open, copy the full URL from the email into your browser.
            </p>
          ) : (
            <p>
              No reset email was sent because this address is not registered. Use{' '}
              <Link to="/register" className="font-semibold text-sea">
                Create an account
              </Link>{' '}
              with a real inbox, then try Forgot password again.
            </p>
          )}
        </div>
      )}
    </AuthLayout>
  );
}
