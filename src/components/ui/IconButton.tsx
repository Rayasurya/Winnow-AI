// WinnowAI Design System — IconButton
// Inline-styled icon button with consistent hit target and hover state.
// Usage:
//   <IconButton size="md" onClick={...}><X size={16} /></IconButton>
//   <IconButton size="lg" onClick={...}><X size={20} /></IconButton>  // close/X buttons

import React from "react";
import { radius, C } from "../../design/tokens";

type Size = "sm" | "md" | "lg";

interface IconButtonProps {
  size?: Size;
  disabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  "aria-label"?: string;
}

const sizeMap: Record<Size, { hit: number; br: number }> = {
  sm: { hit: 28, br: radius.sm },
  md: { hit: 36, br: radius.md },
  lg: { hit: 44, br: radius.md },
};

const IconButton = ({
  size = "md",
  disabled = false,
  onClick,
  children,
  style,
  "aria-label": ariaLabel,
}: IconButtonProps) => {
  const s = sizeMap[size];

  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={ariaLabel}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: s.hit,
        height: s.hit,
        padding: 0,
        border: "none",
        borderRadius: s.br,
        background: "transparent",
        color: C.text4,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: "background 0.15s, color 0.15s",
        outline: "none",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = C.cardHover;
          e.currentTarget.style.color = C.text2;
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = C.text4;
        }
      }}
    >
      {children}
    </button>
  );
};

export default IconButton;
