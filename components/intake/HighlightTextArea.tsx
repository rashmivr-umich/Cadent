'use client';

// A text box that softly highlights key words while you type.
// How it works: an invisible copy of the text sits *behind* a see-through textarea.
// In that copy, key words are wrapped in colored marks, so the colors show through.
// Typing, selecting and cursor movement all stay 100% normal because you're typing in a real textarea.

import { useRef } from 'react';
import { NativeTextArea } from '@coinbase/cds-web/controls';
import { Box } from '@coinbase/cds-web/layout';
import { CATEGORY_COLORS, type KeywordMatch } from '@/lib/intakeKeywords';
import styles from './intake.module.css';

type Props = {
  value: string;
  onChange: (value: string) => void;
  highlights: KeywordMatch[];
  placeholder?: string;
  accessibilityLabel: string;
};

export function HighlightTextArea({ value, onChange, highlights, placeholder, accessibilityLabel }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Cut the text into plain pieces and highlighted pieces.
  const pieces: React.ReactNode[] = [];
  let cursor = 0;
  highlights.forEach((h, i) => {
    if (h.start > cursor) pieces.push(value.slice(cursor, h.start));
    pieces.push(
      <Box
        as="mark"
        key={i}
        display="inline"
        dangerouslySetBackground={CATEGORY_COLORS[h.category]}
        borderRadius={100}
      >
        {value.slice(h.start, h.end)}
      </Box>,
    );
    cursor = h.end;
  });
  pieces.push(value.slice(cursor));
  // A trailing line break needs a character after it, or the two layers drift apart by one line.
  pieces.push('​');

  return (
    <Box position="relative" bordered borderRadius={200} background="bg">
      <Box
        ref={overlayRef}
        aria-hidden
        display="block"
        pin="all"
        padding={2}
        font="body"
        className={styles.overlay}
      >
        {pieces}
      </Box>
      <NativeTextArea
        aria-label={accessibilityLabel}
        className={`${styles.textarea} ${styles.tall}`}
        font="body"
        position="relative"
        rows={6}
        placeholder={placeholder}
        value={value}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
        // Keep the highlight layer scrolled in step with the text box.
        onScroll={(e: React.UIEvent<HTMLTextAreaElement>) => {
          if (overlayRef.current) overlayRef.current.scrollTop = e.currentTarget.scrollTop;
        }}
      />
    </Box>
  );
}
