# Workout Challenge

Lightweight public fitness challenge app built with Next.js. The current prototype models the first MVP challenge: a one-week pushup leaderboard with batch session submission and a secondary leaderboard for best single set.

## Local Development

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`. The home route redirects to the active challenge slug.

## Current State

- App Router Next.js scaffold
- Public challenge page backed by Supabase
- Batch session submission with server-side persistence
- Total reps leaderboard
- Best single set leaderboard
- Initial Supabase schema in `supabase/schema.sql`

If Supabase is not configured, or no real challenge exists yet, the app shows an explicit empty state instead of sample data.

## Supabase Setup

1. Create a Supabase project.
2. In the Supabase dashboard, open the SQL Editor and run `supabase/schema.sql`.
   If you already ran the schema before session writes were added, also run `supabase/submit-session-function.sql`.
3. In the project Connect dialog or API Keys settings, copy:
   - Project URL
   - Publishable key
4. Create `.env.local` in the project root with:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Once those values exist, the app will read challenge, participant, session, and set data from Supabase instead of the local seed file.

## Initial Data

To create your first real setup, run:

- `supabase/first-challenge.sql`

That script creates:

- one pushup challenge from March 21, 2026 through March 29, 2026
- three active participants: Eric, Joe, and Nick
- no sessions yet

## Session Writes

Session submissions now persist through a Postgres function:

- `supabase/submit-session-function.sql`

The API route applies:

- server-side input validation
- max 20 sets per session
- max 250 reps per set
- lightweight in-memory rate limiting per IP

## Project Structure

- `src/app/` app routes
- `src/components/` UI shell for the challenge page
- `src/lib/` domain types, repository utilities, and Supabase client setup
- `docs/mvp-spec.md` product spec
- `supabase/schema.sql` initial database schema and public policies

## Next Steps

- Add organizer-managed participant and challenge setup
- Decide whether you want a participant PIN or another lightweight anti-abuse layer
- Tighten public reads if you only want standings visible
