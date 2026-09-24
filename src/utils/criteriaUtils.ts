import { Criterion } from '../types';

/**
 * Normalizes an array of criteria so their `order` fields are strictly
 * sequential starting from 1 upwards (1, 2, 3, ... N) without gaps or duplicates.
 */
export function normalizeCriteriaOrders(list: Criterion[]): Criterion[] {
  if (!Array.isArray(list) || list.length === 0) return [];

  // Sort primarily by order, then fallback to name or code
  const sorted = [...list].sort((a, b) => {
    const orderA = typeof a.order === 'number' && !isNaN(a.order) && a.order > 0 ? a.order : 9999;
    const orderB = typeof b.order === 'number' && !isNaN(b.order) && b.order > 0 ? b.order : 9999;
    if (orderA !== orderB) return orderA - orderB;
    return (a.name || '').localeCompare(b.name || '');
  });

  // Re-index strictly from 1 upwards: 1, 2, 3, ... N
  return sorted.map((item, index) => ({
    ...item,
    order: index + 1
  }));
}

/**
 * Reorders a criterion to a target sequence number (1-based),
 * shifting other criteria and renormalizing the entire list to 1, 2, ... N.
 */
export function reorderCriterionToPosition(
  list: Criterion[],
  criterionId: string,
  targetOrder: number
): Criterion[] {
  if (!Array.isArray(list) || list.length === 0) return [];
  const currentList = normalizeCriteriaOrders(list);

  const currentIndex = currentList.findIndex(c => c.criterionId === criterionId);
  if (currentIndex === -1) return currentList;

  // Clamp target index between 0 and currentList.length - 1
  const targetIndex = Math.max(0, Math.min(currentList.length - 1, targetOrder - 1));
  if (currentIndex === targetIndex) return currentList;

  // Remove the item from its current position
  const [movedItem] = currentList.splice(currentIndex, 1);
  // Insert at target index
  currentList.splice(targetIndex, 0, movedItem);

  // Normalize all orders strictly 1, 2, 3... N
  return currentList.map((item, idx) => ({
    ...item,
    order: idx + 1
  }));
}

/**
 * Moves a criterion up by 1 step in sequence (swap with previous item),
 * ensuring the list remains strictly sequential starting from 1 upwards.
 */
export function moveCriterionUp(list: Criterion[], criterionId: string): Criterion[] {
  const currentList = normalizeCriteriaOrders(list);
  const idx = currentList.findIndex(c => c.criterionId === criterionId);
  if (idx <= 0) return currentList; // Already first item

  const temp = currentList[idx - 1];
  currentList[idx - 1] = currentList[idx];
  currentList[idx] = temp;

  return currentList.map((item, i) => ({
    ...item,
    order: i + 1
  }));
}

/**
 * Moves a criterion down by 1 step in sequence (swap with next item),
 * ensuring the list remains strictly sequential starting from 1 upwards.
 */
export function moveCriterionDown(list: Criterion[], criterionId: string): Criterion[] {
  const currentList = normalizeCriteriaOrders(list);
  const idx = currentList.findIndex(c => c.criterionId === criterionId);
  if (idx === -1 || idx >= currentList.length - 1) return currentList; // Already last item

  const temp = currentList[idx + 1];
  currentList[idx + 1] = currentList[idx];
  currentList[idx] = temp;

  return currentList.map((item, i) => ({
    ...item,
    order: i + 1
  }));
}
