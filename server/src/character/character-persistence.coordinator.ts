import { Logger } from '@nestjs/common';

import type { DatabaseService } from '../database/database.service';
import type { Character } from '../game/character/character.types';

export class CharacterPersistenceCoordinator {
  private readonly scheduledCharacterVersions = new Map<string, number>();
  private readonly persistenceChains = new Map<string, Promise<void>>();
  private readonly pendingPersistence = new Set<Promise<void>>();
  private readonly logger = new Logger(CharacterPersistenceCoordinator.name);

  constructor(private readonly databaseService?: DatabaseService) {}

  async flush(): Promise<void> {
    await Promise.all(Array.from(this.pendingPersistence));
  }

  resetVersions(characters: readonly Character[]): void {
    this.scheduledCharacterVersions.clear();

    for (const character of characters) {
      this.scheduledCharacterVersions.set(character.id, character.version);
    }
  }

  forgetCharacter(characterId: string): void {
    this.scheduledCharacterVersions.delete(characterId);
  }

  clearVersions(): void {
    this.scheduledCharacterVersions.clear();
  }

  restoreVersion(
    character: Character | null | undefined,
    characterId: string,
  ): void {
    if (character) {
      this.scheduledCharacterVersions.set(characterId, character.version);
      return;
    }

    this.scheduledCharacterVersions.delete(characterId);
  }

  persistCharacter(character: Character, onFailure: () => Promise<void>): void {
    const scheduledVersion = this.scheduledCharacterVersions.get(character.id);
    const expectedVersion = scheduledVersion;
    character.version =
      scheduledVersion === undefined
        ? Math.max(1, character.version)
        : scheduledVersion + 1;
    this.scheduledCharacterVersions.set(character.id, character.version);

    if (!this.databaseService?.isEnabled()) {
      return;
    }

    this.queue(`character:${character.id}`, async () => {
      try {
        await this.databaseService!.saveCharacter(character, expectedVersion);
      } catch (error) {
        await onFailure();
        throw error;
      }
    });
  }

  deleteCharacter(characterId: string): void {
    if (!this.databaseService?.isEnabled()) {
      return;
    }

    this.queue(`character:${characterId}`, () =>
      this.databaseService!.deleteCharacter(characterId),
    );
  }

  setCurrentCharacter(userId: string, characterId: string): void {
    if (!this.databaseService?.isEnabled()) {
      return;
    }

    this.queue(`current-character:${userId}`, () =>
      this.databaseService!.setCurrentCharacter(userId, characterId),
    );
  }

  deleteCurrentCharacter(userId: string): void {
    if (!this.databaseService?.isEnabled()) {
      return;
    }

    this.queue(`current-character:${userId}`, () =>
      this.databaseService!.deleteCurrentCharacter(userId),
    );
  }

  clearCharacterState(): void {
    if (!this.databaseService?.isEnabled()) {
      return;
    }

    this.queue('characters:clear', () =>
      this.databaseService!.clearCharacterState(),
    );
  }

  private queue(key: string, operation: () => Promise<void>): void {
    const chainKey = 'character-state';
    const previous = this.persistenceChains.get(chainKey) ?? Promise.resolve();
    const trackedPromise: Promise<void> = previous
      .then(operation)
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : 'Unknown database error.';
        this.logger.error(`Persistence operation ${key} failed: ${message}`);
        throw error;
      })
      .finally(() => {
        this.pendingPersistence.delete(trackedPromise);
        if (this.persistenceChains.get(chainKey) === trackedPromise) {
          this.persistenceChains.delete(chainKey);
        }
      });

    this.persistenceChains.set(chainKey, trackedPromise);
    this.pendingPersistence.add(trackedPromise);
  }
}
