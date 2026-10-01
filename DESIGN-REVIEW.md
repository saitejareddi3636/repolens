# RepoLens design review

Applied the user-requested Apple Design Skill from `.design-rules/SKILL.md`. RepoLens is a responsive React web application: the accessibility, hierarchy and interaction principles apply; native macOS menu-bar and iOS navigation conventions do not.

## Thesis

A readable source atlas for developers entering an unfamiliar codebase. Its signature is the dependency graph paired with commit-pinned evidence. The design spends its visual emphasis on selected modules and their connections. A direct link leads from the instant curated sample to the published production walkthrough. It removes the decorative Preview badge and avoids ornamental blur, animations, or dashboard metrics.

## Findings and changes

- **High — contrast:** source path text was #8a97a8 on white, 2.97:1. Secondary text is now #586779, 5.78:1 on white and 5.39:1 on #f5f7fa. Source code increased from 10px to 12px. Reference: `accessibility.md › Vision`, “Strive to meet color contrast minimum standards”; `typography.md › Ensuring legibility`.
- **High — cramped panes:** the three-pane layout squeezed the graph on intermediate widths. The sidebar now has a reveal button below 1440px, and the inspector stacks below the map at 1100px. Mobile retains access to repository navigation. Reference: `split-views.md › Platform considerations`; `layout.md › Adaptability`.
- **Medium — graph density:** Focus connections reduces the view to the selected module and its direct neighbors. The selected module stays visibly and programmatically selected. Reference: `charting-data.md › Best practices`, “Keep a chart simple”; `split-views.md › Best practices`.
- **Medium — touch and feedback:** mobile controls use 44px minimum heights, inputs use 16px text, buttons have press feedback, and keyboard focus remains visible. Reference: `accessibility.md › Mobility`; `buttons.md › Best practices`.

## Tokens and layout

| Role      | Light appearance | Contrast against white |
| --------- | ---------------- | ---------------------- |
| Content   | #172a40          | 14.57:1                |
| Secondary | #586779          | 5.78:1                 |
| Accent    | #315ee8          | 5.39:1                 |
| Canvas    | #f5f7fa          | Surface                |
| Paper     | #ffffff          | Surface                |

Type: locally bundled Inter, 14px body, 12–13px controls and source, 11px metadata, 28–38px display title. Color signals always accompany labels or selection outlines. This release deliberately keeps one light appearance; a full dark palette needs a separate contrast audit rather than a partial inversion.

Regular: `repository rail | source map | evidence inspector`.
Intermediate: `collapsible rail | source map`, then `evidence inspector`.
Compact: `toolbar / optional repository list / map / evidence`.

No decorative animation or translucency is required. Reduced motion disables transitions; increased contrast strengthens muted text and graph borders. Browser zoom uses the same responsive breakpoints.

## Validation

Type checking and six unit tests passed. Two browser smoke tests passed including source links, walkthrough navigation, focus mode (22 nodes to four and back), mobile sidebar access, and no horizontal page overflow at 390px. Source imports remain static evidence; AI explanations remain labeled interpretations. This review does not certify comprehensive accessibility conformance.
