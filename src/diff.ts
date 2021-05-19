import type { StatsCompilation, StatsAsset } from 'webpack';

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

const DEFAULT_DIFF_THRESHOLD = 0.05;

const ASSET_NAME_REGEXP = /^(?<assetname>[a-z0-9\.\-_]+)\.([a-z0-9]{20})\.(?<extension>js|css)$/;

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

const deltaDescending = (a: AssetDiff, b: AssetDiff) =>
  Math.abs(b.delta) - Math.abs(a.delta);

export function getDiff(
  stats: {
    base: WebpackStats;
    head: WebpackStats;
  },
  { diffThreshold = DEFAULT_DIFF_THRESHOLD }: { diffThreshold?: number } = {},
): Diff {
  const byChunkName: {
    base: Record<string, WebpackAsset>;
    head: Record<string, WebpackAsset>;
  } = {
    base: Object.fromEntries(
      stats.base.assets
        .map((asset) => {
          const parsed = parseAssetName(asset.name);

          if (!parsed) {
            return [];
          }

          return [
            parsed.canonicalName,
            { name: parsed.canonicalName, size: asset.size },
          ];
        })
        // filter out assets that didn't match for some reason
        .filter((entry) => entry.length !== 0),
    ),
    head: Object.fromEntries(
      stats.head.assets
        .map((asset) => {
          const parsed = parseAssetName(asset.name);

          if (!parsed) {
            return [];
          }

          return [
            parsed.canonicalName,
            { name: parsed.canonicalName, size: asset.size },
          ];
        })
        // filter out assets that didn't match for some reason
        .filter((entry) => entry.length !== 0),
    ),
  };

  console.log(byChunkName);

  let diff: Record<string, AssetDiff[]> = {
    added: [],
    removed: [],
    bigger: [],
    smaller: [],
    unchanged: [],
  };

  for (let name of Object.keys(byChunkName.base)) {
    const baseAsset = byChunkName.base[name];
    const baseSize = baseAsset.size;

    const headAsset = byChunkName.head[name];

    // Removed
    if (!headAsset) {
      const headSize = 0;
      diff.removed.push({
        name,
        baseSize: baseAsset.size,
        headSize,
        delta: baseSize,
        ratio: -1,
      });
    } else {
      const headSize = headAsset.size;
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

  for (let name of Object.keys(byChunkName.head)) {
    const headAsset = byChunkName.head[name];
    const headSize = headAsset.size;

    const baseAsset = byChunkName.base[name];

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

  return {
    added: diff.added.sort(deltaDescending),
    removed: diff.removed.sort(deltaDescending),
    bigger: diff.bigger.sort(deltaDescending),
    smaller: diff.smaller.sort(deltaDescending),
    unchanged: diff.unchanged.sort(deltaDescending),
  };
}
