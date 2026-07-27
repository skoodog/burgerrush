/**
 * skoodog-robot: pure core.
 *
 * Everything here is I/O-free and deterministic so it unit-tests in Node with no
 * network, no Discord and no credentials. The CLI in `skoodog-robot.mjs` owns
 * every side effect.
 */

/** Patterns that must never leave this machine in a Discord message. */
const SECRET_PATTERNS = [
  // Discord bot / user tokens
  /\b[A-Za-z0-9_-]{23,28}\.[A-Za-z0-9_-]{6,7}\.[A-Za-z0-9_-]{27,}\b/g,
  /\bmfa\.[A-Za-z0-9_-]{20,}\b/g,
  // Common provider keys
  /\bsk-[A-Za-z0-9_-]{16,}\b/g,
  /\b(?:ghp|gho|ghu|ghs|ghr|github_pat)_[A-Za-z0-9_]{16,}\b/g,
  /\bxox[abposr]-[A-Za-z0-9-]{10,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bAIza[0-9A-Za-z_-]{35}\b/g,
  // Bearer headers and PEM blocks
  /\bBearer\s+[A-Za-z0-9._~+/-]{20,}=*/gi,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  // KEY=secret / "token": "secret" shaped assignments
  /\b([A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|APIKEY|API_KEY|PRIVATE_KEY)[A-Z0-9_]*)\s*[:=]\s*["']?[^\s"',]{8,}/gi,
];

/**
 * Removes anything secret-shaped.
 *
 * This runs on every outbound message without exception. An agent that posts
 * its own troubleshooting context into a public server is exactly the situation
 * where a token gets leaked by accident, so the scrub is unconditional rather
 * than something the caller opts into.
 */
export function redact(text, extraSecrets = []) {
  let out = String(text ?? '');
  // Literal values first: env values are known-exact and may not match a shape.
  for (const secret of extraSecrets) {
    if (typeof secret === 'string' && secret.length >= 8) {
      out = out.split(secret).join('[REDACTED]');
    }
  }
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, (match) => {
      // Keep the variable name when the match was a KEY=value assignment.
      const assign = /^([A-Z0-9_]+)\s*[:=]/i.exec(match);
      return assign ? `${assign[1]}=[REDACTED]` : '[REDACTED]';
    });
  }
  return out;
}

/** Stable short id for an issue, so replies can be matched back to a question. */
export function issueId(question, salt = '') {
  const input = `${salt}::${String(question).trim().toLowerCase().replace(/\s+/g, ' ')}`;
  // FNV-1a, 32-bit. Deterministic across runs and platforms.
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `SKR-${hash.toString(36).toUpperCase().padStart(7, '0')}`;
}

export const MAX_DISCORD_MESSAGE = 2000;

/**
 * Builds the message posted to Discord.
 *
 * The id is in the first line because replies are matched by substring, and
 * Discord threads are not guaranteed to be available in every channel.
 */
export function formatQuestion({ id, question, context = '', project = 'Burger Rush' }) {
  const head = `\`${id}\` · **${project}** · skoodog-robot`;
  const body = String(question).trim();
  const ctx = String(context).trim();
  let out = ctx ? `${head}\n\n${body}\n\n> ${ctx.split('\n').join('\n> ')}` : `${head}\n\n${body}`;
  if (out.length > MAX_DISCORD_MESSAGE) {
    out = `${out.slice(0, MAX_DISCORD_MESSAGE - 20)}\n…[truncated]`;
  }
  return out;
}

/**
 * Selects replies to one issue from a raw Discord message list.
 *
 * A reply counts when it is not from the bot itself and either references the
 * bot's message or quotes the issue id. Returned oldest-first; Discord serves
 * newest-first.
 */
export function parseReplies(messages, { issueId: id, botUserId, askedMessageId } = {}) {
  const list = Array.isArray(messages) ? messages : [];
  return list
    .filter((m) => {
      if (!m || typeof m !== 'object') return false;
      if (botUserId && m.author?.id === botUserId) return false;
      const refersToAsk = askedMessageId && m.message_reference?.message_id === askedMessageId;
      const quotesId = id && typeof m.content === 'string' && m.content.includes(id);
      return Boolean(refersToAsk || quotesId);
    })
    .map((m) => ({
      id: m.id,
      author: m.author?.global_name || m.author?.username || 'unknown',
      authorId: m.author?.id ?? null,
      content: typeof m.content === 'string' ? m.content : '',
      timestamp: m.timestamp ?? null,
    }))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

/**
 * Turns a transport failure into an actionable diagnosis.
 *
 * The distinction that matters here is egress-policy denial versus everything
 * else: only the first one is fixed by the operator rather than by the code.
 */
export function classifyTransportError(error, status) {
  const message = String(error?.message ?? error ?? '');
  if (/host not permitted|not in allowlist|proxy refused CONNECT|403 Forbidden/i.test(message)) {
    return {
      kind: 'egress-blocked',
      summary: 'The network egress policy refused the connection to discord.com.',
      fix: 'Add discord.com (and gateway.discord.gg if you later use the gateway) to the environment network egress settings.',
    };
  }
  if (status === 401) {
    return {
      kind: 'auth',
      summary: 'Discord rejected the bot token.',
      fix: 'Check DISCORD_BOT_TOKEN. It must be the bot token from the Developer Portal, not the application secret.',
    };
  }
  if (status === 403) {
    return {
      kind: 'permission',
      summary: 'The bot reached Discord but is not permitted in that channel.',
      fix: 'Invite the bot to the guild and grant View Channel, Send Messages and Read Message History on DISCORD_CHANNEL_ID.',
    };
  }
  if (status === 404) {
    return {
      kind: 'not-found',
      summary: 'That channel id does not exist or the bot cannot see it.',
      fix: 'Re-check DISCORD_CHANNEL_ID. Enable Developer Mode in Discord, right-click the channel, Copy Channel ID.',
    };
  }
  if (status === 429) {
    return { kind: 'rate-limited', summary: 'Discord rate limited the request.', fix: 'Back off and retry; poll no faster than once every few seconds.' };
  }
  if (/ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ETIMEDOUT|socket hang up|cancelled/i.test(message)) {
    return {
      kind: 'network',
      summary: 'No route to discord.com from this sandbox.',
      fix: 'This is usually the same egress restriction; confirm with `npm run robot -- doctor`.',
    };
  }
  return { kind: 'unknown', summary: message || `HTTP ${status}`, fix: 'Run `npm run robot -- doctor` for a transport-level probe.' };
}

/** Record written to the offline outbox when Discord cannot be reached. */
export function outboxRecord({ id, question, context, content, reason, at }) {
  return {
    id,
    at,
    status: 'queued',
    reason: reason?.kind ?? 'unknown',
    reasonSummary: reason?.summary ?? '',
    question: redact(question),
    context: redact(context ?? ''),
    content,
  };
}
