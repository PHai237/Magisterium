import { useMemo } from "react";

import { Button } from "../../../components/ui/Button";
import { ORIGIN_OPTIONS } from "../../../domain/magisterium.constants";
import type { OriginId } from "../../../domain/magisterium.types";

interface CharacterOriginSelectorProps {
  originId: OriginId;
  previewBusy: boolean;
  onOriginChange: (originId: OriginId) => void;
}

export function CharacterOriginSelector({
  originId,
  previewBusy,
  onOriginChange
}: CharacterOriginSelectorProps) {
  const selectedOrigin = useMemo(
    () =>
      ORIGIN_OPTIONS.find((origin) => origin.id === originId) ??
      ORIGIN_OPTIONS[0]!,
    [originId]
  );

  const selectedOriginIndex = useMemo(
    () => ORIGIN_OPTIONS.findIndex((origin) => origin.id === originId),
    [originId]
  );

  const normalizedOriginIndex =
    selectedOriginIndex >= 0 ? selectedOriginIndex : 0;

  function selectPreviousOrigin() {
    const previousIndex =
      normalizedOriginIndex === 0
        ? ORIGIN_OPTIONS.length - 1
        : normalizedOriginIndex - 1;

    onOriginChange(ORIGIN_OPTIONS[previousIndex]!.id);
  }

  function selectNextOrigin() {
    const nextIndex =
      normalizedOriginIndex === ORIGIN_OPTIONS.length - 1
        ? 0
        : normalizedOriginIndex + 1;

    onOriginChange(ORIGIN_OPTIONS[nextIndex]!.id);
  }

  return (
    <div className="character-origin-panel">
      <div className="character-card-title">Origin</div>

      <div className="origin-content">
        <div>
          <div className="origin-name">
            <span>{selectedOrigin.icon}</span>
            <strong>{selectedOrigin.label}</strong>
          </div>

          <span className="origin-focus">{selectedOrigin.focus}</span>

          <p>{selectedOrigin.description}</p>
        </div>

        <div className="origin-controls">
          <Button
            type="button"
            variant="ghost"
            onClick={selectPreviousOrigin}
            disabled={previewBusy}
          >
            Prev
          </Button>

          <span>
            Origin {normalizedOriginIndex + 1} / {ORIGIN_OPTIONS.length}
          </span>

          <Button
            type="button"
            variant="ghost"
            onClick={selectNextOrigin}
            disabled={previewBusy}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}