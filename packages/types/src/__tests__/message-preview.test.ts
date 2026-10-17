import { describe, expect, it } from 'vitest';

import { MESSAGE_PREVIEW_LENGTH, toMessagePreview } from '../message-preview';

describe('toMessagePreview', () => {
  it('keeps short content as it is', () => {
    expect(toMessagePreview('Radio check. Over.')).toBe('Radio check. Over.');
  });

  it('keeps content of exactly the maximum length', () => {
    const content = 'a'.repeat(MESSAGE_PREVIEW_LENGTH);
    expect(toMessagePreview(content)).toBe(content);
  });

  it('cuts longer content to the maximum, ending in an ellipsis', () => {
    const preview = toMessagePreview('a'.repeat(MESSAGE_PREVIEW_LENGTH + 1));
    expect(Array.from(preview)).toHaveLength(MESSAGE_PREVIEW_LENGTH);
    expect(preview.endsWith('…')).toBe(true);
  });

  it('never cuts an emoji in half', () => {
    const preview = toMessagePreview('📻'.repeat(MESSAGE_PREVIEW_LENGTH + 5));
    expect(preview).toBe(`${'📻'.repeat(MESSAGE_PREVIEW_LENGTH - 1)}…`);
  });
});
