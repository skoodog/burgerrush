# Burger Rush — Claude Code setup

`Burger Rush` is a working title. Perform formal name and trademark clearance before release.

## 1. Create and enter the project

```bash
mkdir burger-rush
cd burger-rush
git init
```

Copy the contents of this launch pack into the repository root.

## 2. Enable Claude Code auto mode safely

Auto mode cannot be granted by a repository. Set it in your user-level Claude Code settings, or use the CLI flag for this session.

User settings file:

- macOS/Linux: `~/.claude/settings.json`
- Windows: `%USERPROFILE%\.claude\settings.json`

Suggested user-level configuration:

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "defaultMode": "auto",
    "disableBypassPermissionsMode": "disable"
  }
}
```

Start the session:

```bash
claude --permission-mode auto
```

Do not use `--dangerously-skip-permissions`. Auto mode retains a classifier safety review.

## 3. Connect Higgsfield MCP

```bash
claude mcp add --transport http higgsfield --scope user https://mcp.higgsfield.ai/mcp
claude mcp login higgsfield
claude mcp list
```

If the endpoint authenticates through the interactive MCP panel instead:

```text
/mcp
```

The build must not depend on Higgsfield being available. It must first produce a complete playable game with deterministic placeholder assets. Higgsfield is a replaceable production pipeline for concept art, character consistency, key art, motion reference, textures, and any sound-generation tools exposed by the connected server.

## 4. Launch the autonomous build

Open `MASTER_PROMPT.md`, copy everything under **COPY-PASTE MASTER PROMPT**, and paste it into Claude Code.

Then set this goal:

```text
/goal Burger Rush has a polished playable browser build with player-facing sibling identities Chef Sal (S) and Chef Pep (P); Sal and Pep each support Boy and Girl presentation with identical mechanics and collision bounds; local two-player mode accepts two controllers or keyboard-plus-gamepad, isolates each input device, allows both players to choose the same gender presentation, swaps occupied Sal/Pep identities without changing player settings, keeps Player 1 red in uniform striping/lettering and Player 2 blue regardless of identity or presentation, and supports slot-preserving controller reconnect; no salt-or-pepper-shaker enemies; rounds 1-4 implemented; deterministic procedural rounds thereafter; a real 60-second Stack Phase timer; at least three distinct enemy brains; the front/back map flip and required secret burger; a klaxon and exact BOSS COMING! / ボス接近！ warning after every completed Stack Phase; both selected chefs launching through the top boundary into a side-scrolling giant-burger boss battle; both firing unlimited spinning spatulas with no ammo decrement and cosmetic red/blue stream attribution; distinct pickle/ketchup/mustard/mayo boss patterns by round 4; level-10 finite field spatulas available through normal progression and debug selection; local leaderboard persistence; keyboard/gamepad/touch controls; reduced-motion and high-contrast options; no copied BurgerTime or shooter assets or exact map geometry; npm run lint exits 0; npm run typecheck exits 0; npm test exits 0; npm run test:e2e exits 0; npm run validate:maps -- --count 1000 exits 0; and npm run build exits 0; or stop after 30 evaluated turns and leave BUILD_STATUS.md with exact remaining failures.
```

Auto mode approves appropriate tool calls within a turn. `/goal` supplies a separate completion evaluator and begins new turns until the measurable condition is met or the turn cap is reached.

## 5. Useful built-in commands after the first build

```text
/run-skill-generator
/run
/verify
/code-review
```

Project-specific skills included in this pack:

```text
/build-vertical-slice
/validate-procgen 1000
/generate-asset-pack sal-pep-four-presentations-red-blue-enemies-boss-ui
/validate-local-coop
/release-candidate
```
