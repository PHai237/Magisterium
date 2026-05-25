import { Transform } from 'class-transformer';

import { IsNotEmpty, IsString, Length, MaxLength } from 'class-validator';

const IDENTIFIER_MAX_LENGTH = 254;
const PASSWORD_MIN_LENGTH = 6;
const PASSWORD_MAX_LENGTH = 128;

function normalizeIdentifierInput(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  return value.normalize('NFKC').trim();
}

export class LoginAuthDto {
  @Transform(({ value }) => normalizeIdentifierInput(value))
  @IsString()
  @IsNotEmpty({
    message: 'Username or email must not be empty.',
  })
  @MaxLength(IDENTIFIER_MAX_LENGTH, {
    message: `Username or email must not exceed ${IDENTIFIER_MAX_LENGTH} characters.`,
  })
  identifier!: string;

  @IsString()
  @IsNotEmpty({
    message: 'Password must not be empty.',
  })
  @Length(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, {
    message: `Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters.`,
  })
  password!: string;
}
