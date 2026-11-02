'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function Input({ label, error, className, type, ...props }) {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordType = type === 'password';
  const inputType = isPasswordType ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="w-full space-y-1.5">
      {label && <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">{label}</label>}
      <div className="relative w-full">
        <input
          type={inputType}
          className={`w-full bg-gray-50 dark:bg-ig-surface border border-gray-300 dark:border-ig-border rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-ig-primary dark:focus:border-gray-400 transition-colors ${
            isPasswordType ? 'pr-11' : ''
          } ${error ? 'border-red-500 focus:border-red-500' : ''} ${className || ''}`}
          {...props}
        />
        {isPasswordType && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors p-1.5 focus:outline-none"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && <span className="text-xs text-red-500 dark:text-red-400">{error}</span>}
    </div>
  );
}

