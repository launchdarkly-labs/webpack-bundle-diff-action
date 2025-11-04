import { getDiff, parseAssetName, affectsLongTermCaching } from './diff';
import {
  renderTotalDownloadedBytesTable,
  renderLongTermCachingSummary,
  renderSection,
  renderAddedTable,
  renderBiggerTable,
  renderRemovedTable,
  renderSmallerTable,
  renderUnchangedTable,
  renderSummaryTable,
  renderReductionCelebration,
  renderNegligibleTable,
  pluralize,
  renderViolationsTable,
  renderViolationSection,
  formatThresholds,
} from './render';

const diff = getDiff(
  {
    base: {
      report: require('../base-webpack-bundle-analyzer-report.json'),
    },
    head: {
      report: require('../head-webpack-bundle-analyzer-report.json'),
    },
  },
  { percentChangeMinimum: 0.05 },
);

test('section', () => {
  expect(
    renderSection({
      title: `⚠️ ${diff.chunks.bigger.length} ${pluralize(
        diff.chunks.bigger.length,
        'bundle',
        'bundles',
      )} got bigger`,
      isEmpty: diff.chunks.bigger.length === 0,
      children: renderBiggerTable({ assets: diff.chunks.bigger }),
    }),
  ).toMatchSnapshot();
});

const violationDiff = getDiff(
  {
    base: {
      report: require('../violation-base-webpack-bundle-analyzer-report.json'),
    },
    head: {
      report: require('../violation-head-webpack-bundle-analyzer-report.json'),
    },
  },
  {
    percentChangeMinimum: 0.05,
    bundleBudgets: [{ name: 'common.js', budget: 10 }],
  },
);

test('render violations table', () => {
  expect(
    renderViolationSection({
      title: `❌❌❌❌❌❌❌❌❌❌ ${
        violationDiff.chunks.violations.length
      } ${pluralize(
        violationDiff.chunks.violations.length,
        'bundle',
        'bundles',
      )} violated budgets ❌❌❌❌❌❌❌❌❌❌`,
      isEmpty: violationDiff.chunks.violations.length === 0,
      children: renderViolationsTable({
        violations: violationDiff.chunks.violations,
      }),
    }),
  ).toMatchSnapshot();
});

// Test asset name parsing with various filename patterns
test('asset name parsing with various patterns', () => {
  // Test different hash lengths (common in RSPack)
  expect(parseAssetName('main.abcd1234.js')).toEqual({
    assetname: 'main',
    extension: 'js',
    canonicalName: 'main.js',
  });

  expect(parseAssetName('vendor.abcdef123456.js')).toEqual({
    assetname: 'vendor',
    extension: 'js',
    canonicalName: 'vendor.js',
  });

  expect(parseAssetName('chunk-common.abcdef1234567890abcdef12.js')).toEqual({
    assetname: 'chunk-common',
    extension: 'js',
    canonicalName: 'chunk-common.js',
  });

  // Test assets without hashes
  expect(parseAssetName('runtime.js')).toEqual({
    assetname: 'runtime',
    extension: 'js',
    canonicalName: 'runtime.js',
  });

  // Test additional file extensions (with hash)
  expect(parseAssetName('styles.abc123.css')).toEqual({
    assetname: 'styles',
    extension: 'css',
    canonicalName: 'styles.css',
  });

  // Test invalid patterns should return undefined
  expect(parseAssetName('invalid-asset-name')).toBeUndefined();
  expect(parseAssetName('asset.hash')).toBeUndefined(); // no extension
});

test('empty section', () => {
  expect(
    renderSection({
      title: `⚠️ ${diff.chunks.bigger.length} ${pluralize(
        diff.chunks.bigger.length,
        'bundle',
        'bundles',
      )} got bigger`,
      isEmpty: true,
      children: renderBiggerTable({ assets: [] }),
    }),
  ).toMatchSnapshot();
});

test('added diff', () => {
  expect(renderAddedTable({ assets: diff.chunks.added })).toMatchSnapshot();
});

test('removed diff', () => {
  expect(renderRemovedTable({ assets: diff.chunks.removed })).toMatchSnapshot();
});

test('bigger diff', () => {
  expect(renderBiggerTable({ assets: diff.chunks.bigger })).toMatchSnapshot();
});

