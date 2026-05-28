import { Module } from '@nestjs/common';

import { CharacterModule } from '../../character/character.module';

import { ExplorationController } from './exploration.controller';
import { ExplorationService } from './exploration.service';

@Module({
  imports: [CharacterModule],
  controllers: [ExplorationController],
  providers: [ExplorationService],
})
export class ExplorationModule {}
