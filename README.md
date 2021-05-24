# Webpack bundle diff action 🗜

This action computes a diff of bundle sizes between a head branch and a base branch, and posts a comment to your pull request with useful information.

## Improvements

This section contains ideas for how to make this better.

**Make threshold more configurable**

## Usage

This workflow assumes there is a script called `yarn webpack:stats` which generates,
- a webpack stats json file (we might not need this anymore…)
- a webpack-bundle-analyzer report json file

Add this to a `.yml` file under `.github/workflows/`:

```yaml
on:
  pull_request:
name: Webpack bundle diff
jobs:
  build-head:
    name: 'Build head'
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - uses: actions/cache@v2
      id: yarn-install
      with:
        path: '**/node_modules'
        key: ${{ runner.os }}-modules-${{ hashFiles('**/yarn.lock') }}
    - name: Install dependencies
      if: steps.yarn-install.outputs.cache-hit != 'true'
      run: yarn install --pure-lockfile --frozen-lockfile
    - name: Generate stats
      run: yarn webpack:stats
    - name: Upload bundle analysis
      uses: actions/upload-artifact@v2
      with:
        name: head-stats
        path: ./dist/s/ld/webpack-*.json
        if-no-files-found: error
  build-base:
    name: 'Build base'
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
      with:
        ref: ${{ github.base_ref }}
    - uses: actions/cache@v2
      id: yarn-install
      with:
        path: '**/node_modules'
        key: ${{ runner.os }}-modules-${{ hashFiles('**/yarn.lock') }}
    - name: Install dependencies
      if: steps.yarn-install.outputs.cache-hit != 'true'
      run: yarn install --pure-lockfile --frozen-lockfile
    - name: Generate stats
      run: yarn webpack:stats
    - name: Upload bundle analysis
      uses: actions/upload-artifact@v2
      with:
        name: base-stats
        path: ./dist/s/ld/webpack-*.json
        if-no-files-found: error
  compare:
    name: 'Compare base & head bundle sizes'
    runs-on: ubuntu-latest
    needs: [build-base, build-head]
    steps:
    - uses: actions/checkout@v2
    - name: Download base analysis artifacts
      uses: actions/download-artifact@v2
      with:
        name: base-stats
        path: base-stats
    - name: Download head analysis artifacts
      uses: actions/download-artifact@v2
      with:
        name: head-stats
        path: head-stats
    - name: Diff between base and head
      uses: launchdarkly-labs/webpack-bundle-diff-action@main
      with:
        github-token: ${{ secrets.GITHUB_TOKEN }}
        base-stats-path: ./base-stats/webpack-stats.json
        base-bundle-analysis-report-path: ./base-stats/webpack-bundle-analyzer-report.json
        head-stats-path: ./head-stats/webpack-stats.json
        head-bundle-analysis-report-path: ./head-stats/webpack-bundle-analyzer-report.json

```

## Contributing

```bash
npm install
```

Once you've made the changes you wanted, you can release a new version by following these steps:

```bash
$ npm run build
$ npm run package
$ git add .
$ git commit -m 'Commit message'
```

To test your changes, you can re-run your workflow for your PR on GitHub.

