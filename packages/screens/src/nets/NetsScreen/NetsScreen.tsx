import { useJoinNet, useLogout, useNets, useSignedInUser } from '@callsign/hooks';
import { spacing } from '@callsign/theme';
import type { RoomDto, RoomScope } from '@callsign/types';
import { Button, ScreenHeader, SectionLabel } from '@callsign/ui';
import type { SectionListData } from 'react-native';
import { SectionList, View } from 'react-native';

import { errorMessage } from '../../errors/errorMessage';
import { FormError } from '../../form/FormError';
import { useInsetPadding } from '../../layout/useInsetPadding';
import { JoinedNetRow, OpenNetRow } from './NetRows';
import { useNetsStyles } from './NetsScreen.styles';
import type { NetsScreenProps } from './NetsScreen.types';
import type { SectionQueryState } from './SectionStatus';
import { SectionStatus } from './SectionStatus';

interface NetSection {
  key: RoomScope;
  title: string;
  emptyText: string;
  query: SectionQueryState;
}

/**
 * The nets list: joined nets (open the chat), then open nets (Join). Both sections are paged;
 * scrolling to the end loads the next page of Joined first, then of Open to join.
 */
export function NetsScreen({ onOpenNet, onNewNet, selectedNetId }: NetsScreenProps) {
  const styles = useNetsStyles();
  const user = useSignedInUser();
  const joined = useNets('joined');
  const open = useNets('open');
  const join = useJoinNet();
  const logout = useLogout();
  const insetPadding = useInsetPadding({ top: spacing.xl, bottom: spacing.xxl * 2 });

  const sections: SectionListData<RoomDto, NetSection>[] = [
    {
      key: 'joined',
      title: 'Joined',
      emptyText: 'No nets yet. Join one below or open a new net.',
      query: joined,
      data: joined.data ?? [],
    },
    {
      key: 'open',
      title: 'Open to join',
      emptyText: 'You are on every net.',
      query: open,
      data: open.data ?? [],
    },
  ];

  const loadMore = () => {
    const next = joined.hasNextPage ? joined : open;
    if (next.hasNextPage && !next.isFetchingNextPage) void next.fetchNextPage();
  };

  const joinAndOpen = (id: string) => join.mutate(id, { onSuccess: (net) => onOpenNet(net.id) });

  return (
    <SectionList
      style={styles.screen}
      contentContainerStyle={[styles.content, insetPadding]}
      sections={sections}
      keyExtractor={(net) => net.id}
      stickySectionHeadersEnabled={false}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <ScreenHeader
            eyebrow={`Station ${user.callsign}`}
            title="Nets"
            action={
              <Button
                label="Log out"
                variant="link"
                loading={logout.isPending}
                onPress={() => logout.mutate()}
              />
            }
          />
          <Button label="New net" icon="plus" variant="secondary" onPress={onNewNet} />
          <FormError message={join.error ? errorMessage(join.error) : undefined} />
        </View>
      }
      renderSectionHeader={({ section }) => (
        <SectionLabel title={section.title} style={styles.section} />
      )}
      renderSectionFooter={({ section }) => (
        <SectionStatus query={section.query} emptyText={section.emptyText} />
      )}
      renderItem={({ item, section }) =>
        section.key === 'joined' ? (
          <JoinedNetRow net={item} selected={item.id === selectedNetId} onOpen={onOpenNet} />
        ) : (
          <OpenNetRow
            net={item}
            joining={join.isPending && join.variables === item.id}
            onJoin={joinAndOpen}
          />
        )
      }
    />
  );
}
