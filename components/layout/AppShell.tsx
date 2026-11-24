'use client';

// Shared page frame: header (wordmark, workspace, teammates) + footer (data source label).

import { Avatar } from '@coinbase/cds-web/media';
import { Box, Divider, HStack, VStack } from '@coinbase/cds-web/layout';
import { NavigationBar } from '@coinbase/cds-web/navigation';
import { Text } from '@coinbase/cds-web/typography';
import { useIntake } from '@/lib/IntakeContext';

const TEAMMATES = [
  { name: 'Maria', colorScheme: 'purple' as const },
  { name: 'Jordan', colorScheme: 'teal' as const },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { intake } = useIntake();
  const workspaceName = intake.workspace.name || 'No workspace yet';

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
