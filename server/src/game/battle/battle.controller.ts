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

@Controller('battles')
export class BattleController {
  constructor(
    private readonly battleService: BattleService,
    private readonly characterService: CharacterService,
  ) {}

  @Post()
  createBattle(@Body() dto: CreateBattleDto) {
    const character = this.characterService.findById(dto.characterId);

    if (
      dto.userId &&
      character.userId &&
      character.userId.trim() !== dto.userId.trim()
    ) {
      throw new BadRequestException(
        `Character ${dto.characterId} does not belong to user scope ${dto.userId}.`,
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
}
