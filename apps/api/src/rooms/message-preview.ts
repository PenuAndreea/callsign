export const MESSAGE_PREVIEW_LENGTH = 80;

/**
 * The nets-list preview of a message: at most `MESSAGE_PREVIEW_LENGTH` characters, ending in
 * `…` when cut. Counts code points, not UTF-16 units, so an emoji is never cut in half.
 */
export function toMessagePreview(content: string): string {
  const chars = Array.from(content);
  if (chars.length <= MESSAGE_PREVIEW_LENGTH) return content;
  return `${chars.slice(0, MESSAGE_PREVIEW_LENGTH - 1).join('')}…`;
}
