import { authMiddleware } from '@clerk/nextjs';

export default authMiddleware({
  // Routes that can be accessed while signed out
  publicRoutes: [
    '/',
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/api/webhooks/(.*)',
    '/api/agora/(.*)',
    '/api/ably/(.*)',
    '/api/stripe/webhook',
    '/live/(.*)', // Allow viewing live streams without auth
    '/readers/(.*)', // Allow browsing readers without auth
    '/shop/(.*)', // Allow browsing shop without auth
  ],

  // Routes that can always be accessed, and have
  // no authentication information
  ignoredRoutes: [
    '/api/webhooks/(.*)',
    '/api/health',
    '/api/stripe/webhook',
    '/_next/(.*)',
    '/favicon.ico',
    '/sitemap.xml',
    '/robots.txt',
  ],

  // Additional configuration
  afterAuth(auth, req, evt) {
    // Handle users who aren't authenticated
    if (!auth.userId && !auth.isPublicRoute) {
      const signInUrl = new URL('/sign-in', req.url);
      signInUrl.searchParams.set('redirect_url', req.url);
      return Response.redirect(signInUrl);
    }

    // Redirect logged in users from sign-in/sign-up pages
    if (auth.userId && (req.nextUrl.pathname === '/sign-in' || req.nextUrl.pathname === '/sign-up')) {
      return Response.redirect(new URL('/dashboard', req.url));
    }

    // Allow users to access the page
    return;
  },
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
