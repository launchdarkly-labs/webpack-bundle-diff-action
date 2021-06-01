import markdownTable from 'markdown-table';

import { AssetDiff, Diff } from './diff';

const sortedColumn = (name: string) => `${name} ▾`;

const deltaDescending = (a: AssetDiff, b: AssetDiff) =>
  Math.abs(b.delta) - Math.abs(a.delta);

const sizeDescending = (version: 'headSize' | 'baseSize') => (
  a: AssetDiff,
  b: AssetDiff,
) => b[version] - a[version];

const md = {
  emphasis: (s: string) => `**${s}**`,
  code: (s: string) => `\`${s}\``,
};

const formatBytes = (bytes: number, { signed }: { signed?: boolean } = {}) =>
  (bytes / 1000).toLocaleString('en', {
    // @ts-ignore: typescript type defs don't know about signDisplay yet
    signDisplay: signed ? 'always' : 'auto',
    maximumFractionDigits: 0,
    style: 'unit',
    unit: 'kilobyte',
    unitDisplay: 'short',
  });

const formatRatio = (ratio: number) =>
  ratio.toLocaleString('en', { style: 'percent', maximumFractionDigits: 0 });

export function renderSection({
  title,
  isEmpty = false,
  children,
}: {
  title: string;
  isEmpty?: boolean;
  children: string;
}) {
  return `
#### ${title}
${!isEmpty ? children : 'No significant changes.'}
`;
}

export function renderSummaryTable({ diff }: { diff: Diff }) {
  const bigger = Object.values(diff.bigger).reduce(
    (total, asset) => total + asset.delta,
    0,
  );

  const smaller = Object.values(diff.smaller).reduce(
    (total, asset) => total + asset.delta,
    0,
  );

  const added = Object.values(diff.added).reduce(
    (total, asset) => total + asset.delta,
    0,
  );

  const removed = Object.values(diff.removed).reduce(
    (total, asset) => total + asset.delta,
    0,
  );

  const total = bigger + smaller + added + removed;

  return markdownTable(
    [
      ['', 'Delta'],
      ['Bigger', md.code(formatBytes(bigger, { signed: true }))],
      ['Smaller', md.code(formatBytes(smaller, { signed: true }))],
      ['Added', md.code(formatBytes(added, { signed: true }))],
      ['Removed', md.code(formatBytes(removed, { signed: true }))],
      [
        md.emphasis('Total'),
        md.emphasis(md.code(formatBytes(total, { signed: true }))),
      ],
    ],
    { align: ['l', 'r'] },
  );
}

export function renderAddedTable({ assets }: { assets: AssetDiff[] }) {
  const order = sizeDescending('headSize');
  return markdownTable(
    [
      ['Asset', sortedColumn('Size')],
      ...assets
        .sort(order)
        .map((asset) => [
          md.code(asset.name),
          md.code(formatBytes(asset.headSize)),
        ]),
    ],
    { align: ['l', 'r'] },
  );
}

export function renderRemovedTable({ assets }: { assets: AssetDiff[] }) {
  const order = sizeDescending('baseSize');
  return markdownTable(
    [
      ['Asset', sortedColumn('Size')],
      ...assets
        .sort(order)
        .map((asset) => [
          md.code(asset.name),
          md.code(formatBytes(asset.baseSize)),
        ]),
    ],
    { align: ['l', 'r'] },
  );
}

export function renderBiggerTable({ assets }: { assets: AssetDiff[] }) {
  return markdownTable(
    [
      ['Asset', 'Base size', 'Head size', sortedColumn('Delta'), 'Delta %'],
      ...assets
        .sort(deltaDescending)
        .map((asset) => [
          md.code(asset.name),
          md.code(formatBytes(asset.baseSize)),
          md.code(formatBytes(asset.headSize)),
          md.code(formatBytes(asset.delta)),
          md.code(formatRatio(asset.ratio)),
        ]),
    ],
    { align: ['l', 'r', 'r', 'r', 'r'] },
  );
}

export function renderSmallerTable({ assets }: { assets: AssetDiff[] }) {
  return markdownTable(
    [
      ['Asset', 'Base size', 'Head size', sortedColumn('Delta'), 'Delta %'],
      ...assets
        .sort(deltaDescending)
        .map((asset) => [
          md.code(asset.name),
          md.code(formatBytes(asset.baseSize)),
          md.code(formatBytes(asset.headSize)),
          md.code(formatBytes(asset.delta)),
          md.code(formatRatio(asset.ratio)),
        ]),
    ],
    { align: ['l', 'r', 'r', 'r', 'r'] },
  );
}

export function renderUnchangedTable({ assets }: { assets: AssetDiff[] }) {
  const order = sizeDescending('baseSize');
  return markdownTable(
    [
      ['Asset', sortedColumn('Size')],
      ...assets
        .sort(order)
        .map((asset) => [asset.name, formatBytes(asset.headSize)]),
    ],
    { align: ['l', 'r'] },
  );
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

export function renderGithubCompareLink(baseSha: string, headSha: string) {
  return `[${baseSha.slice(0, 9)}…${headSha.slice(
    0,
    9,
  )}](https://github.com/launchdarkly/gonfalon/compare/${baseSha}...${headSha} "Compare the head branch sha to the base branch sha for this run")`;
}

export function renderReductionCelebration({ diff }: { diff: Diff }) {
  if (
    diff.added.length === 0 &&
    diff.bigger.length === 0 &&
    diff.removed.length > 0 &&
    diff.smaller.length > 0
  ) {
    return `
Amazing! You reduced the amount of code we ship to our customers, which is great way to help improve performance. Every step counts.

![](https://i.gggl.es/zqN9EdmeD4aY.gif)
`;
  }
}
