import { isApiClientError, useRegister } from '@callsign/hooks';
import { registerFormSchema } from '@callsign/types';
import { Button, IconButton, Masthead, Text } from '@callsign/ui';
import { View } from 'react-native';

import { errorMessage } from '../../errors/errorMessage';
import { formErrorExcept } from '../../errors/formErrorExcept';
import { FormError } from '../../form/FormError';
import { FormInput } from '../../form/FormInput';
import { useZodForm } from '../../form/useZodForm';
import { FormLayout } from '../../layout/FormLayout/FormLayout';
import { useFormStyles } from '../../form/form.styles';
import { useRegisterStyles } from './RegisterScreen.styles';
import type { RegisterScreenProps } from './RegisterScreen.types';

/** "Request clearance": a new station. Registering signs in, like login. */
export function RegisterScreen({ onBack, onSignIn }: RegisterScreenProps) {
  const styles = useRegisterStyles();
  const formStyles = useFormStyles();
  const register = useRegister();
  const { control, handleSubmit, setError } = useZodForm(registerFormSchema, {
    callsign: '',
    passphrase: '',
    confirmPassphrase: '',
  });

  // The confirmation stays in the form: the API never receives it.
  const submit = handleSubmit(({ callsign, passphrase }) =>
    register.mutate(
      { callsign, passphrase },
      {
        onError: (error) => {
          if (isApiClientError(error, 'CALLSIGN_TAKEN')) {
            setError('callsign', { message: errorMessage(error) });
          }
        },
      },
    ),
  );
  // A taken callsign shows under its field instead.
  const formError = formErrorExcept(register.error, 'CALLSIGN_TAKEN');

  return (
    <FormLayout
      header={
        <View style={styles.header}>
          <IconButton icon="chevronLeft" aria-label="Back" onPress={onBack} />
          <Text variant="meta" style={styles.formId}>
            Form 2 · New station
          </Text>
        </View>
      }
      footer="Keep the net clear. Be brief. Be kind. Over."
    >
      <Masthead title="Register" subtitle="Join the net as a new station" />
      <View style={formStyles.fields}>
        <FormInput
          control={control}
          name="callsign"
          label="Callsign"
          placeholder="e.g. WOLF-2"
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="username"
          returnKeyType="next"
        />
        <FormInput
          control={control}
          name="passphrase"
          label="Passphrase"
          placeholder="At least 8 characters"
          secureTextEntry
          autoComplete="new-password"
          returnKeyType="next"
        />
        <FormInput
          control={control}
          name="confirmPassphrase"
          label="Confirm passphrase"
          placeholder="Repeat passphrase"
          secureTextEntry
          autoComplete="new-password"
          returnKeyType="go"
          onSubmitEditing={() => void submit()}
        />
      </View>
      <View style={formStyles.actions}>
        <FormError message={formError} />
        <Button
          label="Request clearance"
          icon="arrowRight"
          loading={register.isPending}
          onPress={() => void submit()}
        />
        <Button label="Already on the net? Report in" variant="link" onPress={onSignIn} />
      </View>
    </FormLayout>
  );
}
