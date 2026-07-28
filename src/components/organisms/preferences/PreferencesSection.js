'use client';

import { useState, useMemo, useEffect } from 'react';
import { Sliders, Tv, UserX, ShieldAlert, Search, Loader2 } from 'lucide-react';
import Skeleton from '@/components/atoms/Skeleton';
import AdCard from '@/components/molecules/preferences/AdCard';
import UninterestedProfileCard from '@/components/molecules/preferences/UninterestedProfileCard';

const BATCH_SIZE = 20;

function formatDate(ts) {
  if (!ts) return 'N/A';
  const timeMs = ts < 10000000000 ? ts * 1000 : ts;
  return new Date(timeMs).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function PreferencesSection({
  adsViewed = [],
  profilesNotInterested = [],
  adPreferences = [],
  isLoading = false,
}) {
  const [activeTab, setActiveTab] = useState('ads_viewed');
  const [searchQuery, setSearchQuery] = useState('');

  const [adsLimit, setAdsLimit] = useState(BATCH_SIZE);
  const [notInterestedLimit, setNotInterestedLimit] = useState(BATCH_SIZE);
  const [adPrefsLimit, setAdPrefsLimit] = useState(BATCH_SIZE);

  const filteredAdsViewed = useMemo(() => {
    if (!searchQuery.trim()) return adsViewed;
    const q = searchQuery.toLowerCase();
    return adsViewed.filter(
      (ad) =>
        ad.ownerUsername?.toLowerCase().includes(q) ||
        ad.ownerName?.toLowerCase().includes(q) ||
        ad.caption?.toLowerCase().includes(q)
    );
  }, [adsViewed, searchQuery]);

  // Reset limit on search or tab change
  useEffect(() => {
    setAdsLimit(BATCH_SIZE);
  }, [searchQuery]);

  // Infinite scroll listener
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.offsetHeight - 500) {
        if (activeTab === 'ads_viewed' && adsLimit < filteredAdsViewed.length) {
          setAdsLimit((prev) => Math.min(prev + BATCH_SIZE, filteredAdsViewed.length));
        } else if (activeTab === 'not_interested' && notInterestedLimit < profilesNotInterested.length) {
          setNotInterestedLimit((prev) => Math.min(prev + BATCH_SIZE, profilesNotInterested.length));
        } else if (activeTab === 'ad_prefs' && adPrefsLimit < adPreferences.length) {
          setAdPrefsLimit((prev) => Math.min(prev + BATCH_SIZE, adPreferences.length));
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeTab, adsLimit, notInterestedLimit, adPrefsLimit, filteredAdsViewed.length, profilesNotInterested.length, adPreferences.length]);

  const visibleAds = filteredAdsViewed.slice(0, adsLimit);
  const visibleNotInterested = profilesNotInterested.slice(0, notInterestedLimit);
  const visibleAdPrefs = adPreferences.slice(0, adPrefsLimit);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
          <Sliders size={26} className="text-ig-primary" />
          <span>Account Preferences & Ad Settings</span>
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Viewed ads, uninterested profiles, and privacy preferences parsed from your export archive.
        </p>
      </div>

      {/* Filter Tabs showing TOTAL counts */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none border-b border-[#1f1f1f]">
        <button
          onClick={() => setActiveTab('ads_viewed')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'ads_viewed'
              ? 'bg-ig-primary text-white shadow-lg shadow-ig-primary/20'
              : 'bg-[#121212] text-gray-400 hover:text-white hover:bg-[#181818] border border-[#1f1f1f]'
          }`}
        >
          <Tv size={15} />
          <span>Ads Viewed ({adsViewed.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('not_interested')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'not_interested'
              ? 'bg-ig-primary text-white shadow-lg shadow-ig-primary/20'
              : 'bg-[#121212] text-gray-400 hover:text-white hover:bg-[#181818] border border-[#1f1f1f]'
          }`}
        >
          <UserX size={15} />
          <span>Uninterested Profiles ({profilesNotInterested.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ad_prefs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'ad_prefs'
              ? 'bg-ig-primary text-white shadow-lg shadow-ig-primary/20'
              : 'bg-[#121212] text-gray-400 hover:text-white hover:bg-[#181818] border border-[#1f1f1f]'
          }`}
        >
          <ShieldAlert size={15} />
          <span>Ad Preferences ({adPreferences.length})</span>
        </button>
      </div>

      {/* Content Body */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      ) : (
        <div>
          {/* TAB 1: Ads Viewed */}
          {activeTab === 'ads_viewed' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#121212] border border-[#1f1f1f] p-4 rounded-2xl">
                <div className="relative w-full sm:w-72">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search viewed ads..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#181818] border border-[#262626] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-ig-primary"
                  />
                </div>
                <div className="text-xs text-gray-400 font-semibold">
                  Showing <span className="text-white">{visibleAds.length}</span> of {filteredAdsViewed.length} viewed ads
                </div>
              </div>

              {filteredAdsViewed.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {visibleAds.map((ad, idx) => (
                      <AdCard key={idx} ad={ad} />
                    ))}
                  </div>

                  {adsLimit < filteredAdsViewed.length && (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                      <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                        <Loader2 size={16} className="animate-spin text-ig-primary" />
                        <span>Showing {visibleAds.length} of {filteredAdsViewed.length} viewed ads (scroll to load more)</span>
                      </div>
                      <button
                        onClick={() => setAdsLimit((prev) => Math.min(prev + BATCH_SIZE, filteredAdsViewed.length))}
                        className="px-4 py-2 bg-[#1f1f1f] hover:bg-[#2a2a2a] text-xs font-semibold text-gray-200 rounded-xl border border-[#333] transition-colors"
                      >
                        Load More Ads
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 bg-[#121212] border border-[#1f1f1f] rounded-2xl p-6">
                  <Tv size={32} className="mx-auto text-gray-600 mb-2" />
                  <p className="text-xs text-gray-400">No viewed ads matched your query.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Profiles Not Interested In */}
          {activeTab === 'not_interested' && (
            <div className="space-y-4">
              {profilesNotInterested.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {visibleNotInterested.map((prof, idx) => (
                      <UninterestedProfileCard key={idx} profile={prof} />
                    ))}
                  </div>

                  {notInterestedLimit < profilesNotInterested.length && (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                      <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                        <Loader2 size={16} className="animate-spin text-ig-primary" />
                        <span>Showing {visibleNotInterested.length} of {profilesNotInterested.length} profiles</span>
                      </div>
                      <button
                        onClick={() => setNotInterestedLimit((prev) => Math.min(prev + BATCH_SIZE, profilesNotInterested.length))}
                        className="px-4 py-2 bg-[#1f1f1f] hover:bg-[#2a2a2a] text-xs font-semibold text-gray-200 rounded-xl border border-[#333] transition-colors"
                      >
                        Load More Profiles
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 bg-[#121212] border border-[#1f1f1f] rounded-2xl p-6">
                  <UserX size={32} className="mx-auto text-gray-600 mb-2" />
                  <p className="text-xs text-gray-400">No uninterested profile records found.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Ad Preferences & Hidden Ads */}
          {activeTab === 'ad_prefs' && (
            <div className="space-y-4">
              {adPreferences.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {visibleAdPrefs.map((pref, idx) => (
                      <div
                        key={idx}
                        className="bg-[#121212] border border-[#1f1f1f] p-4 rounded-2xl flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                            <ShieldAlert size={18} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-md">
                                {pref.event}
                              </span>
                              <span className="text-[10px] text-gray-500">{formatDate(pref.timestamp)}</span>
                            </div>
                            <h4 className="text-xs font-semibold text-gray-200 mt-1 truncate max-w-md">
                              {pref.adTitle || 'Ad preference update'}
                            </h4>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {adPrefsLimit < adPreferences.length && (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                      <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                        <Loader2 size={16} className="animate-spin text-ig-primary" />
                        <span>Showing {visibleAdPrefs.length} of {adPreferences.length} ad preferences</span>
                      </div>
                      <button
                        onClick={() => setAdPrefsLimit((prev) => Math.min(prev + BATCH_SIZE, adPreferences.length))}
                        className="px-4 py-2 bg-[#1f1f1f] hover:bg-[#2a2a2a] text-xs font-semibold text-gray-200 rounded-xl border border-[#333] transition-colors"
                      >
                        Load More Preferences
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 bg-[#121212] border border-[#1f1f1f] rounded-2xl p-6">
                  <ShieldAlert size={32} className="mx-auto text-gray-600 mb-2" />
                  <p className="text-xs text-gray-400">No ad preference modifications logged.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
