/**
 * skoodog-robot core tests.
 *
 * The bridge posts into a public Discord, so the redaction path is treated as a
 * security control and tested as one: every known secret shape, plus literal
 * values passed in from the environment.
 */

import { describe, expect, it } from 'vitest';
import {
  classifyTransportError,
  formatQuestion,
  issueId,
  MAX_DISCORD_MESSAGE,
  outboxRecord,
  parseReplies,
  redact,
} from '../../scripts/skoodogRobotCore.mjs';
import type { DiscordMessage } from '../../scripts/skoodogRobotCore.mjs';

describe('skoodog-robot redaction', () => {
  it('removes a Discord bot token', () => {
    // Assembled at runtime: a token-shaped literal in source trips GitHub's
    // secret scanner, which is exactly the class of accident this test guards.
    const token = ['MTIzNDU2Nzg5MDEyMzQ1Njc4', 'AbCdEf', 'notarealtokenjustfixture12345678'].join('.');
    expect(redact(`Authorization: Bot ${token}`)).not.toContain(token);
  });

  it('removes provider keys without touching ordinary prose', () => {
    const cases = [
      'sk-abcdefghijklmnopqrstuvwx',
      'ghp_abcdefghijklmnopqrstuvwxyz0123',
      'AKIAIOSFODNN7EXAMPLE',
      'xoxb-1234567890-abcdefghijkl',
    ];
    for (const secret of cases) {
      const out = redact(`before ${secret} after`);
      expect(out).not.toContain(secret);
      expect(out).toContain('before');
      expect(out).toContain('after');
    }
  });

  it('keeps the variable name but drops the value in an assignment', () => {
    const out = redact('DISCORD_BOT_TOKEN=supersecretvalue123');
    expect(out).toContain('DISCORD_BOT_TOKEN');
    expect(out).not.toContain('supersecretvalue123');
  });

  it('removes literal secrets supplied by the caller even when shapeless', () => {
    // A token that matches no pattern must still be scrubbed by exact value.
    const out = redact('the value is hunter2hunter2', ['hunter2hunter2']);
    expect(out).not.toContain('hunter2hunter2');
    expect(out).toContain('[REDACTED]');
  });

  it('strips a private key block', () => {
    const pem = '-----BEGIN RSA PRIVATE KEY-----\nAAAA\nBBBB\n-----END RSA PRIVATE KEY-----';
    expect(redact(pem)).not.toContain('AAAA');
  });

  it('leaves innocent text untouched', () => {
    const text = 'The chef rig has 24 bones and the timer is 60 seconds.';
    expect(redact(text)).toBe(text);
  });
});

describe('skoodog-robot issue ids', () => {
  it('is deterministic and whitespace/case insensitive', () => {
    expect(issueId('Why does CONNECT fail?')).toBe(issueId('why   does connect fail?'));
  });

  it('differs between different questions', () => {
    expect(issueId('question one')).not.toBe(issueId('question two'));
  });

  it('is always a usable short token', () => {
    expect(issueId('anything')).toMatch(/^SKR-[0-9A-Z]{7}$/);
  });
});

describe('skoodog-robot message formatting', () => {
  it('puts the id first so replies can be matched by substring', () => {
    const id = issueId('q');
    expect(formatQuestion({ id, question: 'q' }).startsWith(`\`${id}\``)).toBe(true);
  });

  it('never exceeds the Discord message limit', () => {
    const out = formatQuestion({ id: 'SKR-AAAAAAA', question: 'x'.repeat(5000) });
    expect(out.length).toBeLessThanOrEqual(MAX_DISCORD_MESSAGE);
  });
});

describe('skoodog-robot reply matching', () => {
  const bot = { id: 'bot-1', username: 'skoodog-robot' };
  const messages = [
    { id: '30', author: { id: 'u2', username: 'carol' }, content: 'unrelated chatter' },
    { id: '20', author: { id: 'u1', username: 'bob' }, content: 'SKR-ABC1234 try the v10 route' },
    { id: '10', author: bot, content: 'SKR-ABC1234 my question' },
    { id: '25', author: { id: 'u3', username: 'dave' }, content: 'replying', message_reference: { message_id: '10' } },
  ];

  it('matches by quoted id and by reply reference, and excludes the bot itself', () => {
    const replies = parseReplies(messages, { issueId: 'SKR-ABC1234', botUserId: 'bot-1', askedMessageId: '10' });
    expect(replies.map((r) => r.author)).toEqual(['20', '25'].map((id) => (id === '20' ? 'bob' : 'dave')));
    expect(replies.some((r) => r.authorId === 'bot-1')).toBe(false);
  });

  it('returns oldest-first even though Discord serves newest-first', () => {
    const replies = parseReplies(messages, { issueId: 'SKR-ABC1234', botUserId: 'bot-1', askedMessageId: '10' });
    expect(replies.map((r) => r.id)).toEqual(['20', '25']);
  });

  it('survives malformed input', () => {
    // Deliberately ill-typed: this guards the runtime path when Discord returns
    // an error body instead of a message array.
    const junk = [null, 'nope', {}] as unknown as DiscordMessage[];
    expect(parseReplies(null, { issueId: 'x' })).toEqual([]);
    expect(parseReplies(junk, { issueId: 'x' })).toEqual([]);
  });
});

describe('skoodog-robot transport diagnosis', () => {
  it('identifies an egress-policy denial as the operator-fixable case', () => {
    const diag = classifyTransportError(
      new Error('proxy refused CONNECT discord.com: HTTP/1.1 403 Forbidden — request rejected: host not permitted'),
    );
    expect(diag.kind).toBe('egress-blocked');
    expect(diag.fix).toMatch(/egress/i);
  });

  it('separates auth, permission and not-found so they are not all "Discord broken"', () => {
    expect(classifyTransportError(new Error('x'), 401).kind).toBe('auth');
    expect(classifyTransportError(new Error('x'), 403).kind).toBe('permission');
    expect(classifyTransportError(new Error('x'), 404).kind).toBe('not-found');
    expect(classifyTransportError(new Error('x'), 429).kind).toBe('rate-limited');
  });

  it('treats a dead socket as a network problem', () => {
    expect(classifyTransportError(new Error('getaddrinfo ENOTFOUND discord.com')).kind).toBe('network');
  });
});

describe('skoodog-robot outbox', () => {
  it('redacts the question and context it stores on disk', () => {
    const record = outboxRecord({
      id: 'SKR-AAAAAAA',
      question: 'why does ghp_abcdefghijklmnopqrstuvwxyz0123 fail',
      context: 'DISCORD_BOT_TOKEN=supersecretvalue123',
      content: 'already-redacted',
      reason: { kind: 'egress-blocked', summary: 'blocked' },
      at: '2026-07-27T00:00:00.000Z',
    });
    expect(record.question).not.toContain('ghp_abcdefghijklmnopqrstuvwxyz0123');
    expect(record.context).not.toContain('supersecretvalue123');
    expect(record.status).toBe('queued');
    expect(record.reason).toBe('egress-blocked');
  });
});
