import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Button } from '../components/Button/Button';
import { ChatBubble } from '../components/ChatBubble/ChatBubble';
import { Input } from '../components/Input/Input';
import { Masthead } from '../components/Masthead/Masthead';
import { MessageInput } from '../components/MessageInput/MessageInput';
import { RoomListItem } from '../components/RoomListItem/RoomListItem';
import { ScreenHeader } from '../components/ScreenHeader/ScreenHeader';
import { SectionLabel } from '../components/SectionLabel/SectionLabel';
import { Text } from '../components/Text/Text';
import { usePreviewStyles } from './ComponentPreview.styles';

const noop = () => undefined;

/**
 * Every component on one scrolling screen, rendered by both apps during M1 to check them on
 * web and native. Replaced by the real screens in M5. Needs a `ThemeProvider` above it.
 */
export function ComponentPreview() {
  const styles = usePreviewStyles();
  const [draft, setDraft] = useState('');
  const [sent, setSent] = useState<string[]>([]);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Masthead title="Callsign" subtitle="Field radio · Flight and ground" />

        <View style={styles.section}>
          <Input label="Callsign" placeholder="e.g. WOLF-2" autoCapitalize="characters" />
          <Input
            label="Passphrase"
            placeholder="Enter passphrase"
            secureTextEntry
            error="Too short"
          />
          <Button label="Report in" onPress={noop} />
          <Button label="New station? Register here" variant="link" onPress={noop} />
        </View>

        <ScreenHeader
          eyebrow="Station WOLF-2"
          title="Nets"
          action={<Button label="Log out" variant="link" onPress={noop} />}
        />
        <View style={styles.section}>
          <SectionLabel title="Joined" />
          <RoomListItem
            name="Tower and ground"
            joined
            selected
            preview="Hold at bay four, engines off."
            trailing={<Text variant="meta">12</Text>}
            onPress={noop}
          />
          <RoomListItem
            name="Flight ops"
            joined
            preview="Briefing moved to 2300 zulu."
            trailing={<Text variant="meta">4</Text>}
            onPress={noop}
          />
          <SectionLabel title="Open to join" />
          <RoomListItem
            name="Crew chiefs"
            joined={false}
            preview="Rota posted for the night shift."
            trailing={<Button label="Join" variant="secondary" onPress={noop} />}
          />
        </View>

        <ScreenHeader
          onBack={noop}
          eyebrow="Net"
          title="Tower and ground"
          subtitle="4 stations on net"
          truncateTitle
          action={<Button label="Leave" variant="link" onPress={noop} />}
        />
        <View style={styles.messages}>
          <ChatBubble
            senderCallsign="twr-ops"
            content="Wolf Two, runway three-six is clear. Cleared to land."
            sentAt="2026-10-15T21:58:00Z"
          />
          <ChatBubble
            own
            senderCallsign="wolf-2"
            content="Roger Tower. Wolf Two on final."
            sentAt="2026-10-15T21:59:00Z"
          />
          {sent.map((content, index) => (
            <ChatBubble
              key={index}
              own
              senderCallsign="wolf-2"
              content={content}
              sentAt={new Date()}
            />
          ))}
        </View>
      </ScrollView>
      <MessageInput
        value={draft}
        onChangeText={setDraft}
        onSend={(text) => {
          setSent((messages) => [...messages, text]);
          setDraft('');
        }}
        maxLength={1000}
      />
    </View>
  );
}
