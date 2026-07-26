# Accessibility

## Shipped

**Colour independence.** Nothing critical is communicated by colour alone.

| Signal             | Non-colour carriers                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Player slot        | slot number, identity letter (`S`/`P`), marker shape (P1 diamond / P2 circle), screen position                                             |
| Tread progress     | segment compression and a footprint notch                                                                                                  |
| Aprons             | outlined apron shapes, filled or hollow                                                                                                    |
| Boss armour        | discrete layer pips, plus an optional numeric readout                                                                                      |
| Condiment patterns | a distinct warning glyph per family (circle, rectangle, fork, triangle), a text caption, a distinct silhouette, and a distinct audio motif |
| Timer urgency      | scale and pulse in addition to hue                                                                                                         |

**Gender presentation** options use neutral text labels (`BOY` / `GIRL`) and
neutral glyphs (`△` / `○`). No pink/blue stereotype coding anywhere.

**Reduced motion** replaces the boss-warning shake and zoom with a short two-card
reveal at **identical timing**, so ranked pacing and control readiness are
unchanged. Honoured from the OS via `prefers-reduced-motion` and from settings.

**Screen shake** is a 0-1 multiplier applied at every call site, so it can be
turned fully off.

**Boss-flight auto-fire** is available and does **not** affect ranked
eligibility, because ammunition is unlimited for everyone anyway.

**Keyboard and controller complete.** Every screen — including the two-column
co-op join and select — is fully operable without a mouse.

**Pause on focus loss** via `visibilitychange`.

**Audio separation** into master, music, SFX and warning buses. Warning cues stay
audible with music muted and always have a visual equivalent.

**Readable timer scale** multiplier.

**Adjustable projectile contrast** applied to hazard alpha.

**Screen-reader companion.** The canvas carries `role="application"` and an
accessible name; an `aria-live` region describes how to start.

## Settings surface

`AccessibilitySettings` is persisted per profile and applied at scene
construction:

```ts
(reducedMotion,
  reducedFlash,
  highContrast,
  screenShake,
  numericBossHealth,
  projectileContrast,
  autoFire,
  captions,
  readableTimerScale);
```

## Not yet implemented

Listed honestly rather than implied:

- Full keyboard and gamepad **remapping** UI. The device layer supports it; the
  settings screen does not exist yet.
- **Touch overlay**. `ControlMap` has a touch device kind and a virtual-axis
  path, but there is no on-screen pad to drive it.
- **High-contrast palette swap**. The flag is plumbed and persisted; the alternate
  palette is not authored.
- **Rumble** toggles.
- **Practice** speed, timer and invulnerability toggles.
- Player **locator arrows** during hectic play.
