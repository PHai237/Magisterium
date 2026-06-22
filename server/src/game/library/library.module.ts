import { Module } from '@nestjs/common';

import { CharacterModule } from '../../character/character.module';
import { LibraryController } from './library.controller';
import { LibraryService } from './library.service';

@Module({
  imports: [CharacterModule],
  controllers: [LibraryController],
  providers: [LibraryService],
})
export class LibraryModule {}
