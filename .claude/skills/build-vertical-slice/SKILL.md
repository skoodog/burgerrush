---
name: build-vertical-slice
description: Build or finish the smallest polished Burger Rush slice that proves the core loop end to end.
disable-model-invocation: true
allowed-tools: Read Grep Glob Edit Write Bash(npm *) Bash(npx *) Bash(node *)
---

Build a complete playable slice before broadening scope.

The slice must include:

1. boot, title, Sal/Pep select with Boy/Girl presentation, local two-device join, P1-red/P2-blue preview, and round-intro screens;
2. one original fixed map;
3. responsive walking and ladders;
4. segmented ingredient tread and drop behavior;
5. one completed burger;
6. two distinct enemies;
7. exact 60-second round timing;
8. life loss, restart, and score;
9. exact `BOSS COMING!` / `ボス接近！` warning and two-pulse klaxon;
10. both siblings launching through the top boundary;
11. a pickle-only giant-burger boss with both chefs firing unlimited spatulas;
12. boss defeat and combined results;
13. keyboard plus one non-keyboard input path for solo, and two gamepads or keyboard-plus-gamepad for local co-op;
14. placeholder audio and original placeholder visuals;
15. unit tests, one browser E2E test, and a production build.

Inspect the running game. Do not mark complete from code review alone. Update `BUILD_STATUS.md`.
