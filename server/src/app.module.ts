import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { CharacterModule } from './character/character.module';
import { BattleModule } from './game/battle/battle.module';

@Module({
  imports: [CharacterModule, BattleModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
