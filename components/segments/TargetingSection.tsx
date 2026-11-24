'use client';

// "Targeting": where (states), why now (30/60/90 days), who to contact (titles), company size.

import { Combobox } from '@coinbase/cds-web/alpha/combobox';
import { Chip } from '@coinbase/cds-web/chips';
import { Icon } from '@coinbase/cds-web/icons';
import { HStack, VStack } from '@coinbase/cds-web/layout';
import { SegmentedTabs } from '@coinbase/cds-web/tabs';
import { Text } from '@coinbase/cds-web/typography';
import { US_STATES } from '@/lib/usStates';
import type { SegmentPlan, WhyNowDays } from '@/lib/types';
import { ConfidenceMeta } from './ConfidenceMeta';

const STATE_OPTIONS = US_STATES.map((s) => ({ value: s.code, label: `${s.name} (${s.code})` }));
const DAY_TABS = [
  { id: '30', label: '30 days' },
  { id: '60', label: '60 days' },
  { id: '90', label: '90 days' },
];

type Props = {
  targeting: SegmentPlan['targeting'];
  states: string[];
  onStatesChange: (states: string[]) => void;
  days: WhyNowDays;
  onDaysChange: (days: WhyNowDays) => void;
  titles: string[];
  onTitlesChange: (titles: string[]) => void;
};

function Row({ title, children, meta }: { title: string; children: React.ReactNode; meta: React.ReactNode }) {
  return (
    <VStack gap={1.5} paddingY={3} borderedTop>
      <Text as="h3" font="headline">
        {title}
      </Text>
      {children}
      {meta}
    </VStack>
  );
}

export function TargetingSection(props: Props) {
  const { targeting, states, onStatesChange, days, onDaysChange, titles, onTitlesChange } = props;

  const toggleTitle = (title: string) =>
    onTitlesChange(titles.includes(title) ? titles.filter((t) => t !== title) : [...titles, title]);

  return (
    <VStack>
      <Row
        title="Location"
        meta={<ConfidenceMeta confidence={targeting.states.confidence} inferredFrom={targeting.states.inferredFrom} />}
      >
        <Combobox
          type="multi"
          label="States"
          placeholder="Search states to add…"
          options={STATE_OPTIONS}
          value={states}
          // In multi mode the Combobox reports either the one option clicked (toggle it),
          // a full list (replace), or null (clear all).
          onChange={(value) => {
            if (value == null) onStatesChange([]);
            else if (Array.isArray(value)) onStatesChange(value.map(String));
            else
              onStatesChange(
                states.includes(String(value))
                  ? states.filter((s) => s !== String(value))
                  : [...states, String(value)],
              );
          }}
          hideSelectAll
          removeSelectedOptionAccessibilityLabel="Remove state"
        />
      </Row>

      <Row
        title="Why now"
        meta={
          <ConfidenceMeta confidence={targeting.whyNowDays.confidence} inferredFrom={targeting.whyNowDays.inferredFrom} />
        }
      >
        <Text as="p" font="body" color="fgMuted">
          Registration renews within {days} days
        </Text>
        <SegmentedTabs
          accessibilityLabel="Registration renews within"
          tabs={DAY_TABS}
          activeTab={DAY_TABS.find((t) => t.id === String(days)) ?? null}
          onChange={(tab) => tab && onDaysChange(Number(tab.id) as WhyNowDays)}
          width={360}
          equalWidth
          padding={0.5}
          borderRadius={400}
          styles={{ activeIndicator: { borderRadius: 'var(--borderRadius-300)' } }}
        />
      </Row>

      <Row
        title="Who to contact"
        meta={
          <ConfidenceMeta
            confidence={targeting.contactTitles.confidence}
            inferredFrom={targeting.contactTitles.inferredFrom}
          />
        }
      >
        <HStack gap={1} flexWrap="wrap">
          {targeting.contactTitles.options.map((title) => {
            const on = titles.includes(title);
            return (
              <Chip
                key={title}
                active={on}
                maxWidth="100%"
                aria-pressed={on}
                start={on ? <Icon name="checkmark" size="xs" color="fg" /> : undefined}
                onClick={() => toggleTitle(title)}
              >
                {title}
              </Chip>
            );
          })}
        </HStack>
      </Row>

      <Row
        title="Company size"
        meta={
          <ConfidenceMeta
            confidence={targeting.size.confidence}
            note="SAM.gov small-business status for the industry code"
          />
        }
      >
        <Text as="p" font="body">
          Small business
        </Text>
      </Row>
    </VStack>
  );
}
