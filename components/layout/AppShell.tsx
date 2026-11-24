'use client';

// Shared page frame: header (wordmark, workspace, teammates) + footer (data source label).

import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@coinbase/cds-web/buttons';
import { Avatar } from '@coinbase/cds-web/media';
import { Box, Divider, HStack, VStack } from '@coinbase/cds-web/layout';
import { NavigationBar } from '@coinbase/cds-web/navigation';
import { Tag } from '@coinbase/cds-web/tag';
import { Text } from '@coinbase/cds-web/typography';
import { useIntake } from '@/lib/IntakeContext';
import { usePipeline } from '@/lib/PipelineContext';

const TEAMMATES = [
  { name: 'Maria', colorScheme: 'purple' as const },
  { name: 'Jordan', colorScheme: 'teal' as const },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { intake } = useIntake();
  const workspaceName = intake.workspace.name || 'No workspace yet';
  const router = useRouter();
  const pathname = usePathname();
  const { work } = usePipeline();
  const toReview = Object.values(work).filter((w) => w.approval === 'pending').length;
  const nav = [
    { href: '/leads', label: 'Leads' },
    { href: '/queue', label: 'Queue', count: toReview },
    { href: '/board', label: 'Board' },
  ];

  return (
    <VStack background="bg" minHeight="100vh">
      <NavigationBar
        start={
          <HStack alignItems="center" gap={2}>
            <Text as="span" font="title2" color="fgPrimary">
              Cadent
            </Text>
            <Divider direction="vertical" height={24} />
            <Text as="span" font="label1" color="fgMuted">
              {workspaceName}
            </Text>
          </HStack>
        }
        end={
          <HStack alignItems="center" gap={1}>
            {nav.map((item) => (
              <Button
                key={item.href}
                variant="secondary"
                transparent={!pathname.startsWith(item.href)}
                compact
                onClick={() => router.push(item.href)}
                end={
                  'count' in item && item.count ? (
                    <Tag colorScheme="blue" emphasis="high">
                      {String(item.count)}
                    </Tag>
                  ) : undefined
                }
                accessibilityLabel={'count' in item && item.count ? `${item.label}, ${item.count} drafts to review` : item.label}
              >
                {item.label}
              </Button>
            ))}
            <Divider direction="vertical" height={24} />
            {TEAMMATES.map((person) => (
              <Avatar
                key={person.name}
                name={person.name}
                alt={person.name}
                colorScheme={person.colorScheme}
                size="l"
              />
            ))}
          </HStack>
        }
      />

      {/* Centers each page's content column. */}
      <VStack as="main" flexGrow={1} width="100%" alignItems="center">
        {children}
      </VStack>

      <Box as="footer" borderedTop paddingX={4} paddingY={2}>
        <Text as="p" font="label2" color="fgMuted">
          Data from SAM.gov public API
        </Text>
      </Box>
    </VStack>
  );
}
