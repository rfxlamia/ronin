import { cn } from '@/lib/utils';
import { HTMLAttributes } from 'react';

interface RoninLoaderProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/**
 * RoninLoader - Meditation pulse animation (礼 Rei - Loading as Ritual)
 * 
 * Per Ronin Philosophy: NO SPINNERS. Loading feels intentional, not broken.
 * Uses opacity pulse: 0.7 → 1.0 → 0.7, 2s loop
 * Respects prefers-reduced-motion: opacity pulse only
 */
export const RoninLoader = ({ className, ...props }: RoninLoaderProps) => {
  return (
    <div
      className={cn(
        'ronin-loader rounded-full bg-ronin-primary',
        className
      )}
      role="status"
      aria-label="Analyzing your activity..."
      {...props}
    >
      <span className="sr-only">Analyzing your activity...</span>
    </div>
  );
};