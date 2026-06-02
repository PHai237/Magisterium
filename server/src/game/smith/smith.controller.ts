import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';

import { normalizeRequiredUserId, USER_ID_HEADER } from '../../character/character.validation';
import { SmithCraftDto } from './dto/smith-craft.dto';
import { SmithService } from './smith.service';

@Controller('smith')
export class SmithController {
  constructor(private readonly smithService: SmithService) {}

  @Get(':characterId/recipes')
  getRecipes(
    @Param('characterId') characterId: string,
    @Headers(USER_ID_HEADER) userIdHeader?: string | string[],
  ) {
    return this.smithService.getRecipes(
      characterId,
      this.readRequiredUserIdHeader(userIdHeader),
    );
  }

  @Post(':characterId/craft')
  craft(
    @Param('characterId') characterId: string,
    @Body() dto: SmithCraftDto,
    @Headers(USER_ID_HEADER) userIdHeader?: string | string[],
  ) {
    return this.smithService.craft(
      characterId,
      this.readRequiredUserIdHeader(userIdHeader),
      dto.recipeId,
    );
  }

  private readRequiredUserIdHeader(userIdHeader?: string | string[]): string {
    const rawUserId = Array.isArray(userIdHeader)
      ? userIdHeader[0]
      : userIdHeader;

    return normalizeRequiredUserId(rawUserId);
  }
}
