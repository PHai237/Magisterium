import { BadRequestException, UnauthorizedException } from '@nestjs/common';

import { AuthService } from './auth.service';

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
});
