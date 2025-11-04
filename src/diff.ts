// Mostly based off of https://github.com/ZachGawlik/webpack-stats-diff/tree/master/src with better
// support for contenthash, typescript, etc…

import type { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';

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
  budget?: number;
};

export type Diff = {
  totalBytes: {
    base: number;
    head: number;
  };
  chunks: {
    added: AssetDiff[];
    removed: AssetDiff[];
    bigger: AssetDiff[];
    smaller: AssetDiff[];
    negligible: AssetDiff[];
    violations: AssetDiff[];
  };
};

export type BundleBudget = { name: string; budget: number };

const ASSET_NAME_REGEXP =
  /^(?<assetname>[a-zA-Z0-9\.\-_]+)\.([a-zA-Z0-9]{6,32})\.(?<extension>js|css)$/;

// Fallback regex for assets without hashes (e.g., vendor.js, main.css)
const SIMPLE_ASSET_NAME_REGEXP =
  /^(?<assetname>[a-zA-Z0-9\.\-_]+)\.(?<extension>js|css)$/;

export const parseAssetName = (name: string) => {
  // First try the hash-based pattern
  let match = name.match(ASSET_NAME_REGEXP);

  if (!match || !match.groups) {
    // Try the simple pattern without hash
    match = name.match(SIMPLE_ASSET_NAME_REGEXP);
  }

  if (!match || !match.groups) {
    return;
  }

  const canonicalName = `${match.groups.assetname}.${match.groups.extension}`;

  return {
    ...match.groups,
    canonicalName,
  };
};

/**
 * Compares webpack bundle analyzer reports between base and head branches
 * and generates a comprehensive diff showing size changes and budget violations.
 *
 * @param analysis - Object containing base and head bundle analyzer reports
 * @param options - Configuration options including diff threshold and bundle budgets
 * @returns Diff object containing categorized asset changes and total byte differences
 */
export function getDiff(
  analysis: {
    base: { report: BundleAnalyzerPlugin.JsonReport };
    head: { report: BundleAnalyzerPlugin.JsonReport };
  },
  {
    percentChangeMinimum,
    bundleBudgets,
    sizeChangeMinimum,
  }: { percentChangeMinimum: number; bundleBudgets?: BundleBudget[]; sizeChangeMinimum?: number },
): Diff {
  const processReportItems = (
    report: BundleAnalyzerPlugin.JsonReport,
    label: string,
  ) => {
    const processed = report
      .map((item) => {
        if (!item.isAsset) {
          return [];
        }

        const parsed = parseAssetName(item.label);

        if (!parsed) {
          console.warn(
            `Skipping unparseable asset in ${label}: "${item.label}"`,
          );
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
      .filter((entry) => entry.length !== 0);

    return processed;
  };

  const byName: {
    base: Record<string, FunkyAsset>;
    head: Record<string, FunkyAsset>;
  } = {
    base: Object.fromEntries(processReportItems(analysis.base.report, 'base')),
    head: Object.fromEntries(processReportItems(analysis.head.report, 'head')),
  };

  let diff: Diff = {
    totalBytes: {
      base: 0,
      head: 0,
    },
    chunks: {
      added: [],
      removed: [],
      bigger: [],
      smaller: [],
      negligible: [],
      violations: [],
    },
  };

  for (let name of Object.keys(byName.base)) {
    const baseAsset = byName.base[name];
    const baseSize = baseAsset.parsedSize;

    const headAsset = byName.head[name];

    // Removed
    if (!headAsset) {
      const headSize = 0;
      diff.chunks.removed.push({
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

      diff.totalBytes.base += baseSize;
      diff.totalBytes.head += headSize;

      // Check if change meets both percentage and size thresholds for significance
      const meetsPercentThreshold = Math.abs(ratio) >= percentChangeMinimum;
      const meetsSizeThreshold = sizeChangeMinimum ? Math.abs(delta) >= sizeChangeMinimum : true;
      const isSignificant = meetsPercentThreshold && meetsSizeThreshold;
      
      if (ratio > 0 && isSignificant) {
        // Bigger - passes both thresholds for increase
        diff.chunks.bigger.push(d);
      } else if (ratio < 0 && isSignificant) {
        // Smaller - passes both thresholds for decrease  
        diff.chunks.smaller.push(d);
      } else {
        // Negligible - fails either percentage threshold OR size threshold (or both)
        diff.chunks.negligible.push(d);
      }
    }
  }

  for (let name of Object.keys(byName.head)) {
    const headAsset = byName.head[name];
    const headSize = headAsset.parsedSize;

    const baseAsset = byName.base[name];

    // Added
    if (!baseAsset) {
      diff.chunks.added.push({
        name,
        baseSize: 0,
        headSize,
        delta: headSize,
        ratio: 1,
      });
    }
  }

  // violations
  if (diff.chunks.bigger.length && bundleBudgets && bundleBudgets.length) {
    diff.chunks.bigger.forEach((asset) => {
      const isBundleInTargetedBundles = bundleBudgets.filter(
        (bundleItem: BundleBudget) =>
          bundleItem.name.toLocaleLowerCase() ===
          asset.name.toLocaleLowerCase(),
      );
      if (isBundleInTargetedBundles.length) {
        let budget = Number(isBundleInTargetedBundles?.shift()?.budget);
        if (Number(asset.ratio * 100) > budget) {
          asset.budget = budget;
          diff.chunks.violations.push(asset);
        }
      }
    });
  }

  return diff;
}

/**
 * Determines if the bundle changes will affect long-term caching strategies.
 * Changes that affect caching include new, removed, or resized assets.
 *
 * @param diff - The bundle diff to analyze
 * @returns True if changes will impact long-term caching
 */
export function affectsLongTermCaching(diff: Diff): boolean {
  return (
    diff.chunks.added.length > 0 ||
    diff.chunks.bigger.length > 0 ||
    diff.chunks.smaller.length > 0 ||
    diff.chunks.negligible.filter((asset) => Math.abs(asset.delta) > 0).length >
      0
  );
}
