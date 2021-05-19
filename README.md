# Webpack bundle diff action

This action computes a diff between two webpack stats files, and creates
a comment on the pull request.

## Usage

Add this to a `.yml` file under `.github/workflows/`:

```
TODO
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

## Random links

Good resource: https://jeffrafter.com/working-with-github-actions/

## Webpack stats data

- [Docs](https://webpack.js.org/api/stats/)

### Playing around with `jq`

There are two sample webpack stats file in this repo: `base-webpack-stats.json` and `head-webpack-stats.json`.

#### Extract asset name and size

```shell
cat head-webpack-stats.json | jq ".assets[] | {name, size}"
```

To only match `.js` files,

```shell
cat head-webpack-stats.json | jq '.assets[] | select(.name | test(".js$")) | {name,size}'
```