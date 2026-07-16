# AGENTS.md

This file is the working agreement for coding agents and automated contributors in the PixelPeel repository. User instructions always take precedence.

## Project intent

PixelPeel is a browser-only UI screenshot comparison tool. Its core promise is narrow and testable: user images are processed locally, never uploaded, and can be inspected in Peel, Overlay, Blink, and Diff modes before exporting a diff or PR report.

Do not introduce a backend, database, account system, cloud storage, analytics, telemetry, remote logging, runtime CDN, online font, remote image, or third-party runtime API. Do not add inactive controls for roadmap ideas.

## Setup and commands

Use Node.js from `.nvmrc` and npm with the committed lockfile.

```bash
nvm use
npm ci
npm run dev
```

Before handing work back, run the relevant checks and, for a complete change, the full gate in this order:

```bash
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Install the Playwright browser with `npx playwright install chromium` when required. Do not publish, create a release, push, or commit unless the user explicitly asks.

## Repository map

- `src/`: React application, translations, UI state, image processing, and export logic.
- `public/`: static assets and repository-owned example images.
- `tests/` and colocated test files: deterministic fixtures and Vitest unit coverage.
- `e2e/`: Playwright tests and local fixtures.
- `docs/`: documentation assets generated from the real application.
- `.github/`: CI, Pages deployment, issue forms, pull-request template, and Dependabot.

Do not hand-edit generated `dist/`, coverage, test-result, or Playwright-report output.

## Non-negotiable invariants

1. Decode imported images in the browser instead of trusting file names or MIME types.
2. Reject unsupported formats, corrupt data, and images over 40 megapixels with an accessible error.
3. Never persist image bytes in localStorage, IndexedDB, cookies, or a network service.
4. Revoke object URLs and release references to temporary canvases and decoded images.
5. Normalize unequal dimensions on a transparent RGBA canvas; center alignment is the default and top-left is available.
6. Calculate diff percentages from the entire normalized canvas and keep alpha in the comparison.
7. Keep zoom, pan, and preview backgrounds out of calculations and exported pixels.
8. Keep TypeScript strict and do not use `any` as an escape hatch.
9. Keep English and Simplified Chinese keys synchronized in the central i18n dictionaries.
10. Preserve keyboard access, visible focus, semantic range controls, live-region feedback, color-independent labels, and reduced-motion behavior.

## Change discipline

- Inspect existing abstractions and tests before editing.
- Prefer small pure functions for normalization, metrics, filenames, and summary generation.
- Keep canvas sizes and allocations bounded; avoid retaining duplicate full-size buffers longer than necessary.
- Add dependencies only when they are justified, local at runtime, and smaller than a clear in-repository solution would be.
- Keep GitHub Pages compatibility at `/pixelpeel/`; do not hard-code root-relative asset URLs.
- Use repository-owned deterministic fixtures. Never fetch test data from the network.
- Update both READMEs and `CHANGELOG.md` when user-visible behavior changes.

## Testing guidance

Cover identical images, a one-pixel change, transparency, unequal dimensions, both alignment modes, thresholds, percentages, size limits, invalid files, filenames, PR summaries, and translation completeness. Component and E2E tests should use accessible queries and must not rely on timing more than necessary. E2E must exercise the real local example, imports, four modes, controls, copy, exports, themes, languages, mobile layout, and unexpected console errors.

For privacy-sensitive changes, inspect browser network activity. Static same-origin asset requests are expected; image-upload or telemetry requests are not.

## Handoff

Report the files changed, commands run, exact pass/fail results, test counts when available, and any remaining limitations. Never describe an unrun check as passing or an unreleased version as published.
