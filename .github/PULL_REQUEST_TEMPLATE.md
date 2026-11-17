# Pull Request

## Summary
<!-- Describe what changed and why. -->

## Change Type

- [ ] Bug fix
- [ ] Feature or behavior change
- [ ] Refactor or maintenance
- [ ] Documentation

## Verification

These run automatically and must pass before the PR can be merged:
`yarn lint`, `yarn typecheck`, `yarn test` and `yarn e2e`.

- [ ] Ran them locally (`yarn e2e:emulators up` first, for the S3/Azure scenarios)
- [ ] Tests added or updated for behavior changes

## Review Checklist

- [ ] Public API or behavior changes are documented
- [ ] `CHANGELOG.md` is updated when behavior or the public API changes
- [ ] No runtime dependency was added without maintainer approval
- [ ] Release version and changelog heading are aligned (when preparing a release)
