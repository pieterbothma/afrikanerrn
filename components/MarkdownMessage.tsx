import { useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, Text, TextStyle, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

type MarkdownBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'unordered-list'; items: string[] }
  | { type: 'ordered-list'; items: { index: number; text: string }[] }
  | { type: 'quote'; text: string };

type MarkdownMessageProps = {
  content: string;
  isUser: boolean;
};

// Neobrutalist Colors
const COLORS = {
  user: {
    text: '#F7F3EE', // Ivory
    subtle: 'rgba(247, 243, 238, 0.8)',
    accent: '#FFFFFF',
    code: 'rgba(255, 255, 255, 0.15)',
  },
  bot: {
    text: '#1A1A1A', // Charcoal
    subtle: 'rgba(26, 26, 26, 0.7)',
    accent: '#DE7356', // Copper
    code: 'rgba(222, 115, 86, 0.1)', // Copper tint
  },
};

export default function MarkdownMessage({ content, isUser }: MarkdownMessageProps) {
  const blocks = useMemo(() => parseMarkdown(content), [content]);
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = 0.3;
    opacity.value = withTiming(1, { duration: 220 });
  }, [content, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const theme = isUser ? COLORS.user : COLORS.bot;
  const textColor = theme.text;
  const subtleColor = theme.subtle;
  const accentColor = theme.accent;

  return (
    <Animated.View style={animatedStyle}>
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'heading':
            return (
              <Text key={`heading-${index}`} style={[getHeadingStyle(block.level), { color: textColor }]}>
                {renderInline(block.text, [styles.text, { color: textColor }], `heading-${index}`, theme.code)}
              </Text>
            );
          case 'paragraph':
            return (
              <Text key={`para-${index}`} style={[styles.paragraph, { color: textColor }]}>
                {renderInline(block.text, [styles.text, { color: textColor }], `para-${index}`, theme.code)}
              </Text>
            );
          case 'unordered-list':
            return (
              <View key={`ul-${index}`} style={styles.listContainer}>
                {block.items.map((item, itemIndex) => (
                  <View key={`ul-${index}-${itemIndex}`} style={styles.listRow}>
                    <Text style={[styles.listBullet, { color: accentColor }]}>•</Text>
                    <Text style={[styles.listText, { color: textColor }]}>
                      {renderInline(item, [styles.text, { color: textColor }], `ul-${index}-${itemIndex}`, theme.code)}
                    </Text>
                  </View>
                ))}
              </View>
            );
          case 'ordered-list':
            return (
              <View key={`ol-${index}`} style={styles.listContainer}>
                {block.items.map((item, itemIndex) => (
                  <View key={`ol-${index}-${itemIndex}`} style={styles.listRow}>
                    <Text style={[styles.listNumber, { color: accentColor }]}>
                      {(item.index || itemIndex + 1).toString()}.
                    </Text>
                    <Text style={[styles.listText, { color: textColor }]}>
                      {renderInline(item.text, [styles.text, { color: textColor }], `ol-${index}-${itemIndex}`, theme.code)}
                    </Text>
                  </View>
                ))}
              </View>
            );
          case 'quote':
            return (
              <View key={`quote-${index}`} style={styles.quoteContainer}>
                <View style={[styles.quoteBar, { backgroundColor: accentColor }]} />
                <Text style={[styles.quoteText, { color: subtleColor }]}>
                  {renderInline(block.text, [styles.text, { color: subtleColor }], `quote-${index}`, theme.code)}
                </Text>
              </View>
            );
          default:
            return null;
        }
      })}
    </Animated.View>
  );
}

