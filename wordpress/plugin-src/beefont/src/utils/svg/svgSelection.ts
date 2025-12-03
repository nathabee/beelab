// src/utils/svg/svgSelection.ts

import type { StrokeGroup } from '@mytypes/glyphEditor';

/**
 * Expand a selection of stroke IDs by group membership.
 *
 * If any stroke of a group is selected, the whole group becomes selected.
 *
 * This is exactly what you previously had inline as expandWithGroups().
 */
export function expandSelectionWithGroups(
  ids: string[],
  groups: StrokeGroup[],
): string[] {
  if (!ids.length || !groups.length) return ids;

  const idSet = new Set(ids);
  let changed = true;

  while (changed) {
    changed = false;

    for (const g of groups) {
      const inGroup = g.strokeIds.some(id => idSet.has(id));
      if (!inGroup) continue;

      for (const id of g.strokeIds) {
        if (!idSet.has(id)) {
          idSet.add(id);
          changed = true;
        }
      }
    }
  }

  return Array.from(idSet);
}
