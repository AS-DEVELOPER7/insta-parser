export default function Badge({ children, variant = 'default' }) {
  const variants = {
    default: 'bg-ig-surface text-gray-300 border-ig-border',
    primary: 'bg-ig-primary/10 text-ig-primary border-ig-primary/30',
    success: 'bg-green-500/10 text-green-400 border-green-500/30',
    warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${variants[variant]}`}>
      {children}
    </span>
  );
}
