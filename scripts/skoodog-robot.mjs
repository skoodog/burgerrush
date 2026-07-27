#!/usr/bin/env node
/**
 * skoodog-robot - Discord bridge for questions this project cannot answer itself.
 *
 * Usage:
 *   npm run robot -- doctor                    preflight: transport, auth, channel
 *   npm run robot -- ask "question" [--context "..."]
 *   npm run robot -- poll [--id SKR-XXXX]
 *   npm run robot -- watch [--id SKR-XXXX] [--interval 15] [--timeout 300]
 *   npm run robot -- outbox                    list questions queued while offline
 *   npm run robot -- flush                     retry every queued question
 *
 * Configuration, all via environment, never committed:
 *   DISCORD_BOT_TOKEN    bot token from the Discord Developer Portal
 *   DISCORD_CHANNEL_ID   numeric channel id the bot can read and post in
 *
 * Design notes:
 *   - REST only. The gateway needs a WebSocket upgrade, which the sandbox's
 *     egress proxy does not support; polling `GET /channels/:id/messages` is
 *     plain HTTPS and works through a CONNECT tunnel.
 *   - No dependencies. The proxy tunnel is ~30 lines rather than a package.
 *   - When Discord is unreachable, questions queue to a local outbox instead of
 *     failing, so the calling agent is never blocked on the network.
 */

import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import tls from 'node:tls';
import https from 'node:https';
import process from 'node:process';
import {
  classifyTransportError,
  formatQuestion,
  issueId,
  outboxRecord,
  parseReplies,
  redact,
} from './skoodogRobotCore.mjs';

const API = 'discord.com';
const API_BASE = '/api/v10';
const STATE_DIR = path.resolve('.skoodog-robot');
const OUTBOX = path.join(STATE_DIR, 'outbox.jsonl');
const ISSUES = path.join(STATE_DIR, 'issues.json');
const CA_PATH = '/root/.ccr/ca-bundle.crt';
const CA = fs.existsSync(CA_PATH) ? fs.readFileSync(CA_PATH) : undefined;

const TOKEN = process.env.DISCORD_BOT_TOKEN ?? '';
const CHANNEL = process.env.DISCORD_CHANNEL_ID ?? '';
/** Every outbound message is scrubbed against these literal values too. */
const SECRETS = [TOKEN].filter((s) => s.length >= 8);

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

/**
 * https.Agent that tunnels through HTTPS_PROXY with CONNECT.
 *
 * Node's built-in client ignores HTTPS_PROXY, and the sandbox has no
 * https-proxy-agent installed, so the tunnel is built by hand. A non-200
 * CONNECT response is surfaced verbatim - that body is the egress policy
 * explaining itself, and it is the single most useful diagnostic here.
 */
class TunnelAgent extends https.Agent {
  constructor(proxyUrl, options) {
    super(options);
    this.proxy = new URL(proxyUrl);
  }

  createConnection(options, callback) {
    let settled = false;
    const done = (err, sock) => {
      if (settled) return;
      settled = true;
      callback(err, sock);
    };

    const socket = net.connect({
      host: this.proxy.hostname,
      port: Number(this.proxy.port || 80),
    });
    socket.setTimeout(20000, () => {
      socket.destroy();
      done(new Error('proxy CONNECT timed out'));
    });
    socket.once('error', (err) => done(err));
    socket.on('connect', () => {
      const target = `${options.host}:${options.port || 443}`;
      socket.write(`CONNECT ${target} HTTP/1.1\r\nHost: ${target}\r\n\r\n`);
    });

    let buffer = '';
    const onData = (chunk) => {
      buffer += chunk.toString('latin1');
      if (!buffer.includes('\r\n\r\n')) return;
      socket.removeListener('data', onData);
      socket.setTimeout(0);
      const [head, rest = ''] = buffer.split('\r\n\r\n');
      const statusLine = head.split('\r\n')[0] ?? '';
      const code = Number(statusLine.split(/\s+/)[1]);
      if (code !== 200) {
        const detail = rest.trim();
        socket.destroy();
        done(
          new Error(
            `proxy refused CONNECT ${options.host}: ${statusLine.trim()}${detail ? ` — ${detail}` : ''}`,
          ),
        );
        return;
      }
      done(null, tls.connect({ socket, servername: options.host, ca: CA }));
    };
    socket.on('data', onData);
  }
}

