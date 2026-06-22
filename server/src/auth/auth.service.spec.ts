import { BadRequestException, UnauthorizedException } from '@nestjs/common';

import { AuthService } from './auth.service';
import { DatabaseService } from '../database/database.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService();
  });

  it('registers a player and resolves the new bearer session', () => {
    const response = service.register({
      username: 'Magica',
      email: 'MAGICA@example.com',
      password: 'secret123',
    });

    expect(response.user).toMatchObject({
      username: 'Magica',
      email: 'magica@example.com',
      role: 'player',
    });
    expect(response.token).toContain('.');
    expect(service.me(`Bearer ${response.token}`)).toEqual(response.user);
  });

  it('rejects duplicate usernames and emails case-insensitively', () => {
    service.register({
      username: 'Bell',
      email: 'bell@example.com',
      password: 'secret123',
    });

    expect(() =>
      service.register({
        username: 'BELL',
        email: 'other@example.com',
        password: 'secret123',
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      service.register({
        username: 'Other',
        email: 'BELL@example.com',
        password: 'secret123',
      }),
    ).toThrow(BadRequestException);
  });

  it('logs in with either username or email and rejects a wrong password', () => {
    service.register({
      username: 'Liliruca',
      email: 'lili@example.com',
      password: 'correct-password',
    });

    expect(
      service.login({
        identifier: 'liliruca',
        password: 'correct-password',
      }).user.username,
    ).toBe('Liliruca');

    expect(
      service.login({
        identifier: 'LILI@example.com',
        password: 'correct-password',
      }).user.username,
    ).toBe('Liliruca');

    expect(() =>
      service.login({
        identifier: 'Liliruca',
        password: 'wrong-password',
      }),
    ).toThrow(UnauthorizedException);
  });

  it('invalidates a session on logout', () => {
    const response = service.register({
      username: 'Ais',
      email: 'ais@example.com',
      password: 'secret123',
    });

    expect(service.logout(`Bearer ${response.token}`)).toEqual({
      success: true,
    });
    expect(service.me(`Bearer ${response.token}`)).toBeNull();
  });

  it('rejects malformed and expired session tokens', () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

    const response = service.register({
      username: 'Ryuu',
      email: 'ryuu@example.com',
      password: 'secret123',
    });

    expect(service.me('Basic credentials')).toBeNull();
    expect(service.me('Bearer malformed-token')).toBeNull();

    nowSpy.mockReturnValue(1_700_000_000_000 + 8 * 24 * 60 * 60 * 1000);

    expect(service.me(`Bearer ${response.token}`)).toBeNull();

    nowSpy.mockRestore();
  });

  it('waits for user persistence before writing the related session', async () => {
    let resolveUserPersistence: (() => void) | undefined;
    const upsertAuthUser = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveUserPersistence = resolve;
        }),
    );
    const upsertAuthSession = jest.fn().mockResolvedValue(undefined);
    const databaseService = {
      isEnabled: () => true,
      upsertAuthUser,
      upsertAuthSession,
    } as unknown as DatabaseService;
    const persistentService = new AuthService(databaseService);

    const response = persistentService.register({
      username: 'Freya',
      email: 'freya@example.com',
      password: 'secret123',
    });
    const completion = persistentService.completePersistence(response);

    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
    expect(upsertAuthUser).toHaveBeenCalledTimes(1);
    expect(upsertAuthSession).not.toHaveBeenCalled();

    resolveUserPersistence?.();
    await completion;

    expect(upsertAuthSession).toHaveBeenCalledWith(
      response.token,
      response.user.id,
      expect.any(String),
    );
  });

  it('surfaces persistence failures to the request completion', async () => {
    const databaseService = {
      isEnabled: () => true,
      upsertAuthUser: jest
        .fn()
        .mockRejectedValue(new Error('database unavailable')),
      upsertAuthSession: jest.fn().mockResolvedValue(undefined),
    } as unknown as DatabaseService;
    const persistentService = new AuthService(databaseService);
    const response = persistentService.register({
      username: 'Loki',
      email: 'loki@example.com',
      password: 'secret123',
    });

    await expect(
      persistentService.completePersistence(response),
    ).rejects.toThrow('database unavailable');
  });
});
