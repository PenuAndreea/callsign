import { ChatScreen } from '@callsign/screens';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { goBackOr } from '@/navigation/goBackOr';

export default function Chat() {
  const router = useRouter();
  const { netId } = useLocalSearchParams<{ netId: string }>();
  const toList = () => goBackOr(router, '/');
  return <ChatScreen key={netId} netId={netId} onBack={toList} onLeft={toList} />;
}