function agent() {
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  return proxy ? new TunnelAgent(proxy, { keepAlive: false }) : undefined;
}

/** One Discord REST call. Resolves `{ status, json, text }`; never throws on HTTP status. */
function discord(method, route, body) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : Buffer.from(JSON.stringify(body));
    const req = https.request(
      {
        host: API,
        path: `${API_BASE}${route}`,
        method,
        agent: agent(),
        ca: CA,
        headers: {
          Authorization: `Bot ${TOKEN}`,
          'User-Agent': 'skoodog-robot (burger-rush, 1.0)',
          ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': payload.length } : {}),
        },
      },
      (res) => {
        let text = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (text += c));
        res.on('end', () => {
          let json = null;
          try {
            json = text ? JSON.parse(text) : null;
          } catch {
            /* non-JSON error page; `text` is still reported */
          }
          resolve({ status: res.statusCode ?? 0, json, text });
        });
      },
    );
    req.on('error', reject);
    req.setTimeout(25000, () => {
      req.destroy(new Error('request timed out'));
    });
    if (payload) req.write(payload);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Local state
// ---------------------------------------------------------------------------

function ensureState() {
  fs.mkdirSync(STATE_DIR, { recursive: true });
}

function readIssues() {
  try {
    return JSON.parse(fs.readFileSync(ISSUES, 'utf8'));
  } catch {
    return {};
  }
}

function writeIssues(issues) {
  ensureState();
  fs.writeFileSync(ISSUES, `${JSON.stringify(issues, null, 2)}\n`);
}

function appendOutbox(record) {
  ensureState();
  fs.appendFileSync(OUTBOX, `${JSON.stringify(record)}\n`);
}

