import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
} from '@nestjs/common';

import { CharacterService } from '../../character/character.service';

import {
  normalizeRequiredUserId,
  USER_ID_HEADER,
} from '../../character/character.validation';

import { BattleService } from './battle.service';

import { ClaimBattleRewardDto } from './dto/claim-battle-reward.dto';
import { CreateBattleDto } from './dto/create-battle.dto';
import { ResolveBattleActionDto } from './dto/resolve-battle-action.dto';

@Controller('battles')
export class BattleController {
  constructor(
    private readonly battleService: BattleService,
    private readonly characterService: CharacterService,
  ) {}

  @Post()
  createBattle(
    @Body() dto: CreateBattleDto,
    @Headers(USER_ID_HEADER) userIdHeader?: string | string[],
  ) {
    const userId = this.readRequiredUserIdHeader(userIdHeader);
    const character = this.characterService.findByIdForUserScope(
      dto.characterId,
      userId,
    );

    if (dto.encounterId && dto.monsters && dto.monsters.length > 0) {
      throw new BadRequestException(
        'Battle creation accepts either encounterId or monsters, not both.',
      );
    }

    if (dto.encounterId) {
      return this.completeBattlePersistence(
        this.battleService.createBattleFromEncounter({
          battleId: dto.battleId,
          seed: dto.seed,
          character,
          encounterId: dto.encounterId,
          autoStart: dto.autoStart,
          autoResolveMonsterTurns: dto.autoResolveMonsterTurns,
        }),
      );
    }

    if (!dto.monsters || dto.monsters.length === 0) {
      throw new BadRequestException(
        'Battle creation requires either encounterId or monsters.',
      );
    }

    return this.completeBattlePersistence(
      this.battleService.createBattleFromCharacter({
        battleId: dto.battleId,
        seed: dto.seed,
        character,
        monsters: dto.monsters,
        autoStart: dto.autoStart,
        autoResolveMonsterTurns: dto.autoResolveMonsterTurns,
      }),
    );
  }

  @Get()
  listBattles(@Headers(USER_ID_HEADER) userIdHeader?: string | string[]) {
    return this.completeBattlePersistence(
      this.battleService.listBattlesForUserScope(
        this.readRequiredUserIdHeader(userIdHeader),
      ),
    );
  }

  @Get(':battleId')
  getBattle(
    @Param('battleId') battleId: string,
    @Headers(USER_ID_HEADER) userIdHeader?: string | string[],
  ) {
    return this.battleService.getBattleOrThrowForUserScope(
      battleId,
      this.readRequiredUserIdHeader(userIdHeader),
    );
  }

  @Post(':battleId/actions')
  resolveAction(
    @Param('battleId') battleId: string,
    @Body() dto: ResolveBattleActionDto,
    @Headers(USER_ID_HEADER) userIdHeader?: string | string[],
  ) {
    return this.completeBattlePersistence(
      this.battleService.resolveActionForUserScope(
        {
          battleId,
          actorId: dto.actorId,
          targetIds: dto.targetIds ?? [],
          actionType: dto.actionType,
          skillId: dto.skillId,
          itemId: dto.itemId,
          autoResolveMonsterTurns: dto.autoResolveMonsterTurns,
        },
        this.readRequiredUserIdHeader(userIdHeader),
      ),
    );
  }

  @Post(':battleId/reward/claim')
  claimReward(
    @Param('battleId') battleId: string,
    @Body() dto: ClaimBattleRewardDto,
    @Headers(USER_ID_HEADER) userIdHeader?: string | string[],
  ) {
    const userId = this.readRequiredUserIdHeader(userIdHeader);
    const character = this.characterService.findByIdForUserScope(
      dto.characterId,
      userId,
    );

    const preparedClaim = this.battleService.prepareBattleRewardClaim({
      battleId,
      characterId: character.id,
      userId,
    });

    const battleCharacterActor = preparedClaim.characterActor;

    const committedClaim = this.battleService.commitBattleRewardClaim({
      battleId,
      characterId: character.id,
      userId,
      reward: preparedClaim.reward,
    });

    const applyRewardAndPersist = () => {
      const appliedReward = this.characterService.applyBattleReward(
        character.id,
        userId,
        preparedClaim.reward,
        {
          battleStartingInventoryItemIds:
            battleCharacterActor.battleStartInventoryItemIds,
          battleInventoryItemIds: battleCharacterActor.inventoryItemIds,
          battleCurrentState: {
            hp: battleCharacterActor.hp,
            mp: battleCharacterActor.mp,
            stamina: battleCharacterActor.stamina,
          },
        },
      );

      const response = {
        battle: committedClaim.battle,
        character: appliedReward.character,
        reward: appliedReward.reward,
      };
      return this.completeCharacterPersistence(response);
    };

    const rollbackClaim = async (error: unknown): Promise<never> => {
      this.battleService.rollbackBattleRewardClaim({
        battleId,
        characterId: character.id,
        userId,
      });
      await this.completeBattlePersistence(undefined);
      throw error;
    };

    const battlePersistence = this.completeBattlePersistence(committedClaim);

    if (battlePersistence instanceof Promise) {
      return battlePersistence
        .then(() => applyRewardAndPersist())
        .catch((error: unknown) => rollbackClaim(error));
    }

    try {
      return applyRewardAndPersist();
    } catch (error) {
      this.battleService.rollbackBattleRewardClaim({
        battleId,
        characterId: character.id,
        userId,
      });
      throw error;
    }
  }

  @Delete(':battleId')
  deleteBattle(
    @Param('battleId') battleId: string,
    @Headers(USER_ID_HEADER) userIdHeader?: string | string[],
  ) {
    return this.completeBattlePersistence({
      deleted: this.battleService.deleteBattleForUserScope(
        battleId,
        this.readRequiredUserIdHeader(userIdHeader),
      ),
    });
  }

  private readRequiredUserIdHeader(userIdHeader?: string | string[]): string {
    const rawUserId = Array.isArray(userIdHeader)
      ? userIdHeader[0]
      : userIdHeader;

    return normalizeRequiredUserId(rawUserId);
  }

  private completeBattlePersistence<T>(result: T): T | Promise<T> {
    return typeof this.battleService.completePersistence === 'function'
      ? this.battleService.completePersistence(result)
      : result;
  }

  private completeCharacterPersistence<T>(result: T): T | Promise<T> {
    return typeof this.characterService.completePersistence === 'function'
      ? this.characterService.completePersistence(result)
      : result;
  }
}
