/// Public URL for a stored object served through the media route handler.
export function mediaUrl(storageKey: string): string {
  return `/api/media/${storageKey}`;
}
