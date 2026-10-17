import { NetsScreen, NewNetScreen } from '@callsign/screens';
import { useNavigate } from 'react-router';

export const netPath = (id: string) => `/nets/${encodeURIComponent(id)}`;

export function NetsRoute() {
  const navigate = useNavigate();
  return (
    <NetsScreen
      onOpenNet={(id) => void navigate(netPath(id))}
      onNewNet={() => void navigate('/nets/new')}
    />
  );
}

export function NewNetRoute() {
  const navigate = useNavigate();
  return (
    <NewNetScreen
      // Not history back: a deep link to /nets/new would leave the app.
      onBack={() => void navigate('/')}
      // Replace: back from the new net goes to the list, not to the filled-in form.
      onCreated={(id) => void navigate(netPath(id), { replace: true })}
    />
  );
}
