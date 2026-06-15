import React from "react";
import { radius, font, C } from "../../design/tokens";

type Variant = "success" | "warning" | "danger" | "info" | "neutral";

interface BadgeProps {
  variant?: Variant;
  size?: "sm" | "md";
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

const variantMap: Record<Variant, { bg: string; color: string; border: string }> = {
  success: { bg: "#d1fae5", color: "#065f46", border: "#a7f3d0" },
  warning: { bg: "#fef3c7", color: "#d97706", border: "#fcd34d" },
  danger:  { bg: "#fee2e2", color: "#dc2626", border: "#fecaca" },
  info:    { bg: "#dbeafe", color: "#1d4ed8", border: "#bfdbfe" },
  neutral: { bg: C.cardHover, color: C.text3, border: C.border },
};

const Badge = ({
  variant = "neutral",
  size = "sm",
  children,
  style,
}: BadgeProps) => {
  const v = variantMap[variant];
  const fs = size === "sm" ? font.size.caption : font.size.xs;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        fontSize: fs,
        fontWeight: font.weight.bold,
        lineHeight: 1,
        padding: size === "sm" ? "2px 6px" : "3px 8px",
        borderRadius: radius.full,
        background: v.bg,
        color: v.color,
        border: `1px solid ${v.border}`,
        textTransform: "uppercase",
        ...style,
      }}
    >
      {children}
    </span>
  );
};

export default Badge;
