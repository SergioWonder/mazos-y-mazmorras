// Version rules for players: only MAJOR releases (first semver number) show the
// "what's new" window and raise a system notification. Pure, testable in node.

export interface ChangelogEntry { version: string; fecha: string; cambios: string[] }

export const majorOf = (version: string): number => parseInt(version, 10) || 0;

/** True when going from `previous` to `current` crosses a major version. The
 *  first run ever (no previous version) is not an upgrade. */
export function isMajorUpgrade(previous: string | null, current: string): boolean {
  return previous !== null && majorOf(current) > majorOf(previous);
}

/** Every changelog entry of the current major line (newest first). */
export function majorChangelog<T extends ChangelogEntry>(changelog: T[], current: string): T[] {
  return changelog.filter((e) => majorOf(e.version) === majorOf(current));
}

/** Notify about `remote` if it is a newer major than the installed one and we
 *  have not notified that exact version yet. */
export function shouldNotifyMajor(installed: string, remote: string, lastNotified: string | null): boolean {
  return majorOf(remote) > majorOf(installed) && lastNotified !== remote;
}
