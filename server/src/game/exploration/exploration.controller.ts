import { Body, Controller, Headers, Post } from '@nestjs/common';

import {
  normalizeRequiredUserId,
  USER_ID_HEADER,
} from '../../character/character.validation';

import { SearchZoneDto } from './dto/search-zone.dto';
import { ExplorationService } from './exploration.service';

@Controller('exploration')
export class ExplorationController {
  constructor(private readonly explorationService: ExplorationService) {}

  @Post('search')
  searchZone(
    @Body() dto: SearchZoneDto,
    @Headers(USER_ID_HEADER) userIdHeader?: string | string[],
  ) {
    return this.explorationService.searchZone({
      characterId: dto.characterId,
      zoneId: dto.zoneId,
      userId: this.readRequiredUserIdHeader(userIdHeader),
    });
  }

  private readRequiredUserIdHeader(userIdHeader?: string | string[]): string {
    const rawUserId = Array.isArray(userIdHeader)
      ? userIdHeader[0]
      : userIdHeader;

    return normalizeRequiredUserId(rawUserId);
  }
}
