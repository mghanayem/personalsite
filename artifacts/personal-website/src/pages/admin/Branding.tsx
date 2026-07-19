import { useState, useEffect } from "react";
import { useGetBrandingSettings, useUpdateBrandingSettings, useGetAiStatus, useSetAiKey } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, Save, Palette, Globe, BookOpen, Sparkles, Link2, Briefcase, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { applyBrandingColors } from "@/lib/branding";
import { useQueryClient } from "@tanstack/react-query";
import { getGetAiStatusQueryKey } from "@workspace/api-client-react";

function ColorPicker({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold">{label}</Label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-12 rounded-lg border border-border cursor-pointer p-1 bg-transparent shrink-0"
        />
        <div className="flex-1 space-y-1">
          <Input
            value={value}
            onChange={(e) => {
              const v = e.target.value;
              if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v);
            }}
            className="font-mono uppercase"
            maxLength={7}
          />
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <div
          className="w-16 h-12 rounded-lg border border-border shadow-sm shrink-0"
          style={{ backgroundColor: value }}
        />
      </div>
    </div>
  );
}

export default function Branding() {
  const { data: settings, isLoading } = useGetBrandingSettings();
  const update = useUpdateBrandingSettings();

  const [primaryColor, setPrimaryColor] = useState("#0e1a2a");
  const [accentColor, setAccentColor] = useState("#f1f5f9");
  const [cta1BgColor, setCta1BgColor] = useState("#5b91c8");
  const [cta1TextColor, setCta1TextColor] = useState("#ffffff");
  const [cta2BgColor, setCta2BgColor] = useState("#ffffff");
  const [cta2TextColor, setCta2TextColor] = useState("#0e1a2a");
  const [defaultLanguage, setDefaultLanguage] = useState<"ar" | "en">("ar");
  const [blogBgColor, setBlogBgColor] = useState("#ffffff");
  const [blogTextColor, setBlogTextColor] = useState("#1e293b");
  const [blogAccentColor, setBlogAccentColor] = useState("#5b91c8");

  // AEO / structured data fields
  const [seoPersonJobTitle, setSeoPersonJobTitle] = useState("");
  const [seoWebsiteUrl, setSeoWebsiteUrl] = useState("");
  const [seoLinkedinUrl, setSeoLinkedinUrl] = useState("");
  const [seoTwitterUrl, setSeoTwitterUrl] = useState("");
  const [seoGithubUrl, setSeoGithubUrl] = useState("");

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setPrimaryColor(settings.primaryColor);
      setAccentColor(settings.accentColor);
      setCta1BgColor(settings.cta1BgColor);
      setCta1TextColor(settings.cta1TextColor);
      setCta2BgColor(settings.cta2BgColor);
      setCta2TextColor(settings.cta2TextColor);
      setDefaultLanguage(settings.defaultLanguage as "ar" | "en");
      setBlogBgColor(settings.blogBgColor);
      setBlogTextColor(settings.blogTextColor);
      setBlogAccentColor(settings.blogAccentColor);
      setSeoPersonJobTitle(settings.seoPersonJobTitle ?? "");
      setSeoWebsiteUrl(settings.seoWebsiteUrl ?? "");
      setSeoLinkedinUrl(settings.seoLinkedinUrl ?? "");
      setSeoTwitterUrl(settings.seoTwitterUrl ?? "");
      setSeoGithubUrl(settings.seoGithubUrl ?? "");
    }
  }, [settings]);

  const handleSave = () => {
    update.mutate(
      {
        data: {
          primaryColor,
          accentColor,
          cta1BgColor,
          cta1TextColor,
          cta2BgColor,
          cta2TextColor,
          defaultLanguage,
          blogBgColor,
          blogTextColor,
          blogAccentColor,
          seoPersonJobTitle: seoPersonJobTitle || null,
          seoWebsiteUrl: seoWebsiteUrl || null,
          seoLinkedinUrl: seoLinkedinUrl || null,
          seoTwitterUrl: seoTwitterUrl || null,
          seoGithubUrl: seoGithubUrl || null,
        },
      },
      {
        onSuccess: (data) => {
          applyBrandingColors(data);
          setSaved(true);
          setTimeout(() => setSaved(false), 2500);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-2xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Palette className="w-6 h-6" />
            Site Branding
          </h1>
          <p className="text-muted-foreground mt-1">
            Customize your site's appearance. Changes apply immediately.
          </p>
        </div>

        {/* Default Language */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Default Language
            </CardTitle>
            <CardDescription>
              The language new visitors see when they open your site. They can always switch using the language toggle.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {(["ar", "en"] as const).map((lang) => {
                const label = lang === "ar" ? "Arabic (العربية)" : "English";
                const isSelected = defaultLanguage === lang;
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setDefaultLanguage(lang)}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-5 text-sm font-medium transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/5 text-primary shadow-sm"
                        : "border-border bg-background text-foreground/70 hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    <span className="text-2xl">{lang === "ar" ? "🇸🇦" : "🇬🇧"}</span>
                    <span>{label}</span>
                    {isSelected && (
                      <span className="text-xs font-semibold text-primary">✓ Default</span>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Theme Colors */}
        <Card>
          <CardHeader>
            <CardTitle>Theme Colors</CardTitle>
            <CardDescription>
              Controls the hero background, active navigation states, and the timeline section.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <ColorPicker
              label="Primary Color"
              hint="Hero section background, active nav, timeline background"
              value={primaryColor}
              onChange={setPrimaryColor}
            />
            <ColorPicker
              label="Accent Color"
              hint="Subtle section backgrounds and hover states"
              value={accentColor}
              onChange={setAccentColor}
            />
            <div className="rounded-xl overflow-hidden border border-border shadow-sm mt-2">
              <div className="px-5 py-3 text-sm font-semibold" style={{ backgroundColor: primaryColor, color: "#fff" }}>
                Hero background
              </div>
              <div className="px-5 py-3 text-sm text-gray-600" style={{ backgroundColor: accentColor }}>
                Accent area
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hero Button Colors */}
        <Card>
          <CardHeader>
            <CardTitle>Hero Buttons</CardTitle>
            <CardDescription>
              Controls the two call-to-action buttons in your hero section.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Primary Button</p>
              <ColorPicker
                label="Background"
                hint="Fill color of the primary action button"
                value={cta1BgColor}
                onChange={setCta1BgColor}
              />
              <ColorPicker
                label="Text"
                hint="Label color on the primary action button"
                value={cta1TextColor}
                onChange={setCta1TextColor}
              />
            </div>
            <div className="space-y-4 pt-4 border-t">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Secondary Button</p>
              <ColorPicker
                label="Background"
                hint="Fill color of the secondary action button"
                value={cta2BgColor}
                onChange={setCta2BgColor}
              />
              <ColorPicker
                label="Text"
                hint="Label color on the secondary action button"
                value={cta2TextColor}
                onChange={setCta2TextColor}
              />
            </div>
            <div className="rounded-xl p-5 mt-2" style={{ backgroundColor: primaryColor }}>
              <p className="text-xs mb-4 font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
                Live preview against hero background
              </p>
              <div className="flex flex-wrap gap-3">
                <span className="inline-flex items-center px-5 py-2.5 rounded-lg text-sm font-semibold" style={{ backgroundColor: cta1BgColor, color: cta1TextColor }}>
                  Primary Button →
                </span>
                <span className="inline-flex items-center px-5 py-2.5 rounded-lg text-sm font-semibold" style={{ backgroundColor: cta2BgColor, color: cta2TextColor }}>
                  Secondary Button
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Blog Style */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Blog Style
            </CardTitle>
            <CardDescription>
              Controls the colors of your blog index and post pages.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <ColorPicker
              label="Background"
              hint="Page background for the blog index and post pages"
              value={blogBgColor}
              onChange={setBlogBgColor}
            />
            <ColorPicker
              label="Text Color"
              hint="Main text color for blog post content"
              value={blogTextColor}
              onChange={setBlogTextColor}
            />
            <ColorPicker
              label="Accent Color"
              hint="Card borders, date labels, and back links"
              value={blogAccentColor}
              onChange={setBlogAccentColor}
            />
            {/* Live blog preview */}
            <div className="rounded-xl overflow-hidden border border-border shadow-sm mt-2">
              <div className="px-5 py-4" style={{ backgroundColor: blogBgColor }}>
                <div className="rounded-xl border overflow-hidden" style={{ borderColor: blogAccentColor }}>
                  <div className="aspect-video bg-current opacity-10" style={{ backgroundColor: blogAccentColor }} />
                  <div className="p-4" style={{ backgroundColor: blogBgColor }}>
                    <p className="font-bold text-sm mb-1" style={{ color: blogTextColor }}>Post title preview</p>
                    <p className="text-xs mb-3" style={{ color: blogTextColor, opacity: 0.6 }}>A short excerpt appears here…</p>
                    <span className="text-xs font-medium" style={{ color: blogAccentColor }}>📅 January 1, 2025</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AEO — Structured Data (Person) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Structured Data (AEO)
            </CardTitle>
            <CardDescription>
              Powers the <code className="text-xs bg-muted px-1 py-0.5 rounded">schema.org/Person</code> JSON-LD block injected on your homepage. AI assistants (ChatGPT, Google AI Overviews, Perplexity) read this to surface accurate information about you.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                Job Title
              </Label>
              <Input
                value={seoPersonJobTitle}
                placeholder="e.g. Technical Project Manager"
                onChange={e => setSeoPersonJobTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
                Website URL
              </Label>
              <Input
                value={seoWebsiteUrl}
                placeholder="https://yoursite.com"
                type="url"
                onChange={e => setSeoWebsiteUrl(e.target.value)}
              />
            </div>
            <div className="grid sm:grid-cols-3 gap-4 pt-2 border-t">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">LinkedIn</Label>
                <Input
                  value={seoLinkedinUrl}
                  placeholder="https://linkedin.com/in/…"
                  onChange={e => setSeoLinkedinUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Twitter / X</Label>
                <Input
                  value={seoTwitterUrl}
                  placeholder="https://twitter.com/…"
                  onChange={e => setSeoTwitterUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">GitHub</Label>
                <Input
                  value={seoGithubUrl}
                  placeholder="https://github.com/…"
                  onChange={e => setSeoGithubUrl(e.target.value)}
                />
              </div>
            </div>

            {/* JSON-LD preview */}
            {(seoPersonJobTitle || seoWebsiteUrl || seoLinkedinUrl || seoTwitterUrl || seoGithubUrl) && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-2 font-medium">JSON-LD preview</p>
                <pre className="rounded-lg bg-muted p-4 text-xs overflow-auto leading-relaxed font-mono">
                  {JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "Person",
                    "name": "Mohammad Ghanayem",
                    ...(seoPersonJobTitle ? { "jobTitle": seoPersonJobTitle } : {}),
                    ...(seoWebsiteUrl ? { "url": seoWebsiteUrl } : {}),
                    ...(
                      [seoLinkedinUrl, seoTwitterUrl, seoGithubUrl].filter(Boolean).length > 0
                        ? { "sameAs": [seoLinkedinUrl, seoTwitterUrl, seoGithubUrl].filter(Boolean) }
                        : {}
                    ),
                  }, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Assistant Card */}
        <AiKeyCard />

        <div className="flex items-center justify-between">
          <div>
            {saved && (
              <p className="text-sm text-green-600 font-medium">
                ✓ Settings saved and applied to the live site
              </p>
            )}
          </div>
          <Button onClick={handleSave} disabled={update.isPending} className="gap-2">
            {update.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save All Settings
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}

function AiKeyCard() {
  const queryClient = useQueryClient();
  const { data: status, isLoading } = useGetAiStatus();
  const setKey = useSetAiKey();
  const [apiKey, setApiKey] = useState("");
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!apiKey.trim()) return;
    await setKey.mutateAsync({ data: { apiKey: apiKey.trim() } });
    queryClient.invalidateQueries({ queryKey: getGetAiStatusQueryKey() });
    setApiKey("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <CardTitle className="text-base">Claude AI Assistant</CardTitle>
        </div>
        <CardDescription>
          Enter your Anthropic API key to enable AI-powered content writing, SEO audits, and site review. The key is stored securely and never exposed to the browser.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Checking…
          </div>
        ) : status?.isConfigured ? (
          <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" /> API key is configured
          </div>
        ) : (
          <div className="text-sm text-amber-600">No API key configured — AI features will use the default Replit integration key.</div>
        )}
        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-1.5">
            <Label className="text-sm">Anthropic API Key</Label>
            <div className="relative">
              <Input
                type={show ? "text" : "password"}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder={status?.isConfigured ? "Enter new key to replace…" : "sk-ant-…"}
                className="pr-10 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <Button onClick={handleSave} disabled={!apiKey.trim() || setKey.isPending} className="gap-2">
            {setKey.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Key
          </Button>
        </div>
        {saved && <p className="text-sm text-green-600 font-medium">✓ API key saved</p>}
        <p className="text-xs text-muted-foreground">
          Get your key at <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">console.anthropic.com</a>
        </p>
      </CardContent>
    </Card>
  );
}
