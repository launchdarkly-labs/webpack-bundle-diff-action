// Mostly based off of https://github.com/ZachGawlik/webpack-stats-diff/tree/master/src with better
// support for contenthash, typescript, etc…

import type { StatsCompilation, StatsAsset } from 'webpack';
import type { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';

// We tweak the Webpack stats type to make,
//   - assetsByChunkName and assets required
//   - only require name and size on assets
type Modify<T, R> = Omit<T, keyof R> & R;

type WebpackAsset = Pick<StatsAsset, 'name' | 'size'>;

type WebpackStats = Modify<
  StatsCompilation,
  {
    assets: WebpackAsset[];
  }
>;

type FunkyAsset = {
  name: string;
  gzipSize: number;
  statSize: number;
  parsedSize: number;
};

export type AssetDiff = {
  name: string;
  baseSize: number;
  headSize: number;
  delta: number;
  ratio: number;
};

export type Diff = {
  added: AssetDiff[];
  removed: AssetDiff[];
  bigger: AssetDiff[];
  smaller: AssetDiff[];
  unchanged: AssetDiff[];
};

const DEFAULT_DIFF_THRESHOLD = 0.05; // 5%

const ASSET_NAME_REGEXP = /^(?<assetname>[a-zA-Z0-9\.\-_]+)\.([a-zA-Z0-9]{20})\.(?<extension>js|css)$/;

const parseAssetName = (name: string) => {
  const match = name.match(ASSET_NAME_REGEXP);

  if (!match || !match.groups) {
    return;
  }

  return {
    ...match.groups,
    canonicalName: `${match.groups.assetname}.${match.groups.extension}`,
  };
};

export function getDiff(
  analysis: {
    base: { stats: WebpackStats; report: BundleAnalyzerPlugin.JsonReport };
    head: { stats: WebpackStats; report: BundleAnalyzerPlugin.JsonReport };
  },
  { diffThreshold = DEFAULT_DIFF_THRESHOLD }: { diffThreshold?: number } = {},
): Diff {
  const byName: {
    base: Record<string, FunkyAsset>;
    head: Record<string, FunkyAsset>;
  } = {
    base: Object.fromEntries(
      analysis.base.report
        .map((item) => {
          const parsed = parseAssetName(item.label);

          if (!item.isAsset || !parsed) {
            return [];
          }

          return [
            parsed.canonicalName,
            {
              name: parsed.canonicalName,
              gzipSize: item.gzipSize,
              statSize: item.statSize,
              parsedSize: item.parsedSize,
            },
          ];
        })
        // filter out assets that didn't match for some reason
        .filter((entry) => entry.length !== 0),
    ),
    head: Object.fromEntries(
      analysis.head.report
        .map((item) => {
          const parsed = parseAssetName(item.label);

          if (!item.isAsset || !parsed) {
            return [];
          }

          return [
            parsed.canonicalName,
            {
              name: parsed.canonicalName,
              gzipSize: item.gzipSize,
              statSize: item.statSize,
              parsedSize: item.parsedSize,
            },
          ];
        })
        // filter out assets that didn't match for some reason
        .filter((entry) => entry.length !== 0),
    ),
  };

  let diff: Record<
    'added' | 'removed' | 'bigger' | 'smaller' | 'unchanged',
    AssetDiff[]
  > = {
    added: [],
    removed: [],
    bigger: [],
    smaller: [],
    unchanged: [],
  };

  for (let name of Object.keys(byName.base)) {
    const baseAsset = byName.base[name];
    const baseSize = baseAsset.parsedSize;

    const headAsset = byName.head[name];

    // Removed
    if (!headAsset) {
      const headSize = 0;
      diff.removed.push({
        name,
        baseSize: baseAsset.parsedSize,
        headSize,
        delta: -baseSize,
        ratio: -1,
      });
    } else {
      const headSize = headAsset.parsedSize;
      const delta = headSize - baseSize;
      const ratio = (1 - headSize / baseSize) * -1 || 0;
      const d: AssetDiff = {
        name,
        baseSize,
        headSize,
        ratio,
        delta,
      };

      if (ratio > diffThreshold) {
        diff.bigger.push(d);
      } else if (ratio < -1 * diffThreshold) {
        diff.smaller.push(d);
      } else {
        diff.unchanged.push(d);
      }
    }
  }

  for (let name of Object.keys(byName.head)) {
    const headAsset = byName.head[name];
    const headSize = headAsset.parsedSize;

    const baseAsset = byName.base[name];

    // Added
    if (!baseAsset) {
      diff.added.push({
        name,
        baseSize: 0,
        headSize,
        delta: headSize,
        ratio: 1,
      });
    }
  }

  return diff;
}
