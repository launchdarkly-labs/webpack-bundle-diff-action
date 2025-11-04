import markdownTable from 'markdown-table';

import { AssetDiff, Diff } from './diff';

const sortedColumn = (name: string) => `${name} ▾`;

const deltaDescending = (a: AssetDiff, b: AssetDiff) =>
  Math.abs(b.delta) - Math.abs(a.delta);

const sizeDescending =
  (version: 'headSize' | 'baseSize') => (a: AssetDiff, b: AssetDiff) =>
    b[version] - a[version];

const md = {
  emphasis: (s: string) => `**${s}**`,
  code: (s: string) => `\`${s}\``,
};

const formatBytes = (
  bytes: number,
  {
    signed,
    minimumFractionDigits = 0,
    maximumFractionDigits = 0,
  }: {
    signed?: boolean;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  } = {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  },
) =>
  (bytes / 1000).toLocaleString('en', {
    signDisplay: signed ? 'always' : 'auto',
    minimumFractionDigits,
    maximumFractionDigits,
    style: 'unit',
    unit: 'kilobyte',
    unitDisplay: 'short',
  });

export const formatRatio = (
  ratio: number,
  {
    minimumFractionDigits = 0,
    maximumFractionDigits = 0,
  }: { minimumFractionDigits?: number; maximumFractionDigits?: number } = {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  },
) =>
  ratio.toLocaleString('en', {
    style: 'percent',
    minimumFractionDigits,
    maximumFractionDigits,
  });

/**
 * Formats threshold values for percent and size changes as a human-readable string.
 *
 * @param percentChangeMinimum - The minimum percent change threshold to format.
 * @param sizeChangeMinimum - (Optional) The minimum size change threshold to format, in bytes.
 * @returns A string representing the formatted percent change threshold, or both percent and size thresholds if both are provided.
 */
export const formatThresholds = (
  percentChangeMinimum: number,
  sizeChangeMinimum?: number,
): string => {
  const percentText = formatRatio(percentChangeMinimum);
  if (sizeChangeMinimum === undefined) {
    return percentText;
  }
  const sizeText = formatBytes(sizeChangeMinimum);
  return `${percentText} and ${sizeText}`;
};

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

