// src/utils/svgSelection.ts

import type { StrokeGroup } from '@mytypes/glyphEditor';

/**
 * Expand a list of selected stroke IDs by group membership:
 * if any stroke of a group is selected, the whole group becomes selected.
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
      const hasAny = g.strokeIds.some(id => idSet.has(id));
      if (!hasAny) continue;

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
