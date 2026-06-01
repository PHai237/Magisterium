import type { CSSProperties } from "react";

interface MapNodeProps {
  className?: string;
  style?: CSSProperties;
  icon: string;
  name: string;
  subtitle: string;
  onClick: () => void;
  disabled?: boolean;
}

export function MapNode({
  className = "",
  style,
  icon,
  name,
  subtitle,
  onClick,
  disabled = false
}: MapNodeProps) {
  return (
    <button
      type="button"
      className={`gameshell-node ${className}`}
      style={style}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="gameshell-node__icon">{icon}</span>
      <strong>{name}</strong>
      <small>{subtitle}</small>
    </button>
  );
}
