// WinnowAI Design System Tokens
// Consumed by inline-styled components; never migrate to Tailwind.

import { C as Colors } from "../WinnowData";

// ── Radius ──
export const radius = {
  xs: 2,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 10,
  "2xl": 12,
  full: 9999,
  input: 8,   // the chat/input box is exempt from curvature reduction
} as const;

// ── Spacing (4-based) ──
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
} as const;

// ── Typography ──
export const font = {
  family: {
    sans: "'Manrope', system-ui, sans-serif",
    accent: "'Instrument Serif', Georgia, serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
  },
  size: {
    caption: 10,
    xs: 11,
    sm: 12,
    body: 13,
    bodyLg: 14,
    subtitle: 15,
    title: 18,
    h3: 20,
    h2: 24,
    h1: 32,
  },
  weight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
} as const;

// ── Shadow ──
export const shadow = {
  sm: "0 1px 2px rgba(34,40,49,0.04)",
  md: "0 4px 12px rgba(34,38,49,0.12)",
  lg: "0 8px 24px rgba(34,40,49,0.16)",
  tabInset: "inset 0 2px 3px rgba(34,40,49,0.08)",
} as const;

// ── Colors (re-export unchanged, additive only) ──
export { Colors as C };

// ── Agent Colors (case-study palette, used by status indicators etc.) ──
export const agentColors: Record<string, string> = {
  planner: "#10b981",
  dataCompiler: "#0ea5e9",
  medicalReviewer: "#8b5cf6",
  phiGuard: "#ef4444",
};

// ── Premium / Upgrade accent ──
export const premium = "#f59e0b";
