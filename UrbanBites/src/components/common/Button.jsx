import React from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for Tailwind class merging
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  isLoading = false, 
  className,
  disabled,
  ...props 
}) {
  const baseStyles = "inline-flex items-center justify-center font-semibold rounded-2xl transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-[#780116] text-white shadow-premium hover:-translate-y-0.5 hover:bg-[#A00320]",
    secondary: "bg-[#FDF9F1] text-[#780116] hover:bg-[#F7B538] shadow-sm hover:shadow-[#F7B538]/25",
    outline: "border-2 border-[#EADDCD] text-[#780116] hover:border-[#F7B538] hover:text-[#780116] hover:bg-[#FDF9F1]",
    ghost: "text-[#8E7B73] hover:bg-[#FDF9F1] hover:text-[#780116]",
    danger: "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 shadow-sm",
  };

  const sizes = {
    sm: "h-9 px-4 text-sm",
    md: "h-12 px-6 text-base",
    lg: "h-14 px-8 text-lg",
    icon: "h-10 w-10",
  };

  return (
    <button 
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
      {children}
    </button>
  );
}
