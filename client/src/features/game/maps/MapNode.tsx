interface MapNodeProps {
  className?: string;
  icon: string;
  name: string;
  subtitle: string;
  onClick: () => void;
  disabled?: boolean;
}

export function MapNode({
  className = "",
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
      onClick={onClick}
      disabled={disabled}
    >
      <span className="gameshell-node__icon">{icon}</span>
      <strong>{name}</strong>
      <small>{subtitle}</small>
    </button>
  );
}