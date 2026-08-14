export default function Input({
  label,
  id,
  error,
  className = '',
  as = 'input',
  children,
  ...props
}) {
  const fieldId = id || props.name || label?.toLowerCase().replace(/\s+/g, '-');

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
        <input
          id={fieldId}
          className={`input ${error ? 'border-rose-400' : ''}`}
          {...props}
        />
      )}
      {error && <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p>}
    </div>
  );
}
