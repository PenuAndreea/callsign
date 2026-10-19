import { lightColors } from '@callsign/theme';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithTheme } from '../../test/renderWithTheme';
import { MessageInput } from './MessageInput';
import type { MessageInputProps } from './MessageInput.types';

/** Owns the draft like a chat screen would, and clears it after sending. */
function Composer(props: Partial<MessageInputProps> & Pick<MessageInputProps, 'onSend'>) {
  const [draft, setDraft] = useState('');
  return (
    <MessageInput
      value={draft}
      onChangeText={setDraft}
      {...props}
      onSend={(text) => {
        props.onSend(text);
        setDraft('');
      }}
    />
  );
}

describe('MessageInput', () => {
  it('has a named message field with the radio placeholder and a Send button', () => {
    renderWithTheme(<Composer onSend={vi.fn()} />);

    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveAttribute(
      'placeholder',
      'Type message. Over.',
    );
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument();
  });

  it('sits on the sheet color', () => {
    renderWithTheme(<Composer onSend={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Send' }).parentElement).toHaveStyle({
      backgroundColor: lightColors.sheet,
    });
  });

  it('sends the trimmed text with the TX button', async () => {
    const onSend = vi.fn();
    renderWithTheme(<Composer onSend={onSend} />);

    await userEvent.type(screen.getByRole('textbox'), '  Roger, holding.  ');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(onSend).toHaveBeenCalledWith('Roger, holding.');
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('sends with the keyboard return key', async () => {
    const onSend = vi.fn();
    renderWithTheme(<Composer onSend={onSend} />);

    await userEvent.type(screen.getByRole('textbox'), 'Copy{Enter}');

    expect(onSend).toHaveBeenCalledWith('Copy');
  });

  it('sends the text in the field on return, even when `value` is a keystroke behind', () => {
    const onSend = vi.fn();
    // `value` not updated yet: Return arrived before the re-render with the last keystroke.
    renderWithTheme(<MessageInput value="Cop" onChangeText={vi.fn()} onSend={onSend} />);
    const field = screen.getByRole<HTMLInputElement>('textbox');
    field.value = 'Copy';

    fireEvent.keyDown(field, { key: 'Enter' });

    expect(onSend).toHaveBeenCalledWith('Copy');
  });

  it('cannot send an empty or blank message', async () => {
    const onSend = vi.fn();
    renderWithTheme(<Composer onSend={onSend} />);

    await userEvent.type(screen.getByRole('textbox'), '   ');
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(onSend).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Send' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('cannot send while disabled', () => {
    const onSend = vi.fn();
    renderWithTheme(<MessageInput value="Copy" onChangeText={vi.fn()} onSend={onSend} disabled />);

    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(onSend).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
  });

  it('passes the length limit to the field', () => {
    renderWithTheme(
      <MessageInput value="" onChangeText={vi.fn()} onSend={vi.fn()} maxLength={1000} />,
    );

    expect(screen.getByRole('textbox')).toHaveAttribute('maxlength', '1000');
  });
});
