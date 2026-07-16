/**
 * Design tokens derived from the personal-website artifact (index.css)
 * Light/dark palettes mirror the web app so both feel like one product.
 */
const colors = {
  light: {
    // Legacy aliases
    text: '#0e1a2a',
    tint: '#5b91c8',

    // Core surfaces
    background: '#ffffff',
    foreground: '#0e1a2a',

    // Cards / elevated surfaces
    card: '#ffffff',
    cardForeground: '#0e1a2a',

    // Primary (dark navy in light mode)
    primary: '#0e1a2a',
    primaryForeground: '#ffffff',

    // Secondary (soft blue-grey)
    secondary: '#dde6f0',
    secondaryForeground: '#0e1a2a',

    // Muted (very light blue-white)
    muted: '#edf2f7',
    mutedForeground: '#64748b',

    // Accent (the ring/highlight blue)
    accent: '#5b91c8',
    accentForeground: '#ffffff',

    // Destructive
    destructive: '#ef4444',
    destructiveForeground: '#ffffff',

    // Borders and inputs
    border: '#dde6f0',
    input: '#dde6f0',
  },

  dark: {
    text: '#ffffff',
    tint: '#5b91c8',

    background: '#0e1a2a',
    foreground: '#ffffff',

    card: '#172a45',
    cardForeground: '#ffffff',

    primary: '#ffffff',
    primaryForeground: '#0e1a2a',

    secondary: '#1d3352',
    secondaryForeground: '#ffffff',

    muted: '#1d3352',
    mutedForeground: '#94a3b8',

    accent: '#5b91c8',
    accentForeground: '#ffffff',

    destructive: '#ef4444',
    destructiveForeground: '#ffffff',

    border: '#1d3352',
    input: '#1d3352',
  },

  // 8px radius matches web --radius: 0.5rem
  radius: 8,
};

export default colors;