function readOutbox() {
  try {
    return fs
      .readFileSync(OUTBOX, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function doctor() {
  console.log('skoodog-robot doctor\n');

  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  console.log(`  proxy              ${proxy ? proxy : '(none - direct connections)'}`);
  console.log(`  CA bundle          ${CA ? CA_PATH : '(system trust store)'}`);
  console.log(`  DISCORD_BOT_TOKEN  ${TOKEN ? `set (${TOKEN.length} chars)` : 'MISSING'}`);
  console.log(`  DISCORD_CHANNEL_ID ${CHANNEL ? CHANNEL : 'MISSING'}`);
  console.log('');

  // 1. Can we reach discord.com at all?
  process.stdout.write('  [1/3] transport to discord.com ... ');
  let reachable = false;
  try {
    const res = await discord('GET', '/gateway');
    reachable = true;
    console.log(`reachable (HTTP ${res.status})`);
  } catch (error) {
    const diag = classifyTransportError(error);
    console.log('BLOCKED');
    console.log(`        ${diag.summary}`);
    console.log(`        raw: ${redact(String(error.message), SECRETS)}`);
    console.log(`        fix: ${diag.fix}`);
  }

  if (!reachable) {
    console.log('\n  Stopping: nothing downstream can be tested without transport.');
    console.log('  Questions will still queue locally; run `npm run robot -- flush` once open.');
    return 2;
  }

  // 2. Does the token authenticate?
  process.stdout.write('  [2/3] bot identity ............. ');
  if (!TOKEN) {
    console.log('SKIPPED (no DISCORD_BOT_TOKEN)');
  } else {
    const me = await discord('GET', '/users/@me');
    if (me.status === 200) {
      console.log(`ok - ${me.json?.username ?? 'unknown'}#${me.json?.discriminator ?? '0'} (${me.json?.id})`);
    } else {
      const diag = classifyTransportError(new Error(me.text), me.status);
      console.log(`FAILED (HTTP ${me.status})`);
      console.log(`        ${diag.summary}\n        fix: ${diag.fix}`);
    }
  }

  // 3. Is the channel readable?
  process.stdout.write('  [3/3] channel access ........... ');
  if (!TOKEN || !CHANNEL) {
    console.log('SKIPPED (needs token and channel id)');
  } else {
    const ch = await discord('GET', `/channels/${CHANNEL}`);
    if (ch.status === 200) {
      console.log(`ok - #${ch.json?.name ?? CHANNEL} in guild ${ch.json?.guild_id ?? '?'}`);
    } else {
      const diag = classifyTransportError(new Error(ch.text), ch.status);
      console.log(`FAILED (HTTP ${ch.status})`);
      console.log(`        ${diag.summary}\n        fix: ${diag.fix}`);
    }
  }
  return 0;
}

async function ask(question, context) {
  if (!question) {
    console.error('usage: npm run robot -- ask "your question" [--context "..."]');
    return 1;
  }
  const id = issueId(question);
  const content = redact(formatQuestion({ id, question, context }), SECRETS);

  const issues = readIssues();
  issues[id] = issues[id] ?? { id, question: redact(question, SECRETS), askedAt: new Date().toISOString(), messageId: null, replies: [] };

  if (!TOKEN || !CHANNEL) {
    const reason = { kind: 'unconfigured', summary: 'DISCORD_BOT_TOKEN / DISCORD_CHANNEL_ID not set.' };
    appendOutbox(outboxRecord({ id, question, context, content, reason, at: new Date().toISOString() }));
    writeIssues(issues);
    console.log(`${id} queued locally (not configured). See docs/EXTERNAL_SETUP.md.`);
    return 3;
  }

  try {
    const res = await discord('POST', `/channels/${CHANNEL}/messages`, { content });
    if (res.status === 200 || res.status === 201) {
      issues[id].messageId = res.json?.id ?? null;
      issues[id].delivered = true;
      writeIssues(issues);
      console.log(`${id} posted to Discord (message ${res.json?.id}).`);
      console.log(`Poll for answers: npm run robot -- watch --id ${id}`);
      return 0;
    }
    const diag = classifyTransportError(new Error(res.text), res.status);
    appendOutbox(outboxRecord({ id, question, context, content, reason: diag, at: new Date().toISOString() }));
    writeIssues(issues);
    console.error(`${id} not delivered (HTTP ${res.status}): ${diag.summary}\n  fix: ${diag.fix}`);
    return 1;
  } catch (error) {
    const diag = classifyTransportError(error);
    appendOutbox(outboxRecord({ id, question, context, content, reason: diag, at: new Date().toISOString() }));
    writeIssues(issues);
    console.error(`${id} queued locally — ${diag.summary}`);
    console.error(`  fix: ${diag.fix}`);
    return 2;
  }
}

async function poll(id, { quiet = false } = {}) {
  if (!TOKEN || !CHANNEL) {
    if (!quiet) console.error('Not configured: set DISCORD_BOT_TOKEN and DISCORD_CHANNEL_ID.');
    return { replies: [], status: 'unconfigured' };
  }
  const issues = readIssues();
  const issue = id ? issues[id] : null;
  let res;
  try {
    res = await discord('GET', `/channels/${CHANNEL}/messages?limit=100`);
  } catch (error) {
    const diag = classifyTransportError(error);
    if (!quiet) console.error(`poll failed — ${diag.summary}\n  fix: ${diag.fix}`);
    return { replies: [], status: diag.kind };
  }
  if (res.status !== 200) {
    const diag = classifyTransportError(new Error(res.text), res.status);
    if (!quiet) console.error(`poll failed (HTTP ${res.status}) — ${diag.summary}\n  fix: ${diag.fix}`);
    return { replies: [], status: diag.kind };
  }

  const meRes = await discord('GET', '/users/@me');
  const botUserId = meRes.json?.id;
  const replies = parseReplies(res.json, { issueId: id, botUserId, askedMessageId: issue?.messageId });

  if (id && issues[id]) {
    issues[id].replies = replies;
    writeIssues(issues);
  }
  if (!quiet) {
    if (replies.length === 0) console.log(id ? `No replies to ${id} yet.` : 'No matching replies.');
    for (const r of replies) console.log(`\n[${r.author}] ${r.timestamp ?? ''}\n${r.content}`);
  }
  return { replies, status: 'ok' };
}

async function watch(id, intervalSec, timeoutSec) {
  const deadline = Date.now() + timeoutSec * 1000;
  const seen = new Set();
  console.log(`Watching ${id ?? 'channel'} every ${intervalSec}s for up to ${timeoutSec}s.`);
  while (Date.now() < deadline) {
    const { replies, status } = await poll(id, { quiet: true });
    if (status !== 'ok') {
      console.error(`Stopping: transport reported "${status}". Run \`npm run robot -- doctor\`.`);
      return 2;
    }
    for (const r of replies) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      console.log(`\n[${r.author}] ${r.timestamp ?? ''}\n${r.content}`);
    }
    await new Promise((r) => setTimeout(r, intervalSec * 1000));
  }
  console.log(`\nTimed out after ${timeoutSec}s with ${seen.size} repl${seen.size === 1 ? 'y' : 'ies'}.`);
  return seen.size > 0 ? 0 : 1;
}

function outbox() {
  const records = readOutbox();
  if (records.length === 0) {
    console.log('Outbox empty.');
    return 0;
  }
  console.log(`${records.length} queued question(s):\n`);
  for (const r of records) {
    console.log(`  ${r.id}  [${r.reason}]  ${r.at}`);
    console.log(`    ${r.question.split('\n')[0].slice(0, 140)}`);
  }
  console.log('\nRetry all once egress is open: npm run robot -- flush');
  return 0;
}

async function flush() {
  const records = readOutbox();
  if (records.length === 0) {
    console.log('Outbox empty.');
    return 0;
  }
  const remaining = [];
  let sent = 0;
  for (const r of records) {
    try {
      const res = await discord('POST', `/channels/${CHANNEL}/messages`, { content: r.content });
      if (res.status === 200 || res.status === 201) {
        sent += 1;
        console.log(`  sent ${r.id}`);
        continue;
      }
      console.error(`  kept ${r.id} (HTTP ${res.status})`);
      remaining.push(r);
    } catch (error) {
      console.error(`  kept ${r.id} — ${classifyTransportError(error).summary}`);
      remaining.push(r);
    }
  }
  ensureState();
  fs.writeFileSync(OUTBOX, remaining.map((r) => JSON.stringify(r)).join('\n') + (remaining.length ? '\n' : ''));
  console.log(`\n${sent} sent, ${remaining.length} still queued.`);
  return remaining.length === 0 ? 0 : 1;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function flag(argv, name, fallback) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
}

async function main() {
  const argv = process.argv.slice(2);
  const command = argv[0];
  switch (command) {
    case 'doctor':
      return doctor();
    case 'ask':
      return ask(argv[1], flag(argv, 'context', ''));
    case 'poll':
      return (await poll(flag(argv, 'id', null))) ? 0 : 0;
    case 'watch':
      return watch(flag(argv, 'id', null), Number(flag(argv, 'interval', 15)), Number(flag(argv, 'timeout', 300)));
    case 'outbox':
      return outbox();
    case 'flush':
      return flush();
    default:
      console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(2, 22).join('\n').replace(/^ \* ?/gm, ''));
      return command ? 1 : 0;
  }
}

main().then(
  (code) => process.exit(typeof code === 'number' ? code : 0),
  (error) => {
    console.error(`skoodog-robot crashed: ${redact(String(error?.stack ?? error), SECRETS)}`);
    process.exit(1);
  },
);
