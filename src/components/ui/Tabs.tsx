// WinnowAI Design System — Tabs
// Segmented boxes sharing edges (no gap). Active = filled solid (in front).
// Inactive = recessed with an inset top shadow (tucked behind).
// Usage:
//   <Tabs tabs={['Charts', 'Agents']} active={activeTab} onChange={setActiveTab} />

import React from "react";
import { radius, spacing, font, shadow as s, C } from "../../design/tokens";

interface TabsProps {
  tabs: { label: string; value: string }[] | string[];
  active: string;
  onChange: (v: string) => void;
  style?: React.CSSProperties;
}

const Tabs = ({ tabs, active, onChange, style }: TabsProps) => {
  const resolved = tabs.map((t) =>
    typeof t === "string" ? { label: t, value: t } : t
  );

  return (
    <div
      role="tablist"
      style={{
        display: "inline-flex",
        borderRadius: radius.md,
        overflow: "hidden",
        border: `1px solid ${C.border}`,
        fontFamily: font.family.sans,
        ...style,
      }}
    >
      {resolved.map((tab, idx) => {
        const isActive = tab.value === active;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.value)}
            style={{
              flex: 1,
              padding: `${spacing[2]}px ${spacing[4]}px`,
              fontSize: font.size.sm,
              fontWeight: isActive ? font.weight.bold : font.weight.semibold,
              fontFamily: font.family.sans,
              lineHeight: 1,
              whiteSpace: "nowrap",
              cursor: "pointer",
              border: "none",
              borderRight: idx < resolved.length - 1 ? `1px solid ${C.border}` : "none",
              background: isActive ? C.brand : C.card,
              color: isActive ? "#fff" : C.text2,
              boxShadow: isActive ? "none" : s.tabInset,
              transition: "background 0.15s, color 0.15s, box-shadow 0.15s",
              outline: "none",
              position: "relative",
              zIndex: isActive ? 1 : 0,
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = C.cardHover;
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = C.card;
              }
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
