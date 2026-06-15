// WinnowAI Design System — Select
// Fully custom (never native <select>), styled chevron, keyboard a11y.
// Usage:
//   <Select value={val} onChange={setVal} options={['All Types', 'Type A']} />

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { radius, spacing, font, shadow as s, C } from "../../design/tokens";

interface SelectProps {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[] | string[];
  placeholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

const Select = ({ value, onChange, options, placeholder, disabled = false, style }: SelectProps) => {
  const [open, setOpen] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const resolved = options.map((o) =>
    typeof o === "string" ? { label: o, value: o } : o
  );
  const selectedLabel = resolved.find((o) => o.value === value)?.label ?? placeholder ?? "Select...";

  const close = useCallback(() => {
    setOpen(false);
    setFocusedIdx(-1);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, close]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === "ArrowDown") {
        setOpen(true);
        setFocusedIdx(0);
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIdx((i) => Math.min(i + 1, resolved.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIdx((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (focusedIdx >= 0) {
          onChange(resolved[focusedIdx].value);
          close();
        }
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
    }
  };

  return (
    <div ref={ref} style={{ position: "relative", fontFamily: font.family.sans, ...style }}>
      <button
        type="button"
        onClick={() => { if (!disabled) setOpen((o) => !o); }}
        onKeyDown={disabled ? undefined : handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing[2],
          width: "100%",
          height: 40,
          padding: `0 ${spacing[4]}px`,
          fontSize: font.size.body,
          fontWeight: font.weight.medium,
          color: value ? C.text1 : C.text4,
          border: `1px solid ${C.border}`,
          borderRadius: radius.md,
          background: "#fff",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          outline: "none",
          transition: "border-color 0.15s",
          boxSizing: "border-box",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.borderMid; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selectedLabel}
        </span>
        <ChevronDown
          size={14}
          style={{
            flexShrink: 0,
            transition: "transform 0.2s",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 500,
            background: "#fff",
            border: `1px solid ${C.border}`,
            borderRadius: radius.md,
            boxShadow: s.md,
            maxHeight: 240,
            overflowY: "auto",
          }}
        >
          {resolved.map((opt, i) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={opt.value === value}
              disabled={opt.value === value}
              onClick={() => { onChange(opt.value); close(); }}
              onMouseEnter={() => setFocusedIdx(i)}
              style={{
                display: "block",
                width: "100%",
                padding: `${spacing[2]}px ${spacing[4]}px`,
                fontSize: font.size.body,
                fontWeight: opt.value === value ? font.weight.bold : font.weight.normal,
                color: opt.value === value ? C.brand : C.text1,
                border: "none",
                background: i === focusedIdx ? C.cardHover : "transparent",
                cursor: "pointer",
                textAlign: "left",
                transition: "background 0.1s",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Select;
