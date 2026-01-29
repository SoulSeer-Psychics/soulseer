import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        mystical: 'border-mystical-pink-500/20 bg-mystical-pink-500/10 text-mystical-pink-400 hover:bg-mystical-pink-500/20',
        cosmic: 'border-mystical-gold-500/20 bg-mystical-gold-500/10 text-mystical-gold-400 hover:bg-mystical-gold-500/20',
        online: 'border-green-500/20 bg-green-500/10 text-green-400 hover:bg-green-500/20',
        offline: 'border-gray-500/20 bg-gray-500/10 text-gray-400 hover:bg-gray-500/20',
        busy: 'border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20',
        away: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20',
        live: 'border-red-600 bg-red-600 text-white animate-pulse',
        featured: 'border-mystical-gold-500 bg-mystical-gold-500/20 text-mystical-gold-300 gold-glow',
        new: 'border-blue-500/20 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20',
        premium: 'border-purple-500/20 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  pulse?: boolean;
}

function Badge({ className, variant, pulse = false, ...props }: BadgeProps) {
  return (
    <div 
      className={cn(
        badgeVariants({ variant }), 
        pulse && 'animate-pulse',
        className
      )} 
      {...props} 
    />
  );
}

export { Badge, badgeVariants };
