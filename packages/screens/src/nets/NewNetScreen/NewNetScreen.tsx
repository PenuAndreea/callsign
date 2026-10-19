import { isApiClientError, useCreateNet, useSignedInUser } from '@callsign/hooks';
import { createRoomRequestSchema } from '@callsign/types';
import { Button, ScreenHeader, Text } from '@callsign/ui';
import { View } from 'react-native';

import { errorMessage } from '../../errors/errorMessage';
import { formErrorExcept } from '../../errors/formErrorExcept';
import { FormError } from '../../form/FormError';
import { FormInput } from '../../form/FormInput';
import { useFormStyles } from '../../form/form.styles';
import { useZodForm } from '../../form/useZodForm';
import { FormLayout } from '../../layout/FormLayout/FormLayout';
import type { NewNetScreenProps } from './NewNetScreen.types';

/** Opens a public net: only a name (3 to 30 characters). The creator joins it automatically. */
export function NewNetScreen({ onBack, onCreated }: NewNetScreenProps) {
  const styles = useFormStyles();
  const user = useSignedInUser();
  const create = useCreateNet();
  const { control, handleSubmit, setError } = useZodForm(createRoomRequestSchema, { name: '' });

  const submit = handleSubmit((values) =>
    create.mutate(values, {
      onSuccess: (net) => onCreated(net.id),
      onError: (error) => {
        if (isApiClientError(error, 'NET_NAME_TAKEN')) {
          setError('name', { message: errorMessage(error) });
        }
      },
    }),
  );

  return (
    <FormLayout
      header={<ScreenHeader onBack={onBack} eyebrow={`Station ${user.callsign}`} title="New net" />}
    >
      <View style={styles.fields}>
        <FormInput
          control={control}
          name="name"
          label="Net name"
          placeholder="e.g. TOWER AND GROUND"
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={() => void submit()}
        />
        <Text variant="small" tone="textMuted">
          Open to every station: anyone can join and read the history.
        </Text>
      </View>
      <View style={styles.actions}>
        <FormError message={formErrorExcept(create.error, 'NET_NAME_TAKEN')} />
        <Button
          label="Open the net"
          icon="arrowRight"
          loading={create.isPending}
          onPress={() => void submit()}
        />
      </View>
    </FormLayout>
  );
}
