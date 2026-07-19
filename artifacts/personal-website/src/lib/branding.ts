/**
 * Converts a hex color (#rrggbb) to an HSL string in the format used by
 * Tailwind CSS v4 custom properties: "H S% L%" (no hsl() wrapper).
 */
export function hexToHslVars(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export interface BrandingColors {
  primaryColor: string;
  accentColor: string;
  cta1BgColor: string;
  cta1TextColor: string;
  cta2BgColor: string;
  cta2TextColor: string;
  defaultLanguage?: string;
  blogBgColor?: string;
  blogTextColor?: string;
  blogAccentColor?: string;
}

/**
 * Injects branding colors as CSS custom properties on :root.
 * Called once at app startup with values from the API, and again on admin saves.
 */
export function applyBrandingColors(colors: BrandingColors) {
  const root = document.documentElement;

  if (colors.primaryColor && HEX_RE.test(colors.primaryColor)) {
    const hsl = hexToHslVars(colors.primaryColor);
    root.style.setProperty("--primary", hsl);
    root.style.setProperty("--sidebar", hsl);
  }
  if (colors.accentColor && HEX_RE.test(colors.accentColor)) {
    root.style.setProperty("--accent", hexToHslVars(colors.accentColor));
  }

  // Hero button CSS vars — consumed by RenderSection hero buttons
  if (colors.cta1BgColor && HEX_RE.test(colors.cta1BgColor)) {
    root.style.setProperty("--hero-cta1-bg", colors.cta1BgColor);
  }
  if (colors.cta1TextColor && HEX_RE.test(colors.cta1TextColor)) {
    root.style.setProperty("--hero-cta1-text", colors.cta1TextColor);
  }
  if (colors.cta2BgColor && HEX_RE.test(colors.cta2BgColor)) {
    root.style.setProperty("--hero-cta2-bg", colors.cta2BgColor);
  }
  if (colors.cta2TextColor && HEX_RE.test(colors.cta2TextColor)) {
    root.style.setProperty("--hero-cta2-text", colors.cta2TextColor);
  }

  // Blog template CSS vars — consumed by Blog and BlogPost pages
  if (colors.blogBgColor && HEX_RE.test(colors.blogBgColor)) {
    root.style.setProperty("--blog-bg", colors.blogBgColor);
  }
  if (colors.blogTextColor && HEX_RE.test(colors.blogTextColor)) {
    root.style.setProperty("--blog-text", colors.blogTextColor);
  }
  if (colors.blogAccentColor && HEX_RE.test(colors.blogAccentColor)) {
    root.style.setProperty("--blog-accent", colors.blogAccentColor);
  }
}
