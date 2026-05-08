import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';

import { CharacterService } from './character.service';
import { CreateCharacterDto } from './dto/create-character.dto';

import type { Character } from '../game/character/character.types';

@Controller('characters')
export class CharacterController {
  constructor(private readonly characterService: CharacterService) {}

  @Get('ping')
  ping() {
    return this.characterService.ping();
  }

  @Post()
  create(@Body() createCharacterDto: CreateCharacterDto) {
    return this.characterService.create(createCharacterDto);
  }

  @Get()
  findAll() {
    return this.characterService.findAll();
  }

  @Get('current')
  findCurrent() {
    return this.characterService.findCurrent();
  }

  @Post(':id/current')
  setCurrentCharacter(@Param('id') id: string) {
    return this.characterService.setCurrentCharacter(id);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.characterService.findById(id);
  }

  @Put(':id')
  replaceById(@Param('id') id: string, @Body() character: Character) {
    return this.characterService.replaceById(id, character);
  }

  @Delete(':id')
  deleteById(@Param('id') id: string) {
    return this.characterService.deleteById(id);
  }
}
