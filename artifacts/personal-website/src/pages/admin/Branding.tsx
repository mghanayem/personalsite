import { useState, useEffect } from "react";
import { useGetBrandingSettings, useUpdateBrandingSettings } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, Save, Palette } from "lucide-react";
import { applyBrandingColors } from "@/lib/branding";

export default function Branding() {
  const { data: settings, isLoading } = useGetBrandingSettings();
  const update = useUpdateBrandingSettings();

  const [primaryColor, setPrimaryColor] = useState("#0e1a2a");
  const [accentColor, setAccentColor] = useState("#f1f5f9");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setPrimaryColor(settings.primaryColor);
      setAccentColor(settings.accentColor);
    }
  }, [settings]);

  const handleSave = () => {
    update.mutate(
      { data: { primaryColor, accentColor } },
      {
        onSuccess: (data) => {
          applyBrandingColors(data.primaryColor, data.accentColor);
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
            Choose your site's color palette. Changes apply immediately to the public site.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Color Palette</CardTitle>
            <CardDescription>
              The primary color is used for the hero background, buttons, and active states.
              The accent color is used for subtle highlights and backgrounds.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Primary Color */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Primary Color</Label>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-14 h-14 rounded-xl border border-border cursor-pointer p-1 bg-transparent"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Input
                    value={primaryColor}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setPrimaryColor(v);
                    }}
                    className="font-mono uppercase"
                    maxLength={7}
                    placeholder="#0e1a2a"
                  />
                  <p className="text-xs text-muted-foreground">
                    Used for: hero section, primary buttons, active nav, timeline
                  </p>
                </div>
                {/* Preview swatch */}
                <div
                  className="w-20 h-14 rounded-lg border border-border shadow-sm flex items-center justify-center text-xs font-medium"
                  style={{ backgroundColor: primaryColor, color: "#fff" }}
                >
                  Aa
                </div>
              </div>
            </div>

            {/* Accent Color */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Accent Color</Label>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-14 h-14 rounded-xl border border-border cursor-pointer p-1 bg-transparent"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Input
                    value={accentColor}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setAccentColor(v);
                    }}
                    className="font-mono uppercase"
                    maxLength={7}
                    placeholder="#f1f5f9"
                  />
                  <p className="text-xs text-muted-foreground">
                    Used for: subtle section backgrounds, hover states
                  </p>
                </div>
                {/* Preview swatch */}
                <div
                  className="w-20 h-14 rounded-lg border border-border shadow-sm flex items-center justify-center text-xs font-medium"
                  style={{ backgroundColor: accentColor, color: "#333" }}
                >
                  Aa
                </div>
              </div>
            </div>

            {/* Combined preview */}
            <div className="rounded-xl overflow-hidden border border-border shadow-sm">
              <div
                className="px-6 py-4 text-white text-sm font-semibold"
                style={{ backgroundColor: primaryColor }}
              >
                Hero section preview
              </div>
              <div
                className="px-6 py-4 text-sm text-gray-600"
                style={{ backgroundColor: accentColor }}
              >
                Accent / background area
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                {saved && (
                  <p className="text-sm text-green-600 font-medium">
                    ✓ Colors saved and applied to the live site
                  </p>
                )}
              </div>
              <Button onClick={handleSave} disabled={update.isPending} className="gap-2">
                {update.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Colors
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