export function renderViolationSection({
  title,
  isEmpty = false,
  children,
}: {
  title: string;
  isEmpty?: boolean;
  children: string;
}) {
  return `
  ${!isEmpty ? `#### ${title}` : ''}
  ${!isEmpty ? children : ''}
`;
}

export function renderCollapsibleSection({
  title,
  isEmpty = false,
  ifEmpty = 'No other changes.',
  children,
}: {
  title: string;
  isEmpty?: boolean;
  ifEmpty?: string;
  children: string;
}) {
  return `
<details>
  <summary>${title}</summary>

${!isEmpty ? children : ifEmpty}

</details>
`;
}

export function renderSummaryTable({ diff }: { diff: Diff }) {
  // Combine all reduce operations into a single pass for better performance
  const { bigger, smaller, added, removed } = Object.entries(
    diff.chunks,
  ).reduce(
    (acc, [key, assets]) => {
      if (key !== 'negligible' && key !== 'violations') {
        acc[key as keyof typeof acc] = assets.reduce(
          (total, asset) => total + asset.delta,
          0,
        );
      }
      return acc;
    },
    { bigger: 0, smaller: 0, added: 0, removed: 0 },
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

export function renderTotalDownloadedBytesTable({ diff }: { diff: Diff }) {
  return markdownTable([
    ['', 'Total downloaded'],
    ['Base', formatBytes(diff.totalBytes.base)],
    ['Head', formatBytes(diff.totalBytes.head)],
    [
      md.emphasis('Delta'),
      md.code(
        formatBytes(diff.totalBytes.head - diff.totalBytes.base, {
          signed: true,
        }),
      ),
    ],
  ]);
}

export function renderLongTermCachingSummary({ diff }: { diff: Diff }) {
  const unchangedBytes = diff.chunks.negligible
    .filter((asset) => asset.delta === 0)
    .map((asset) => asset.headSize)
    .reduce((total, size) => total + size, 0);

  // Cache filtered negligible assets to avoid redundant filtering
  const changedNegligibleAssets = diff.chunks.negligible.filter(
    (asset) => Math.abs(asset.delta) > 0,
  );

  const invalidatedCount =
    diff.chunks.bigger.length +
    diff.chunks.smaller.length +
    changedNegligibleAssets.length;

  // Combine multiple map().reduce() operations for better performance
  const invalidatedBytes =
    diff.chunks.bigger.reduce((total, asset) => total + asset.headSize, 0) +
    diff.chunks.smaller.reduce((total, asset) => total + asset.headSize, 0) +
    changedNegligibleAssets.reduce((total, asset) => total + asset.headSize, 0);

  const addedCount = diff.chunks.added.length;
  const addedBytes = diff.chunks.added.reduce(
    (total, asset) => total + asset.headSize,
    0,
  );

  const totalBytes = addedBytes + invalidatedBytes + unchangedBytes;

  return [
    `${invalidatedCount} ${pluralize(
      invalidatedCount,
      'chunk',
      'chunks',
    )} will be invalidated from [long-term caching](https://webpack.js.org/guides/caching/), and ${addedCount} ${pluralize(
      addedCount,
      'chunk',
      'chunks',
    )} will be added.`,

    "Here's a breakdown of the number of bytes our customers will need to download once this pull request is deployed:",

    markdownTable(
      [
        ['', 'Bytes', '% of total JavaScript code'],
        [
          'Invalidated',
          md.code(formatBytes(invalidatedBytes)),
          md.code(formatRatio(invalidatedBytes / totalBytes)),
        ],
        [
          'Added',
          md.code(formatBytes(addedBytes)),
          md.code(formatRatio(addedBytes / totalBytes)),
        ],
        [
          md.emphasis('Total uncached'),
          md.code(formatBytes(invalidatedBytes + addedBytes)),
          md.code(formatRatio((invalidatedBytes + addedBytes) / totalBytes)),
        ],
        [
          md.emphasis('Total cached'),
          md.code(formatBytes(unchangedBytes)),
          md.code(formatRatio(unchangedBytes / totalBytes)),
        ],
        [
          md.emphasis('Total'),
          md.code(formatBytes(totalBytes)),
          md.code(formatRatio(1)),
        ],
      ],
      { align: ['l', 'r', 'r'] },
    ),
    '\n',
    'ℹ️ Lower is better.',
  ].join('\n');
}

export function renderNegligibleTable({ assets }: { assets: AssetDiff[] }) {
  return markdownTable(
    [
      ['Asset', 'Base size', 'Head size', sortedColumn('Delta'), 'Delta %'],
      ...assets.sort(deltaDescending).map((asset) => [
        md.code(asset.name),
        md.code(
          formatBytes(asset.baseSize, {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3,
          }),
        ),
        md.code(
          formatBytes(asset.headSize, {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3,
          }),
        ),
        md.code(
          formatBytes(asset.delta, {
            signed: true,
            minimumFractionDigits: 3,
            maximumFractionDigits: 3,
          }),
        ),
        md.code(
          formatRatio(asset.ratio, {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3,
          }),
        ),
      ]),
    ],
    { align: ['l', 'r', 'r', 'r', 'r'] },
  );
}

export function renderViolationsTable({
  violations,
}: {
  violations: AssetDiff[];
}) {
  return markdownTable(
    [
      [
        'Asset',
        'Base size',
        'Head size',
        sortedColumn('Delta'),
        'Delta %',
        'Budget',
      ],
      ...violations
        .sort(deltaDescending)
        .map((asset) => [
          md.code(asset.name),
          md.code(formatBytes(asset.baseSize)),
          md.code(formatBytes(asset.headSize)),
          md.code(formatBytes(asset.delta)),
          md.code(formatRatio(asset.ratio)),
          md.code(asset?.budget + '%'),
        ]),
    ],
    { align: ['l', 'r', 'r', 'r', 'r'] },
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

/**
 * Returns the correct plural form based on count using English plural rules.
 *
 * @param count - The number to check for pluralization
 * @param singular - The singular form of the word
 * @param plural - The plural form of the word
 * @returns The appropriate form based on the count
 */
export function pluralize(
  count: number,
  singular: string,
  plural: string,
): string {
  const rule = pluralRules.select(count);

  switch (rule) {
    case 'one':
      return singular;
    case 'other':
      return plural;
    default:
      return plural;
  }
}

/**
 * Truncates a Git SHA to the first 9 characters for display.
 *
 * @param sha - The full SHA string
 * @returns The shortened SHA (first 9 characters)
 */
export function shortSha(sha: string): string {
  return sha.slice(0, 9);
}

/**
 * Generates a GitHub compare URL for viewing changes between two commits.
 *
 * @param baseSha - The base commit SHA
 * @param headSha - The head commit SHA
 * @returns Markdown link to GitHub compare view
 */
export function renderGithubCompareLink(
  baseSha: string,
  headSha: string,
): string {
  return `[${shortSha(baseSha)}…${shortSha(
    headSha,
  )}](https://github.com/launchdarkly/gonfalon/compare/${baseSha}...${headSha} "Compare the head branch sha to the base branch sha for this run")`;
}

export function renderCommitSummary({
  sha,
  message,
  pullRequestId,
}: {
  sha: string;
  message: string;
  pullRequestId: number;
}) {
  return `
💬 _${message} ([${shortSha(
    sha,
  )}](https://github.com/launchdarkly/gonfalon/pull/${pullRequestId}/commits/${sha}))_
`;
}

export function renderReductionCelebration({ diff }: { diff: Diff }) {
  if (
    diff.chunks.added.length === 0 &&
    diff.chunks.bigger.length === 0 &&
    diff.chunks.removed.length > 0 &&
    diff.chunks.smaller.length > 0
  ) {
    return `
Amazing! You reduced the amount of code we ship to our customers, which is great way to help improve performance. Every step counts.

![gif](https://i.gggl.es/zqN9EdmeD4aY.gif)
`;
  }
}

export function renderViolationWarning({
  diff,
  shouldGateFailures,
}: {
  diff: Diff;
  shouldGateFailures: boolean;
}) {
  if (diff.chunks.violations.length > 0 && shouldGateFailures) {
    return (
      'Sorry you exceeded the budget for critical bundles.<br/>' +
      'Please double check the above violation table.<br/>' +
      'Checkout out this doc on managing frontend bundle sizes [Confluence](https://launchdarkly.atlassian.net/wiki/spaces/ENG/pages/1711866153)</br>' +
      '![gif](https://i.gggl.es/sqJ_RRw-qU3J.gif)'
    );
  }
}
