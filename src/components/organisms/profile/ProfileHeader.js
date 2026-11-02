"use client";

import Link from "next/link";
import { User, Lock, UploadCloud, Sliders, LogOut, Globe, Settings, History, Star } from "lucide-react";

export default function ProfileHeader({ profile, stats, onLogout }) {
  const username = profile?.username || "";
  const fullName = profile?.full_name;
  const bio = profile?.bio;
  const website = profile?.website;
  const isPrivate = profile?.is_private ?? true;
  const avatarUrl = profile?.avatar_url;

  return (
    <div className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#1f1f1f] rounded-3xl p-6 sm:p-8 mb-8 shadow-sm transition-colors duration-200">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
        {/* Avatar with IG Gradient Border */}
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] p-1 flex-shrink-0 shadow-xl relative">
          <div className="w-full h-full rounded-full bg-white dark:bg-black overflow-hidden flex items-center justify-center font-bold text-gray-900 dark:text-white text-3xl uppercase">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={username}
                className="w-full h-full object-cover"
              />
            ) : (
              <User size={44} className="text-gray-400" />
            )}
          </div>
        </div>

        {/* Main Bio & Info Details */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mb-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              @{username}
            </h1>
            {isPrivate && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 bg-ig-primary/20 text-ig-primary rounded-full border border-ig-primary/30">
                <Lock size={12} />
                Private Account
              </span>
            )}
          </div>

          {/* Quick Action Navigation (Saved, Settings, Activity, Preferences, Logout) */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-4">
            <Link
              href="/saved"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-xl text-xs font-semibold transition-colors"
            >
              <Star size={14} className="fill-amber-400" />
              <span>Saved Messages</span>
            </Link>
            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gray-100 dark:bg-[#1a1a1a] hover:bg-gray-200 dark:hover:bg-[#252525] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-[#2e2e2e] rounded-xl text-xs font-semibold transition-colors"
            >
              <Settings size={14} />
              <span>Settings</span>
            </Link>
            <Link
              href="/activity-log"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gray-100 dark:bg-[#1a1a1a] hover:bg-gray-200 dark:hover:bg-[#252525] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-[#2e2e2e] rounded-xl text-xs font-semibold transition-colors"
            >
              <History size={14} />
              <span>Activity</span>
            </Link>
            <Link
              href="/preferences"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gray-100 dark:bg-[#1a1a1a] hover:bg-gray-200 dark:hover:bg-[#252525] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-[#2e2e2e] rounded-xl text-xs font-semibold transition-colors"
            >
              <Sliders size={14} />
              <span>Preferences</span>
            </Link>
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded-xl text-xs font-semibold transition-colors"
            >
              <LogOut size={14} />
              <span>Log Out</span>
            </button>
          </div>

          {fullName && (
            <h2 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-3">
              {fullName}
            </h2>
          )}

          {/* Stats Bar */}
          <div className="flex items-center justify-center sm:justify-start gap-6 py-2 mb-3 border-y border-gray-200 dark:border-[#1a1a1a] text-xs">
            <div>
              <span className="font-bold text-gray-900 dark:text-white text-sm">
                {stats.postsCount}
              </span>{" "}
              <span className="text-gray-500 dark:text-gray-400">posts</span>
            </div>
            <div>
              <span className="font-bold text-gray-900 dark:text-white text-sm">
                {stats.storiesCount}
              </span>{" "}
              <span className="text-gray-500 dark:text-gray-400">stories</span>
            </div>
            <div>
              <span className="font-bold text-gray-900 dark:text-white text-sm">
                {stats.followersCount}
              </span>{" "}
              <span className="text-gray-500 dark:text-gray-400">followers</span>
            </div>
            <div>
              <span className="font-bold text-gray-900 dark:text-white text-sm">
                {stats.followingCount}
              </span>{" "}
              <span className="text-gray-500 dark:text-gray-400">following</span>
            </div>
          </div>

          {bio && (
            <div className="text-xs text-gray-800 dark:text-gray-300 whitespace-pre-line leading-relaxed bg-slate-50 dark:bg-[#181818] p-3.5 rounded-2xl border border-gray-200 dark:border-[#262626] max-w-lg mb-3">
              {bio}
            </div>
          )}

          {website && (
            <a
              href={website.startsWith("http") ? website : `https://${website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-ig-primary hover:underline"
            >
              <Globe size={14} />
              <span>{website}</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
