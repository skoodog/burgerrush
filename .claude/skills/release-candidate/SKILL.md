---
name: release-candidate
description: Turn the current Burger Rush build into a measured release candidate without deploying or publishing it.
disable-model-invocation: true
allowed-tools: Read Grep Glob Edit Write Bash(npm *) Bash(npx *) Bash(node *) Bash(git status *) Bash(git diff *)
---

Create a release candidate, but do not publish.

1. Run formatting, lint, typecheck, unit tests, map validation, run simulations, E2E tests, and production build.
2. Run a browser smoke test for title -> Sal/Pep identity plus Boy/Girl select -> two-device P1-red/P2-blue join/ready -> Stack Phase -> BOSS COMING bilingual warning -> sibling launch -> unlimited dual-spatula boss -> portal flip on round 4 -> boss -> results -> leaderboard.
3. Test offline startup and installability.
4. Run accessibility and performance audits, including monochrome P1/P2 identification, two-controller isolation, disconnect/rebind, and sustained dual-player input.
5. Verify no secrets, generated debug dumps, copied source assets, exact BurgerTime map geometry, copied shooter warning treatment, or salt/pepper shaker enemy remnants are included.
6. Verify leaderboard input sanitization and local-storage migration.
7. Record bundle sizes and known limitations.
8. Update `BUILD_STATUS.md`, `CHANGELOG.md`, and `docs/RELEASE_CHECKLIST.md`.
9. Stop before commit, push, deployment, store upload, or paid generation.
