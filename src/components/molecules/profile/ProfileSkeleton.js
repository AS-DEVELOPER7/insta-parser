import Skeleton from '@/components/atoms/Skeleton';

export default function ProfileSkeleton() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-12 pb-8 border-b border-ig-border">
        <Skeleton className="w-32 h-32 rounded-full shrink-0" />
        <div className="space-y-4 flex-1">
          <Skeleton className="h-6 w-40" />
          <div className="flex gap-8">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-4 w-48" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    </div>
  );
}
