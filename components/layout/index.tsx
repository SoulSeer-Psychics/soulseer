import React from 'react';
import { Header } from './header';
import { Footer } from './footer';
import { Toaster } from 'sonner';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
  showFooter?: boolean;
  variant?: 'default' | 'cosmic' | 'minimal';
}

export function Layout({ 
  children, 
  className, 
  showFooter = true, 
  variant = 'default' 
}: LayoutProps) {
  const backgroundVariants = {
    default: 'bg-slate-900',
    cosmic: 'cosmic-bg min-h-screen',
    minimal: 'bg-background',
  };

  return (
    <div className={cn(
      'min-h-screen flex flex-col',
      backgroundVariants[variant]
    )}>
      {/* Cosmic Stars Background for cosmic variant */}
      {variant === 'cosmic' && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          {/* Floating stars */}
          <div className="star absolute top-[10%] left-[10%] opacity-30" style={{ animationDelay: '0s' }} />
          <div className="star absolute top-[20%] left-[80%] opacity-50" style={{ animationDelay: '1s' }} />
          <div className="star absolute top-[30%] left-[60%] opacity-40" style={{ animationDelay: '2s' }} />
          <div className="star absolute top-[50%] left-[15%] opacity-60" style={{ animationDelay: '1.5s' }} />
          <div className="star absolute top-[60%] left-[85%] opacity-35" style={{ animationDelay: '0.5s' }} />
          <div className="star absolute top-[80%] left-[40%] opacity-45" style={{ animationDelay: '2.5s' }} />
          <div className="star absolute top-[15%] left-[45%] opacity-55" style={{ animationDelay: '1.2s' }} />
          <div className="star absolute top-[70%] left-[70%] opacity-40" style={{ animationDelay: '0.8s' }} />
          <div className="star absolute top-[40%] left-[25%] opacity-50" style={{ animationDelay: '1.8s' }} />
          <div className="star absolute top-[90%] left-[60%] opacity-45" style={{ animationDelay: '2.2s' }} />
          
          {/* Larger mystical elements */}
          <div className="absolute top-[25%] right-[20%] w-32 h-32 bg-mystical-pink-500/5 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-[30%] left-[10%] w-24 h-24 bg-mystical-gold-500/5 rounded-full blur-2xl animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute top-[60%] right-[40%] w-20 h-20 bg-mystical-pink-500/3 rounded-full blur-xl animate-float" style={{ animationDelay: '2s' }} />
        </div>
      )}

      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className={cn('flex-1 relative z-10', className)}>
        {children}
      </main>

      {/* Footer */}
      {showFooter && <Footer />}

      {/* Toast Notifications */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'rgb(30 41 59)', // slate-800
            border: '1px solid rgb(71 85 105)', // slate-600
            color: 'white',
          },
        }}
      />
    </div>
  );
}

// Specialized layout variants
export function CosmicLayout({ children, className, ...props }: Omit<LayoutProps, 'variant'>) {
  return (
    <Layout variant="cosmic" className={className} {...props}>
      {children}
    </Layout>
  );
}

export function MinimalLayout({ children, className, ...props }: Omit<LayoutProps, 'variant' | 'showFooter'>) {
  return (
    <Layout variant="minimal" showFooter={false} className={className} {...props}>
      {children}
    </Layout>
  );
}

// Dashboard layout for authenticated pages
export function DashboardLayout({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Layout variant="default" className={className}>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {children}
      </div>
    </Layout>
  );
}

// Reading session layout for minimal distractions
export function ReadingLayout({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Layout variant="cosmic" showFooter={false} className={cn('pt-0', className)}>
      {children}
    </Layout>
  );
}
