# Story 5.6: v0.1.0-alpha Release Bundle

Status: backlog

## Story

As a **project maintainer**,
I want **to bundle and publish Ronin for public testing**,
So that **users can download and try the v0.1.0-alpha release**.

## Acceptance Criteria

- [ ] GitHub Actions workflow created (`.github/workflows/release.yml`)
- [ ] CI builds on Ubuntu 22.04 for glibc compatibility
- [ ] `.deb` package generated
- [ ] `.AppImage` generated
- [ ] GitHub Release created with both artifacts on tag push
- [ ] README.md updated with installation instructions
- [ ] CHANGELOG.md created with v0.1.0-alpha notes
- [ ] LICENSE file added (MPL-2.0)
- [ ] All tests pass (`npm test` + `cargo test`)
- [ ] Smoke test on Ubuntu completed

## Tasks

- [ ] Create `.github/workflows/release.yml` from DISTRIBUTION.md template
- [ ] Update README.md with user-facing content
- [ ] Create CHANGELOG.md
- [ ] Add LICENSE (MPL-2.0)
- [ ] Run full test suite
- [ ] Tag `v0.1.0-alpha` and push
- [ ] Verify GitHub Release artifacts
- [ ] Smoke test AppImage locally

## Technical Notes

- Tag format: `v0.1.0-alpha`
- CI: Ubuntu 22.04 LTS
- Artifacts: `.deb` + `.AppImage`
- Reference: `docs/DISTRIBUTION.md`
