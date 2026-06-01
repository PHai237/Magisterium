import { forwardRef, Module } from '@nestjs/common';

import { CharacterController } from './character.controller';
import { CharacterService } from './character.service';

import { BattleModule } from '../game/battle/battle.module';

@Module({
  imports: [forwardRef(() => BattleModule)],
  controllers: [CharacterController],
  providers: [CharacterService],
  exports: [CharacterService],
})
export class CharacterModule {}
