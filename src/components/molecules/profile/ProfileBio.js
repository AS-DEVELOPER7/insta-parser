import Link from 'next/link';
import { UploadCloud } from 'lucide-react';

export default function ProfileBio({ username, fullName, bio }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row items-center gap-4">
        <h1 className="text-xl font-bold text-white">{username}</h1>
        <Link
          href="/upload"
          className="px-4 py-1.5 bg-ig-surface hover:bg-ig-border text-white font-semibold rounded-lg text-sm border border-ig-border transition-colors flex items-center gap-2"
        >
          <UploadCloud size={16} />
          <span>Upload New Archive</span>
        </Link>
      </div>

      <div>
        <div className="font-semibold text-sm text-white">{fullName || username}</div>
        <p className="text-sm text-gray-300 whitespace-pre-line mt-1">
          {bio || 'Personal Instagram Export Archive Vault.'}
        </p>
      </div>
    </div>
  );
}
