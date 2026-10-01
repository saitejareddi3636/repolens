# RepoLens verification

Verification record, September 30–October 1, 2026. The automated and production checks below establish specific behavior; they are not a claim that every repository shape or browser is covered.

## Automated checks

- TypeScript type checking and production build passed.
- Five unit tests passed: repository URL boundaries, canonical URL parsing, AST import extraction, relative module resolution, and citation validation.
- Five browser/API tests passed: example navigation and source links, mobile overflow, unauthenticated action rejection, integration proxy rejection, and a two-user collaboration lifecycle.
- Collaboration lifecycle covered real import, private access denial, reviewer invitation and edits, publication, and removal of a public snapshot from an already-connected guest after unpublishing.

## Live deployment

- DeepSpace confirmed serving and data services at https://repolens.app.space.
- A production GitHub import of deepdotspace/threadhunt completed with 32 modules and 34 resolved import relationships.
- Anthropic generated and saved a source-linked walkthrough and answered a module question.
- ElevenLabs returned playable narration data.
- The resulting analysis was published as a separate public snapshot.
- The deployment log query after these checks returned no errors in the queried 15-minute window.

Published example: https://repolens.app.space/home?analysis=22c2e718-006e-4206-9d73-0230d7a7152a

## Deliberate limits

Public JavaScript/TypeScript repositories only. Imports resolve relative paths; aliases, dynamic runtime behavior, and complete repository coverage are not promised. Analysis is capped at 32 files and 180 KB. AI prose is interpretation; citation validation checks source locations, not semantic truth. Narration is session-only. Reviewer introduction edits use last-write-wins. Daily server-side usage limits bound integration spend.

## Reproducibility

Run the commands in README.md. The published analysis link above permits read-only review without an account. Source exports and module edges link to an immutable commit.
