import { Body, Controller, Get, Headers, Post } from '@nestjs/common';

import {
  normalizeRequiredUserId,
  USER_ID_HEADER,
} from '../../character/character.validation';

import { MarketTransactionDto } from './dto/market-transaction.dto';
import { MarketService } from './market.service';

@Controller('market')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Get('catalog')
  getCatalog() {
    return this.marketService.getCatalog();
  }

  @Post('buy')
  buyItem(
    @Body() dto: MarketTransactionDto,
    @Headers(USER_ID_HEADER) userIdHeader?: string | string[],
  ) {
    return this.marketService.buyItem({
      characterId: dto.characterId,
      itemId: dto.itemId,
      quantity: dto.quantity,
      userId: this.readRequiredUserIdHeader(userIdHeader),
    });
  }

  @Post('sell')
  sellItem(
    @Body() dto: MarketTransactionDto,
    @Headers(USER_ID_HEADER) userIdHeader?: string | string[],
  ) {
    return this.marketService.sellItem({
      characterId: dto.characterId,
      itemId: dto.itemId,
      quantity: dto.quantity,
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
