/**
 * Types for the skoodog-robot pure core.
 *
 * The implementation is plain ESM so the CLI stays dependency-free and runnable
 * with bare `node`; these declarations give the unit tests and editors the same
 * type safety as the rest of the repository.
 */

export interface DiscordAuthor {
  readonly id?: string;
  readonly username?: string;
  readonly global_name?: string;
}

export interface DiscordMessage {
  readonly id?: string;
  readonly content?: string;
  readonly timestamp?: string | null;
  readonly author?: DiscordAuthor;
  readonly message_reference?: { readonly message_id?: string };
}

export interface Reply {
  readonly id: string;
  readonly author: string;
  readonly authorId: string | null;
  readonly content: string;
  readonly timestamp: string | null;
}

export type TransportErrorKind =
  | 'egress-blocked'
  | 'auth'
  | 'permission'
  | 'not-found'
  | 'rate-limited'
  | 'network'
  | 'unknown';

export interface TransportDiagnosis {
  readonly kind: TransportErrorKind;
  readonly summary: string;
  readonly fix: string;
}

export interface OutboxRecord {
  readonly id: string;
  readonly at: string;
  readonly status: 'queued';
  readonly reason: string;
  readonly reasonSummary: string;
  readonly question: string;
  readonly context: string;
  readonly content: string;
}

export const MAX_DISCORD_MESSAGE: number;

/** Strips secret-shaped substrings and any literal values supplied by the caller. */
export function redact(text: unknown, extraSecrets?: readonly string[]): string;

/** Stable, whitespace- and case-insensitive short id for a question. */
export function issueId(question: string, salt?: string): string;

/** Builds the Discord message body, id first, clamped to the message limit. */
export function formatQuestion(input: {
  id: string;
  question: string;
  context?: string;
  project?: string;
}): string;

/** Selects replies to one issue, oldest-first, excluding the bot's own messages. */
export function parseReplies(
  messages: readonly DiscordMessage[] | null | undefined,
  options?: { issueId?: string; botUserId?: string; askedMessageId?: string | null },
): Reply[];

/** Maps a transport failure or HTTP status onto an actionable diagnosis. */
export function classifyTransportError(error: unknown, status?: number): TransportDiagnosis;

/** Record persisted to the offline outbox; question and context are redacted. */
export function outboxRecord(input: {
  id: string;
  question: string;
  context?: string;
  content: string;
  reason?: { kind?: string; summary?: string };
  at: string;
}): OutboxRecord;
