import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { LanguageProvider } from '@/lib/i18n';
import { useEffect } from 'react';
import { applyBrandingColors } from '@/lib/branding';
import { HelmetProvider } from 'react-helmet-async';

import Home from '@/pages/public/Home';
import Page from '@/pages/public/Page';
import Blog from '@/pages/public/Blog';
import BlogPost from '@/pages/public/BlogPost';
import Login from '@/pages/admin/Login';
import Dashboard from '@/pages/admin/Dashboard';
import PagesList from '@/pages/admin/PagesList';
import PageEditor from '@/pages/admin/PageEditor';
import Account from '@/pages/admin/Account';
import Branding from '@/pages/admin/Branding';
import Messages from '@/pages/admin/Messages';
import BlogList from '@/pages/admin/BlogList';
import BlogEditor from '@/pages/admin/BlogEditor';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    }
  }
});

/**
 * Fetches branding settings from the API on first mount.
 * - Applies color CSS vars immediately.
 * - Redirects the bare root path to /en when English is the stored default language.
 */
function BrandingLoader() {
  useEffect(() => {
    const snapshotHref = window.location.pathname;

    fetch('/api/settings/branding')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;

        if (data.primaryColor) applyBrandingColors(data);

        // Default language redirect — only for new visitors landing on the root
        if (data.defaultLanguage === 'en') {
          const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
          const rel = snapshotHref.startsWith(base)
            ? snapshotHref.slice(base.length) || '/'
            : snapshotHref;
          if (rel === '/' || rel === '') {
            window.location.replace(base + '/en');
          }
        }
      })
      .catch(() => { /* silently fall back to CSS defaults */ });
  }, []);

  return null;
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-muted-foreground mb-6">Page not found.</p>
        <a href="/" className="text-primary hover:underline">Go Home</a>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      {/* Admin Routes */}
      <Route path="/admin" component={Login} />
      <Route path="/admin/dashboard" component={Dashboard} />
      <Route path="/admin/pages" component={PagesList} />
      <Route path="/admin/pages/:id" component={PageEditor} />
      <Route path="/admin/account" component={Account} />
      <Route path="/admin/messages" component={Messages} />
      <Route path="/admin/branding" component={Branding} />
      <Route path="/admin/blog" component={BlogList} />
      <Route path="/admin/blog/:id" component={BlogEditor} />

      {/* Public English Routes */}
      <Route path="/en" component={Home} />
      <Route path="/en/" component={Home} />
      <Route path="/en/p/:slug" component={Page} />
      <Route path="/en/blog" component={Blog} />
      <Route path="/en/blog/:slug" component={BlogPost} />

      {/* Public Arabic Routes */}
      <Route path="/" component={Home} />
      <Route path="/p/:slug" component={Page} />
      <Route path="/blog" component={Blog} />
      <Route path="/blog/:slug" component={BlogPost} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, '') || ''}>
          <LanguageProvider>
            <BrandingLoader />
            <Router />
          </LanguageProvider>
        </WouterRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
