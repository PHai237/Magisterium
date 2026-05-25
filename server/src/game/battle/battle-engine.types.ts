import type { BattleActionResult, BattleState } from './battle.types';

export interface BattleEngineResult {
  battleState: BattleState;
  actionResult: BattleActionResult;
}
