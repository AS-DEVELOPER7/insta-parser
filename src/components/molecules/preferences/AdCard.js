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

export default function AdCard({ ad }) {
  return (
    <div className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#1f1f1f] p-4 rounded-2xl hover:border-gray-300 dark:hover:border-[#2a2a2a] transition-all space-y-2.5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-ig-primary/20 text-ig-primary flex items-center justify-center font-bold text-xs flex-shrink-0">
            {ad.ownerUsername ? ad.ownerUsername.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">
              {ad.ownerName || ad.ownerUsername || 'Sponsored Advertiser'}
            </h4>
            {ad.ownerUsername && (
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">@{ad.ownerUsername}</p>
            )}
          </div>
        </div>
        <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-[#181818] px-2.5 py-1 rounded-full border border-gray-200 dark:border-[#262626] flex-shrink-0">
          {formatDate(ad.timestamp)}
        </span>
      </div>

      {ad.caption && (
        <p className="text-xs text-gray-800 dark:text-gray-300 leading-relaxed bg-slate-50 dark:bg-[#181818] p-3 rounded-xl border border-gray-200 dark:border-[#262626] line-clamp-3">
          {ad.caption}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-1">
        {ad.url && (
          <a
            href={ad.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ig-primary hover:underline"
          >
            <span>View Instagram Post</span>
            <ExternalLink size={12} />
          </a>
        )}
        {ad.adLibraryUrl && (
          <a
            href={ad.adLibraryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-500 dark:text-blue-400 hover:underline"
          >
            <span>Meta Ad Library</span>
            <ExternalLink size={12} />
          </a>
        )}
      </div>
    </div>
  );
}
