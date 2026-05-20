import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Put,
} from '@nestjs/common';

import { CharacterService } from './character.service';

import { CreateCharacterDto } from './dto/create-character.dto';
import { UpdateCharacterDto } from './dto/update-character.dto';

import {
  normalizeRequiredUserId,
  USER_ID_HEADER,
} from './character.validation';

@Controller('characters')
export class CharacterController {
  constructor(private readonly characterService: CharacterService) {}

  @Get('ping')
  ping() {
    return this.characterService.ping();
  }

  @Post()
  create(
    @Body() createCharacterDto: CreateCharacterDto,
    @Headers(USER_ID_HEADER) userIdHeader?: string | string[],
  ) {
    return this.characterService.create({
      ...createCharacterDto,
      userId: this.readRequiredUserIdHeader(userIdHeader),
    });
  }

  @Get()
  findAll(@Headers(USER_ID_HEADER) userIdHeader?: string | string[]) {
    return this.characterService.findAll(
      this.readRequiredUserIdHeader(userIdHeader),
    );
  }

  @Get('current')
  findCurrent(@Headers(USER_ID_HEADER) userIdHeader?: string | string[]) {
    return this.characterService.findCurrent(
      this.readRequiredUserIdHeader(userIdHeader),
    );
  }

  @Post(':id/current')
  setCurrentCharacter(
    @Param('id') id: string,
    @Headers(USER_ID_HEADER) userIdHeader?: string | string[],
  ) {
    return this.characterService.setCurrentCharacter(
      id,
      this.readRequiredUserIdHeader(userIdHeader),
    );
  }

  @Get(':id')
  findById(
    @Param('id') id: string,
    @Headers(USER_ID_HEADER) userIdHeader?: string | string[],
  ) {
    return this.characterService.findByIdForUserScope(
      id,
      this.readRequiredUserIdHeader(userIdHeader),
    );
  }

  @Put(':id')
  updateById(
    @Param('id') id: string,
    @Body() updateCharacterDto: UpdateCharacterDto,
    @Headers(USER_ID_HEADER) userIdHeader?: string | string[],
  ) {
    return this.characterService.updateById(
      id,
      updateCharacterDto,
      this.readRequiredUserIdHeader(userIdHeader),
    );
  }

  @Delete(':id')
  deleteById(
    @Param('id') id: string,
    @Headers(USER_ID_HEADER) userIdHeader?: string | string[],
  ) {
    return this.characterService.deleteById(
      id,
      this.readRequiredUserIdHeader(userIdHeader),
    );
  }

  private readRequiredUserIdHeader(userIdHeader?: string | string[]): string {
    const rawUserId = Array.isArray(userIdHeader)
      ? userIdHeader[0]
      : userIdHeader;

    return normalizeRequiredUserId(rawUserId);
  }
}
