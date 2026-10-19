export interface ChatScreenProps {
  netId: string;
  /** Shows the back button (phones, narrow web). Leave it out next to the nets sidebar. */
  onBack?: () => void;
  /** After "Leave" succeeded. */
  onLeft: () => void;
}
