import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';

import type { NextFunction, Request, Response } from 'express';

import { AuthService } from './auth.service';

export const USER_ID_HEADER = 'x-user-id';

function readHeaderValue(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

@Injectable()
export class AuthUserScopeMiddleware implements NestMiddleware {
  constructor(private readonly authService: AuthService) {}

  use(request: Request, _response: Response, next: NextFunction): void {
    const authenticatedUser = this.authService.me(
      request.headers.authorization,
    );

    if (!authenticatedUser) {
      throw new UnauthorizedException('Authentication is required.');
    }

    const requestedUserId = readHeaderValue(
      request.headers[USER_ID_HEADER],
    )?.trim();

    if (!requestedUserId) {
      throw new UnauthorizedException(`${USER_ID_HEADER} header is required.`);
    }

    if (requestedUserId !== authenticatedUser.id) {
      throw new UnauthorizedException(
        `${USER_ID_HEADER} does not match authenticated user.`,
      );
    }

    next();
  }
}
