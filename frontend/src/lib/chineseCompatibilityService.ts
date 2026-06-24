import { apiRequest } from './apiClient';
import type { ChineseAnimal, ChineseCompatibilityResult } from './types';

export async function compareAnimals(
  animal1: ChineseAnimal,
  animal2: ChineseAnimal,
): Promise<ChineseCompatibilityResult> {
  return apiRequest<ChineseCompatibilityResult>('/api/chinese/compatibility/signs', {
    method: 'POST',
    auth: true,
    body: { animal1, animal2 },
  });
}
