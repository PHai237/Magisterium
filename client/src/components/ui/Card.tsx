import type { PropsWithChildren, ReactNode } from "react";

interface CardProps {
  title?: string;
  eyebrow?: string;
  action?: ReactNode;
  className?: string;
}

export function Card({
  title,
  eyebrow,
  action,
  className = "",
  children
}: PropsWithChildren<CardProps>) {
  return (
    <section className={`card ${className}`}>
      {(title || eyebrow || action) && (
        <header className="card__header">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            {title && <h2>{title}</h2>}
          </div>
          {action}
        </header>
      )}

      {children}
    </section>
  );
}
