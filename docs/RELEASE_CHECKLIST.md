# Release checklist

## Gates (must exit 0)

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run validate:maps -- --count 1000
npm run build
```

Record the actual outcomes in `BUILD_STATUS.md`. Never record an outcome that was
not observed.

## Functional

- [ ] Boot → title → select → Stack Phase → warning → launch → Boss Flight →
      results completes without a console error
- [ ] Stack Phase timer is exactly 60.0 seconds and starts on first input
- [ ] Warning renders exactly `BOSS COMING!` and `ボス接近！` from localisation
- [ ] Both chefs cross the top boundary before flight control begins
- [ ] Holding fire for 60 seconds decrements nothing
- [ ] Level cannot clear before boss defeat is committed
- [ ] All four chef variants play identically; collision bounds are identical
- [ ] P1 red / P2 blue survive every identity and presentation change
- [ ] P1/P2 remain distinguishable under a monochrome filter
- [ ] Occupied-identity selection swaps without changing device, presentation or
      slot colour
- [ ] Controller disconnect pauses; a replacement rebinds to the same slot
- [ ] Reduced motion and high contrast behave
- [ ] Offline reload retains the local leaderboard
- [ ] No salt-shaker or pepper-shaker asset, identifier or prompt exists

## Content and legal

- [ ] No copied sprite, sound, tune, name, palette, lettering or map geometry
- [ ] Tutorial stage geometry is original in layout, proportion and route logic
- [ ] Fonts licensed and bundled; licence recorded
- [ ] Name and trademark clearance complete
- [ ] Asset provenance recorded in `docs/ASSET_LEDGER.md`

## Security and privacy

- [ ] All user-visible names sanitised on write and escaped on render
- [ ] Storage payloads validated; corrupt storage backed up and reset
- [ ] No secrets in client code; no telemetry without explicit configuration
- [ ] CSP appropriate for the deployment

## Performance

- [ ] Stable 60 FPS on target hardware
- [ ] No repeated allocation in hot loops
- [ ] Pools cover projectiles, hazards, particles and popups
- [ ] 30-minute autoplay soak with no leak
- [ ] Bundle and asset budgets documented

## Sign-off

Report what is playable, the exact run command, controls, test and build results,
generated assets and provenance, remaining external setup, known limitations, and
the next highest-value improvement.
