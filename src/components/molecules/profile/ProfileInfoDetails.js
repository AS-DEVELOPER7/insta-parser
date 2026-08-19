'use client';

import { Mail, Phone, Calendar, User } from 'lucide-react';

export default function ProfileInfoDetails({ email, phone, dob, gender }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="p-4 bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#1f1f1f] rounded-2xl flex items-center gap-3.5 shadow-sm transition-colors duration-200">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-500 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
          <Mail size={18} />
        </div>
        <div className="min-w-0">
          <span className="text-[11px] text-gray-500 dark:text-gray-400 uppercase font-semibold">Email Address</span>
          <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{email || 'Not specified'}</p>
        </div>
      </div>

      <div className="p-4 bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#1f1f1f] rounded-2xl flex items-center gap-3.5 shadow-sm transition-colors duration-200">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
          <Phone size={18} />
        </div>
        <div className="min-w-0">
          <span className="text-[11px] text-gray-500 dark:text-gray-400 uppercase font-semibold">Phone Number</span>
          <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{phone || 'Not specified'}</p>
        </div>
      </div>

      <div className="p-4 bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#1f1f1f] rounded-2xl flex items-center gap-3.5 shadow-sm transition-colors duration-200">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-500 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
          <Calendar size={18} />
        </div>
        <div className="min-w-0">
          <span className="text-[11px] text-gray-500 dark:text-gray-400 uppercase font-semibold">Date of Birth</span>
          <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{dob || 'Not specified'}</p>
        </div>
      </div>

      <div className="p-4 bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#1f1f1f] rounded-2xl flex items-center gap-3.5 shadow-sm transition-colors duration-200">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
          <User size={18} />
        </div>
        <div className="min-w-0">
          <span className="text-[11px] text-gray-500 dark:text-gray-400 uppercase font-semibold">Gender</span>
          <p className="text-xs font-semibold text-gray-900 dark:text-white capitalize truncate">{gender || 'Not specified'}</p>
        </div>
      </div>
    </div>
  );
}
