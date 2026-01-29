import React from 'react';
import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { ThemeProvider } from 'next-themes';
import { ToastProvider } from '@/components/ui/toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'SoulSeer - A Community of Gifted Psychics',
  description: 'Connect with authentic spiritual advisors for guidance on love, career, and life\'s journey. Available 24/7 for instant readings through chat, voice, or video.',
  keywords: [
    'psychic reading',
    'tarot cards',
    'astrology',
    'spiritual guidance',
    'online psychics',
    'love readings',
    'career guidance',
    'spiritual advisor'
  ],
  authors: [{ name: 'SoulSeer' }],
  creator: 'SoulSeer',
  publisher: 'SoulSeer',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'SoulSeer - A Community of Gifted Psychics',
    description: 'Connect with authentic spiritual advisors for guidance on love, career, and life\'s journey.',
    url: '/',
    siteName: 'SoulSeer',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SoulSeer - Spiritual Guidance Platform',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SoulSeer - A Community of Gifted Psychics',
    description: 'Connect with authentic spiritual advisors for guidance on love, career, and life\'s journey.',
    images: ['/og-image.png'],
    creator: '@soulseerapp',
  },
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: undefined,
        variables: {
          colorPrimary: '#ec4899', // mystical-pink-500
          colorBackground: '#1e293b', // slate-800
          colorInputBackground: '#334155', // slate-700
          colorText: '#ffffff',
          colorTextSecondary: '#cbd5e1', // slate-300
        },
        elements: {
          formButtonPrimary: 
            'bg-mystical-pink-500 hover:bg-mystical-pink-600 text-white mystical-glow',
          card: 
            'bg-slate-800 border-slate-700 text-white mystical-glow',
          headerTitle: 
            'text-mystical-pink-400 font-alex-brush text-2xl',
          socialButtonsIconButton: 
            'bg-slate-700 border-slate-600 hover:bg-slate-600',
          formFieldInput: 
            'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-mystical-pink-500',
          footerActionLink: 
            'text-mystical-pink-400 hover:text-mystical-pink-300',
        },
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <head>
          {/* Preload critical fonts */}
          <link
            rel="preload"
            href="https://fonts.googleapis.com/css2?family=Alex+Brush&display=swap"
            as="style"
          />
          <link
            rel="preload"
            href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600;1,700;1,800;1,900&display=swap"
            as="style"
          />
          <link
            rel="preload"
            href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap"
            as="style"
          />
          
          {/* Favicon */}
          <link rel="icon" href="/favicon.ico" />
          <link rel="icon" href="/icon.svg" type="image/svg+xml" />
          <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
          
          {/* Theme color */}
          <meta name="theme-color" content="#1e293b" />
          
          {/* PWA manifest */}
          <link rel="manifest" href="/manifest.json" />
          
          {/* Viewport optimizations */}
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        </head>
        <body className="min-h-screen bg-slate-900 text-white antialiased">
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
          >
            <ToastProvider>
              <div className="relative flex min-h-screen flex-col">
                {children}
              </div>
            </ToastProvider>
          </ThemeProvider>
          
          {/* Analytics and other scripts would go here */}
          {process.env.NODE_ENV === 'production' && (
            <>
              {/* Google Analytics */}
              <script
                async
                src={`https://www.googletagmanager.com/gtag/js?id=${process.env.GOOGLE_ANALYTICS_ID}`}
              />
              <script
                dangerouslySetInnerHTML={{
                  __html: `
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', '${process.env.GOOGLE_ANALYTICS_ID}', {
                      page_title: document.title,
                      page_location: window.location.href,
                    });
                  `,
                }}
              />
              
              {/* Hotjar or other analytics */}
              {process.env.HOTJAR_ID && (
                <script
                  dangerouslySetInnerHTML={{
                    __html: `
                      (function(h,o,t,j,a,r){
                        h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
                        h._hjSettings={hjid:${process.env.HOTJAR_ID},hjsv:6};
                        a=o.getElementsByTagName('head')[0];
                        r=o.createElement('script');r.async=1;
                        r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
                        a.appendChild(r);
                      })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
                    `,
                  }}
                />
              )}
            </>
          )}
        </body>
      </html>
    </ClerkProvider>
  );
}
