import { useState, useEffect } from "react";
import { useGetBrandingSettings, useUpdateBrandingSettings } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, Save, Palette, Globe } from "lucide-react";
import { applyBrandingColors } from "@/lib/branding";

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
            Choose your site's color palette and default language. Changes apply immediately.
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

            {/* Theme preview */}
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
              Controls the two call-to-action buttons in your hero section. Both have a solid fill for guaranteed readability.
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

            {/* Live button preview */}
            <div className="rounded-xl p-5 mt-2" style={{ backgroundColor: primaryColor }}>
              <p className="text-xs mb-4 font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
                Live preview against hero background
              </p>
              <div className="flex flex-wrap gap-3">
                <span
                  className="inline-flex items-center px-5 py-2.5 rounded-lg text-sm font-semibold"
                  style={{ backgroundColor: cta1BgColor, color: cta1TextColor }}
                >
                  Primary Button →
                </span>
                <span
                  className="inline-flex items-center px-5 py-2.5 rounded-lg text-sm font-semibold"
                  style={{ backgroundColor: cta2BgColor, color: cta2TextColor }}
                >
                  Secondary Button
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

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
