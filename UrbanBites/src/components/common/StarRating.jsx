import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StarRating({
  value = 0,
  onChange = null,
  readonly = false,
  size = 24,
}) {
  const [hoverValue, setHoverValue] = useState(null);
  const activeValue = hoverValue !== null ? hoverValue : value;

  const handleStarClick = (val) => {
    if (!readonly && onChange) {
      onChange(val);
    }
  };

  const handleMouseEnter = (val) => {
    if (!readonly) {
      setHoverValue(val);
    }
  };

  const handleMouseLeave = () => {
    if (!readonly) {
      setHoverValue(null);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const isActive = star <= activeValue;
        return (
          <motion.button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => handleStarClick(star)}
            onMouseEnter={() => handleMouseEnter(star)}
            onMouseLeave={handleMouseLeave}
            whileHover={readonly ? {} : { scale: 1.2 }}
            whileTap={readonly ? {} : { scale: 0.9 }}
            className={`outline-none transition-colors duration-150 ${
              readonly ? 'cursor-default' : 'cursor-pointer'
            }`}
          >
            <Star
              size={size}
              className={`${
                isActive
                  ? 'fill-[#F7B538] text-[#F7B538]'
                  : 'text-[#EADDCD] fill-transparent'
              }`}
              strokeWidth={isActive ? 0 : 2}
            />
          </motion.button>
        );
      })}
    </div>
  );
}
