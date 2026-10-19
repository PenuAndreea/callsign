import { ThemeProvider } from '@callsign/ui';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { FormError } from './FormError';
import { FormInput } from './FormInput';
import { useZodForm } from './useZodForm';

const schema = z.object({ name: z.string().trim().toLowerCase().min(3, 'Too short') });

function NameForm({ onValid }: { onValid: (values: { name: string }) => void }) {
  const { control, handleSubmit } = useZodForm(schema, { name: '' });
  return (
    <>
      <FormInput control={control} name="name" label="Name" />
      <button type="button" onClick={() => void handleSubmit(onValid)()}>
        Submit
      </button>
    </>
  );
}

const renderForm = (onValid = vi.fn()) => {
  render(
    <ThemeProvider>
      <NameForm onValid={onValid} />
    </ThemeProvider>,
  );
  return onValid;
};

describe('FormInput with useZodForm', () => {
  it('shows the schema message on submit and clears it once the value is valid', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByText('Too short')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAttribute('aria-invalid', 'true');

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'tower');
    expect(screen.queryByText('Too short')).not.toBeInTheDocument();
  });

  it('submits the parsed output, not the raw input', async () => {
    const user = userEvent.setup();
    const onValid = renderForm();

    await user.type(screen.getByRole('textbox', { name: 'Name' }), '  TOWER ');
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onValid.mock.calls[0]?.[0]).toEqual({ name: 'tower' });
  });
});

describe('FormError', () => {
  it('announces a message and renders nothing without one', () => {
    const { rerender } = render(
      <ThemeProvider>
        <FormError message="No contact" />
      </ThemeProvider>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('No contact');

    rerender(
      <ThemeProvider>
        <FormError message={undefined} />
      </ThemeProvider>,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
