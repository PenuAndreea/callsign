import { createRef } from 'react';
import type { TextInput } from 'react-native';
import { darkColors, lightColors } from '@callsign/theme';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderWithTheme } from '../../test/renderWithTheme';
import { Input } from './Input';

describe('Input', () => {
  it('is a text field named by its label, with the label shown above it', () => {
    renderWithTheme(<Input label="Callsign" placeholder="e.g. WOLF-2" />);

    expect(screen.getByRole('textbox', { name: 'Callsign' })).toBeInTheDocument();
    expect(screen.getByText('Callsign')).toBeVisible();
  });

  it('can keep the label for screen readers only', () => {
    renderWithTheme(<Input label="Message" variant="chat" hideLabel />);

    expect(screen.getByRole('textbox', { name: 'Message' })).toBeInTheDocument();
    expect(screen.queryByText('Message')).not.toBeInTheDocument();
  });

  it('reports typed text', async () => {
    const onChangeText = vi.fn();
    renderWithTheme(<Input label="Callsign" onChangeText={onChangeText} />);

    await userEvent.type(screen.getByRole('textbox'), 'WOLF-2');

    expect(onChangeText).toHaveBeenLastCalledWith('WOLF-2');
  });

  it('renders the form variant on the surface and the chat variant on the inset color', () => {
    renderWithTheme(
      <>
        <Input label="Callsign" />
        <Input label="Message" variant="chat" hideLabel />
      </>,
      { scheme: 'dark' },
    );

    expect(screen.getByRole('textbox', { name: 'Callsign' })).toHaveStyle({
      backgroundColor: darkColors.surface,
    });
    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveStyle({
      backgroundColor: darkColors.surfaceInset,
    });
  });

  it('shows a primary border while focused and still calls onFocus and onBlur', () => {
    const onFocus = vi.fn();
    const onBlur = vi.fn();
    renderWithTheme(<Input label="Callsign" onFocus={onFocus} onBlur={onBlur} />);
    const field = screen.getByRole('textbox');

    fireEvent.focus(field);
    expect(field).toHaveStyle({ borderColor: lightColors.primary });
    expect(onFocus).toHaveBeenCalledTimes(1);

    fireEvent.blur(field);
    expect(field).not.toHaveStyle({ borderColor: lightColors.primary });
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('announces an error and marks the field invalid', () => {
    renderWithTheme(<Input label="Callsign" error="Callsign taken" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Callsign taken');
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('textbox')).toHaveStyle({ borderColor: lightColors.danger });
  });

  it('passes its ref to the field, so another field can focus it', () => {
    const ref = createRef<TextInput>();
    renderWithTheme(<Input label="Passphrase" ref={ref} />);

    ref.current?.focus();
    expect(screen.getByLabelText('Passphrase')).toHaveFocus();
  });
});