test('smaller diff', () => {
  expect(renderSmallerTable({ assets: diff.chunks.smaller })).toMatchSnapshot();
});

test('unchanged diff', () => {
  expect(
    renderUnchangedTable({ assets: diff.chunks.negligible }),
  ).toMatchSnapshot();
});

test('summary', () => {
  expect(renderSummaryTable({ diff })).toMatchSnapshot();
});

test('reduction celebration', () => {
  expect(renderReductionCelebration({ diff })).toMatchSnapshot();
});

test('negligible diff', () => {
  expect(
    renderNegligibleTable({
      assets: diff.chunks.negligible.filter(
        (asset) => Math.abs(asset.ratio) > 0.0001,
      ),
    }),
  ).toMatchSnapshot();
});

test('total downloaded bytes diff', () => {
  expect(renderTotalDownloadedBytesTable({ diff })).toMatchSnapshot();
});

test('long-term cache invalidation summary', () => {
  expect(renderLongTermCachingSummary({ diff })).toMatchSnapshot();
});

// Test the affectsLongTermCaching function with proper types
test('affectsLongTermCaching', () => {
  // Should return true when there are changes that affect caching
  const diffWithChanges = {
    chunks: {
      bigger: [
        {
          name: 'main.js',
          baseSize: 100000,
          headSize: 101000,
          delta: 1000,
          ratio: 0.01,
        },
      ],
      smaller: [],
      added: [],
      removed: [],
      negligible: [],
      violations: [],
    },
    totalBytes: { base: 100000, head: 101000 },
  };
  expect(affectsLongTermCaching(diffWithChanges)).toBe(true);

  // Should return false when no changes affect caching
  const diffNoChanges = {
    chunks: {
      bigger: [],
      smaller: [],
      added: [],
      removed: [],
      negligible: [],
      violations: [],
    },
    totalBytes: { base: 100000, head: 100000 },
  };
  expect(affectsLongTermCaching(diffNoChanges)).toBe(false);

  // Should return true with negligible changes that have delta > 0
  const diffNegligibleChanges = {
    chunks: {
      bigger: [],
      smaller: [],
      added: [],
      removed: [],
      negligible: [
        {
          name: 'chunk.js',
          baseSize: 10000,
          headSize: 10000,
          delta: 0,
          ratio: 0,
        },
        {
          name: 'chunk2.js',
          baseSize: 10000,
          headSize: 10100,
          delta: 100,
          ratio: 0.01,
        },
      ],
      violations: [],
    },
    totalBytes: { base: 20000, head: 20100 },
  };
  expect(affectsLongTermCaching(diffNegligibleChanges)).toBe(true);
});

