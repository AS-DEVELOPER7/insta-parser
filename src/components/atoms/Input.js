export default function Input({ label, error, className, ...props }) {
  return (
    <div className="w-full space-y-1">
      {label && <label className="text-xs font-semibold text-gray-400">{label}</label>}
      <input
        className={`w-full bg-ig-surface border border-ig-border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-400 transition-colors ${
          error ? 'border-red-500' : ''
        } ${className || ''}`}
        {...props}
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
