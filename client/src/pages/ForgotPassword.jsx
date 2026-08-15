import { useState } from 'react';
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
  const [copied, setCopied] = useState(false);

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
    setCopied(false);
    try {
      const { data } = await api.post('/auth/forgot-password', {
        email: email.trim(),
      });
      setResult(data);
      toast(
        data.resetUrl
          ? 'Reset link ready — open it below'
          : data.sent
            ? 'Reset email sent — check inbox and spam'
            : 'No account found for that email',
        data.resetUrl || data.sent ? 'success' : 'error'
      );
    } catch (err) {
      const message = err.response?.data?.message || 'Request failed';
      setError(message);
      toast(message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!result?.resetUrl) return;
    try {
      await navigator.clipboard.writeText(result.resetUrl);
      setCopied(true);
      toast('Reset link copied');
    } catch {
      toast('Copy failed — select the link and copy it', 'error');
    }
  };

  return (
    <AuthLayout
      title="Forgot password?"
      subtitle="Enter your account email to get a reset link"
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
        Works with demo logins such as{' '}
        <code className="font-semibold">customer@trustlink.ai</code> and with any
        registered account. The reset page is valid for 60 minutes.
      </p>

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
          placeholder="customer@trustlink.ai"
        />
        <Button type="submit" loading={busy} className="w-full">
          {busy ? 'Sending…' : 'Get reset link'}
        </Button>
      </form>

      {result && (
        <div className="mt-5 space-y-3 rounded-2xl border border-sea/30 bg-sea/10 p-4 text-sm text-ink-soft">
          <p className="font-semibold text-ink">{result.message}</p>
          {result.resetUrl ? (
            <>
              <a
                href={result.resetUrl}
                className="btn btn-primary inline-flex w-full items-center justify-center"
              >
                Open reset page
              </a>
              <button
                type="button"
                onClick={copyLink}
                className="btn btn-secondary w-full"
              >
                {copied ? 'Copied' : 'Copy link'}
              </button>
              <p className="break-all text-xs">{result.resetUrl}</p>
            </>
          ) : result.sent ? (
            <p>
              Check inbox and spam. The link expires in {result.expiresInMinutes || 60}{' '}
              minutes.
            </p>
          ) : (
            <p>
              No matching account. Use{' '}
              <Link to="/register" className="font-semibold text-sea">
                Create an account
              </Link>{' '}
              first, or try a demo email such as customer@trustlink.ai.
            </p>
          )}
        </div>
      )}
    </AuthLayout>
  );
}
