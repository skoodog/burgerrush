/**
 * Data-driven tuning. Every number the simulation reads lives here so balance
 * changes never require touching systems code, and so unit tests can assert
 * against the same table the game runs on.
 */

/** Virtual design resolution. The canvas letterboxes to this 16:9 field. */
export const VIEW = { width: 960, height: 540 } as const;

/** Fixed simulation step. Rendering interpolates; simulation never varies. */
export const FIXED_STEP = 1 / 120;
export const MAX_STEPS_PER_FRAME = 8;

export const STACK_PHASE = {
  /** Exactly 60.0 seconds after the ready animation, per the brief. */
  durationSeconds: 60,
  /** Timer starts on first accepted input, or after this grace period. */
  startGraceSeconds: 2.5,
  /** Adaptive music / AI escalation thresholds. */
  pressureAt: 30,
  rageAt: 15,
  finalCountAt: 5,
  /** Cost of a hit. */
  hitTimePenalty: 3,
  hitInvulnSeconds: 1.25,
  hitStopSeconds: 0.18,
} as const;

export const RUN = {
  startingAprons: 3,
  extraApronScore: 20_000,
  /** Field spatulas appear from this round onward. Exactly three per Stack Phase. */
  fieldSpatulaRound: 10,
  fieldSpatulaCount: 3,
} as const;

/**
 * Chef movement. Identical for every identity, presentation and player slot -
 * asserted by tests/unit/identity.test.ts.
 */
export const CHEF_MOVE = {
  maxRunSpeed: 132,
  accel: 1450,
  decel: 1750,
  /** Reversal is near-instant for arcade feel. */
  turnAccel: 2600,
  climbSpeed: 92,
  gravity: 980,
  maxFallSpeed: 460,
  /** Snap radius for grabbing a ladder. */
  ladderSnapRadius: 11,
  /** Horizontal hold must fall inside this window to avoid an accidental grab. */
  ladderIntentWindow: 0.16,
  /** Coyote time after leaving a surface. */
  edgeForgiveness: 0.08,
  inputBufferSeconds: 0.12,
  /** Speed below which the chef reads as stopped. */
  idleThreshold: 8,
  /** Ground-speed fraction that triggers the skid state. */
  skidThreshold: 0.45,
} as const;

export const FLIGHT = {
  /** Eight-directional free movement inside safe bounds. */
  moveSpeed: 210,
  accel: 1800,
  decel: 2100,
  /**
   * Throws per second, per chef. Unlimited: no ammo, no reload, no heat.
   * The cadence exists for readability and pooling only.
   */
  fireRate: 7,
  projectileSpeed: 470,
  projectileDamage: 1,
  /** Pool cap. A rendering limit, never an ammo shortage. */
  projectilePool: 220,
  wingOffset: { x: -34, y: 26 },
  wingRecoverSeconds: 1.6,
  quickClearSeconds: 30,
  bounds: { minX: 60, maxX: 470, minY: 110, maxY: 470 },
} as const;

export const BOSS_WARNING = {
  /** Full warning-to-control handoff, per docs/BOSS_FLIGHT.md. */
  totalSeconds: 2.6,
  klaxonSeconds: 1.15,
  lookUpSeconds: 0.7,
  launchSeconds: 0.62,
  /** Reduced motion swaps shake/zoom for a two-card wipe at identical timing. */
  reducedMotionSeconds: 2.6,
} as const;

/** Exact localized strings. These are asserted by unit and E2E tests. */
export const BOSS_WARNING_TEXT = {
  en: 'BOSS COMING!',
  ja: 'ボス接近！',
} as const;

/** Score table from MASTER_PROMPT section 14. */
export const SCORE = {
  treadSegment: 10,
  ingredientLayerComplete: 250,
  ingredientDropLanding: 100,
  enemyCarriedOneLevel: 400,
  enemyFlattened: 1_000,
  enemyFlattenedSecond: 1_500,
  enemyFlattenedThird: 2_500,
  burgerComplete: 5_000,
  secretBurgerRequired: 7_500,
  secretBurgerOptional: 10_000,
  fieldSpatulaDispatch: 750,
  fieldSpatulaLineup: [750, 1_500, 3_000],
  remainingSecond: 100,
  bossArmourMinor: 500,
  bossArmourMajor: 1_500,
  pickleDiscDestroyed: 25,
  /** Anti-farming cap on destructible pickle discs, per encounter. */
  pickleDiscCap: 40,
  bossDefeatBase: 5_000,
  bossQuickClearPerSecond: 250,
  noHitStackPhase: 3_000,
  noHitBossFlight: 3_000,
  siblingSync: 1_500,
  noWastedPortal: 1_500,
  unusedFieldSpatulas: 1_500,
  comboCap: 8,
} as const;

