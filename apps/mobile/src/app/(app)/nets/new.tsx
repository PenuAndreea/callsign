import { NewNetScreen } from '@callsign/screens';
import { useRouter } from 'expo-router';

import { goBackOr } from '@/navigation/goBackOr';

export default function NewNet() {
  const router = useRouter();
  return (
    <NewNetScreen
      onBack={() => goBackOr(router, '/')}
      // Replace: back from the new net goes to the list, not to the filled-in form.
      onCreated={(id) => router.replace({ pathname: '/nets/[netId]', params: { netId: id } })}
    />
  );
}
