import { createBattleEvent, createSystemEvent } from './battle-event.factory';

describe('battle event factory', () => {
  describe('createBattleEvent', () => {
    it('should create an event with a generated id', () => {
      const event = createBattleEvent({
        type: 'ACTION_STARTED',
        phase: 'initiation',
        actorId: 'hero',
        message: 'Action started.',
      });

      expect(event.id).toBeDefined();
      expect(event).toMatchObject({
        type: 'ACTION_STARTED',
        phase: 'initiation',
        actorId: 'hero',
        message: 'Action started.',
      });
    });

    it('should preserve explicit id when provided', () => {
      const event = createBattleEvent({
        id: 'event_1',
        type: 'HIT',
        phase: 'accuracy_check',
        actorId: 'hero',
        targetId: 'slime',
        message: 'Hit.',
      });

      expect(event).toMatchObject({
        id: 'event_1',
        type: 'HIT',
        phase: 'accuracy_check',
        actorId: 'hero',
        targetId: 'slime',
        message: 'Hit.',
      });
    });
  });

  describe('createSystemEvent', () => {
    it('should create a battle started system event in initiation phase', () => {
      const event = createSystemEvent('BATTLE_STARTED', 'Battle started.');

      expect(event).toMatchObject({
        type: 'BATTLE_STARTED',
        phase: 'initiation',
        actorId: 'battle_engine',
        message: 'Battle started.',
      });
    });

    it('should create a round started system event in initiation phase', () => {
      const event = createSystemEvent('ROUND_STARTED', 'Round 1 started.');

      expect(event).toMatchObject({
        type: 'ROUND_STARTED',
        phase: 'initiation',
        actorId: 'battle_engine',
        message: 'Round 1 started.',
      });
    });

    it('should create a round ended system event in completed phase', () => {
      const event = createSystemEvent('ROUND_ENDED', 'Round 1 ended.');

      expect(event).toMatchObject({
        type: 'ROUND_ENDED',
        phase: 'completed',
        actorId: 'battle_engine',
        message: 'Round 1 ended.',
      });
    });

    it('should create a battle ended system event in completed phase', () => {
      const event = createSystemEvent('BATTLE_ENDED', 'Battle ended.');

      expect(event).toMatchObject({
        type: 'BATTLE_ENDED',
        phase: 'completed',
        actorId: 'battle_engine',
        message: 'Battle ended.',
      });
    });

    it('should allow overriding the system event phase', () => {
      const event = createSystemEvent(
        'CONTROL_FORCED',
        'Monster control was forced.',
        'cancelled',
      );

      expect(event).toMatchObject({
        type: 'CONTROL_FORCED',
        phase: 'cancelled',
        actorId: 'battle_engine',
        message: 'Monster control was forced.',
      });
    });

    it('should assign non-lifecycle system events to a sensible default phase', () => {
      const event = createSystemEvent(
        'RESOURCE_RESTORED',
        'Resource restored.',
      );

      expect(event).toMatchObject({
        type: 'RESOURCE_RESTORED',
        phase: 'apply_damage',
        actorId: 'battle_engine',
        message: 'Resource restored.',
      });
    });
  });
});
