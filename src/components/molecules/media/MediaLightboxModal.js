'use client';

import { X, ExternalLink, Volume2 } from 'lucide-react';

export default function MediaLightboxModal({ lightbox, onClose }) {
  if (!lightbox) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-50"
      >
        <X size={20} />
      </button>

      <div onClick={(e) => e.stopPropagation()} className="max-w-3xl max-h-[85vh] w-full flex items-center justify-center">
        {lightbox.isAudio ? (
          <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] p-8 rounded-2xl max-w-md w-full text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-ig-primary/20 text-ig-primary flex items-center justify-center mx-auto shadow-lg">
              <Volume2 size={32} />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white text-base">Voice Note / Audio Message</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Sent by {lightbox.sender || 'User'}</p>
            </div>
            <audio src={lightbox.url} controls autoPlay className="w-full rounded-xl" />
          </div>
        ) : lightbox.isExternalLink ? (
          <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] p-6 rounded-2xl max-w-md w-full text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-ig-primary/20 text-ig-primary flex items-center justify-center mx-auto">
              <ExternalLink size={24} />
            </div>
            <h4 className="font-bold text-gray-900 dark:text-white text-base">Shared Link / Post</h4>
            {lightbox.shareText && (
              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed max-h-32 overflow-y-auto">{lightbox.shareText}</p>
            )}
            <a
              href={lightbox.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ig-primary text-white text-sm font-semibold hover:bg-ig-primary/90 transition-colors"
            >
              <span>Open Instagram Link</span>
              <ExternalLink size={14} />
            </a>
          </div>
        ) : lightbox.isVid ? (
          <video src={lightbox.url} controls autoPlay className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl" />
        ) : (
          <img src={lightbox.url} alt="Preview" className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl" />
        )}
      </div>
    </div>
  );
}
