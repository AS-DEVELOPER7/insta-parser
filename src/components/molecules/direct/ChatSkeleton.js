import Skeleton from '@/components/atoms/Skeleton';

export default function ChatSkeleton() {
  return (
    <div className="w-full h-full flex divide-x divide-ig-border">
      {/* Threads skeleton */}
      <div className="w-80 p-4 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-full shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>

      {/* Timeline skeleton */}
      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-ig-border">
          <Skeleton className="w-10 h-10 rounded-full" />
          <Skeleton className="h-4 w-36" />
        </div>

        <div className="space-y-4">
          <div className="flex flex-col items-start space-y-1">
            <Skeleton className="h-10 w-48 rounded-2xl rounded-bl-none" />
          </div>
          <div className="flex flex-col items-end space-y-1">
            <Skeleton className="h-14 w-64 rounded-2xl rounded-br-none" />
          </div>
          <div className="flex flex-col items-start space-y-1">
            <Skeleton className="h-10 w-52 rounded-2xl rounded-bl-none" />
          </div>
        </div>
      </div>
    </div>
  );
}
