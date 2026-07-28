import Skeleton from '@/components/atoms/Skeleton';

export default function FeedSkeleton() {
  return (
    <div className="bg-black border border-ig-border rounded-xl mb-6 overflow-hidden max-w-lg mx-auto p-4 space-y-4">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>

      {/* Media viewport skeleton */}
      <Skeleton className="w-full aspect-square rounded-lg" />

      {/* Action & text skeleton */}
      <div className="space-y-2">
        <div className="flex gap-3">
          <Skeleton className="w-6 h-6 rounded-full" />
          <Skeleton className="w-6 h-6 rounded-full" />
          <Skeleton className="w-6 h-6 rounded-full" />
        </div>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  );
}
