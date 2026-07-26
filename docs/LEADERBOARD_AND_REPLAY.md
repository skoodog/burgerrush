# Leaderboard and replay

## Status

Local leaderboard persistence, sanitisation and migration are **implemented**.
The replay format and headless verifier are **specified here but not
implemented**; `replayHash` is currently a seed-and-score digest, not a
recomputation. This is called out in `BUILD_STATUS.md`.

## Local persistence

Versioned under `burger-rush.profile.v3`, with migration from `v2`, `v1` and the
unversioned key.

Corrupt storage is **backed up and reset**, never allowed to break boot:
`loadProfile()` catches the parse failure, writes the raw payload to
`<key>.corrupt.<timestamp>`, removes the bad key and continues with defaults.
Storage being unavailable entirely (private mode, quota) degrades to in-memory
play with no error surfaced to the player.

### Stored per entry

```
initials, displayName?, score, round, durationSeconds, mode,
seed, bossSeed, bossClearSeconds,
leadIdentity, leadPresentation, coop,
version, replayHash, timestamp, ranked, practiceFlags[]
```

No hardware serial or device identifier is ever stored.

### Migration

Pre-Revision-3 records naming `Chef P` / `Chef S` map to `pep` / `sal` with the
prior default presentations. Unknown fields are dropped rather than trusted.

## Sanitisation

- **Initials**: uppercased, restricted to `A-Z0-9`, truncated to 3, padded with
  `A`.
- **Display name**: `< > & " ' \` ` stripped, whitespace collapsed, truncated to
  16 characters.

Both run on write _and_ the leaderboard renderer escapes on read. There is no
path from stored data to `innerHTML`.

## Intended replay format

Seed, version and timestamped input changes — never video.

```ts
interface Replay {
  version: string;
  runSeed: number;
  mode: GameMode;
  coop: boolean;
  players: { slot: 1 | 2; identity: ChefIdentity; presentation: GenderPresentation }[];
  inputs: { slot: 1 | 2; step: number; state: number }[]; // bitfield deltas
  bossSeed: number;
  finalScore: number;
  hash: string;
}
```

Because the simulation is fixed-step and every RNG stream is seeded and named,
replaying the input stream against the same version must reproduce the score
exactly. The headless verifier will recompute it and compare.

## Remote adapter

```ts
interface LeaderboardProvider {
  submit(entry: LeaderboardEntry, replay: Replay): Promise<SubmitResult>;
  top(scope: 'all' | 'daily' | 'weekly' | 'endless', limit: number): Promise<LeaderboardEntry[]>;
}
```

Rules for any remote implementation:

- local play must work fully without it;
- no service key in client code;
- names sanitised server-side as well as client-side;
- rate-limited submissions;
- practice and modified runs rejected as unranked;
- network failure is non-destructive — the local entry is already written.

A Supabase adapter is the intended first implementation, enabled only when
configured. See `docs/EXTERNAL_SETUP.md`.
