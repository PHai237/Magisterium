import type { ReactNode } from "react";

import type {
  BattleEvent,
  BattleState,
  CharacterSnapshot,
} from "../../domain/magisterium.types";

interface MobileBattleLogGroup {
  label: string;
  events: BattleEvent[];
  current: boolean;
}

interface MobileBattleLogProps {
  battle: BattleState | null;
  battleFinished: boolean;
  currentCharacter: CharacterSnapshot;
  group: MobileBattleLogGroup | null;
  getEventTone: (event: BattleEvent) => string;
  getVisibleBattleLogEvents: (events: BattleEvent[]) => BattleEvent[];
  renderBattleLogEvent: (
    event: BattleEvent,
    battle: BattleState | null,
    currentCharacter: CharacterSnapshot,
  ) => ReactNode;
}

export function MobileBattleLog({
  battle,
  battleFinished,
  currentCharacter,
  group,
  getEventTone,
  getVisibleBattleLogEvents,
  renderBattleLogEvent,
}: MobileBattleLogProps) {
  const visibleEvents = group ? getVisibleBattleLogEvents(group.events) : [];

  return (
    <details className="battle-mobile-log-card" open>
      <summary>
        <span>{group?.label ?? "Battle"}</span>
        <strong>Combat Log</strong>
      </summary>

      <div className="battle-mobile-log-body">
        {group ? (
          visibleEvents.length > 0 ? (
            visibleEvents.map((event) => (
              <div
                key={event.id}
                className={`battle-mobile-log-line battle-log-line--${getEventTone(
                  event,
                )}`}
              >
                {renderBattleLogEvent(event, battle, currentCharacter)}
              </div>
            ))
          ) : (
            <div className="battle-mobile-log-awaiting">
              Awaiting your command...
            </div>
          )
        ) : (
          <div className="battle-mobile-log-awaiting">
            Preparing encounter...
          </div>
        )}

        {group?.current && !battleFinished && visibleEvents.length > 0 ? (
          <div className="battle-mobile-log-awaiting">
            Awaiting your command...
          </div>
        ) : null}
      </div>
    </details>
  );
}
