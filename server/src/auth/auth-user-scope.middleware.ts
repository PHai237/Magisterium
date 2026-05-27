import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';

import type { NextFunction, Request, Response } from 'express';

import { AuthService } from './auth.service';

export const USER_ID_HEADER = 'x-user-id';

const PUBLIC_AUTH_PATHS = new Set([
  '/auth/register',
  '/auth/login',
  '/auth/me',
  '/auth/logout',
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/me',
  '/api/auth/logout',
]);

const PUBLIC_PATHS = new Set(['/health', '/api/health']);

function readHeaderValue(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function normalizeRequestPath(request: Request): string {
  const rawPath =
    request.path ||
    request.originalUrl?.split('?')[0] ||
    request.url?.split('?')[0] ||
    '/';

  if (rawPath.length > 1 && rawPath.endsWith('/')) {
    return rawPath.slice(0, -1);
  }

  return rawPath;
}

function isPublicRequest(request: Request): boolean {
  if (request.method.toUpperCase() === 'OPTIONS') {
    return true;
  }

  const path = normalizeRequestPath(request);

  return PUBLIC_PATHS.has(path) || PUBLIC_AUTH_PATHS.has(path);
}

@Injectable()
export class AuthUserScopeMiddleware implements NestMiddleware {
  constructor(private readonly authService: AuthService) {}

  use(request: Request, _response: Response, next: NextFunction): void {
    if (isPublicRequest(request)) {
      next();
      return;
    }

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
