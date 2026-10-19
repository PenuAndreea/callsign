import { ChatScreen, NetsScreen, NewNetScreen } from '@callsign/screens';
import { useNavigate, useOutletContext, useParams } from 'react-router';

import type { NetsLayoutContext } from './NetsLayout';

export const netPath = (id: string) => `/nets/${encodeURIComponent(id)}`;

interface NetsRouteProps {
  selectedNetId?: string;
}

export function NetsRoute({ selectedNetId }: NetsRouteProps) {
  const navigate = useNavigate();
  return (
    <NetsScreen
      onOpenNet={(id) => void navigate(netPath(id))}
      onNewNet={() => void navigate('/nets/new')}
      {...(selectedNetId !== undefined && { selectedNetId })}
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

export function ChatRoute() {
  const navigate = useNavigate();
  const { split } = useOutletContext<NetsLayoutContext>();
  const { netId = '' } = useParams();
  const toList = () => void navigate('/');
  return (
    <ChatScreen
      // A fresh screen per net: the draft never carries over to another net.
      key={netId}
      netId={netId}
      {...(!split && { onBack: toList })}
      onLeft={toList}
    />
  );
}
