import { Skeleton } from '@/components/ui/skeleton';

export default function ProductLoading() {
  return (
    <div className="container-main py-6">
      {/* Breadcrumb skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-40" />
      </div>

      <div className="mt-6 grid gap-8 md:grid-cols-2">
        {/* Gallery skeleton */}
        <div className="space-y-3">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-16 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Details skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-3 w-24" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-5 w-28" />
          <div className="space-y-3 pt-4">
            <Skeleton className="h-4 w-16" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-16 rounded-lg" />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 pt-4">
            <Skeleton className="h-10 w-32 rounded-lg" />
            <Skeleton className="h-12 flex-1 rounded-lg" />
          </div>
          <Skeleton className="h-12 w-full rounded-lg" />
          <div className="pt-4">
            <Skeleton className="h-10 w-60 rounded-lg" />
            <Skeleton className="mt-4 h-32 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
