import { useLeaveNet, useNet } from '@callsign/hooks';
import { errorMessage, stationsLabel } from '@callsign/screens';
import { Button, ScreenHeader, Text } from '@callsign/ui';
import { View } from 'react-native';
import { useNavigate, useParams } from 'react-router';

import { useNetRouteStyles } from './NetRoute.styles';

// Temporary net page for M5 step 4 (header and Leave); the chat screen replaces it in step 6.
export function NetRoute() {
  const styles = useNetRouteStyles();
  const navigate = useNavigate();
  const { netId = '' } = useParams();
  const { data: net, error } = useNet(netId);
  const leave = useLeaveNet();
  const back = () => void navigate('/');

  return (
    <View style={styles.screen}>
      <ScreenHeader
        onBack={back}
        eyebrow="Net"
        title={net?.name ?? ''}
        {...(net && { subtitle: `${stationsLabel(net.memberCount)} on net` })}
        truncateTitle
        action={
          <Button
            label="Leave"
            variant="link"
            loading={leave.isPending}
            onPress={() => leave.mutate(netId, { onSuccess: back })}
          />
        }
      />
      {(error ?? leave.error) && (
        <Text variant="body" tone="dangerText" role="alert">
          {errorMessage(error ?? leave.error)}
        </Text>
      )}
    </View>
  );
}
