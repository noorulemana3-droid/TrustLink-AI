export default function Button({
  children,
  variant = 'primary',
  loading = false,
  className = '',
  type = 'button',
  disabled,
  ...props
}) {
  const variants = {
    primary: 'btn btn-primary',
    secondary: 'btn btn-secondary',
    ghost: 'btn btn-ghost',
  };

  return (
    <button
      type={type}
      className={`${variants[variant] || variants.primary} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? 'Please wait...' : children}
    </button>
  );
}
