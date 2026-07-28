'use client';

import { ExternalLink } from 'lucide-react';

function formatDate(ts) {
  if (!ts) return 'N/A';
  const timeMs = ts < 10000000000 ? ts * 1000 : ts;
  return new Date(timeMs).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function UninterestedProfileCard({ profile }) {
  return (
    <div className="bg-[#121212] border border-[#1f1f1f] p-4 rounded-2xl flex items-center justify-between gap-3 hover:border-[#2a2a2a] transition-all">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center font-bold text-xs flex-shrink-0">
          {profile.username ? profile.username.charAt(0).toUpperCase() : 'U'}
        </div>
        <div className="min-w-0">
          <h4 className="text-xs font-bold text-white truncate">@{profile.username || 'user'}</h4>
          {profile.name && <p className="text-[11px] text-gray-400 truncate">{profile.name}</p>}
          <span className="text-[10px] text-gray-500">{formatDate(profile.timestamp)}</span>
        </div>
      </div>

      {profile.url && (
        <a
          href={profile.url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 bg-[#181818] hover:bg-[#222] text-gray-300 hover:text-white rounded-xl transition-colors flex-shrink-0"
          title="View profile"
        >
          <ExternalLink size={14} />
        </a>
      )}
    </div>
  );
}
