import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs';
import { 
  Menu, 
  X, 
  Home, 
  Users, 
  Radio, 
  ShoppingBag, 
  MessageSquare, 
  LayoutDashboard,
  Heart,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCurrentUser } from '@/lib/hooks';
import { cn } from '@/lib/utils';

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const router = useRouter();
  const { user: clerkUser, isSignedIn } = useUser();
  const { user: dbUser, isLoading } = useCurrentUser();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navigationItems = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Readings', href: '/readings', icon: Users },
    { name: 'Live', href: '/live', icon: Radio },
    { name: 'Shop', href: '/shop', icon: ShoppingBag },
    { name: 'Community', href: '/community', icon: MessageSquare },
  ];

  const userNavigationItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Favorites', href: '/favorites', icon: Heart },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className={cn(
      'sticky top-0 z-50 w-full border-b border-slate-700 bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-slate-900/60',
      className
    )}>
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link 
          href="/" 
          className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
          onClick={closeMobileMenu}
        >
          <div className="relative">
            <div className="text-3xl font-alex-brush text-mystical-pink-500 mystical-glow">
              SoulSeer
            </div>
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-mystical-gold-500 rounded-full animate-pulse"></div>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          {navigationItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center space-x-2 text-slate-300 hover:text-mystical-pink-400 transition-colors font-medium"
            >
              <item.icon className="w-4 h-4" />
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>

        {/* User Section */}
        <div className="flex items-center space-x-4">
          {/* User Balance (for signed in users) */}
          {isSignedIn && dbUser && (
            <div className="hidden sm:flex items-center space-x-2 text-sm">
              <span className="text-slate-400">Balance:</span>
              <span className="text-mystical-gold-400 font-medium">
                ${dbUser.clientBalance?.balance || '0.00'}
              </span>
            </div>
          )}

          {/* Authentication */}
          {!isSignedIn ? (
            <div className="flex items-center space-x-2">
              <SignInButton mode="modal">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button variant="default" size="sm">
                  Sign Up
                </Button>
              </SignUpButton>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              {/* Reader Status Badge */}
              {dbUser?.role === 'reader' && dbUser.readerProfile && (
                <div className="hidden sm:flex items-center space-x-2">
                  <Badge 
                    variant={dbUser.readerProfile.isOnline ? 'online' : 'offline'}
                  >
                    {dbUser.readerProfile.isOnline ? 'Online' : 'Offline'}
                  </Badge>
                  {dbUser.readerProfile.isOnline && (
                    <Badge 
                      variant={dbUser.readerProfile.isAvailable ? 'mystical' : 'busy'}
                    >
                      {dbUser.readerProfile.isAvailable ? 'Available' : 'Busy'}
                    </Badge>
                  )}
                </div>
              )}

              {/* User Menu */}
              <div className="relative">
                <UserButton 
                  appearance={{
                    elements: {
                      avatarBox: 'w-8 h-8 border-2 border-mystical-pink-500/30 hover:border-mystical-pink-500/60 transition-colors',
                    },
                  }}
                  afterSignOutUrl="/"
                />
              </div>
            </div>
          )}

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            <span className="sr-only">Toggle menu</span>
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-700 bg-slate-900/95 backdrop-blur">
          <div className="container py-4 space-y-3">
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center space-x-3 text-slate-300 hover:text-mystical-pink-400 transition-colors py-2"
                onClick={closeMobileMenu}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            ))}
            
            {isSignedIn && (
              <>
                <div className="border-t border-slate-700 pt-3 mt-3">
                  {userNavigationItems.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="flex items-center space-x-3 text-slate-300 hover:text-mystical-pink-400 transition-colors py-2"
                      onClick={closeMobileMenu}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  ))}
                </div>
                
                {/* Mobile User Balance */}
                {dbUser && (
                  <div className="flex items-center justify-between py-2 border-t border-slate-700 mt-3 pt-3">
                    <span className="text-slate-400 text-sm">Account Balance:</span>
                    <span className="text-mystical-gold-400 font-medium">
                      ${dbUser.clientBalance?.balance || '0.00'}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
