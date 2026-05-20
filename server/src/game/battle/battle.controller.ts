import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from '@nestjs/common';

import { CharacterService } from '../../character/character.service';

import { BattleService } from './battle.service';

import { CreateBattleDto } from './dto/create-battle.dto';
import { ResolveBattleActionDto } from './dto/resolve-battle-action.dto';

import type { CharacterSnapshot } from '../character/character.types';

@Controller('battles')
export class BattleController {
  constructor(
    private readonly battleService: BattleService,
    private readonly characterService: CharacterService,
  ) {}

  @Post()
  createBattle(@Body() dto: CreateBattleDto) {
    const character = this.characterService.findById(dto.characterId);

    this.assertCharacterCanBeUsedForBattle(character, dto.userId);

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
  listBattles() {
    return this.battleService.listBattles();
  }

  @Get(':battleId')
  getBattle(@Param('battleId') battleId: string) {
    return this.battleService.getBattleOrThrow(battleId);
  }

  @Post(':battleId/actions')
  resolveAction(
    @Param('battleId') battleId: string,
    @Body() dto: ResolveBattleActionDto,
  ) {
    return this.battleService.resolveAction({
      battleId,
      actorId: dto.actorId,
      targetIds: dto.targetIds ?? [],
      actionType: dto.actionType,
      skillId: dto.skillId,
      itemId: dto.itemId,
      autoResolveMonsterTurns: dto.autoResolveMonsterTurns,
    });
  }

  @Delete(':battleId')
  deleteBattle(@Param('battleId') battleId: string) {
    return {
      deleted: this.battleService.deleteBattle(battleId),
    };
  }

  private assertCharacterCanBeUsedForBattle(
    character: CharacterSnapshot,
    requestUserId?: string,
  ): void {
    const characterUserId = character.userId.trim();
    const normalizedRequestUserId = requestUserId?.trim();

    if (!normalizedRequestUserId) {
      throw new BadRequestException('userId is required to create a battle.');
    }

    if (!characterUserId) {
      throw new BadRequestException(
        `Character ${character.id} does not have an owner user scope.`,
      );
    }

    if (characterUserId !== normalizedRequestUserId) {
      throw new BadRequestException(
        `Character ${character.id} does not belong to user scope ${normalizedRequestUserId}.`,
      );
    }
  }
}
