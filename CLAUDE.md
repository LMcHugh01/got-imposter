# Game of Thrones: Secret Word — Claude Code Briefing

## Project Overview

A single-phone, pass-and-play social deduction game with a Game of Thrones theme. Players are secretly assigned a GoT character. All players get the same character except one — the Impostor — who doesn't know the character. Players take turns giving clues in real life. After each round, players vote on who they think the Impostor is. The app reveals the result.

---

## Tech Stack

- **React + Vite** — UI framework
- **React Router** — page navigation
- **Zustand** — global game state
- **Framer Motion** — card flip animation
- **TailwindCSS** — styling
- **Supabase** — characters table + image storage
- **Netlify** — static site deployment

---

## Supabase Setup

### Table: `characters`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key, auto-generated |
| `name` | text | e.g. "Jon Snow" |
| `image_url` | text | Public URL from Supabase Storage |
| `difficulty` | text | `easy`, `medium`, or `hard` |
| `created_at` | timestamp | Auto-generated |

### Storage

- Create a public Supabase Storage bucket called `characters`
- Upload character images there
- Store the public URL in the `image_url` column

### Seed Data

Populate the `characters` table with the following:

**Easy**
- Jon Snow, Daenerys Targaryen, Tyrion Lannister, Cersei Lannister, Arya Stark, Ned Stark, Joffrey Baratheon, Sansa Stark

**Medium**
- The Hound, Littlefinger, Varys, Melisandre, Jaime Lannister, Brienne of Tarth, Theon Greyjoy, Stannis Baratheon

**Hard**
- Ygritte, Gendry, Beric Dondarrion, Olenna Tyrell, Euron Greyjoy, Qyburn, Podrick Payne, Tormund Giantsbane

### Environment Variables

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## Game State (Zustand)

```js
{
  // Settings
  totalPlayers: number,
  impostorCount: number,
  difficulty: "easy" | "medium" | "hard",

  // Game data
  secretCharacter: { id, name, image_url, difficulty },
  players: [
    { id: number, isImpostor: boolean, isEliminated: boolean }
  ],

  // Flow
  phase: "settings" | "reveal" | "voting" | "elimination" | "results",
  currentRevealIndex: number,  // which player is currently viewing their card
  round: number,
  winner: "loyalists" | "impostor" | null
}
```

---

## Screens & Flow

### 1. Home (`/`)
- Game of Thrones logo / title
- "New Game" button → navigates to Settings

### 2. Settings (`/settings`)
- Number of players: stepper input (2–20)
- Number of impostors: stepper input (1 to half of players max)
- Difficulty: Easy / Medium / Hard toggle (cumulative — Medium includes Easy pool; Hard includes all)
- "Start Game" button → fetches a random character from Supabase matching difficulty, assigns impostors randomly, navigates to Card Reveal

### 3. Card Reveal (`/reveal`)
- Shows: *"Player [N] — Keep this secret!"*
- Large card (face down by default)
- Strictly enforced 3-step flow per player:
  1. **Reveal Card** → card flips to show character or Impostor card
  2. **Hide Card** → card flips back face-down (only button shown while revealed)
  3. **Next Player** → only appears after card is hidden; updates content while face-down (no peek possible)
- After all players have seen their card → "Everyone's Ready" → navigates to Voting

### 4. Voting (`/voting`)
- Shows current round number
- List of all active (non-eliminated) players by number
- One player selects the name of whoever got the most real-life votes
- **Eliminate** button → navigates to Elimination Reveal

### 5. Elimination Reveal (`/elimination`)
- Dramatic reveal of whether the eliminated player was the Impostor or not
- Win condition checked after every elimination:
  - All impostors eliminated → Loyalists win → navigate to `/results`
  - Impostors >= remaining loyalists → Impostor wins → navigate to `/results`
  - Otherwise → increment round, continue to `/voting`
- `lastEliminatedId` is NOT cleared on round advance (prevents guard mis-navigation to home)

### 6. Results (`/results`)
- Shows who won: Loyalists or the Impostor
- Reveals the secret character to everyone
- Shows who the Impostor was
- "Play Again" button → resets state, goes back to Home

---

## Project Structure

```
got-impostor/
├── public/
├── src/
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Settings.jsx
│   │   ├── CardReveal.jsx
│   │   ├── Voting.jsx
│   │   ├── EliminationReveal.jsx
│   │   └── Results.jsx
│   ├── components/
│   │   ├── FlipCard.jsx        # Framer Motion card flip
│   │   └── PlayerList.jsx      # Reusable player list for voting
│   ├── store/
│   │   └── gameStore.js        # Zustand store
│   ├── lib/
│   │   ├── supabase.js         # Supabase client init
│   │   └── gameLogic.js        # Assign impostors, check win conditions
│   ├── App.jsx                 # React Router routes
│   └── main.jsx
├── .env
├── netlify.toml
├── _redirects                  # /* /index.html 200
└── package.json
```

---

## Game Logic (`gameLogic.js`)

```js
// Randomly assign impostors from player list
assignImpostors(totalPlayers, impostorCount)
// Returns array of player objects with isImpostor boolean

// Check if game is over after elimination
checkWinCondition(players)
// Returns "loyalists" | "impostor" | null (game continues)
// Loyalists win if all impostors eliminated
// Impostor wins if impostors >= remaining loyalists (i.e. 2 players left, impostor still in)
```

---

## Design Direction

- **Theme**: Dark, medieval, dramatic — Game of Thrones aesthetic
- **Palette**: Deep black/charcoal backgrounds, aged gold accents, dark red highlights
- **Typography**: `Cinzel` (Google Font) for all headings and titles — gives a royal, stone-carved feel. Clean readable sans-serif for body text.
- **Card Design**:
  - Loyalist card: parchment-style background, character image, character name in gold
  - Impostor card: dark/black card, red sigil or crown icon, "You are the Impostor" in red
- **Animations**: Framer Motion 3D card flip on reveal. Subtle fade transitions between screens.
- **Mobile First**: Designed for one phone passed between players. Large tap targets, nothing too small.

---

## Netlify Config (`netlify.toml`)

```toml
[build]
  command = "npm run build"
  publish = "dist"
```

## Redirects (`public/_redirects`)

```
/* /index.html 200
```

---

## Build Order

1. Supabase — create table, storage bucket, seed character data
2. Project scaffold — Vite + React + install all dependencies
3. Supabase client + env vars
4. Zustand store
5. Game logic functions
6. Home + Settings screens
7. Card Reveal screen + Framer Motion flip
8. Voting screen
9. Elimination Reveal screen + win condition
10. Results screen
11. GoT visual polish — fonts, colors, card design, animations
12. Netlify deploy config
