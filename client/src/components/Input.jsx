import { useState } from 'react';

function EyeIcon({ open }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 3l18 18" strokeLinecap="round" />
        <path d="M10.6 10.6A2 2 0 0 0 12 14a2 2 0 0 0 1.4-.6" strokeLinecap="round" />
        <path d="M9.9 5.1A10.8 10.8 0 0 1 12 4.8c4.5 0 8.3 2.7 10 7.2a11.5 11.5 0 0 1-1.8 3.1" strokeLinecap="round" />
        <path d="M6.1 6.1A11.4 11.4 0 0 0 2 12c1.7 4.5 5.5 7.2 10 7.2 1.5 0 2.9-.3 4.2-.9" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M2 12c1.7-4.5 5.5-7.2 10-7.2S20.3 7.5 22 12c-1.7 4.5-5.5 7.2-10 7.2S3.7 16.5 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function Input({
  label,
  id,
  error,
  className = '',
  as = 'input',
  children,
  type = 'text',
  ...props
}) {
  const fieldId = id || props.name || label?.toLowerCase().replace(/\s+/g, '-');
  const [visible, setVisible] = useState(false);
  const isPassword = as === 'input' && type === 'password';
  const inputType = isPassword && visible ? 'text' : type;

  return (
    <div className={className}>
      {label && (
        <label className="label" htmlFor={fieldId}>
          {label}
        </label>
      )}
      {as === 'select' ? (
        <select
          id={fieldId}
          className={`input ${error ? 'border-rose-400' : ''}`}
          {...props}
        >
          {children}
        </select>
      ) : as === 'textarea' ? (
        <textarea
          id={fieldId}
          className={`input ${error ? 'border-rose-400' : ''}`}
          {...props}
        />
      ) : (
        <div className="relative">
          <input
            id={fieldId}
            type={inputType}
            className={`input ${error ? 'border-rose-400' : ''} ${isPassword ? 'pr-11' : ''}`}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1 text-ink-soft hover:text-sea"
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? 'Hide password' : 'Show password'}
              title={visible ? 'Hide password' : 'Show password'}
            >
              <EyeIcon open={visible} />
            </button>
          )}
        </div>
      )}
      {error && <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p>}
    </div>
  );
}
