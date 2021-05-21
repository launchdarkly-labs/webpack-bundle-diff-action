import markdownTable from 'markdown-table';
import prettyBytes from 'pretty-bytes';

import { AssetDiff } from './diff';

const md = {
  code: (s: string) => `\`${s}\``,
};

const formatBytes = (bytes: number) => prettyBytes(bytes);

const formatRatio = (ratio: number) =>
  ratio.toLocaleString('en', { style: 'percent', maximumFractionDigits: 2 });

export function getAddedTable(assets: AssetDiff[]) {
  return markdownTable([
    ['Asset', 'Size'],
    ...assets.map((asset) => [
      md.code(asset.name),
      md.code(formatBytes(asset.headSize)),
    ]),
  ]);
}

export function getRemovedTable(assets: AssetDiff[]) {
  return markdownTable([
    ['Asset', 'Size'],
    ...assets.map((asset) => [
      md.code(asset.name),
      md.code(formatBytes(asset.baseSize)),
    ]),
  ]);
}

export function getBiggerTable(assets: AssetDiff[]) {
  return markdownTable([
    ['Asset', 'Base size', 'Head size', 'Delta', 'Delta %'],
    ...assets.map((asset) => [
      md.code(asset.name),
      md.code(formatBytes(asset.baseSize)),
      md.code(formatBytes(asset.headSize)),
      md.code(formatBytes(asset.delta)),
      md.code(formatRatio(asset.ratio)),
    ]),
  ]);
}

export function getSmallerTable(assets: AssetDiff[]) {
  return markdownTable([
    ['Asset', 'Base size', 'Head size', 'Delta', 'Delta %'],
    ...assets.map((asset) => [
      md.code(asset.name),
      md.code(formatBytes(asset.baseSize)),
      md.code(formatBytes(asset.headSize)),
      md.code(formatBytes(asset.delta)),
      md.code(formatRatio(asset.ratio)),
    ]),
  ]);
}

export function getUnchangedTable(assets: AssetDiff[]) {
  return markdownTable([
    ['Asset', 'Size'],
    ...assets.map((asset) => [asset.name, formatBytes(asset.headSize)]),
  ]);
}

const pluralRules = new Intl.PluralRules('en');

export function pluralize(count: number, singular: string, plural: string) {
  const rule = pluralRules.select(count);

  switch (rule) {
    case 'one':
      return singular;
    case 'other':
      return plural;
    default:
      return undefined;
  }
}

export function formatGithubCompareLink(baseSha: string, headSha: string) {
  return `[${baseSha.slice(0, 9)}…${headSha.slice(
    0,
    9,
  )}](https://github.com/launchdarkly/gonfalon/compare/${baseSha}...${headSha})`;
}
