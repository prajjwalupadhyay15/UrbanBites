import React, { forwardRef } from 'react';
import { cn } from './Button';

export const Input = forwardRef(({ 
  className, 
  type = "text", 
  icon: Icon,
  error,
  ...props 
}, ref) => {
  return (
    <div className="w-full relative">
      {Icon && (
        <Icon 
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 peer-focus:text-[#F7B538] transition-colors z-10" 
          size={20} 
        />
      )}
      <input
        type={type}
        className={cn(
          "peer w-full bg-white border border-[#EADDCD] text-[#2A0800] placeholder:text-[#8E7B73] rounded-2xl py-3 outline-none focus:border-[#F7B538] focus:ring-4 focus:ring-[#F7B538]/10 transition-all font-bold",
          Icon ? "pl-12 pr-4" : "px-4",
          error && "border-red-500 focus:border-red-500 focus:ring-red-500/10",
          className
        )}
        ref={ref}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-sm text-red-500 font-medium px-1">{error}</p>
      )}
    </div>
  );
});

Input.displayName = "Input";
