---
name: validate-procgen
description: Validate Burger Rush procedural maps and reproduce failing seeds.
argument-hint: [seed-count-or-specific-seed]
disable-model-invocation: true
allowed-tools: Read Grep Glob Edit Write Bash(npm run validate:maps *) Bash(npm run simulate:runs *) Bash(node *)
---

Validate `$ARGUMENTS`.

For a specific seed, output:

- topology summary;
- front/back face count;
- reachable burger and portal checks;
- optimal enemy-free completion estimate;
- escape-route metrics;
- spawn safety;
- secret burger classification;
- bot-simulation outcomes;
- rendered debug artifact path.

For a count, batch-test that many deterministic seeds, save all failures, classify causes, fix root causes, and rerun until the requested batch passes or a documented hard limit is reached.