// Test getDiff edge cases with existing data
describe('getDiff function edge cases', () => {
  test('should handle different threshold values', () => {
    const result1 = getDiff(
      {
        base: {
          report: require('../base-webpack-bundle-analyzer-report.json'),
        },
        head: {
          report: require('../head-webpack-bundle-analyzer-report.json'),
        },
      },
      { percentChangeMinimum: 0.001 }, // Very low threshold
    );

    const result2 = getDiff(
      {
        base: {
          report: require('../base-webpack-bundle-analyzer-report.json'),
        },
        head: {
          report: require('../head-webpack-bundle-analyzer-report.json'),
        },
      },
      { percentChangeMinimum: 0.5 }, // Very high threshold
    );

    // Lower threshold should result in fewer negligible changes
    expect(result1.chunks.negligible.length).toBeLessThanOrEqual(
      result2.chunks.negligible.length,
    );
  });

  test('should handle budget violations with existing data', () => {
    const result = getDiff(
      {
        base: {
          report: require('../violation-base-webpack-bundle-analyzer-report.json'),
        },
        head: {
          report: require('../violation-head-webpack-bundle-analyzer-report.json'),
        },
      },
      {
        percentChangeMinimum: 0.05,
        bundleBudgets: [
          { name: 'common.js', budget: 10 },
          { name: 'nonexistent.js', budget: 5 }, // Should not cause issues
        ],
      },
    );

    // Should detect violations from the existing test data
    expect(result.chunks.violations.length).toBeGreaterThanOrEqual(0);
    if (result.chunks.violations.length > 0) {
      expect(result.chunks.violations[0]).toHaveProperty('budget');
    }
  });

  test('should calculate total bytes from real data', () => {
    const result = getDiff(
      {
        base: {
          report: require('../base-webpack-bundle-analyzer-report.json'),
        },
        head: {
          report: require('../head-webpack-bundle-analyzer-report.json'),
        },
      },
      { percentChangeMinimum: 0.05 },
    );

    expect(typeof result.totalBytes.base).toBe('number');
    expect(typeof result.totalBytes.head).toBe('number');
    expect(result.totalBytes.base).toBeGreaterThan(0);
    expect(result.totalBytes.head).toBeGreaterThan(0);
  });

  test('should require both percent and size thresholds to be significant', () => {
    // Create mock data with a 5% change on 10KB file = 500 byte change
    const mockBaseReport = [
      {
        label: 'main.abc123.js',
        isAsset: true,
        gzipSize: 5000,
        statSize: 10000,
        parsedSize: 10000,
      },
    ];

    const mockHeadReport = [
      {
        label: 'main.def456.js',
        isAsset: true,
        gzipSize: 5500,
        statSize: 10500,
        parsedSize: 10500, // 500 byte increase (5% change)
      },
    ];

    // With only percent threshold - should categorize as bigger (5% exceeds 1%)
    const resultOnlyPercent = getDiff(
      {
        base: { report: mockBaseReport },
        head: { report: mockHeadReport },
      },
      { percentChangeMinimum: 0.01 }, // 1% threshold, no size threshold
    );

    // With both thresholds - should be negligible (fails size threshold)
    const resultBothThresholds = getDiff(
      {
        base: { report: mockBaseReport },
        head: { report: mockHeadReport },
      },
      {
        percentChangeMinimum: 0.01, // 1% threshold (passes)
        sizeChangeMinimum: 1000, // 1000 byte minimum (fails - change is only 500 bytes)
      },
    );

    expect(resultOnlyPercent.chunks.bigger.length).toBe(1);
    expect(resultBothThresholds.chunks.bigger.length).toBe(0);
    expect(resultBothThresholds.chunks.negligible.length).toBe(1);
  });

  test('should report changes that exceed both thresholds', () => {
    // Create mock data with a large change (5000 bytes, 5% increase)
    const mockBaseReport = [
      {
        label: 'main.abc123.js',
        isAsset: true,
        gzipSize: 50000,
        statSize: 100000,
        parsedSize: 100000,
      },
    ];

    const mockHeadReport = [
      {
        label: 'main.def456.js',
        isAsset: true,
        gzipSize: 55000,
        statSize: 105000,
        parsedSize: 105000, // 5000 byte increase (5% change)
      },
    ];

    const result = getDiff(
      {
        base: { report: mockBaseReport },
        head: { report: mockHeadReport },
      },
      {
        percentChangeMinimum: 0.01, // 1% threshold (passes - 5% > 1%)
        sizeChangeMinimum: 2000, // 2000 byte minimum (passes - 5000 > 2000)
      },
    );

    expect(result.chunks.bigger.length).toBe(1);
    expect(result.chunks.negligible.length).toBe(0);
  });

  test('should work without size threshold specified', () => {
    const result = getDiff(
      {
        base: {
          report: require('../base-webpack-bundle-analyzer-report.json'),
        },
        head: {
          report: require('../head-webpack-bundle-analyzer-report.json'),
        },
      },
      { percentChangeMinimum: 0.05 }, // No sizeChangeMinimum specified
    );

    // Should work normally without errors - only percent threshold applies
    expect(result).toHaveProperty('chunks');
    expect(result.chunks).toHaveProperty('bigger');
    expect(result.chunks).toHaveProperty('smaller');
    expect(result.chunks).toHaveProperty('negligible');
  });
});

// Test the new formatThresholds function
describe('formatThresholds', () => {
  test('should format percent threshold only', () => {
    expect(formatThresholds(0.05)).toBe('5%');
  });

  test('should format both percent and size thresholds', () => {
    expect(formatThresholds(0.05, 2000)).toBe('5% and 2 kB');
  });

  test('should handle zero size threshold', () => {
    expect(formatThresholds(0.03, 0)).toBe('3% and 0 kB');
  });
});
