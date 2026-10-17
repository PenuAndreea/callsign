import { useLogin } from '@callsign/hooks';
import { loginRequestSchema } from '@callsign/types';
import { Button, Masthead } from '@callsign/ui';
import { View } from 'react-native';

import { errorMessage } from '../../errors/errorMessage';
import { FormError } from '../../form/FormError';
import { FormInput } from '../../form/FormInput';
import { useZodForm } from '../../form/useZodForm';
import { FormLayout } from '../../layout/FormLayout/FormLayout';
import { useFormStyles } from '../../form/form.styles';
import type { SignInScreenProps } from './SignInScreen.types';

/** "Report in": callsign + passphrase. On success the session is signed in; the app's guard moves on. */
export function SignInScreen({ onRegister }: SignInScreenProps) {
  const styles = useFormStyles();
  const login = useLogin();
  const { control, handleSubmit } = useZodForm(loginRequestSchema, {
    callsign: '',
    passphrase: '',
  });
  const submit = handleSubmit((values) => login.mutate(values));

  return (
    <FormLayout>
      <Masthead title="Callsign" subtitle="Field radio · Flight and ground" />
      <View style={styles.fields}>
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
          placeholder="Enter passphrase"
          secureTextEntry
          autoComplete="current-password"
          returnKeyType="go"
          onSubmitEditing={() => void submit()}
        />
      </View>
      <View style={styles.actions}>
        <FormError message={login.error ? errorMessage(login.error) : undefined} />
        <Button
          label="Report in"
          icon="arrowRight"
          loading={login.isPending}
          onPress={() => void submit()}
        />
        <Button label="New station? Register here" variant="link" onPress={onRegister} />
      </View>
    </FormLayout>
  );
}