/** Enemy brain parameters. Intelligence scales before raw speed. */
export const ENEMY_BRAINS = {
  stalker: {
    speed: 52,
    rageSpeed: 66,
    pathRefresh: 0.85,
    lookahead: 0,
    mistakeRate: 0.18,
    ladderPreference: 0.5,
    persistence: 0.4,
    telegraphSeconds: 0,
  },
  brat: {
    speed: 62,
    rageSpeed: 80,
    pathRefresh: 0.45,
    lookahead: 0,
    mistakeRate: 0.06,
    ladderPreference: 0.85,
    persistence: 0.92,
    telegraphSeconds: 0,
    /** Extra speed once it has run more than this far in one direction. */
    longPlatformBonus: 18,
    /** Distance it overshoots a turn, which reversals exploit. */
    overshoot: 26,
  },
  phantom: {
    speed: 56,
    rageSpeed: 70,
    pathRefresh: 0.55,
    /** Seconds of chef movement it extrapolates. */
    lookahead: 1.35,
    mistakeRate: 0.04,
    ladderPreference: 0.7,
    persistence: 0.7,
    /** Visible pause before a high-confidence intercept, so it stays readable. */
    telegraphSeconds: 0.5,
  },
  ringletSmall: {
    speed: 68,
    rageSpeed: 84,
    pathRefresh: 0.4,
    lookahead: 0.5,
    mistakeRate: 0.12,
    ladderPreference: 0.4,
    persistence: 0.5,
    telegraphSeconds: 0,
  },
  ringletLarge: {
    speed: 46,
    rageSpeed: 58,
    pathRefresh: 0.6,
    lookahead: 0.9,
    mistakeRate: 0.08,
    ladderPreference: 0.6,
    persistence: 0.8,
    telegraphSeconds: 0.35,
  },
} as const;

export const THREAT_DIRECTOR = {
  /** Radius inside which an enemy contributes pressure. */
  pressureRadius: 190,
  /** Max simultaneous approach directions allowed near the chef. */
  maxApproachAngles: 2,
  /** An enemy is held back rather than closing an unavoidable trap. */
  holdSeconds: 0.8,
  /** Minimum distance an enemy may re-enter play from. */
  reentryDistance: 150,
  /** Escape-route score below which the director intervenes. */
  escapeFloor: 0.28,
} as const;

/** Boss health and pattern unlock schedule. */
export const BOSS = {
  baseHealth: 26,
  healthPerRound: 8,
  armourLayers: ['lettuce', 'cheese', 'patty', 'tomato'] as const,
  enrageSpeedMultiplier: 1.25,
  patternUnlock: {
    1: ['pickle'],
    2: ['pickle', 'ketchup'],
    3: ['pickle', 'ketchup', 'mustard'],
    4: ['pickle', 'ketchup', 'mustard', 'mayo'],
  } as const,
} as const;

export type AccessibilitySettings = {
  reducedMotion: boolean;
  reducedFlash: boolean;
  highContrast: boolean;
  screenShake: number;
  numericBossHealth: boolean;
  projectileContrast: number;
  autoFire: boolean;
  captions: boolean;
  readableTimerScale: number;
};

export const DEFAULT_ACCESSIBILITY: AccessibilitySettings = {
  reducedMotion: false,
  reducedFlash: false,
  highContrast: false,
  screenShake: 1,
  numericBossHealth: false,
  projectileContrast: 1,
  autoFire: false,
  captions: true,
  readableTimerScale: 1,
};

export const AUDIO_DEFAULTS = {
  master: 0.8,
  music: 0.55,
  sfx: 0.85,
  warning: 1,
} as const;
