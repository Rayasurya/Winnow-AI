import React from "react";
import { radius, spacing, font, C } from "../../design/tokens";

interface PillProps {
  active?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  size?: "sm" | "md";
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

const Pill = ({
  active = false,
  onClick,
  size = "md",
  children,
  style,
}: PillProps) => {
  const h = size === "sm" ? 28 : 32;
  const px = size === "sm" ? spacing[2] : spacing[3];
  const fs = size === "sm" ? font.size.xs : font.size.sm;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: spacing[1],
        height: h,
        padding: `0 ${px}px`,
        fontSize: fs,
        fontWeight: font.weight.semibold,
        fontFamily: font.family.sans,
        lineHeight: 1,
        whiteSpace: "nowrap",
        cursor: onClick ? "pointer" : "default",
        border: `1px solid ${active ? "#86efac" : C.border}`,
        borderRadius: radius.full,
        background: active ? C.brandSoft : "transparent",
        color: active ? C.brandText : C.text3,
        transition: "background 0.15s, border-color 0.15s, color 0.15s",
        outline: "none",
        ...style,
      }}
    >
      {children}
    </button>
  );
};

export default Pill;
