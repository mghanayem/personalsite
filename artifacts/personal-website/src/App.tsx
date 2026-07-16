import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { LanguageProvider } from '@/lib/i18n';
import { useEffect } from 'react';
import { applyBrandingColors } from '@/lib/branding';

import Home from '@/pages/public/Home';
import Page from '@/pages/public/Page';
import Login from '@/pages/admin/Login';
import Dashboard from '@/pages/admin/Dashboard';
import PagesList from '@/pages/admin/PagesList';
import PageEditor from '@/pages/admin/PageEditor';
import Account from '@/pages/admin/Account';
import Branding from '@/pages/admin/Branding';
import Messages from '@/pages/admin/Messages';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    }
  }
});

/** Fetches branding colors from the API and injects them as CSS vars at startup. */
function BrandingLoader() {
  useEffect(() => {
    fetch('/api/settings/branding')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.primaryColor) {
          applyBrandingColors(data);
        }
      })
      .catch(() => { /* fallback to CSS defaults */ });
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

      {/* Public English Routes */}
      <Route path="/en" component={Home} />
      <Route path="/en/" component={Home} />
      <Route path="/en/p/:slug" component={Page} />

      {/* Public Arabic Routes */}
      <Route path="/" component={Home} />
      <Route path="/p/:slug" component={Page} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, '') || ''}>
        <LanguageProvider>
          <BrandingLoader />
          <Router />
        </LanguageProvider>
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
