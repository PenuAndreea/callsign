export interface NewNetScreenProps {
  onBack: () => void;
  /** The net was created and the creator joined it. */
  onCreated: (id: string) => void;
}
