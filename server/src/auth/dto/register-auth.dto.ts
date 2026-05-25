import { Transform } from 'class-transformer';

import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 24;
const PASSWORD_MIN_LENGTH = 6;
const PASSWORD_MAX_LENGTH = 128;
const EMAIL_MAX_LENGTH = 254;

const USERNAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

function normalizeTextInput(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  return value.normalize('NFKC').trim();
}

function normalizeEmailInput(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  return value.normalize('NFKC').trim().toLowerCase();
}

export class RegisterAuthDto {
  @Transform(({ value }) => normalizeTextInput(value))
  @IsString()
  @IsNotEmpty({
    message: 'Username must not be empty.',
  })
  @Length(USERNAME_MIN_LENGTH, USERNAME_MAX_LENGTH, {
    message: `Username must be between ${USERNAME_MIN_LENGTH} and ${USERNAME_MAX_LENGTH} characters.`,
  })
  @Matches(USERNAME_PATTERN, {
    message:
      'Username may contain only letters, numbers, underscores, or hyphens.',
  })
  username!: string;

  @Transform(({ value }) => normalizeEmailInput(value))
  @IsString()
  @IsNotEmpty({
    message: 'Email must not be empty.',
  })
  @MaxLength(EMAIL_MAX_LENGTH, {
    message: `Email must not exceed ${EMAIL_MAX_LENGTH} characters.`,
  })
  @IsEmail(
    {},
    {
      message: 'Email must be valid.',
    },
  )
  email!: string;

  @IsString()
  @IsNotEmpty({
    message: 'Password must not be empty.',
  })
  @Length(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, {
    message: `Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters.`,
  })
  password!: string;
}
