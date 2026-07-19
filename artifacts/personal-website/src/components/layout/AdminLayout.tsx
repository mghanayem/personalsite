import { useGetAdminSession, useAdminLogout, getGetAdminSessionQueryKey } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, FileText, Settings, LogOut, Loader2, AlertCircle, Palette, Inbox, ExternalLink, PenLine, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: session, isLoading, isError } = useGetAdminSession({
    query: {
      queryKey: getGetAdminSessionQueryKey(),
      retry: false,
    },
  });
  
  const logout = useAdminLogout();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isLoading && (isError || !session)) {
      setLocation("/admin");
    }
  }, [isLoading, isError, session, setLocation]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!session) {
    return null; // will redirect in useEffect
  }

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.removeQueries({ queryKey: getGetAdminSessionQueryKey() });
        setLocation("/admin");
      },
    });
  };

  const nav = [
    { title: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { title: "Pages", href: "/admin/pages", icon: FileText },
    { title: "Blog", href: "/admin/blog", icon: PenLine },
    { title: "Messages", href: "/admin/messages", icon: Inbox },
    { title: "Branding", href: "/admin/branding", icon: Palette },
    { title: "AI Assistant", href: "/admin/ai", icon: Sparkles },
    { title: "Account Settings", href: "/admin/account", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-muted/20 flex font-sans" dir="ltr" lang="en">
      <aside className="w-64 bg-sidebar border-r border-sidebar-border hidden md:flex flex-col text-sidebar-foreground">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <span className="font-bold text-lg tracking-tight">CMS Admin</span>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                location.startsWith(item.href) 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.title}
            </Link>
          ))}

          {/* Visit Site link */}
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground mt-2"
          >
            <ExternalLink className="w-4 h-4" />
            Visit Site
          </a>
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="mb-4 px-2 text-sm text-sidebar-foreground/70">
            Logged in as <strong>{session.username}</strong>
          </div>
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2 bg-transparent text-sidebar-foreground hover:bg-sidebar-accent border-sidebar-border"
            onClick={handleLogout}
            disabled={logout.isPending}
          >
            {logout.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            Logout
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b bg-card flex items-center justify-between px-6 md:hidden">
          <span className="font-bold">CMS Admin</span>
          <div className="flex items-center gap-2">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
              title="Visit Site"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </header>

        <div className="flex-1 p-6 md:p-8 overflow-auto">
          {session.isDefaultPassword && location !== "/admin/account" && (
            <div className="mb-6 p-4 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-sm">Security Warning</h4>
                <p className="text-sm mt-1">You are using the default password. Please change it in Account Settings immediately.</p>
                <Button variant="link" className="px-0 h-auto mt-2 text-amber-700 dark:text-amber-400" onClick={() => setLocation("/admin/account")}>
                  Go to Account Settings
                </Button>
              </div>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
