'use client';

import { useState, useMemo } from 'react';
import { Users, UserCheck, UserX, ShieldAlert, UserPlus, Search } from 'lucide-react';
import Skeleton from '@/components/atoms/Skeleton';
import ConnectionCard from '@/components/molecules/connections/ConnectionCard';

export default function ConnectionsSection({ connections = [], counts = {}, isLoading = false }) {
  const [activeTab, setActiveTab] = useState('followers');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConnections = useMemo(() => {
    let list = connections;
    if (activeTab === 'followers') list = list.filter((c) => c.connection_type === 'follower');
    else if (activeTab === 'following') list = list.filter((c) => c.connection_type === 'following');
    else if (activeTab === 'close_friends') list = list.filter((c) => c.connection_type === 'close_friend');
    else if (activeTab === 'blocked') list = list.filter((c) => c.connection_type === 'blocked');
    else if (activeTab === 'requests') list = list.filter((c) => c.connection_type === 'request');

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => c.target_username?.toLowerCase().includes(q));
    }
    return list;
  }, [connections, activeTab, searchQuery]);

  const tabs = [
    { id: 'followers', label: 'Followers', count: counts.followers || 0, icon: Users },
    { id: 'following', label: 'Following', count: counts.following || 0, icon: UserCheck },
    { id: 'close_friends', label: 'Close Friends', count: counts.closeFriends || 0, icon: UserPlus },
    { id: 'requests', label: 'Requests', count: counts.requests || 0, icon: UserX },
    { id: 'blocked', label: 'Blocked', count: counts.blocked || 0, icon: ShieldAlert },
  ];

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
            <Users size={26} className="text-ig-primary" />
            <span>Connections & Network</span>
          </h1>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Parsed from your official Instagram connections export data.
          </p>
        </div>
      </div>

      {/* Tab Filters */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 mb-6 border-b border-gray-200 dark:border-[#1f1f1f]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all flex-shrink-0 ${
                isActive
                  ? 'bg-ig-primary text-white shadow-md'
                  : 'bg-gray-100 dark:bg-[#141414] border border-gray-200 dark:border-[#242424] text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-[#333]'
              }`}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-[#222] text-gray-700 dark:text-gray-400'}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search connections..."
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#222] rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-ig-primary/60 transition-colors shadow-sm"
        />
      </div>

      {/* Content List */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : filteredConnections.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredConnections.map((conn) => (
            <ConnectionCard key={conn.id || conn.target_username} connection={conn} fallbackType={activeTab} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#1f1f1f] rounded-2xl p-8 shadow-sm">
          <Users size={32} className="mx-auto text-gray-400 dark:text-gray-600 mb-3" />
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-300">No connections found</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
            No entries found under this section. Upload an archive ZIP containing connection data.
          </p>
        </div>
      )}
    </div>
  );
}
