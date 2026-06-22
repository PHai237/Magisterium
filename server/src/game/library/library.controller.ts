import { Controller, Get, Headers, Param } from '@nestjs/common';

import {
  normalizeRequiredUserId,
  USER_ID_HEADER,
} from '../../character/character.validation';
import { LibraryService } from './library.service';

@Controller('library')
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  @Get(':characterId/bestiary')
  getBestiary(
    @Param('characterId') characterId: string,
    @Headers(USER_ID_HEADER) userIdHeader?: string | string[],
  ) {
    const rawUserId = Array.isArray(userIdHeader)
      ? userIdHeader[0]
      : userIdHeader;

    return this.libraryService.getBestiary(
      characterId,
      normalizeRequiredUserId(rawUserId),
    );
  }
}
