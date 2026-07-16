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

/**
 * Injects branding colors as CSS custom properties on :root.
 * Called once at app startup with values from the API.
 */
export function applyBrandingColors(primaryColor: string, accentColor: string) {
  const root = document.documentElement;
  if (primaryColor && /^#[0-9a-fA-F]{6}$/.test(primaryColor)) {
    const hsl = hexToHslVars(primaryColor);
    root.style.setProperty("--primary", hsl);
    // Keep sidebar consistent with primary
    root.style.setProperty("--sidebar", hsl);
  }
  if (accentColor && /^#[0-9a-fA-F]{6}$/.test(accentColor)) {
    const hsl = hexToHslVars(accentColor);
    root.style.setProperty("--accent", hsl);
  }
}
