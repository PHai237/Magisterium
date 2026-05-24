import { BadRequestException } from '@nestjs/common';

export const USER_ID_HEADER = 'x-user-id';

export const USER_ID_MAX_LENGTH = 128;

export const CHARACTER_NAME_MIN_LENGTH = 3;
export const CHARACTER_NAME_MAX_LENGTH = 20;

export const CHARACTER_NAME_PATTERN =
  /^[\p{L}\p{N}](?:[\p{L}\p{N} '-]{1,18}[\p{L}\p{N}])$/u;

export const CHARACTER_NAME_PATTERN_MESSAGE =
  'Character name may contain only letters, numbers, spaces, apostrophes, or hyphens, and must start and end with a letter or number.';

const INVISIBLE_UNICODE_PATTERN =
  /[\u180E\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/gu;

const WHITESPACE_PATTERN = /\s+/gu;

export function normalizeCharacterNameInput(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  return value
    .normalize('NFKC')
    .replace(INVISIBLE_UNICODE_PATTERN, '')
    .replace(WHITESPACE_PATTERN, ' ')
    .trim();
}

export function normalizeCharacterName(name?: string | null): string {
  const normalizedName = normalizeCharacterNameInput(name);

  if (typeof normalizedName !== 'string' || normalizedName.length === 0) {
    throw new BadRequestException('Character name must not be empty.');
  }

  if (
    normalizedName.length < CHARACTER_NAME_MIN_LENGTH ||
    normalizedName.length > CHARACTER_NAME_MAX_LENGTH
  ) {
    throw new BadRequestException(
      `Character name must be between ${CHARACTER_NAME_MIN_LENGTH} and ${CHARACTER_NAME_MAX_LENGTH} characters.`,
    );
  }

  if (!CHARACTER_NAME_PATTERN.test(normalizedName)) {
    throw new BadRequestException(CHARACTER_NAME_PATTERN_MESSAGE);
  }

  return normalizedName;
}

export function normalizeOptionalCharacterName(
  name?: string | null,
): string | undefined {
  if (name === undefined || name === null) {
    return undefined;
  }

  return normalizeCharacterName(name);
}

export function normalizeRequiredUserId(userId?: string | null): string {
  const normalizedUserId = userId?.trim();

  if (!normalizedUserId) {
    throw new BadRequestException('userId is required.');
  }

  if (normalizedUserId.length > USER_ID_MAX_LENGTH) {
    throw new BadRequestException(
      `userId must not exceed ${USER_ID_MAX_LENGTH} characters.`,
    );
  }

  return normalizedUserId;
}

export function normalizeOptionalUserId(
  userId?: string | null,
): string | undefined {
  const normalizedUserId = userId?.trim();

  if (!normalizedUserId) {
    return undefined;
  }

  if (normalizedUserId.length > USER_ID_MAX_LENGTH) {
    throw new BadRequestException(
      `userId must not exceed ${USER_ID_MAX_LENGTH} characters.`,
    );
  }

  return normalizedUserId;
}
