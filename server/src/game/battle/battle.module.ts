import { Module } from '@nestjs/common';

import { CharacterModule } from '../../character/character.module';

import { BattleController } from './battle.controller';
import { BattleService } from './battle.service';

@Module({
  imports: [CharacterModule],
  controllers: [BattleController],
  providers: [BattleService],
  exports: [BattleService],
})
export class BattleModule {}
