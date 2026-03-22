# Workout Challenge

Lightweight public fitness challenge app for simple leaderboard-based competitions.

The current MVP is a one-week pushup challenge:

- public challenge page
- organizer-managed participants
- challenge dates with stored week numbers
- batch session submission
- multiple sets per session
- total reps leaderboard
- best single set leaderboard

## Stack

- Next.js
- React
- Supabase
- Tailwind CSS

## What Works

- real challenge and participant reads from Supabase
- persistent session submissions
- mobile-first submission flow
- live leaderboard recalculation after submit
- explicit empty states when no real data exists

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

The app also accepts `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` if that is what your Supabase project exposes.

3. Run the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Supabase Setup

Run these SQL files in Supabase:

1. `supabase/schema.sql`
2. `supabase/submit-session-function.sql`
3. `supabase/first-challenge.sql` if you want a starter challenge with Eric, Joe, and Nick

If you are starting from a clean database and run the current `schema.sql`, it already includes the session function. Running `submit-session-function.sql` separately is mainly useful when updating an older setup.

If you already have an older challenge table in Supabase, run `supabase/add-challenge-week-number.sql` once before reseeding so each challenge stores its `week_number`.

## Project Structure

- `src/app/` routes and API handlers
- `src/components/` UI components
- `src/lib/` domain logic, Supabase client, validation, rate limiting
- `supabase/` schema and setup SQL
- `docs/` product notes and MVP spec

## Current Constraints

- public honor-system submissions
- no participant auth yet
- lightweight in-memory rate limiting only
- one main challenge flow optimized for pushups

## Next Likely Improvements

- participant PIN or another simple anti-abuse layer
- challenge-specific participant assignment
- organizer/admin workflow
- tighter public data exposure rules
- frontend polish
