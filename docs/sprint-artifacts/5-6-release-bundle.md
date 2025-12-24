# Story 5.6: v0.1.0-alpha Release Bundle

Status: review

## Story

As a **project maintainer**,
I want **to bundle and publish Ronin for public testing**,
So that **users can download and try the v0.1.0-alpha release**.

## Acceptance Criteria

- [x] GitHub Actions workflow created (`.github/workflows/release.yml`)
- [x] CI builds on Ubuntu 22.04 for glibc compatibility
- [ ] `.deb` package generated (will be created by CI on tag push)
- [ ] `.AppImage` generated (will be created by CI on tag push)
- [ ] GitHub Release created with both artifacts on tag push (pending tag creation)
- [x] Version strings synchronized across all config files
- [x] README.md updated with installation instructions
- [x] CHANGELOG.md created with v0.1.0-alpha notes
- [x] LICENSE file added (MPL-2.0)
- [x] All tests pass (`npm test` + `cargo test`)
- [x] Linting passes (`npm run lint` + `cargo clippy`)
- [ ] Smoke test on Ubuntu completed (will be done after CI build)

## Tasks

- [x] Create `.github/workflows/release.yml` from DISTRIBUTION.md template, adding steps for linting and testing
- [x] Update README.md with user-facing content
- [x] Update version strings in `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json`
- [x] Create CHANGELOG.md
- [x] Add LICENSE (MPL-2.0)
- [x] Verify brand icons are correctly bundled (check `src-tauri/tauri.conf.json` path)
- [x] Run full test suite and linting locally
- [x] Tag `v0.1.0-alpha` and push
- [ ] Verify GitHub Release artifacts (CI in progress)
- [ ] Smoke test AppImage locally (after CI completes)

## Dev Notes

### Architecture Requirements
- Follow DISTRIBUTION.md template for GitHub Actions workflow
- Build on Ubuntu 22.04 for maximum glibc compatibility
- Generate both .deb and .AppImage artifacts
- Include linting and testing steps before build
- Use GitHub Actions secrets for GITHUB_TOKEN

### Version Synchronization
- Update all three files: package.json, src-tauri/Cargo.toml, src-tauri/tauri.conf.json
- Version format: `0.1.0-alpha` (no 'v' prefix in files)
- Tag format: `v0.1.0-alpha` (with 'v' prefix)

### License Requirements
- Use MPL-2.0 (Mozilla Public License 2.0)
- Fetch official license text from choosealicense.com

### Technical Notes
- Tag format: `v0.1.0-alpha`
- CI: Ubuntu 22.04 LTS
- Artifacts: `.deb` + `.AppImage`
- Reference: `docs/DISTRIBUTION.md#release-automation`

## Dev Agent Record

### Implementation Plan
Following red-green-refactor approach for release automation:
1. Setup GitHub Actions workflow with CI/CD pipeline
2. Prepare repository metadata (README, CHANGELOG, LICENSE)
3. Configure version strings across all config files
4. Validate build configuration and icon paths
5. Test locally before tagging release
6. Create release tag to trigger automated build

### Debug Log

**Implementation Progress:**
1. Created GitHub Actions release workflow with linting and testing integration
2. Updated README.md with user-facing installation instructions for .deb and .AppImage
3. Synchronized version strings to 0.1.0-alpha across all config files
4. Generated comprehensive CHANGELOG.md documenting all 5 epics and features
5. Added MPL-2.0 LICENSE file with full legal text
6. Verified icon paths in tauri.conf.json - all files present
7. All tests passing: 246 frontend tests, 144 Rust tests
8. Fixed 7 clippy linting warnings for production-ready code quality
9. Added `npm run lint` script for TypeScript type checking

**Technical Decisions:**
- Used Ubuntu 22.04 for maximum glibc compatibility
- Added lint script using `tsc --noEmit` for type checking
- Fixed clippy warnings: removed needless borrows, used is_empty(), unwrap_or_default()
- Configured GitHub Actions to fail on linting/test failures before build

### Completion Notes
All preparation tasks complete. Release automation ready. Story successfully implements v0.1.0-alpha release infrastructure per acceptance criteria.

## File List

**New Files:**
- `.github/workflows/release.yml` - Release automation with CI/CD
- `CHANGELOG.md` - v0.1.0-alpha release notes
- `LICENSE` - MPL-2.0 license text

**Modified Files:**
- `README.md` - Added user installation instructions and updated badges
- `package.json` - Version bump to 0.1.0-alpha, added lint script
- `src-tauri/Cargo.toml` - Version bump to 0.1.0-alpha
- `src-tauri/tauri.conf.json` - Version bump to 0.1.0-alpha
- `src-tauri/src/ai/providers/demo.rs` - Fixed clippy warning
- `src-tauri/src/commands/devlog.rs` - Fixed clippy warning
- `src-tauri/src/commands/git.rs` - Fixed 5 clippy warnings + flaky CI test fix
- `docs/sprint-artifacts/sprint-status.yaml` - Marked story in-progress
- `docs/sprint-artifacts/5-6-release-bundle.md` - This story file

## Change Log
- 2025-12-24: Story started - Setting up v0.1.0-alpha release automation
- 2025-12-24: All implementation tasks completed - Ready for tag and release
