import type { InputProps } from '@callsign/ui';
import { Input } from '@callsign/ui';
import type { Control, FieldValues, Path } from 'react-hook-form';
import { Controller } from 'react-hook-form';

export interface FormInputProps<TValues extends FieldValues, TOutput> extends Omit<
  InputProps,
  'value' | 'onChangeText' | 'onBlur' | 'error'
> {
  control: Control<TValues, unknown, TOutput>;
  /** A string field of the form. */
  name: Path<TValues>;
}

/** `Input` bound to a react-hook-form field: value, change, blur and the field's error message. */
export function FormInput<TValues extends FieldValues, TOutput>({
  control,
  name,
  ...inputProps
}: FormInputProps<TValues, TOutput>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Input
          {...inputProps}
          value={typeof field.value === 'string' ? field.value : ''}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          {...(fieldState.error?.message !== undefined && { error: fieldState.error.message })}
        />
      )}
    />
  );
}
