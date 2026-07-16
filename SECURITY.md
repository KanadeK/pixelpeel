# Security Policy

PixelPeel processes images locally in the browser and has no image-upload service. Security reports are still important, especially when they concern file parsing, browser storage, exported content, dependencies, or an unexpected network request.

## Supported versions

| Version or branch             | Supported |
| ----------------------------- | --------- |
| `main` and the 0.1.x line     | Yes       |
| Earlier development snapshots | No        |

Security fixes target `main` and the latest patch in the current supported release line.

## Report a vulnerability

Use GitHub's private vulnerability reporting flow for this repository:

1. Open the repository's **Security** tab.
2. Choose **Advisories**.
3. Select **Report a vulnerability**.

Direct link: <https://github.com/KanadeK/pixelpeel/security/advisories/new>

Include the affected version or commit, browser and operating system, reproduction steps, expected impact, and any suggested mitigation. Use minimal synthetic images where a file is required to reproduce the issue.

If private vulnerability reporting is unavailable, open a repository issue stating that you need to report a security concern. **Do not put secrets, personal data, a weaponized proof of concept, or sensitive exploit details in that public issue.** A maintainer can then coordinate an appropriate next step through GitHub.

Please do not report security vulnerabilities through unrelated social accounts or invent an email address for the project.

## What to expect

Maintainers will acknowledge a report through GitHub when practical, assess its scope, and coordinate a fix and disclosure plan. Timelines depend on severity and maintainer availability; no guaranteed response time is promised.

Good-faith reports that avoid privacy violations, data destruction, service disruption, and access to other people's data are appreciated.

## Public disclosure

Allow maintainers reasonable time to investigate and prepare a fix before publishing details. After remediation, the project may publish a GitHub Security Advisory that credits reporters who want to be named.
