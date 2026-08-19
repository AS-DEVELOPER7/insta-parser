'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function Input({ label, error, className, type, ...props }) {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordType = type === 'password';
  const inputType = isPasswordType ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="w-full space-y-1">
      {label && <label className="text-xs font-semibold text-gray-400">{label}</label>}
      <div className="relative w-full">
        <input
          type={inputType}
          className={`w-full bg-ig-surface border border-ig-border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-400 transition-colors ${
            isPasswordType ? 'pr-11' : ''
          } ${error ? 'border-red-500' : ''} ${className || ''}`}
          {...props}
        />
        {isPasswordType && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1 focus:outline-none"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}

