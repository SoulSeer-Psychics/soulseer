import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    variant?: 'default' | 'mystical' | 'cosmic' | 'success' | 'warning' | 'danger';
    showLabel?: boolean;
    animated?: boolean;
  }
>(({ className, value, variant = 'default', showLabel = false, animated = false, ...props }, ref) => {
  const variantClasses = {
    default: 'bg-secondary',
    mystical: 'bg-slate-700',
    cosmic: 'bg-cosmic-700',
    success: 'bg-green-900',
    warning: 'bg-yellow-900',
    danger: 'bg-red-900',
  };

  const indicatorVariants = {
    default: 'bg-primary',
    mystical: 'bg-mystical-pink-500',
    cosmic: 'bg-mystical-gold-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
  };

  return (
    <div className="w-full">
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(
          'relative h-4 w-full overflow-hidden rounded-full',
          variantClasses[variant],
          className
        )}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn(
            'h-full w-full flex-1 transition-all',
            indicatorVariants[variant],
            animated && 'animate-pulse',
            variant === 'mystical' && 'mystical-glow',
            variant === 'cosmic' && 'gold-glow'
          )}
          style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
        />
        {showLabel && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-medium text-white">
              {Math.round(value || 0)}%
            </span>
          </div>
        )}
      </ProgressPrimitive.Root>
      {showLabel && (
        <div className="mt-1 flex justify-between text-sm text-muted-foreground">
          <span>0%</span>
          <span>100%</span>
        </div>
      )}
    </div>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
