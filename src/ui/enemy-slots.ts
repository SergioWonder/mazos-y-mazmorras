/**
 * Fixed enemy slots for the combat screen (pure, no DOM).
 *
 * Slots are listed left to right. Each enemy keeps the slot it got at the start of the
 * fight; a dead enemy keeps its slot as an invisible gap so the others do not shift.
 * A newcomer (a boss summon, a creature released on death) takes the leftmost gap
 * left by a dead enemy; when there is none it is added on the left, which leaves the
 * right-aligned enemy group in place.
 */
export function layoutSlots<T>(prev: readonly T[], enemies: readonly T[], alive: (e: T) => boolean): T[] {
  const slots = prev.filter((e) => enemies.includes(e));
  const newcomers = enemies.filter((e) => !slots.includes(e));
  if (slots.length === 0) return [...newcomers];
  for (const e of newcomers) {
    const gap = slots.findIndex((s) => !alive(s));
    if (gap >= 0) slots[gap] = e;
    else slots.unshift(e);
  }
  return slots;
}
