import React from "react";
import { radius, spacing, shadow as s, C } from "../../design/tokens";

type Variant = "elevated" | "outlined" | "flat";
type Pad = "none" | "sm" | "md" | "lg";

interface CardProps {
  variant?: Variant;
  padding?: Pad;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

const padMap: Record<Pad, number> = {
  none: 0,
  sm: spacing[3],
  md: spacing[4],
  lg: spacing[5],
};

const Card = ({
  variant = "elevated",
  padding = "md",
  onClick,
  style,
  children,
}: CardProps) => {
  const p = padMap[padding];
  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: radius.lg,
        background: C.card,
        border: variant === "outlined" ? `1px solid ${C.border}` : variant === "flat" ? "none" : `1px solid ${C.border}`,
        boxShadow: variant === "elevated" ? s.sm : "none",
        padding: p > 0 ? `${p}px` : 0,
        ...(onClick ? { cursor: "pointer" } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export default Card;
