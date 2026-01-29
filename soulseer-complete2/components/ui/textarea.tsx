import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: 'default' | 'mystical' | 'cosmic';
  error?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant = 'default', error, ...props }, ref) => {
    const baseClasses = 'flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-vertical transition-colors';
    
    const variantClasses = {
      default: 'bg-background border-input focus-visible:ring-ring',
      mystical: 'bg-slate-800 border-slate-600 text-white placeholder-slate-400 focus-visible:ring-mystical-pink-500 focus-visible:border-mystical-pink-500',
      cosmic: 'bg-cosmic-800 border-cosmic-600 text-slate-200 placeholder-cosmic-400 focus-visible:ring-mystical-gold-500 focus-visible:border-mystical-gold-500 glass',
    };

    const errorClasses = error ? 'border-red-500 focus-visible:ring-red-500' : '';

    return (
      <div className="w-full">
        <textarea
          className={cn(
            baseClasses,
            variantClasses[variant],
            errorClasses,
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-500">{error}</p>
        )}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