function parseMarkdown(content: string): MarkdownBlock[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: MarkdownBlock[] = [];
  let paragraphBuffer: string[] = [];
  let listBuffer:
    | { type: 'unordered'; items: string[] }
    | { type: 'ordered'; items: { index: number; text: string }[] }
    | null = null;

  const flushParagraph = () => {
    if (paragraphBuffer.length > 0) {
      blocks.push({ type: 'paragraph', text: paragraphBuffer.join(' ').trim() });
      paragraphBuffer = [];
    }
  };

  const flushList = () => {
    if (!listBuffer) {
      return;
    }
    if (listBuffer.type === 'unordered') {
      blocks.push({ type: 'unordered-list', items: listBuffer.items });
    } else {
      blocks.push({ type: 'ordered-list', items: listBuffer.items });
    }
    listBuffer = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.length === 0) {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      continue;
    }

    const unorderedMatch = line.match(/^[-*]\s+(.*)$/);
    if (unorderedMatch) {
      flushParagraph();
      if (!listBuffer || listBuffer.type !== 'unordered') {
        flushList();
        listBuffer = { type: 'unordered', items: [] };
      }
      listBuffer.items.push(unorderedMatch[1]);
      continue;
    }

    const orderedMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
      flushParagraph();
      if (!listBuffer || listBuffer.type !== 'ordered') {
        flushList();
        listBuffer = { type: 'ordered', items: [] };
      }
      listBuffer.items.push({ index: Number(orderedMatch[1]), text: orderedMatch[2] });
      continue;
    }

    const quoteMatch = line.match(/^>\s+(.*)$/);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'quote', text: quoteMatch[1] });
      continue;
    }

    paragraphBuffer.push(line);
  }

  flushParagraph();
  flushList();
  return blocks;
}

function renderInline(text: string, baseStyle: TextStyle[], keyPrefix: string, codeBgColor: string) {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let match: RegExpExecArray | null;
  let lastIndex = 0;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        <Text key={`${keyPrefix}-text-${key++}`} style={baseStyle}>
          {text.slice(lastIndex, match.index)}
        </Text>,
      );
    }

    const token = match[0];
    if (token.startsWith('**')) {
      nodes.push(
        <Text key={`${keyPrefix}-bold-${key++}`} style={[...baseStyle, styles.bold]}>
          {token.substring(2, token.length - 2)}
        </Text>,
      );
    } else if (token.startsWith('*')) {
      nodes.push(
        <Text key={`${keyPrefix}-italic-${key++}`} style={[...baseStyle, styles.italic]}>
          {token.substring(1, token.length - 1)}
        </Text>,
      );
    } else if (token.startsWith('`')) {
      nodes.push(
        <Text key={`${keyPrefix}-code-${key++}`} style={[...baseStyle, styles.code, { backgroundColor: codeBgColor }]}>
          {token.substring(1, token.length - 1)}
        </Text>,
      );
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(
      <Text key={`${keyPrefix}-text-${key++}`} style={baseStyle}>
        {text.slice(lastIndex)}
      </Text>,
    );
  }

  return nodes;
}

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Inter',
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 10,
    fontFamily: 'Inter',
  },
  h1: {
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 12,
    fontFamily: 'InterTight',
  },
  h2: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 10,
    fontFamily: 'InterTight',
  },
  h3: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    fontFamily: 'InterTight',
  },
  h4: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    fontFamily: 'InterTight',
  },
  listContainer: {
    marginBottom: 8,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  listBullet: {
    fontSize: 16,
    lineHeight: 24,
    width: 16,
    textAlign: 'center',
    fontFamily: 'Inter',
  },
  listNumber: {
    fontSize: 16,
    lineHeight: 24,
    width: 24,
    textAlign: 'right',
    marginRight: 8,
    fontFamily: 'Inter',
  },
  listText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Inter',
  },
  bold: {
    fontWeight: '700',
    fontFamily: 'InterBold', // Ensure this is loaded or fallback to weight
  },
  italic: {
    fontStyle: 'italic',
  },
  code: {
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'Courier',
    }),
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  quoteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 6,
  },
  quoteBar: {
    width: 4,
    borderRadius: 4,
    marginTop: 4,
    height: '100%',
  },
  quoteText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
    fontStyle: 'italic',
    fontFamily: 'Inter',
  },
});

function getHeadingStyle(level: number) {
  const normalized = Math.min(Math.max(level, 1), 4);
  switch (normalized) {
    case 1:
      return styles.h1;
    case 2:
      return styles.h2;
    case 3:
      return styles.h3;
    default:
      return styles.h4;
  }
}
