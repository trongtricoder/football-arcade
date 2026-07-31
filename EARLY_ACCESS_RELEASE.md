# Football Arcade Early Access

Release candidate: `v0.1.0-early-access`

## Live scope

- Era XI drafting, manager and season draws, full league simulation, and season review
- Guest profiles with optional Google or email linking
- Verified run storage, achievements, lifetime statistics, and weekly leaderboards
- Downloadable squad and profile share cards
- In-product feedback
- Responsive desktop, phone, and tablet layouts

Five-a-Side and Build-a-Player remain visible but locked.

## Automated release gate

Before promotion, all of these must pass:

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd audit --omit=dev
git diff --check
```

## Production smoke test

Run these checks on the final Vercel deployment:

- Open the landing page on desktop, iPhone/Safari, Android/Chrome, and iPad.
- Complete one Era XI campaign as a guest.
- Confirm the result is verified and saved.
- Confirm newly earned achievements appear once.
- Submit the run to its correct weekly and era leaderboard.
- Open and download the squad share card.
- Link the guest account with Google, sign out, and sign back in.
- Repeat account recovery with an email magic link.
- Confirm lifetime statistics and the saved run survive on a second device.
- Submit feedback and confirm its row appears in Supabase.
- Confirm Five-a-Side and Build-a-Player cannot be opened.
- Inspect Vercel runtime logs for new errors.

## Launch blockers

Do not promote the release when any of these occur:

- build, lint, test, validation, or security audit failure;
- a verified result cannot be stored or is stored twice;
- a leaderboard accepts a tampered or mismatched run;
- account linking loses the guest profile;
- secrets appear in browser output, source control, or logs;
- primary Era XI controls overflow or become unusable on a supported device.

## Rollback

Keep the last known-good Vercel deployment available. If a launch blocker appears after promotion, restore that deployment first, then investigate on the release branch.
