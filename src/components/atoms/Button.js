import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  ...props
}) {
  const baseStyles = 'font-semibold rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:pointer-events-none';

  const variants = {
    primary: 'bg-ig-primary hover:bg-ig-primary-hover text-white shadow-sm',
    secondary: 'bg-gray-100 hover:bg-gray-200 dark:bg-ig-surface dark:hover:bg-ig-border text-gray-900 dark:text-white border border-gray-200 dark:border-ig-border',
    danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30',
    ghost: 'hover:bg-gray-100 dark:hover:bg-ig-surface text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={twMerge(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
