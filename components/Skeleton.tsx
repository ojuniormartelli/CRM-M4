import React from 'react';

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-muted rounded-md ${className}`} />
);

export const LeadSkeleton = () => (
  <div className="p-6 bg-card rounded-3xl border border-border/50 space-y-4">
    <div className="flex justify-between items-start">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
    <div className="flex justify-between items-center pt-2">
      <Skeleton className="h-8 w-24 rounded-xl" />
      <Skeleton className="h-8 w-8 rounded-full" />
    </div>
  </div>
);
