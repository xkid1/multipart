---
name: github-packages-publish
description:
  Publish @xkid1/reed-solomon to the GitHub npm registry (npm.pkg.github.com) from GitHub
  Actions or locally with Yarn 4, including scope rules, tokens, release tagging, consumer
  setup, and troubleshooting. Use when preparing a release or fixing a failed publish or
  install.
---

# Publishing to GitHub Packages

## Rules

- Scope must equal the repository owner: `@xkid1/reed-solomon-algorithm` for
  `github.com/xkid1/...`.
- `package.json` needs `repository` (links the package) and
  `publishConfig.registry = https://npm.pkg.github.com`.
- A version can be published once. Bump for every release.
- Installing needs a token with `read:packages`, even for public packages.
- `.yarnrc.yml` maps the `@xkid1` scope to the registry and reads `NODE_AUTH_TOKEN`.

## Release workflow

1. Set `version` in `package.json`; add `## [x.y.z] - date` to `CHANGELOG.md`.
2. Merge to `main`; wait for **CI passed**.
3. Add a scoped npm publish token as the repository Actions secret `NPM_TOKEN`. Do not
   paste, print, or commit the token. Use the narrowest package access, permissions, and
   expiry supported by npm. GitHub Packages uses the workflow's `GITHUB_TOKEN`.
4. Push a tag named `vx.y.z`. `publish.yml` verifies the tag, runs `yarn check`, publishes
   to npm using `NPM_TOKEN`, then publishes to GitHub Packages using `secrets.GITHUB_TOKEN`,
   and creates the GitHub Release. It needs `packages: write` and `contents: write`.
5. Verify the package on the repository's GitHub Packages page and on npmjs.com.

## Local publish (fallback)

```bash
nvm use && npm install -g corepack && corepack enable
yarn install --immutable && yarn check
read -rs NODE_AUTH_TOKEN && export NODE_AUTH_TOKEN   # classic PAT, write:packages, short expiry
yarn npm publish
unset NODE_AUTH_TOKEN
```

Never paste tokens into chats, commits, or logs. Revoke any token that was exposed.

## Consumer setup

```ini
# .npmrc
@xkid1:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

```yaml
# .yarnrc.yml
npmScopes:
  xkid1:
    npmRegistryServer: 'https://npm.pkg.github.com'
    npmAlwaysAuth: true
    npmAuthToken: '${GITHUB_TOKEN}'
```

## Troubleshooting

| Symptom                          | Fix                                                                    |
| -------------------------------- | ---------------------------------------------------------------------- |
| `401` on install                 | Token missing or lacks `read:packages`, or the scope mapping is absent |
| `403` on publish                 | Token lacks `write:packages` or workflow lacks `packages: write`       |
| `404` on publish                 | Check package scope and confirm the token has publish access            |
| `409` / version exists           | Bump `version`                                                         |
| Tag check fails in `publish.yml` | Tag must be exactly `v` + `package.json` version                       |
| CI: `CHANGELOG.md has no entry`  | Add a `## [x.y.z]` heading                                             |
| `yarn` missing in CI             | Node 25+ lacks Corepack; the setup action installs it                  |
