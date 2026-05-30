import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';

import { SanctuaryStatDto } from './dto/sanctuary-stat.dto';
import { SanctuaryService } from './sanctuary.service';

import {
  normalizeRequiredUserId,
  USER_ID_HEADER,
} from '../../character/character.validation';

@Controller('sanctuary')
export class SanctuaryController {
  constructor(private readonly sanctuaryService: SanctuaryService) {}

  @Get(':characterId/status')
  getStatus(
    @Param('characterId') characterId: string,
    @Headers(USER_ID_HEADER) userIdHeader?: string | string[],
  ) {
    return this.sanctuaryService.getStatus(
      characterId,
      this.readRequiredUserIdHeader(userIdHeader),
    );
  }

  @Post(':characterId/refine-rune')
  refineRune(
    @Param('characterId') characterId: string,
    @Body() dto: SanctuaryStatDto,
    @Headers(USER_ID_HEADER) userIdHeader?: string | string[],
  ) {
    return this.sanctuaryService.refineRune(
      characterId,
      this.readRequiredUserIdHeader(userIdHeader),
      dto.statKey,
      dto.quantity,
    );
  }

  @Post(':characterId/imbue-rune')
  imbueRune(
    @Param('characterId') characterId: string,
    @Body() dto: SanctuaryStatDto,
    @Headers(USER_ID_HEADER) userIdHeader?: string | string[],
  ) {
    return this.sanctuaryService.imbueRune(
      characterId,
      this.readRequiredUserIdHeader(userIdHeader),
      dto.statKey,
      dto.quantity,
    );
  }

  @Post(':characterId/rank-up')
  rankUp(
    @Param('characterId') characterId: string,
    @Headers(USER_ID_HEADER) userIdHeader?: string | string[],
  ) {
    return this.sanctuaryService.rankUp(
      characterId,
      this.readRequiredUserIdHeader(userIdHeader),
    );
  }

  private readRequiredUserIdHeader(userIdHeader?: string | string[]): string {
    const rawUserId = Array.isArray(userIdHeader)
      ? userIdHeader[0]
      : userIdHeader;

    return normalizeRequiredUserId(rawUserId);
  }
}
