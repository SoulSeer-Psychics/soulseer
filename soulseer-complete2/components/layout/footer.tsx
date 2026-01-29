import React from 'react';
import Link from 'next/link';
import { 
  Facebook, 
  Twitter, 
  Instagram, 
  Youtube,
  Mail,
  Phone,
  MapPin,
  Star,
  Moon,
  Sun
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function Footer() {
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { name: 'Find Readers', href: '/readers' },
    { name: 'How It Works', href: '/how-it-works' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Gift Readings', href: '/gift' },
  ];

  const supportLinks = [
    { name: 'Help Center', href: '/help' },
    { name: 'Contact Us', href: '/contact' },
    { name: 'Safety Guidelines', href: '/safety' },
    { name: 'Report Issues', href: '/report' },
  ];

  const legalLinks = [
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms of Service', href: '/terms' },
    { name: 'Cookie Policy', href: '/cookies' },
    { name: 'Refund Policy', href: '/refunds' },
  ];

  const specialties = [
    'Tarot Reading',
    'Astrology',
    'Psychic Reading',
    'Love & Relationships',
    'Career Guidance',
    'Spiritual Healing',
  ];

  return (
    <footer className="bg-cosmic-950 border-t border-mystical-pink-500/20">
      {/* Decorative stars */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <Star className="absolute top-4 left-10 w-2 h-2 text-mystical-gold-400 animate-pulse" />
        <Moon className="absolute top-8 right-20 w-3 h-3 text-mystical-pink-400 animate-pulse" />
        <Star className="absolute bottom-10 left-1/4 w-2 h-2 text-mystical-gold-400 animate-pulse" />
        <Sun className="absolute bottom-6 right-1/3 w-3 h-3 text-mystical-pink-400 animate-pulse" />
      </div>

      <div className="relative container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand & Description */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-block mb-4">
              <h3 className="text-3xl font-alex-brush text-mystical-pink-500 mystical-glow">
                SoulSeer
              </h3>
            </Link>
            <p className="text-slate-300 mb-4 text-sm leading-relaxed">
              A Community of Gifted Psychics. Connect with authentic spiritual advisors 
              for guidance on love, career, and life's journey. Available 24/7 for instant 
              readings through chat, voice, or video.
            </p>
            
            {/* Newsletter Signup */}
            <div className="space-y-3">
              <h4 className="text-mystical-pink-400 font-semibold text-sm">
                Stay Connected
              </h4>
              <div className="flex space-x-2">
                <Input 
                  variant="mystical"
                  placeholder="Your email" 
                  className="text-xs"
                />
                <Button variant="secondary" size="sm">
                  Subscribe
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-mystical-pink-400 font-semibold mb-4 text-lg font-alex-brush">
              Quick Links
            </h4>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-slate-300 hover:text-mystical-pink-400 transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>

            <h4 className="text-mystical-gold-400 font-semibold mt-6 mb-3 text-sm">
              Popular Specialties
            </h4>
            <ul className="space-y-1">
              {specialties.slice(0, 4).map((specialty) => (
                <li key={specialty}>
                  <Link
                    href={`/readings?specialty=${encodeURIComponent(specialty.toLowerCase())}`}
                    className="text-slate-400 hover:text-mystical-gold-400 transition-colors text-xs"
                  >
                    {specialty}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-mystical-pink-400 font-semibold mb-4 text-lg font-alex-brush">
              Support
            </h4>
            <ul className="space-y-2">
              {supportLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-slate-300 hover:text-mystical-pink-400 transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-6 space-y-2">
              <h4 className="text-mystical-gold-400 font-semibold text-sm">
                Contact Info
              </h4>
              <div className="space-y-1 text-xs text-slate-400">
                <div className="flex items-center space-x-2">
                  <Mail className="w-3 h-3" />
                  <span>support@soulseer.app</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="w-3 h-3" />
                  <span>1-800-SOUL-SEE</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-3 h-3" />
                  <span>Available Worldwide</span>
                </div>
              </div>
            </div>
          </div>

          {/* Legal & Social */}
          <div>
            <h4 className="text-mystical-pink-400 font-semibold mb-4 text-lg font-alex-brush">
              Legal
            </h4>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-slate-300 hover:text-mystical-pink-400 transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Social Media */}
            <div className="mt-6">
              <h4 className="text-mystical-gold-400 font-semibold mb-3 text-sm">
                Follow Us
              </h4>
              <div className="flex space-x-3">
                <Link
                  href="#"
                  className="text-slate-400 hover:text-mystical-pink-400 transition-colors"
                >
                  <Facebook className="w-5 h-5" />
                  <span className="sr-only">Facebook</span>
                </Link>
                <Link
                  href="#"
                  className="text-slate-400 hover:text-mystical-pink-400 transition-colors"
                >
                  <Twitter className="w-5 h-5" />
                  <span className="sr-only">Twitter</span>
                </Link>
                <Link
                  href="#"
                  className="text-slate-400 hover:text-mystical-pink-400 transition-colors"
                >
                  <Instagram className="w-5 h-5" />
                  <span className="sr-only">Instagram</span>
                </Link>
                <Link
                  href="#"
                  className="text-slate-400 hover:text-mystical-pink-400 transition-colors"
                >
                  <Youtube className="w-5 h-5" />
                  <span className="sr-only">Youtube</span>
                </Link>
              </div>
            </div>

            {/* App Store Badges */}
            <div className="mt-6 space-y-2">
              <h4 className="text-mystical-gold-400 font-semibold text-sm">
                Download App
              </h4>
              <div className="space-y-2">
                <Link href="#" className="block">
                  <div className="bg-black text-white px-3 py-1 rounded-md text-xs border border-slate-600 hover:border-mystical-pink-500/50 transition-colors">
                    <div className="text-[10px] text-slate-300">Download on the</div>
                    <div className="font-semibold">App Store</div>
                  </div>
                </Link>
                <Link href="#" className="block">
                  <div className="bg-black text-white px-3 py-1 rounded-md text-xs border border-slate-600 hover:border-mystical-pink-500/50 transition-colors">
                    <div className="text-[10px] text-slate-300">Get it on</div>
                    <div className="font-semibold">Google Play</div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-700/50 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6 text-sm text-slate-400">
            <p>© {currentYear} SoulSeer. All rights reserved.</p>
            <div className="flex items-center space-x-4 text-xs">
              <span>🔮 For entertainment purposes only</span>
              <span>•</span>
              <span>18+ only</span>
              <span>•</span>
              <span>Certified readers</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <span>Powered by mystical energy</span>
            <div className="flex space-x-1">
              <Star className="w-3 h-3 text-mystical-gold-400 animate-pulse" />
              <Moon className="w-3 h-3 text-mystical-pink-400 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
