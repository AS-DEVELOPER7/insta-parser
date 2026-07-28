'use client';

import { ExternalLink } from 'lucide-react';

export default function ConnectionCard({ connection, fallbackType = 'follower' }) {
  const username = connection.target_username || 'user';
  const initial = username.charAt(0).toUpperCase();

  return (
    <div className="flex items-center justify-between p-3.5 bg-[#121212] border border-[#1f1f1f] rounded-2xl hover:border-[#333] transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full bg-ig-primary flex items-center justify-center font-bold text-white text-sm uppercase flex-shrink-0 shadow-sm">
          {initial}
        </div>
        <div className="min-w-0">
          <h4 className="font-semibold text-sm text-white truncate leading-tight">
            @{username}
          </h4>
          <span className="text-[11px] text-gray-500 capitalize">
            {connection.connection_type || fallbackType}
          </span>
        </div>
      </div>

      <a
        href={`https://instagram.com/${username}`}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#1f1f1f] transition-colors flex-shrink-0"
        title="View on Instagram"
      >
        <ExternalLink size={16} />
      </a>
    </div>
  );
}
