'use client';

import { Search, Link as LinkIcon, ExternalLink } from 'lucide-react';

export default function ActivityItemCard({ item, type = 'search' }) {
  if (type === 'search') {
    return (
      <div className="flex items-center justify-between p-3.5 bg-[#121212] border border-[#1f1f1f] rounded-2xl hover:border-[#333] transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <Search size={16} className="text-gray-400 flex-shrink-0" />
          <span className="text-sm font-medium text-white truncate">{item.query}</span>
        </div>
        {item.time && <span className="text-xs text-gray-500 flex-shrink-0">{item.time}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3.5 bg-[#121212] border border-[#1f1f1f] rounded-2xl hover:border-[#333] transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <LinkIcon size={16} className="text-ig-primary flex-shrink-0" />
        <span className="text-sm font-medium text-white truncate">{item.url}</span>
      </div>
      <a
        href={item.url}
        target="_blank"
        rel="noreferrer"
        className="text-gray-400 hover:text-white p-2 rounded-xl transition-colors flex-shrink-0"
        title="Open link"
      >
        <ExternalLink size={16} />
      </a>
    </div>
  );
}
