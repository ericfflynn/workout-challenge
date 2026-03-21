# Fitness Challenge Leaderboard MVP Spec

## Overview

This project is a lightweight public web application for running simple fitness challenges with minimal administrative overhead.

The first challenge format is a one-week pushup challenge. Participants submit workout sessions during the challenge window, and the app calculates live leaderboard standings based on total reps. The app also tracks the highest rep count achieved in a single set.

This is intentionally an honor-system MVP. The goal is to validate whether people will use the product, not to solve identity, fraud prevention, or full competition administration in version 1.

## Product Goals

- Launch a simple public challenge page that anyone with the link can access.
- Allow approved participants to submit pushup sessions quickly.
- Show a live leaderboard for total reps during the challenge.
- Show a secondary leaderboard for highest single set.
- End the challenge automatically based on the configured time window.
- Keep setup and administrative work minimal.

## Non-Goals for V1

- Full authentication and self-service account management
- Complex moderation tools
- Video proof or verification workflows
- Editable or deletable submissions by participants
- Multiple challenge types at launch
- Mobile app support
- Real-time competitive anti-cheat enforcement

## MVP Assumptions

- There is only one active challenge at a time in v1.
- The first challenge type is pushups only.
- The challenge duration is 7 days.
- The application is public, but only pre-approved participants should appear in the participant dropdown.
- The organizer manages participants manually.
- Submissions are accepted on the honor system.
- A session is entered as a single batch submission.

## Core Concepts

### Participant

A person approved by the organizer to appear in the challenge dropdown and submit sessions.

### Challenge

A time-boxed competition with a start and end date. For v1, there is one pushup challenge lasting one week.

### Session

A single workout event submitted by a participant as one batch. A session contains one or more sets.

### Set

A single rep count within a session. Example:

- One set of 40 reps = one session with one set
- Three sets of 20 reps = one session with three sets

## User Roles

### Organizer

The organizer manually creates the challenge and manually manages the participant list outside the public flow.

### Participant

A participant visits the public challenge page, selects their name, enters one or more set counts for a session, and submits the session.

## User Experience

### Public Challenge Page

The main page should include:

- Challenge title
- Challenge description or short instructions
- Challenge start and end date/time
- Countdown or status indicator
- Session submission form
- Total reps leaderboard
- Highest single set leaderboard

### Session Submission Flow

1. Participant opens the public challenge page.
2. Participant selects their name from a dropdown.
3. Participant enters one or more set values as part of a single session.
4. Participant submits the session.
5. The app stores one session and its related sets.
6. The leaderboard updates to reflect the new totals.

## Functional Requirements

### Challenge Management

- The system must support a challenge record with a title, slug, exercise type, start time, and end time.
- The system must determine whether the challenge is upcoming, active, or ended based on the current time.
- The system must prevent new submissions outside the active challenge window.

### Participant Management

- The system must support a participant list managed by the organizer.
- Only active participants should appear in the dropdown.
- Participants do not need self-service signup in v1.

### Session Submission

- A participant must be able to submit a session as a batch.
- A session must contain at least one set.
- Each set must include a positive integer rep count.
- The system must save the session timestamp and associated sets.
- Submitted sessions are append-only in v1.

### Leaderboards

The system must support at least these leaderboard views:

- Total reps during the challenge
- Highest single set during the challenge

Optional but easy with the same data model:

- Highest total reps in a single session
- Most sessions submitted
- Average reps per session

## Business Rules

- Only data submitted during the challenge window counts toward leaderboards.
- A session belongs to exactly one participant and one challenge.
- A set belongs to exactly one session.
- A set cannot exist without a session.
- Total reps leaderboard is calculated from the sum of all set reps in valid sessions for each participant.
- Highest single set leaderboard is calculated from the maximum reps value from all valid sets for each participant.
- Sessions and sets are append-only in v1.
- No participant editing or deletion is required in v1.

## Winner Determination

### Primary Winner

The winner is the participant with the highest total reps at the end of the challenge.

### Tie Breaker

If two participants have the same total reps, the tie breaker should be the participant who reached that total first.

This can be implemented later in queries if needed, but it should be treated as the intended rule from the start.

## Validation Rules

- Participant selection is required.
- At least one set is required for a session.
- Set values must be positive whole numbers.
- Empty sets should not be accepted.
- Submissions after the challenge end time should be rejected.

Recommended lightweight safeguards for v1:

- Basic request rate limiting
- Basic form validation on client and server
- Optional hidden admin-only ability to disable a participant

## Data Model

The MVP should use four main entities.

### `participants`

- `id`
- `display_name`
- `is_active`
- `created_at`

### `challenges`

- `id`
- `slug`
- `title`
- `exercise_type`
- `start_at`
- `end_at`
- `created_at`

### `sessions`

- `id`
- `challenge_id`
- `participant_id`
- `submitted_at`
- `created_at`

### `sets`

- `id`
- `session_id`
- `set_order`
- `reps`
- `created_at`

## Derived Metrics

These values do not need to be stored directly in v1 and can be computed from queries:

- Participant total reps
- Participant highest single set
- Session total reps
- Participant rank
- Challenge winner

## Suggested Pages

### `/`

Landing or redirect page. Can simply route to the active challenge in v1.

### `/challenges/[slug]`

Public challenge page with:

- challenge details
- submission form
- total reps leaderboard
- highest single set leaderboard

### Optional future organizer page

Not required for v1. The organizer can manage challenge and participant data directly in the database or through a later admin page.

## Suggested Technical Approach

This is not part of the product contract, but it is the current recommended implementation path for the MVP:

- Frontend: Next.js
- Hosting: Vercel
- Database: Supabase Postgres

Why this is a good fit:

- Fast to build
- Low hosting overhead
- Easy data modeling for sessions and sets
- Simple deployment path
- Flexible enough for future admin tooling

## Future Enhancements

- Participant PIN or secret code to reduce fake submissions
- Multiple simultaneous challenges
- Challenge history pages
- Organizer dashboard
- Submission review tools
- Exercise-specific rules for squats, situps, miles, etc.
- Richer stats and visualizations
- Team-based challenges
- Real-time updates

## Open Decisions for Later

- Whether to require a participant PIN for basic identity protection
- Whether to show full session history publicly
- Whether to support back-dated sessions or only submission-time sessions
- Whether to allow organizers to edit or delete bad submissions
- Whether to display session-level stats on the public page

## Summary

Version 1 is a simple, public, honor-system pushup challenge app with:

- one active 7-day challenge
- organizer-managed participants
- batch session submission
- one or more sets per session
- total reps leaderboard
- highest single set leaderboard

The main priority is proving that the challenge format is useful and engaging before adding authentication, moderation, or more complex challenge mechanics.
