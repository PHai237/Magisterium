import { Module } from '@nestjs/common';

import { CharacterModule } from '../../character/character.module';
import { SmithController } from './smith.controller';
import { SmithService } from './smith.service';

@Module({
  imports: [CharacterModule],
  controllers: [SmithController],
  providers: [SmithService],
  exports: [SmithService],
})
export class SmithModule {}
