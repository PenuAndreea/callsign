import { Text } from '../Text/Text';
import type { SectionLabelProps } from './SectionLabel.types';

/** Tracked label that starts a list section; a heading for screen readers. */
export function SectionLabel({ title, style }: SectionLabelProps) {
  return (
    <Text variant="label" tone="textMuted" role="heading" aria-level={2} style={style}>
      {title}
    </Text>
  );
}
