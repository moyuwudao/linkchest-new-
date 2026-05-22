'use client';

import { useState, useCallback } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  value?: number | null;
  onChange?: (value: number | null) => void;
  size?: number;
  readonly?: boolean;
  className?: string;
  showValue?: boolean;
  ariaLabel?: string;
  emptyAriaLabel?: string;
}

export default function StarRating({
  value,
  onChange,
  size = 16,
  readonly = false,
  className = '',
  showValue = false,
  ariaLabel,
  emptyAriaLabel,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const displayValue = hoverValue !== null ? hoverValue : (value ?? 0);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, starIndex: number) => {
      if (readonly || !onChange) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const isHalf = x < rect.width / 2;
      const newValue = isHalf ? starIndex - 0.5 : starIndex;

      if (value === newValue) {
        onChange(null);
      } else {
        onChange(newValue);
      }
    },
    [value, onChange, readonly]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, starIndex: number) => {
      if (readonly) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const isHalf = x < rect.width / 2;
      setHoverValue(isHalf ? starIndex - 0.5 : starIndex);
    },
    [readonly]
  );

  const handleMouseLeave = useCallback(() => {
    setHoverValue(null);
  }, []);

  return (
    <div
      className={`flex items-center gap-0.5 ${className}`}
      onMouseLeave={handleMouseLeave}
      role={readonly ? 'img' : 'group'}
      aria-label={value && value > 0
        ? (ariaLabel ? `${ariaLabel}: ${value} / 5` : `评分 ${value} / 5`)
        : (emptyAriaLabel || '无评分')}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = displayValue >= star;
        const halfFilled = !filled && displayValue >= star - 0.5;

        return (
          <div
            key={star}
            className={`relative inline-flex ${readonly ? 'cursor-default' : 'cursor-pointer'}`}
            style={{ width: size, height: size }}
            onClick={(e) => handleClick(e, star)}
            onMouseMove={(e) => handleMouseMove(e, star)}
          >
            {/* Empty star background */}
            <Star
              size={size}
              className="text-parchment/50 dark:text-charcoal/50 absolute"
              strokeWidth={1.5}
            />
            {/* Filled star - clipped for half stars */}
            {(filled || halfFilled) && (
              <div
                className="absolute overflow-hidden"
                style={{ width: halfFilled ? '50%' : '100%' }}
              >
                <Star
                  size={size}
                  className="text-amber-400 fill-amber-400 dark:text-amber-400 dark:fill-amber-400"
                  strokeWidth={1.5}
                />
              </div>
            )}
          </div>
        );
      })}
      {showValue && value != null && value > 0 && (
        <span className="text-xs text-taupe/60 dark:text-parchment/40 ml-1">
          {value}
        </span>
      )}
    </div>
  );
}
