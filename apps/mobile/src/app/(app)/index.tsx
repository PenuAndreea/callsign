import { NetsScreen } from '@callsign/screens';
import { useRouter } from 'expo-router';

export default function Nets() {
  const router = useRouter();
  return (
    <NetsScreen
      onOpenNet={(id) => router.push({ pathname: '/nets/[netId]', params: { netId: id } })}
      onNewNet={() => router.push('/nets/new')}
    />
  );
}
