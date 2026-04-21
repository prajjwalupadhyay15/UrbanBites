import React from 'react';
import { cn } from './Button';

export function Card({ className, children, hover = false, ...props }) {
  return (
    <div 
      className={cn(
        "bg-white rounded-2xl shadow-[var(--box-shadow-card)] border border-gray-100 overflow-hidden",
        hover && "transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn("px-6 py-5 border-b border-gray-50", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }) {
  return (
    <h3 className={cn("text-xl font-bold text-gray-900 tracking-tight", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardContent({ className, children, ...props }) {
  return (
    <div className={cn("p-6", className)} {...props}>
      {children}
    </div>
  );
}
