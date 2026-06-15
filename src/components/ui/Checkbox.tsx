import React from "react";
import { font, spacing, C } from "../../design/tokens";

interface CheckboxProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

const Checkbox = ({
  checked,
  onChange,
  label,
  disabled = false,
  style,
}: CheckboxProps) => {
  const id = React.useId();
  return (
    <label
      htmlFor={id}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: spacing[2],
        fontSize: font.size.body,
        color: disabled ? C.text4 : C.text2,
        cursor: disabled ? "not-allowed" : "pointer",
        ...style,
      }}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: C.brand }}
      />
      {label}
    </label>
  );
};

export default Checkbox;
