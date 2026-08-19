'use client';

import { UploadCloud, FileArchive } from 'lucide-react';

export default function UploadDropzone({ file, onDrop, onClick, fileInputRef, onSelect }) {
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onClick={onClick}
      className="border-2 border-dashed border-gray-300 dark:border-ig-border hover:border-ig-primary rounded-2xl p-6 sm:p-10 md:p-14 cursor-pointer transition-all flex flex-col items-center justify-center bg-slate-50 dark:bg-black/40 hover:bg-gray-100 dark:hover:bg-[#121212] group mb-6 text-center"
    >
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-ig-primary/10 text-ig-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        <UploadCloud size={28} className="sm:w-8 sm:h-8" />
      </div>

      {file ? (
        <div className="flex items-center gap-3 bg-white dark:bg-[#181818] border border-gray-200 dark:border-[#262626] px-4 py-2.5 rounded-xl max-w-full overflow-hidden shadow-sm">
          <FileArchive className="text-ig-primary flex-shrink-0" size={20} />
          <span className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm truncate">{file.name}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
            ({(file.size / (1024 * 1024)).toFixed(1)} MB)
          </span>
        </div>
      ) : (
        <>
          <p className="text-gray-900 dark:text-white font-semibold text-sm sm:text-base mb-1">
            Drag & drop or tap to select your export ZIP
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-xs mb-4 max-w-xs sm:max-w-sm">
            Supports official Instagram export ZIP files in JSON or HTML format.
          </p>
          <span className="bg-ig-primary hover:bg-ig-primary-hover text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-md transition-colors inline-flex items-center gap-2">
            <UploadCloud size={16} />
            <span>Browse Files</span>
          </span>
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".zip"
        onChange={onSelect}
        className="hidden"
      />
    </div>
  );
}
