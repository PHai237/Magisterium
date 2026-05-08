import { Injectable } from '@nestjs/common';

@Injectable()
export class CharacterService {
  ping() {
    return {
      status: 'ok',
      module: 'character',
      message: 'Character module is ready.',
    };
  }
}
