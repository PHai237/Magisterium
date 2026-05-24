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
      return this.battleService.createBattleFromEncounter({
        battleId: dto.battleId,
        seed: dto.seed,
        character,
        encounterId: dto.encounterId,
        autoStart: dto.autoStart,
        autoResolveMonsterTurns: dto.autoResolveMonsterTurns,
      });
    }

    if (!dto.monsters || dto.monsters.length === 0) {
      throw new BadRequestException(
        'Battle creation requires either encounterId or monsters.',
      );
    }

    return this.battleService.createBattleFromCharacter({
      battleId: dto.battleId,
      seed: dto.seed,
      character,
      monsters: dto.monsters,
      autoStart: dto.autoStart,
      autoResolveMonsterTurns: dto.autoResolveMonsterTurns,
    });
  }

  @Get()
  listBattles(@Headers(USER_ID_HEADER) userIdHeader?: string | string[]) {
    return this.battleService.listBattlesForUserScope(
      this.readRequiredUserIdHeader(userIdHeader),
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
    return this.battleService.resolveActionForUserScope(
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

    const committedClaim = this.battleService.commitBattleRewardClaim({
      battleId,
      characterId: character.id,
      userId,
      reward: preparedClaim.reward,
    });

    return {
      battle: committedClaim.battle,
      character: appliedReward.character,
      reward: appliedReward.reward,
      progression: appliedReward.progression,
    };
  }

  @Delete(':battleId')
  deleteBattle(
    @Param('battleId') battleId: string,
    @Headers(USER_ID_HEADER) userIdHeader?: string | string[],
  ) {
    return {
      deleted: this.battleService.deleteBattleForUserScope(
        battleId,
        this.readRequiredUserIdHeader(userIdHeader),
      ),
    };
  }

  private readRequiredUserIdHeader(userIdHeader?: string | string[]): string {
    const rawUserId = Array.isArray(userIdHeader)
      ? userIdHeader[0]
      : userIdHeader;

    return normalizeRequiredUserId(rawUserId);
  }
}
