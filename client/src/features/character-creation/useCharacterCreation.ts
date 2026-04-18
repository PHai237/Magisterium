import { useCallback, useMemo, useState } from 'react';

import { LOCAL_STORAGE_KEYS } from './constants';
import {
  buildBaseStatsForClass,
  buildDerivedStats,
  createCharacter,
  getClassById,
} from './calculations';
import type { Character, ClassId, GiftId } from './types';

export function useCharacterCreation() {
  const [name, setName] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<ClassId | ''>('');
  const [selectedGiftId, setSelectedGiftId] = useState<GiftId | ''>('');

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [createdCharacter, setCreatedCharacter] = useState<Character | null>(null);

  const selectedClass = useMemo(() => {
    if (!selectedClassId) return null;
    return getClassById(selectedClassId);
  }, [selectedClassId]);

  const previewBaseStats = useMemo(() => {
    if (!selectedClass) return null;
    return buildBaseStatsForClass(selectedClass);
  }, [selectedClass]);

  const previewDerivedStats = useMemo(() => {
    if (!previewBaseStats) return null;
    return buildDerivedStats(previewBaseStats);
  }, [previewBaseStats]);

  const canCreate = useMemo(() => {
    return (
      name.trim().length >= 2 &&
      selectedClassId !== '' &&
      selectedGiftId !== ''
    );
  }, [name, selectedClassId, selectedGiftId]);

  const saveCharacter = useCallback((character: Character) => {
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.currentCharacter,
      JSON.stringify(character),
    );

    const archiveRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.characterArchive);
    const archive: Character[] = archiveRaw ? JSON.parse(archiveRaw) : [];

    archive.push(character);

    localStorage.setItem(
      LOCAL_STORAGE_KEYS.characterArchive,
      JSON.stringify(archive),
    );
  }, []);

  const handleCreateCharacter = useCallback((): Character | null => {
    setErrorMessage('');
    setSuccessMessage('');

    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      setErrorMessage('Character name must contain at least 2 characters.');
      return null;
    }

    if (!selectedClassId) {
      setErrorMessage('Please select a class.');
      return null;
    }

    if (!selectedGiftId) {
      setErrorMessage('Please select a starter gift.');
      return null;
    }

    const character = createCharacter({
      name: trimmedName,
      classId: selectedClassId,
      giftId: selectedGiftId,
    });

    saveCharacter(character);
    setCreatedCharacter(character);
    setSuccessMessage(`Character "${character.name}" has been created successfully.`);

    return character;
  }, [name, saveCharacter, selectedClassId, selectedGiftId]);

  const resetForm = useCallback(() => {
    setName('');
    setSelectedClassId('');
    setSelectedGiftId('');
    setErrorMessage('');
    setSuccessMessage('');
    setCreatedCharacter(null);
  }, []);

  return {
    name,
    setName,
    selectedClassId,
    setSelectedClassId,
    selectedGiftId,
    setSelectedGiftId,
    selectedClass,
    previewBaseStats,
    previewDerivedStats,
    canCreate,
    errorMessage,
    successMessage,
    createdCharacter,
    handleCreateCharacter,
    resetForm,
  };
}