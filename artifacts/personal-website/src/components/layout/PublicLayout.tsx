import { useGetPublicNav, useGetPublicBlogHasPosts } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/lib/i18n";
import { Menu, X, Globe } from "lucide-react";
import { useState, useEffect } from "react";
import { useContentProtection } from "@/hooks/useContentProtection";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  useContentProtection();

  // ONE global listener for all module iframes — registered once here, never per-instance.
  // ONLY message type the parent page acts on from a module iframe: "module-resize".
  // Any message with a different shape or type is silently ignored.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const data = e.data as { type?: unknown; height?: unknown };

      // Validate message shape.
      // Accepts both "module-resize" (canonical) and "resize" (legacy compat)
      // so that modules written before the message-type rename continue to work.
      // ONLY these two type values are acted on from module iframes.
      const isResizeMsg =
        (data?.type === "module-resize" || data?.type === "resize") &&
        typeof data.height === "number" &&
        data.height > 0;
      if (!isResizeMsg) return;

      const newHeight = Math.ceil(data.height);

      // Find the iframe whose contentWindow matches the message sender
      const iframes = document.querySelectorAll<HTMLIFrameElement>("iframe[data-module-id]");
      for (const iframe of iframes) {
        if (iframe.contentWindow === e.source) {
          iframe.style.height = `${newHeight}px`;
          break;
        }
      }
      // If no matching iframe is found, the message is silently ignored.

      // ── EXTENSION POINT ─────────────────────────────────────────────────────
      // To handle additional message types from module iframes, add new cases
      // here. Always validate the sender with the contentWindow check above
      // before acting. Do not broaden what types are accepted without a
      // deliberate security review.
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const { lang, setLang } = useLanguage();
  const [location, setLocation] = useLocation();
  const { data: navItems = [] } = useGetPublicNav();
  const { data: blogMeta } = useGetPublicBlogHasPosts();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleLanguage = () => {
    const newLang = lang === "ar" ? "en" : "ar";
    if (newLang === "en") {
      setLocation(location === "/" ? "/en/" : `/en${location}`);
    } else {
      setLocation(location.startsWith("/en") ? location.replace("/en", "") || "/" : location);
    }
  };

  const navLinks = navItems.map((item) => {
    let path = item.isHomepage ? "/" : `/p/${item.slug}`;
    if (lang === "en") {
      path = item.isHomepage ? "/en/" : `/en/p/${item.slug}`;
    }
    return {
      title: lang === "ar" ? item.titleAr : item.titleEn,
      path,
      icon: item.icon ?? null,
    };
  });

  // Blog nav link — only shown when there are published posts
  const blogLink = blogMeta?.hasPosts
    ? {
        title: lang === "ar" ? "المدونة" : "Blog",
        path: lang === "ar" ? "/blog" : "/en/blog",
        icon: null as string | null,
      }
    : null;

  const allNavLinks = blogLink ? [...navLinks, blogLink] : navLinks;

  return (
    <div
      className="min-h-screen bg-background flex flex-col font-sans"
    >
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="font-bold text-xl tracking-tight text-foreground flex items-center gap-2">
            <Link href={lang === "ar" ? "/" : "/en/"} className="hover:text-primary transition-colors">
              {lang === "ar" ? "محمد غنايم" : "Mohammad Ghanayem"}
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-8 font-medium text-sm">
            {allNavLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className={`flex items-center gap-1.5 transition-colors hover:text-primary ${
                  location === link.path ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {"icon" in link && link.icon && (
                  <span className="text-base leading-none">{link.icon}</span>
                )}
                {link.title}
              </Link>
            ))}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
            >
              <Globe className="w-4 h-4" />
              <span>{lang === "ar" ? "English" : "العربية"}</span>
            </button>
          </nav>

          <button
            className="md:hidden p-2 -mr-2 text-foreground"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div className="md:hidden border-b bg-background px-4 py-4 space-y-4 shadow-sm animate-in slide-in-from-top-2">
          {allNavLinks.map((link) => (
            <Link
              key={link.path}
              href={link.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2 text-foreground font-medium py-2 border-b border-border/50"
            >
              {"icon" in link && link.icon && (
                <span className="text-base leading-none">{link.icon}</span>
              )}
              {link.title}
            </Link>
          ))}
          <button
            onClick={() => {
              toggleLanguage();
              setIsMobileMenuOpen(false);
            }}
            className="flex items-center gap-2 text-foreground font-medium py-2 w-full text-left rtl:text-right"
          >
            <Globe className="w-4 h-4" />
            <span>{lang === "ar" ? "English" : "العربية"}</span>
          </button>
        </div>
      )}

      <main className="flex-1 w-full max-w-full">
        {children}
      </main>

      <footer className="border-t bg-muted/40 py-12 mt-20">
        <div className="container mx-auto px-4 md:px-8 text-center text-muted-foreground text-sm space-y-3">
          <p>© {new Date().getFullYear()} {lang === "ar" ? "محمد غنايم. جميع الحقوق محفوظة." : "Mohammad Ghanayem. All rights reserved."}</p>
          <a
            href="/admin"
            className="inline-block text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors"
            title={lang === "ar" ? "لوحة التحكم" : "Site owner"}
          >
            {lang === "ar" ? "أنت صاحب الموقع؟" : "Are you the owner?"}
          </a>
        </div>
      </footer>
    </div>
  );
}
