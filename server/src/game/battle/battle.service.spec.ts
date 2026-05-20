import { BattleService } from './battle.service';

import { createCharacterSnapshot } from '../character/character.calculations';

import { createCharacter } from '../character/character.factory';

import type { CharacterBattleSnapshot } from './factory/battle.factory';

function createTestCharacterSnapshot(): CharacterBattleSnapshot {
  const character = createCharacter({
    name: 'Magica',
    originId: 'mercenary',
    userId: 'test_user_1',
  });

  return createCharacterSnapshot(character);
}

describe('BattleService', () => {
  let service: BattleService;

  beforeEach(() => {
    service = new BattleService();
  });

  afterEach(() => {
    service.clearBattles();
  });

  describe('createBattleFromCharacter', () => {
    it('should create and auto-start a battle from a character snapshot and monster definitions', () => {
      const character = createTestCharacterSnapshot();

      const battle = service.createBattleFromCharacter({
        battleId: 'battle_service_create_test',
        seed: 'battle_service_seed',
        character,
        monsters: [
          {
            monsterId: 'slime',
            instanceId: 'slime_1',
          },
        ],
      });

      expect(battle.battleId).toBe('battle_service_create_test');
      expect(battle.status).toBe('in_progress');

      expect(battle.actors[character.id]).toBeDefined();
      expect(battle.actors.slime_1).toBeDefined();

      expect(battle.actors[character.id].actorType).toBe('character');
      expect(battle.actors.slime_1.actorType).toBe('monster');

      expect(battle.activeActorId).toBeDefined();

      expect(battle.events.map((event) => event.type)).toEqual(
        expect.arrayContaining([
          'BATTLE_STARTED',
          'ROUND_STARTED',
          'TURN_STARTED',
        ]),
      );

      expect(service.getBattle('battle_service_create_test')).toBe(battle);
    });

    it('should create a battle without auto-starting when autoStart is false', () => {
      const character = createTestCharacterSnapshot();

      const battle = service.createBattleFromCharacter({
        battleId: 'battle_service_created_only_test',
        seed: 'battle_service_created_only_seed',
        character,
        monsters: [
          {
            monsterId: 'slime',
            instanceId: 'slime_1',
          },
        ],
        autoStart: false,
      });

      expect(battle.status).toBe('created');
      expect(battle.activeActorId).toBeUndefined();
      expect(battle.turnNumber).toBe(0);
      expect(battle.events).toEqual([]);

      expect(service.getBattle('battle_service_created_only_test')).toBe(
        battle,
      );
    });

    it('should throw when creating a character battle without monsters', () => {
      const character = createTestCharacterSnapshot();

      expect(() =>
        service.createBattleFromCharacter({
          battleId: 'battle_service_no_monster_test',
          seed: 'battle_service_no_monster_seed',
          character,
          monsters: [],
        }),
      ).toThrow('Cannot create a battle without monsters.');
    });
  });

  describe('createMonsterActor', () => {
    it('should create a monster actor through the monster factory', () => {
      const monster = service.createMonsterActor({
        monsterId: 'goblin',
        instanceId: 'goblin_1',
      });

      expect(monster.actorId).toBe('goblin_1');
      expect(monster.actorType).toBe('monster');
      expect(monster.hp).toBe(45);
      expect(monster.derivedStats.pAtk).toBe(13);
    });
  });

  describe('getBattleOrThrow', () => {
    it('should return a stored battle', () => {
      const character = createTestCharacterSnapshot();

      const battle = service.createBattleFromCharacter({
        battleId: 'battle_service_get_test',
        seed: 'battle_service_get_seed',
        character,
        monsters: [
          {
            monsterId: 'slime',
            instanceId: 'slime_1',
          },
        ],
      });

      expect(service.getBattleOrThrow(battle.battleId)).toBe(battle);
    });

    it('should throw when battle does not exist', () => {
      expect(() => service.getBattleOrThrow('missing_battle')).toThrow(
        'Battle not found: missing_battle',
      );
    });
  });

  describe('resolveAction', () => {
    it('should resolve an action and persist the updated battle state', () => {
      const character = createTestCharacterSnapshot();

      const battle = service.createBattleFromCharacter({
        battleId: 'battle_service_action_test',
        seed: 'battle_service_action_seed',
        character,
        monsters: [
          {
            monsterId: 'slime',
            instanceId: 'slime_1',
          },
        ],
      });

      const activeActorId = battle.activeActorId;

      if (!activeActorId) {
        throw new Error('Expected battle to have an active actor.');
      }

      const result = service.resolveAction({
        battleId: battle.battleId,
        actorId: activeActorId,
        targetIds: [],
        actionType: 'skip_turn',
      });

      expect(result.actionResult.phase).toBe('completed');

      expect(result.actionResult.events.map((event) => event.type)).toContain(
        'TURN_ENDED',
      );

      const storedBattle = service.getBattleOrThrow(battle.battleId);

      expect(storedBattle).toBe(result.battleState);
      expect(storedBattle.turnNumber).toBeGreaterThan(battle.turnNumber);
    });

    it('should throw when resolving action for a missing battle', () => {
      expect(() =>
        service.resolveAction({
          battleId: 'missing_battle',
          actorId: 'hero',
          targetIds: [],
          actionType: 'skip_turn',
        }),
      ).toThrow('Battle not found: missing_battle');
    });
  });

  describe('deleteBattle and clearBattles', () => {
    it('should delete a stored battle', () => {
      const character = createTestCharacterSnapshot();

      const battle = service.createBattleFromCharacter({
        battleId: 'battle_service_delete_test',
        seed: 'battle_service_delete_seed',
        character,
        monsters: [
          {
            monsterId: 'slime',
            instanceId: 'slime_1',
          },
        ],
      });

      expect(service.getBattle(battle.battleId)).toBeDefined();

      expect(service.deleteBattle(battle.battleId)).toBe(true);
      expect(service.getBattle(battle.battleId)).toBeUndefined();
    });

    it('should clear all stored battles', () => {
      const character = createTestCharacterSnapshot();

      service.createBattleFromCharacter({
        battleId: 'battle_service_clear_test_1',
        seed: 'battle_service_clear_seed_1',
        character,
        monsters: [
          {
            monsterId: 'slime',
            instanceId: 'slime_1',
          },
        ],
      });

      service.createBattleFromCharacter({
        battleId: 'battle_service_clear_test_2',
        seed: 'battle_service_clear_seed_2',
        character,
        monsters: [
          {
            monsterId: 'goblin',
            instanceId: 'goblin_1',
          },
        ],
      });

      expect(service.listBattles()).toHaveLength(2);

      service.clearBattles();

      expect(service.listBattles()).toHaveLength(0);
    });
  });
});
