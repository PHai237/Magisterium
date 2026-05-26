import type { PropsWithChildren } from "react";

import { Button } from "../../components/ui/Button";

interface GamePanelFrameProps {
  title: string;
  subtitle: string;
  returnLabel: string;
  onBack: () => void;
  contentClassName?: string;
}

export function GamePanelFrame({
  title,
  subtitle,
  returnLabel,
  onBack,
  contentClassName,
  children
}: PropsWithChildren<GamePanelFrameProps>) {
  return (
    <div className="gameshell-panel">
      <header className="gameshell-panel__header">
        <Button type="button" variant="ghost" onClick={onBack}>
          {returnLabel}
        </Button>

        <div>
          <span>{subtitle}</span>
          <strong>{title}</strong>
        </div>
      </header>

      {contentClassName ? (
        <main className={contentClassName}>{children}</main>
      ) : (
        children
      )}
    </div>
  );
}