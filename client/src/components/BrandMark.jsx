export default function BrandMark({ className = 'h-8 w-8' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect width="32" height="32" rx="9" fill="#0f7a6b" />
      <path
        d="M10 16.4l4.1 4.1L22.2 12"
        stroke="#f7faf9"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
