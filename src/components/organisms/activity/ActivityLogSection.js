'use client';

import { useState } from 'react';
import { History, Search, Link as LinkIcon } from 'lucide-react';
import ActivityItemCard from '@/components/molecules/activity/ActivityItemCard';

export default function ActivityLogSection({ recentSearches = [], linkHistory = [] }) {
  const [activeTab, setActiveTab] = useState('searches');

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
          <History size={26} className="text-ig-primary" />
          <span>Logged Activity</span>
        </h1>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          Browse recent search terms and visited links parsed from logged_information.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-gray-200 dark:border-[#1f1f1f] pb-3 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('searches')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all flex-shrink-0 ${
            activeTab === 'searches'
              ? 'bg-ig-primary text-white shadow-md'
              : 'bg-gray-100 dark:bg-[#141414] border border-gray-200 dark:border-[#242424] text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Search size={15} />
          <span>Recent Searches ({recentSearches.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('links')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all flex-shrink-0 ${
            activeTab === 'links'
              ? 'bg-ig-primary text-white shadow-md'
              : 'bg-gray-100 dark:bg-[#141414] border border-gray-200 dark:border-[#242424] text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <LinkIcon size={15} />
          <span>Link History ({linkHistory.length})</span>
        </button>
      </div>

      {/* Content */}
      {activeTab === 'searches' ? (
        recentSearches.length > 0 ? (
          <div className="space-y-2">
            {recentSearches.map((item, idx) => (
              <ActivityItemCard key={idx} item={item} type="search" />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#1f1f1f] rounded-2xl p-8 shadow-sm">
            <Search size={32} className="mx-auto text-gray-400 dark:text-gray-600 mb-3" />
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-300">No search logs found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
              Upload an Instagram archive ZIP with logged search activity to view items here.
            </p>
          </div>
        )
      ) : linkHistory.length > 0 ? (
        <div className="space-y-2">
          {linkHistory.map((item, idx) => (
            <ActivityItemCard key={idx} item={item} type="link" />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#1f1f1f] rounded-2xl p-8 shadow-sm">
          <LinkIcon size={32} className="mx-auto text-gray-400 dark:text-gray-600 mb-3" />
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-300">No link history logs found</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
            Links visited in Instagram&apos;s in-app browser will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
