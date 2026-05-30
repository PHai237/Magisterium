import { Module } from '@nestjs/common';

import { CharacterModule } from '../../character/character.module';

import { SanctuaryController } from './sanctuary.controller';
import { SanctuaryService } from './sanctuary.service';

@Module({
  imports: [CharacterModule],
  controllers: [SanctuaryController],
  providers: [SanctuaryService],
})
export class SanctuaryModule {}
