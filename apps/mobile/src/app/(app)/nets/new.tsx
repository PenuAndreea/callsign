import { NewNetScreen, ScreenErrorBoundary } from '@callsign/screens';
import { useRouter } from 'expo-router';

import { goBackOr } from '@/navigation/goBackOr';

export default function NewNet() {
  const router = useRouter();
  const toList = () => goBackOr(router, '/');
  return (
    <ScreenErrorBoundary onBack={toList}>
      <NewNetScreen
        onBack={toList}
        // Replace: back from the new net goes to the list, not to the filled-in form.
        onCreated={(id) => router.replace({ pathname: '/nets/[netId]', params: { netId: id } })}
      />
    </ScreenErrorBoundary>
  );
}
