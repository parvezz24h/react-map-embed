# Publishing checklist

Nothing in this repository publishes automatically. To release:

1. **Metadata.** In `package.json`, add `author`, `repository`, `homepage` and `bugs` once the GitHub repository exists, and update the copyright holder in `LICENSE`.
2. **Name.** `react-map-embed` was unclaimed on npm when this project was created (October 2026). Re-check with `npm view react-map-embed` right before the first publish. If it's taken, use a scope such as `@your-org/react-map-embed` and publish with `--access public`.
3. **Version.** Follow semver: `npm version patch|minor|major` (or edit the version by hand and tag the commit `vX.Y.Z`). Record the changes in `CHANGELOG.md`.
4. **Verify.** `prepublishOnly` runs lint, typecheck, tests, the build and `verify:package` (ESM/CJS import, SSR smoke test, publint, are-the-types-wrong, key scan). Check what will ship:

   ```bash
   npm pack --dry-run
   ```

   The tarball should only contain `dist/`, `README.md`, `LICENSE` and `package.json`.

5. **Publish.**

   ```bash
   npm login            # interactive; uses your own npm account
   npm publish          # add --provenance when publishing from GitHub Actions with id-token: write
   ```

6. **Tag** the release on GitHub.

To publish from CI later, add a workflow triggered on release tags that uses an `NPM_TOKEN` repository secret (or npm trusted publishing) and `npm publish --provenance`. Never commit the token.
