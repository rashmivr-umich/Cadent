'use client';

// One draft in the approval queue: why this lead + what the agent is unsure about (left),
// the email (right), and Approve / Edit / Reject. Nothing sends without Approve.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Banner } from '@coinbase/cds-web/banner';
import { Button } from '@coinbase/cds-web/buttons';
import { NativeTextArea, TextInput } from '@coinbase/cds-web/controls';
import { Icon } from '@coinbase/cds-web/icons';
import { Box, HStack, VStack } from '@coinbase/cds-web/layout';
import { Tag } from '@coinbase/cds-web/tag';
import { Text } from '@coinbase/cds-web/typography';
import { CompanyLogo } from '@/components/leads/CompanyLogo';
import { EmailStatusBadge } from '@/components/leads/EmailStatusBadge';
import { SourceCitation } from '@/components/leads/SourceCitation';
import { approveEmail } from '@/lib/api';
import { emailUiState, expiryText, formatDate, nameCase, unsureNotes } from '@/lib/leadFormat';
import { FIT_LABELS, fitText } from '@/lib/leadScore';
import { usePipeline, type LeadWork } from '@/lib/PipelineContext';
import styles from '@/components/intake/intake.module.css';

const timeText = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export function QueueCard({ item }: { item: LeadWork }) {
  const router = useRouter();
  const { update, moveStage } = usePipeline();
  const { lead, draft } = item;
  const subject = item.edited?.subject ?? draft?.draftSubject ?? '';
  const body = item.edited?.body ?? draft?.draftBody ?? '';

  const [editing, setEditing] = useState(false);
  const [editSubject, setEditSubject] = useState(subject);
  const [editBody, setEditBody] = useState(body);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  if (!draft) return null;
  const unsure = unsureNotes(item);
  const fit = lead.tier ? FIT_LABELS[lead.tier] : null;
  const isPending = item.approval === 'pending';

  const startEdit = () => {
    setEditSubject(subject);
    setEditBody(body);
    setEditing(true);
  };
  const saveEdit = () => {
    update(lead.id, { edited: { subject: editSubject, body: editBody } });
    setEditing(false);
  };

  const approve = async () => {
    setError('');
    setSending(true);
    try {
      const sent = await approveEmail(lead.id, subject, body);
      update(lead.id, { approval: 'approved', sent });
      moveStage(lead.id, 'Contacted', 'person');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <VStack gap={2} padding={3} bordered borderRadius={500} background="bg">
      <HStack gap={4} alignItems="flex-start" flexWrap="wrap">
        {/* Left: why this lead */}
        <VStack gap={2} flexBasis={280} flexGrow={1} maxWidth={340}>
          <HStack gap={1.5} alignItems="center">
            <CompanyLogo name={lead.legalName} website={item.enrichment?.website ?? lead.website} size="l" />
            <VStack>
              <Text as="h3" font="headline">
                {lead.legalName}
              </Text>
              {fit && (
                <Text as="span" font="label2" color="fgMuted">
                  {fitText(lead.tier!)} · {lead.fitScore}
                </Text>
              )}
            </VStack>
          </HStack>

          <VStack gap={0.5}>
            <Text as="span" font="label2" color="fgMuted">
              Why this lead
            </Text>
            <Text as="span" font="body" color={lead.daysToExpiry <= 30 ? 'fgNegative' : 'fg'}>
              SAM.gov registration {expiryText(lead.daysToExpiry).toLowerCase()} ({formatDate(lead.registrationExpirationDate)})
            </Text>
          </VStack>

          <VStack gap={0.5}>
            <Text as="span" font="label2" color="fgMuted">
              Contact
            </Text>
            <Text as="span" font="body">
              {nameCase(lead.contactName) ?? 'No contact listed'}
              {lead.contactTitle ? ` · ${lead.contactTitle}` : ''}
            </Text>
            <HStack gap={1} alignItems="center" flexWrap="wrap">
              {item.enrichment?.email && (
                <Text as="span" font="label2">
                  {item.enrichment.email}
                </Text>
              )}
              <EmailStatusBadge state={emailUiState(lead, item)} />
            </HStack>
          </VStack>

          <SourceCitation uei={lead.samSource?.uei ?? lead.id} compact />

          {unsure.length > 0 && (
            <VStack gap={0.5} padding={1.5} borderRadius={300} background="bgWarningWash">
              <HStack gap={0.5} alignItems="center">
                <Icon name="warning" size="xs" color="fgWarning" />
                <Text as="span" font="label1">
                  Agent is unsure about
                </Text>
              </HStack>
              {unsure.map((u, i) => (
                <Text as="p" key={i} font="label2">
                  {u}
                </Text>
              ))}
            </VStack>
          )}

          <Box>
            <Button variant="tertiary" compact onClick={() => router.push(`/leads/${lead.id}`)}>
              Open lead
            </Button>
          </Box>
        </VStack>

        {/* Right: the email */}
        <VStack gap={1.5} flexBasis={420} flexGrow={2}>
          {draft.source === 'fallback' && (
            <Tag colorScheme="yellow" emphasis="low">
              Template draft (AI unavailable)
            </Tag>
          )}
          {editing ? (
            <VStack gap={1.5}>
              <TextInput label="Subject" value={editSubject} onChange={(e) => setEditSubject(e.target.value)} />
              <VStack gap={0.5}>
                <Text as="label" font="label2" color="fgMuted" htmlFor={`body-${lead.id}`}>
                  Email
                </Text>
                <Box bordered borderRadius={200}>
                  <NativeTextArea
                    id={`body-${lead.id}`}
                    rows={12}
                    className={styles.textarea}
                    value={editBody}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditBody(e.target.value)}
                  />
                </Box>
              </VStack>
            </VStack>
          ) : (
            <VStack gap={1} padding={2} borderRadius={300} background="bgAlternate">
              <HStack gap={1} alignItems="center">
                <Text as="p" font="headline">
                  {subject}
                </Text>
                {item.edited && (
                  <Tag colorScheme="blue" emphasis="low">
                    Edited
                  </Tag>
                )}
              </HStack>
              <Text as="p" font="body" style={{ whiteSpace: 'pre-wrap' }}>
                {body}
              </Text>
            </VStack>
          )}

          {error && (
            <Banner variant="error" styleVariant="inline" startIcon="error" title="Not sent">
              {error}
            </Banner>
          )}

          {/* Actions */}
          <HStack gap={1} justifyContent="flex-end" alignItems="center" flexWrap="wrap">
            {item.approval === 'approved' && item.sent && (
              <Tag colorScheme="green" emphasis="low">
                {`Approved · sent ${timeText(item.sent.sentAt)}`}
              </Tag>
            )}
            {item.approval === 'rejected' && (
              <>
                <Tag colorScheme="red" emphasis="low">
                  Rejected
                </Tag>
                <Button variant="tertiary" compact onClick={() => update(lead.id, { approval: 'pending' })}>
                  Move back to review
                </Button>
              </>
            )}
            {isPending && editing && (
              <>
                <Button variant="tertiary" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={saveEdit} disabled={!editSubject.trim() || !editBody.trim()}>
                  Save changes
                </Button>
              </>
            )}
            {isPending && !editing && (
              <>
                <Button variant="secondary" onClick={() => update(lead.id, { approval: 'rejected' })} disabled={sending}>
                  Reject
                </Button>
                <Button variant="secondary" startIcon="pencil" onClick={startEdit} disabled={sending}>
                  Edit
                </Button>
                <Button variant="primary" startIcon="checkmark" onClick={approve} loading={sending}>
                  Approve & send
                </Button>
              </>
            )}
          </HStack>
        </VStack>
      </HStack>
    </VStack>
  );
}
