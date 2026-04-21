import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from './Button';

export function Spinner({ className, size = 24, text }) {
  return (
    <div className={cn("flex flex-col items-center justify-center space-y-3", className)}>
      <Loader2 size={size} className="animate-spin text-[#F7B538]" />
      {text && <p className="text-sm text-gray-500 font-medium">{text}</p>}
    </div>
  );
}

export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-gray-200/80", className)}
      {...props}
    />
  );
}

// Pre-configured Skeletons for different shapes
export function SkeletonCard({ className }) {
  return (
    <div className={cn("flex flex-col space-y-3", className)}>
      <Skeleton className="h-[200px] w-full rounded-2xl" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-4 w-[200px]" />
      </div>
    </div>
  );
}
