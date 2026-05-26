import "./magisterium-brand.css";

interface MagisteriumBrandProps {
  subtitle?: string;
  align?: "left" | "center";
  compact?: boolean;
}

export function MagisteriumBrand({
  subtitle,
  align = "left",
  compact = false
}: MagisteriumBrandProps) {
  return (
    <div
      className={[
        "magisterium-brand",
        `magisterium-brand--${align}`,
        compact ? "magisterium-brand--compact" : ""
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <h1>MAGISTERIUM</h1>
      {subtitle ? <span>{subtitle}</span> : null}
    </div>
  );
}