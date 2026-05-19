import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';

import { CharacterService } from './character.service';

import { CreateCharacterDto } from './dto/create-character.dto';
import { UpdateCharacterDto } from './dto/update-character.dto';

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
  findAll(@Query('userId') userId?: string) {
    return this.characterService.findAll(userId);
  }

  @Get('current')
  findCurrent(@Query('userId') userId?: string) {
    return this.characterService.findCurrent(userId);
  }

  @Post(':id/current')
  setCurrentCharacter(
    @Param('id') id: string,
    @Query('userId') userId?: string,
  ) {
    return this.characterService.setCurrentCharacter(id, userId);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.characterService.findById(id);
  }

  @Put(':id')
  updateById(
    @Param('id') id: string,
    @Body() updateCharacterDto: UpdateCharacterDto,
  ) {
    return this.characterService.updateById(id, updateCharacterDto);
  }

  @Delete(':id')
  deleteById(@Param('id') id: string) {
    return this.characterService.deleteById(id);
  }
}
