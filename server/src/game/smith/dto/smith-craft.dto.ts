import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

const RECIPE_ID_MAX_LENGTH = 80;

function normalizeRecipeIdInput(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  return value.normalize('NFKC').trim();
}

export class SmithCraftDto {
  @Transform(({ value }) => normalizeRecipeIdInput(value))
  @IsString()
  @IsNotEmpty({ message: 'Recipe id must not be empty.' })
  @MaxLength(RECIPE_ID_MAX_LENGTH, {
    message: `Recipe id must not exceed ${RECIPE_ID_MAX_LENGTH} characters.`,
  })
  recipeId!: string;
}
