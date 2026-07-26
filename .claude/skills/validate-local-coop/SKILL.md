---
name: validate-local-coop
description: Validate Sal/Pep two-device local co-op selection, P1-red/P2-blue ownership, gender presentation parity, disconnect/rebind, and replay persistence.
argument-hint: [smoke|full]
disable-model-invocation: true
allowed-tools: Read Grep Glob Edit Write Bash(npm *) Bash(npx *) Bash(node *)
---

Validate local co-op according to `docs/LOCAL_COOP_CHARACTER_SELECT.md`.

For `smoke`:

1. launch the app;
2. join with two distinct mocked or physical gamepads, or keyboard-plus-gamepad;
3. select Sal/Pep and Boy/Girl independently;
4. verify Player 1 red and Player 2 blue;
5. begin a Stack Phase and enter Boss Flight;
6. verify independent movement and separately attributable unlimited spatula streams;
7. report exact failures.

For `full` or no argument:

- run all relevant unit and E2E tests;
- test both players selecting Boy and both selecting Girl;
- test occupied-identity swap;
- test join order permutations;
- test that one device cannot control both slots;
- test disconnect and replacement-controller rebind for each slot;
- test that selections and slot colors persist through map flip, boss launch, results, save/load and replay;
- test older Chef P/Chef S save migration;
- test monochrome and common color-vision simulations for P1/P2 number/shape readability;
- test that all four base variants share gameplay values and collision bounds;
- inspect the running game and save screenshots/debug evidence paths in `BUILD_STATUS.md` where available.

Do not hide failures or weaken assertions to get a passing result.
