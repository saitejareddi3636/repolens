# Submission draft

Live URL: pending verified deployment.
Repository: pending source publication.

RepoLens turns a public JavaScript or TypeScript repository into an interactive source atlas. Users inspect static import relationships, follow source-linked walkthroughs, ask contextual questions, collaborate on explanations, and publish a separate shareable snapshot.

DeepSpace provides authentication, record permissions and synchronization, durable background jobs, and deployment. The app uses its GitHub, Anthropic, and ElevenLabs integrations for repository discovery, explanations, and optional narration. Raw source is retrieved at an immutable Git commit.

The main tradeoff is a bounded, verifiable static analysis instead of pretending to recover arbitrary runtime behavior. Imports are parsed; explanations are interpretations. AI tour citations must point to existing source lines before being saved. Repository size limits keep costs and latency bounded.

The coding agent scaffolded and implemented the app, integrated DeepSpace, wrote automated checks, and investigated failures. One important finding was that visibility changes did not evict a record already delivered to a browser through the SDK's action broadcast path; public sharing therefore uses independently deletable snapshots.

## Applicant verification — complete personally before submitting

Do not describe the agent's checks as your own. Personally:

- Import a fresh supported repository and check three graph edges against source.
- Trace one tour and challenge an AI explanation against the linked lines.
- Sign in with a second account; verify private access, review editing, publication, and unpublishing.
- Try an invalid URL and a repository with no supported source.
- Explain the job lifecycle, action authorization, evidence validation, and snapshot tradeoff without the agent.
- Record any change you make yourself and any unfinished edges you observe.

## Next work

Broader module resolution, better source-file prioritization, persistent narration artifacts, conflict-aware collaborative editing, and validated semantic flow extraction beyond static imports.
