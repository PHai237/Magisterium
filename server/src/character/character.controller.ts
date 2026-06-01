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
import { InventoryItemActionDto } from './dto/inventory-item-action.dto';
import { InventoryItemQuantityDto } from './dto/inventory-item-quantity.dto';
import { UpdateCharacterDto } from './dto/update-character.dto';
import { PreviewCharacterDto } from './dto/preview-character.dto';

import {
  normalizeRequiredUserId,
  USER_ID_HEADER,
} from './character.validation';

import type { ItemId } from '../game/character/character.types';

@Controller('characters')
export class CharacterController {
  constructor(private readonly characterService: CharacterService) {}

  @Get('ping')
  ping() {
    return this.characterService.ping();
  }

  @Post('preview')
  preview(
    @Body() previewCharacterDto: PreviewCharacterDto,
    @Headers(USER_ID_HEADER) userIdHeader?: string | string[],
  ) {
    this.readRequiredUserIdHeader(userIdHeader);

    return this.characterService.createPreview(previewCharacterDto);
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

  @Get(':id/inventory')
  getInventoryStacks(
    @Param('id') id: string,
    @Headers(USER_ID_HEADER) userIdHeader?: string | string[],
  ) {
    return this.characterService.getInventoryStacks(
      id,
      this.readRequiredUserIdHeader(userIdHeader),
    );
  }

  @Get(':id/inventory/:itemId/count')
  countInventoryItem(
    @Param('id') id: string,
    @Param('itemId') itemId: ItemId,
    @Headers(USER_ID_HEADER) userIdHeader?: string | string[],
  ) {
    return {
      itemId,
      quantity: this.characterService.countInventoryItem(
        id,
        this.readRequiredUserIdHeader(userIdHeader),
        itemId,
      ),
    };
  }

  @Post(':id/inventory/items')
  addInventoryItem(
    @Param('id') id: string,
    @Body() dto: InventoryItemQuantityDto,
    @Headers(USER_ID_HEADER) userIdHeader?: string | string[],
  ) {
    return this.characterService.addInventoryItem(
      id,
      this.readRequiredUserIdHeader(userIdHeader),
      dto.itemId,
      dto.quantity,
    );
  }

  @Post(':id/inventory/items/remove')
  removeInventoryItem(
    @Param('id') id: string,
    @Body() dto: InventoryItemQuantityDto,
    @Headers(USER_ID_HEADER) userIdHeader?: string | string[],
  ) {
    return this.characterService.removeInventoryItem(
      id,
      this.readRequiredUserIdHeader(userIdHeader),
      dto.itemId,
      dto.quantity,
    );
  }

  @Post(':id/equipment/equip')
  equipInventoryItem(
    @Param('id') id: string,
    @Body() dto: InventoryItemActionDto,
    @Headers(USER_ID_HEADER) userIdHeader?: string | string[],
  ) {
    return this.characterService.equipInventoryItem(
      id,
      this.readRequiredUserIdHeader(userIdHeader),
      dto.itemId,
    );
  }

  @Post(':id/equipment/unequip')
  unequipInventoryItem(
    @Param('id') id: string,
    @Body() dto: InventoryItemActionDto,
    @Headers(USER_ID_HEADER) userIdHeader?: string | string[],
  ) {
    return this.characterService.unequipInventoryItem(
      id,
      this.readRequiredUserIdHeader(userIdHeader),
      dto.itemId,
    );
  }

  @Post(':id/consumables/use')
  useConsumableItemOutOfBattle(
    @Param('id') id: string,
    @Body() dto: InventoryItemActionDto,
    @Headers(USER_ID_HEADER) userIdHeader?: string | string[],
  ) {
    return this.characterService.useConsumableItemOutOfBattle(
      id,
      this.readRequiredUserIdHeader(userIdHeader),
      dto.itemId,
    );
  }

  @Post(':id/inn/rest')
  restAtInn(
    @Param('id') id: string,
    @Headers(USER_ID_HEADER) userIdHeader?: string | string[],
  ) {
    return this.characterService.restAtInn(
      id,
      this.readRequiredUserIdHeader(userIdHeader),
    );
  }

  @Post(':id/inn/rest/pass')
  restAtInnWithPass(
    @Param('id') id: string,
    @Headers(USER_ID_HEADER) userIdHeader?: string | string[],
  ) {
    return this.characterService.restAtInnWithPass(
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
