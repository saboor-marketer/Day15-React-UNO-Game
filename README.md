# UNO Arcade

A fast-paced, single-player UNO game built with React, TypeScript, Vite, and Tailwind CSS v4. Play against three bots, chain cards for score multipliers, catch opponents who forget to call UNO, and keep your best runs in a local leaderboard.

## Getting Started

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Vite prints the local URL in the terminal. To create and preview a production build:

```bash
npm run build
npm run preview
```

## How to Play

Match the discard pile's current color, number, or action symbol. Play a Wild card to choose a color. If you cannot play, draw a card; if that card is playable, play it or pass. Empty your hand before the bots to win the round. Winning advances to a tougher round; losing ends the run.

Call UNO when you are down to one card. If a bot forgets, catch them before the timer runs out. You can also call UNO before playing your second-to-last card. The game pauses automatically when its browser tab is hidden.

### Controls

| Input | Action |
| --- | --- |
| Tap a card | Play that card |
| Tap the deck / press `D` | Draw a card |
| Tap a bot with an UNO warning / press `U` | Catch a bot who forgot UNO |
| UNO button / press `U` | Call UNO |
| `Left` / `Right` arrow | Select a playable card |
| `Enter` / `Space` | Play the selected card, or draw if none can be played |
| `K` / `Backspace` | Pass after drawing a playable card |
| `1`-`4` or `R`, `Y`, `G`, `B` | Choose a Wild color: red, yellow, green, blue |
| `P` / `Esc` | Pause or resume |
| `M` | Toggle sound |
| `R` / `Enter` on the game-over screen | Start a new run |

The on-screen buttons and cards are touch-friendly, so keyboard controls are optional.

## Scoring

- Playing cards earns points; action and Wild cards are worth more than number cards.
- Consecutive plays build a combo multiplier, up to 5x.
- Playing quickly earns a quick-play bonus. Calling UNO and catching a bot can earn extra points too.
- Clearing a round adds a round bonus, points for cards left in opponents' hands, and a best-combo bonus.
- High scores are saved in the browser and the leaderboard keeps the top 10 entries.

## Features

- Responsive, touch-friendly table layout.
- Three bot opponents with round-based difficulty progression.
- Number, Skip, Reverse, Draw Two, Wild, and Wild Draw Four cards.
- Animated card dealing and plays, screen shake, particle bursts, and win confetti.
- Procedural sound effects with a mute control.
- Start, pause, round-win, and game-over screens with instant restart.
- Local high-score table; no account or server required.

## Project Structure

```text
src/
  App.tsx                 Game screen, state orchestration, and input handling
  components/             Cards, hand, table, opponents, overlays, and effects
  game/deck.ts            Deck creation, shuffle, matching, and card scoring
  game/engine.ts          Game rules, bot turns, round flow, and score reducer
  game/highscores.ts      Browser-local leaderboard storage
  fx/                     Particle canvas, sound effects, and screen shake
  index.css               Theme, responsive styling, and animations
```

The game state and rules are implemented in a reducer, separate from the React presentation. High scores, the saved player name, and the mute preference use browser `localStorage` and remain on that device and browser.