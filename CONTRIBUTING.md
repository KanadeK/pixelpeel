# Contributing to PixelPeel

Thanks for helping improve PixelPeel. Contributions are welcome when they keep the project focused, local-first, accessible, and straightforward to review.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md). Report vulnerabilities through the process in [SECURITY.md](SECURITY.md), not in a public bug report.

## Before you begin

- Search existing issues before opening a duplicate.
- Use a bug report for reproducible defects and a feature request for a clearly described user need.
- Discuss broad UI changes, new dependencies, architecture changes, or expansion beyond the v0.1 scope in an issue first.
- Do not attach private or confidential screenshots. GitHub issue and pull-request attachments are generally public.

## Development setup

PixelPeel uses Node.js 24 and npm. The lockfile is authoritative.

```bash
nvm use
npm ci
npm run dev
```

Do not add a backend, remote runtime dependency, analytics, telemetry, tracking, or an image-upload path. Example and test assets must be created for this repository and stored locally.

## Quality checks

Run the full local gate before requesting review:

```bash
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
```

Use `npm run preview` to inspect the production build. Changes involving asset paths must also work under the `/pixelpeel/` GitHub Pages base path.

## Implementation expectations

- Keep TypeScript strict. Do not use `any` to bypass the type system.
- Keep image processing deterministic and entirely in the browser.
- Treat transparent pixels as RGBA data; preview backgrounds must never enter diff calculations or exports.
- Decode images before accepting them, enforce the 40-megapixel limit, and release object URLs and temporary canvases when no longer needed.
- Preserve original pixel dimensions for calculations and export. Zoom and pan are display-only operations.
- Put user-facing English and Simplified Chinese text in the shared i18n dictionaries. Add or update translation-completeness tests.
- Use semantic controls, accessible names, visible focus styles, appropriate live regions, keyboard interaction, and reduced-motion behavior.
- Avoid external CDNs, online fonts, remote images, and runtime third-party APIs.
- Add focused tests for new behavior and regression tests for fixes.

## Tests

Unit tests should cover pure image and formatting logic with small, deterministic fixtures. Component tests should prefer user-visible behavior and accessible queries. End-to-end tests must not depend on external sites or services and should fail on unexpected console errors.

When a visual artifact changes intentionally, regenerate it from the real local application and verify its dimensions and content. Do not substitute a mockup for the README screenshot.

## Pull requests

Keep each pull request focused. In the description:

1. Explain the user-visible problem and the chosen solution.
2. List the checks you ran and their results.
3. Describe privacy, accessibility, localization, and Pages-path implications.
4. Include screenshots for meaningful UI changes, using only non-sensitive data.
5. Link the related issue when one exists.

Review feedback may ask for a smaller scope, additional tests, or documentation updates. A pull request is ready to merge only when CI passes and review comments are resolved.

## Documentation and changelog

Update both `README.md` and `README.zh-CN.md` when user-facing behavior or setup changes. Add notable user-visible changes to `CHANGELOG.md` under the unreleased version without claiming that a release has already been published.

## License

By contributing, you agree that your contributions will be licensed under the repository's [MIT License](LICENSE).
