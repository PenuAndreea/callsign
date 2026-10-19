import { ChatScreen, ScreenErrorBoundary } from '@callsign/screens';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { goBackOr } from '@/navigation/goBackOr';

export default function Chat() {
  const router = useRouter();
  const { netId } = useLocalSearchParams<{ netId: string }>();
  const toList = () => goBackOr(router, '/');
  return (
    // Keyed per net: a fresh draft, and a crashed chat starts over on another net. The crash
    // screen keeps a way back, since the chat's own header (and back button) is gone with it.
    <ScreenErrorBoundary key={netId} onBack={toList}>
      <ChatScreen netId={netId} onBack={toList} onLeft={toList} />
    </ScreenErrorBoundary>
  );
}
