import {
  ForbiddenException,
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';

import type { NextFunction, Request, Response } from 'express';

import { USER_ID_HEADER } from '../character/character.validation';
import { AuthService } from './auth.service';

const PUBLIC_PATHS = new Set(['/health', '/api/health']);

const PUBLIC_PATH_PREFIXES = ['/auth', '/api/auth'];

function readHeaderValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isPublicPath(path: string): boolean {
  if (PUBLIC_PATHS.has(path)) {
    return true;
  }

  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

@Injectable()
export class AuthUserScopeMiddleware implements NestMiddleware {
  constructor(private readonly authService: AuthService) {}

  use(request: Request, _response: Response, next: NextFunction): void {
    if (isPublicPath(request.path)) {
      next();
      return;
    }

    const authorizationHeader = readHeaderValue(request.headers.authorization);

    const session = this.authService.me(authorizationHeader);

    if (!session) {
      throw new UnauthorizedException('Authentication is required.');
    }

    const requestedUserId = readHeaderValue(
      request.headers[USER_ID_HEADER],
    )?.trim();

    if (requestedUserId && requestedUserId !== session.id) {
      throw new ForbiddenException(
        'x-user-id does not match the authenticated session user.',
      );
    }

    request.headers[USER_ID_HEADER] = session.id;

    next();
  }
}
