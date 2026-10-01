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

/** Whether the "new versions" switch is on. The player's own choice (`stored` in localStorage, with
 *  `backup` mirrored in the service worker's cache in case local storage is lost) decides; the
 *  browser's permission only switches it off when notifications are blocked. Home-screen apps on
 *  some phones report the permission as 'default' again after a relaunch even though it was granted. */
export function noticesOn(stored: string | null, backup: string | null, permission: NotificationPermission): boolean {
  return (stored ?? backup) === '1' && permission !== 'denied';
}
