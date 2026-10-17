import { zodResolver } from '@hookform/resolvers/zod';
import type { DefaultValues, FieldValues, UseFormReturn } from 'react-hook-form';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

/**
 * `useForm` validated by a shared schema. Fields hold what the user typed (`TInput`); submit
 * handlers get the parsed output (trimmed, lowercased), exactly what the API validates. Errors
 * show after the first submit, then update as the user types.
 */
export function useZodForm<TInput extends FieldValues, TOutput extends FieldValues>(
  schema: z.ZodType<TOutput, TInput>,
  defaultValues: DefaultValues<TInput>,
): UseFormReturn<TInput, unknown, TOutput> {
  return useForm<TInput, unknown, TOutput>({ resolver: zodResolver(schema), defaultValues });
}
