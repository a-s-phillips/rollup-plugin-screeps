# Rollup Screeps Plugin

Maintained fork of [Arcath/rollup-plugin-screeps](https://github.com/Arcath/rollup-plugin-screeps)
(unmaintained since 2023). This fork drops the `screeps-api` and `git-rev-sync`
dependencies entirely — Screeps API calls use Node's native `fetch`, and the git
branch lookup is a plain `git rev-parse` call — so there are no vulnerable/deprecated
transitive dependencies (`axios`, `shelljs`, old `glob`/`inflight`). The plugin's
public API and config format are unchanged.

## Install

```
npm install --save-dev github:a-s-phillips/rollup-plugin-screeps
```

## Usage

In `rollup.config.js`

```js
import screeps from "rollup-plugin-screeps";

...

export default {
  ...
  sourcemap: true, // If set to true your source maps will be made screeps friendly and uploaded

  plugins: [
    ...
    screeps({configFile: "./screeps.json"})
  ]
}
```

### Config File

rollup-plugin-screeps needs your screeps username/password and the server to upload to.

```json
{
  "email": "you@domain.tld",
  "password": "pass",
  "protocol": "https",
  "hostname": "screeps.com",
  "port": 443,
  "path": "/",
  "branch": "auto"
}
```

If `branch` is set to `"auto"` rollup-plugin-screeps will use your current git branch as the name of the branch on screeps, if you set it to anything else that string will be used as the name of the branch.
