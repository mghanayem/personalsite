import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { LanguageProvider } from '@/lib/i18n';

import Home from '@/pages/public/Home';
import Page from '@/pages/public/Page';
import Login from '@/pages/admin/Login';
import Dashboard from '@/pages/admin/Dashboard';
import PagesList from '@/pages/admin/PagesList';
import PageEditor from '@/pages/admin/PageEditor';
import Account from '@/pages/admin/Account';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    }
  }
});

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
          <Router />
        </LanguageProvider>
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
