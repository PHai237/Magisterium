import { Module } from '@nestjs/common';

import { CharacterModule } from '../../character/character.module';

import { MarketController } from './market.controller';
import { MarketService } from './market.service';

@Module({
  imports: [CharacterModule],
  controllers: [MarketController],
  providers: [MarketService],
})
export class MarketModule {}
