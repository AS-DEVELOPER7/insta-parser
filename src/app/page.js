'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/direct');
  }, [router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center text-gray-400 text-sm">
      <span>Redirecting to Messages...</span>
    </div>
  );
}
