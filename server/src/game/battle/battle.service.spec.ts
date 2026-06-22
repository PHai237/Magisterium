import { BattleService } from './battle.service';
import { DatabaseService } from '../../database/database.service';

import { createCharacterSnapshot } from '../character/character.calculations';

import { createCharacter } from '../character/character.factory';

import {
  createBattleActorFromCharacterSnapshot,
  createBattleState,
  type CharacterBattleSnapshot,
} from './factory/battle.factory';

function createTestCharacterSnapshot(): CharacterBattleSnapshot {
  const character = createCharacter({
    name: 'Magica',
    originId: 'mercenary',
    userId: 'test_user_1',
  });

  return createCharacterSnapshot(character);
}

function createSavedVictoryBattleWithDefeatedSlime(
  service: BattleService,
  character: CharacterBattleSnapshot,
  battleId = 'battle_service_claim_reward_test',
) {
  const characterActor = createBattleActorFromCharacterSnapshot(character);

  const defeatedSlime = {
    ...service.createMonsterActor({
      monsterId: 'slime',
      instanceId: 'slime_1',
    }),
    hp: 0,
  };

  const battle = createBattleState({
    battleId,
    seed: 'battle_service_claim_reward_seed',
    actors: [characterActor, defeatedSlime],
  });

  const victoriousBattle = {
    ...battle,
    status: 'victory' as const,
    activeActorId: undefined,
  };

  return service.saveBattle(victoriousBattle);
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

  describe('claimBattleReward', () => {
    it('should calculate, persist, and return reward for a victorious battle', () => {
      const character = createTestCharacterSnapshot();

      const battle = createSavedVictoryBattleWithDefeatedSlime(
        service,
        character,
      );

      const result = service.claimBattleReward({
        battleId: battle.battleId,
        characterId: character.id,
      });

      expect(result.battle.battleId).toBe(battle.battleId);
      expect(result.battle.rewardClaim).toBeDefined();

      expect(result.battle.rewardClaim).toMatchObject({
        claimedByCharacterId: character.id,
        reward: result.reward,
      });

      expect(result.battle.rewardClaim?.claimedAt).toBeDefined();

      expect(result.reward.moneyBronze).toBeGreaterThanOrEqual(0);

      expect(result.reward.defeatedMonsters).toEqual([
        {
          actorId: 'slime_1',
          monsterId: 'slime',
        },
      ]);

      expect(result.reward.lootRolls.length).toBeGreaterThanOrEqual(0);

      const storedBattle = service.getBattleOrThrow(battle.battleId);

      expect(storedBattle).toBe(result.battle);
      expect(storedBattle.rewardClaim).toEqual(result.battle.rewardClaim);
    });

    it('should reject reward claim when battle is not victorious', () => {
      const character = createTestCharacterSnapshot();

      const battle = service.createBattleFromCharacter({
        battleId: 'battle_service_claim_not_victory_test',
        seed: 'battle_service_claim_not_victory_seed',
        character,
        monsters: [
          {
            monsterId: 'slime',
            instanceId: 'slime_1',
          },
        ],
        autoStart: false,
      });

      expect(() =>
        service.claimBattleReward({
          battleId: battle.battleId,
          characterId: character.id,
        }),
      ).toThrow(`Cannot claim reward while battle is ${battle.status}.`);
    });

    it('should reject duplicate reward claims', () => {
      const character = createTestCharacterSnapshot();

      const battle = createSavedVictoryBattleWithDefeatedSlime(
        service,
        character,
        'battle_service_duplicate_claim_test',
      );

      service.claimBattleReward({
        battleId: battle.battleId,
        characterId: character.id,
      });

      expect(() =>
        service.claimBattleReward({
          battleId: battle.battleId,
          characterId: character.id,
        }),
      ).toThrow(`Battle reward has already been claimed: ${battle.battleId}`);
    });

    it('should reject reward claim when character did not participate in the battle', () => {
      const character = createTestCharacterSnapshot();

      const battle = createSavedVictoryBattleWithDefeatedSlime(
        service,
        character,
        'battle_service_non_participant_claim_test',
      );

      expect(() =>
        service.claimBattleReward({
          battleId: battle.battleId,
          characterId: 'missing_character_actor',
        }),
      ).toThrow(
        `Character actor missing_character_actor did not participate in battle ${battle.battleId}.`,
      );
    });

    it('should reject reward claim when victory battle has no defeated monsters', () => {
      const character = createTestCharacterSnapshot();
      const characterActor = createBattleActorFromCharacterSnapshot(character);

      const livingSlime = service.createMonsterActor({
        monsterId: 'slime',
        instanceId: 'slime_1',
      });

      const battle = createBattleState({
        battleId: 'battle_service_no_defeated_monsters_claim_test',
        seed: 'battle_service_no_defeated_monsters_seed',
        actors: [characterActor, livingSlime],
      });

      const invalidVictoryBattle = service.saveBattle({
        ...battle,
        status: 'victory',
        activeActorId: undefined,
      });

      expect(() =>
        service.claimBattleReward({
          battleId: invalidVictoryBattle.battleId,
          characterId: character.id,
        }),
      ).toThrow(
        `Battle ${invalidVictoryBattle.battleId} has no defeated monsters to reward.`,
      );
    });

    it('should reject reward claim when defeated monster actor has no monsterId', () => {
      const character = createTestCharacterSnapshot();
      const characterActor = createBattleActorFromCharacterSnapshot(character);

      const corruptMonsterActor = {
        ...service.createMonsterActor({
          monsterId: 'slime',
          instanceId: 'corrupt_monster_1',
        }),
        monsterId: undefined,
        hp: 0,
      };

      const battle = createBattleState({
        battleId: 'battle_service_corrupt_monster_claim_test',
        seed: 'battle_service_corrupt_monster_seed',
        actors: [characterActor, corruptMonsterActor],
      });

      const corruptVictoryBattle = service.saveBattle({
        ...battle,
        status: 'victory',
        activeActorId: undefined,
      });

      expect(() =>
        service.claimBattleReward({
          battleId: corruptVictoryBattle.battleId,
          characterId: character.id,
        }),
      ).toThrow(
        'Defeated monster actor corrupt_monster_1 does not have monsterId.',
      );
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

describe('BattleService persistence', () => {
  it('persists battle mutations and hydrates them after restart', async () => {
    const seedService = new BattleService();
    const character = createTestCharacterSnapshot();
    const battle = createSavedVictoryBattleWithDefeatedSlime(
      seedService,
      character,
      'persisted_battle',
    );
    const upsertBattle = jest.fn().mockResolvedValue(undefined);
    const databaseService = {
      isEnabled: () => true,
      loadBattles: jest.fn().mockResolvedValue([battle]),
      upsertBattle,
      deleteBattle: jest.fn().mockResolvedValue(undefined),
    } as unknown as DatabaseService;
    const persistentService = new BattleService(databaseService);

    await persistentService.onModuleInit();

    expect(persistentService.getBattleOrThrow('persisted_battle')).toEqual(
      battle,
    );

    persistentService.saveBattle({
      ...battle,
      updatedAt: new Date().toISOString(),
    });
    await persistentService.flushPersistence();

    expect(upsertBattle).toHaveBeenCalledWith(
      expect.objectContaining({ battleId: 'persisted_battle' }),
    );
  });
});
