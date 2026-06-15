// WinnowAI Design System — Button
// Inline-styled; consumes tokens from src/design/tokens.ts.
// Reuses the existing Spinner for loading state.
// Usage:
//   <Button variant="primary" size="md" loading>Run Analysis</Button>

import React from "react";
import { Spinner } from "./spinner-1";
import { radius, spacing, font, shadow as s, C } from "../../design/tokens";

type Variant = "primary" | "secondary" | "tertiary" | "danger" | "premium";
type Size = "sm" | "md" | "lg";

interface ButtonProps {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

const variantStyle: Record<Variant, { bg: string; color: string; border: string; hoverBg: string; hoverBorder: string }> = {
  primary:   { bg: C.brand, color: "#fff", border: C.brand, hoverBg: "#047857", hoverBorder: "#047857" },
  secondary: { bg: "#fff", color: C.text1, border: C.border, hoverBg: C.cardHover, hoverBorder: C.borderMid },
  tertiary:  { bg: "transparent", color: C.text2, border: "transparent", hoverBg: C.cardHover, hoverBorder: "transparent" },
  danger:    { bg: "#ef4444", color: "#fff", border: "#ef4444", hoverBg: "#dc2626", hoverBorder: "#dc2626" },
  premium:   { bg: "#f59e0b", color: "#fff", border: "#f59e0b", hoverBg: "#d97706", hoverBorder: "#d97706" },
};

const sizeStyle: Record<Size, { h: number; px: number; fs: number }> = {
  sm: { h: 32, px: spacing[3], fs: font.size.sm },
  md: { h: 40, px: spacing[4], fs: font.size.body },
  lg: { h: 48, px: spacing[5], fs: font.size.bodyLg },
};

const Button = ({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  fullWidth = false,
  onClick,
  children,
  style,
}: ButtonProps) => {
  const v = variantStyle[variant];
  const siz = sizeStyle[size];
  const isDisabled = disabled || loading;

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing[2],
        height: siz.h,
        padding: `0 ${siz.px}px`,
        fontSize: siz.fs,
        fontWeight: font.weight.semibold,
        fontFamily: font.family.sans,
        lineHeight: 1,
        whiteSpace: "nowrap",
        cursor: isDisabled ? "not-allowed" : "pointer",
        border: `1px solid ${isDisabled ? C.border : v.border}`,
        borderRadius: radius.md,
        background: isDisabled ? C.border : v.bg,
        color: isDisabled ? C.text4 : v.color,
        opacity: isDisabled ? 0.6 : 1,
        transition: "background 0.15s, border-color 0.15s, opacity 0.15s",
        outline: "none",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!isDisabled) {
          e.currentTarget.style.background = v.hoverBg;
          e.currentTarget.style.borderColor = v.hoverBorder;
        }
      }}
      onMouseLeave={(e) => {
        if (!isDisabled) {
          e.currentTarget.style.background = v.bg;
          e.currentTarget.style.borderColor = v.border;
        }
      }}
    >
      {loading && <Spinner size={siz.fs} color={v.color} />}
      {children}
    </button>
  );
};

export default Button;
