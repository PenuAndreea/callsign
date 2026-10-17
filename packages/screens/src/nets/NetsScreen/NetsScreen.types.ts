export interface NetsScreenProps {
  /** A joined net was pressed, or a net was just joined. */
  onOpenNet: (id: string) => void;
  /** "New net". */
  onNewNet: () => void;
  /** Highlights the open net (web sidebar next to the chat). */
  selectedNetId?: string;
}
