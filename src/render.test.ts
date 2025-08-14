import {
  renderSection,
  renderViolationSection,
  renderCollapsibleSection,
  renderSummaryTable,
  renderAddedTable,
  renderRemovedTable,
  renderTotalDownloadedBytesTable,
  renderLongTermCachingSummary,
  renderNegligibleTable,
  renderViolationsTable,
  renderBiggerTable,
  renderSmallerTable,
  renderUnchangedTable,
  pluralize,
  shortSha,
  renderGithubCompareLink,
  renderCommitSummary,
  renderReductionCelebration,
  renderViolationWarning,
  formatRatio,
} from './render';
import { AssetDiff, Diff } from './diff';

// Mock data for testing
const mockAssetDiff: AssetDiff = {
  name: 'main.abc123.js',
  baseSize: 100000,
  headSize: 105000,
  delta: 5000,
  ratio: 0.05,
};

const mockAssetDiffWithBudget: AssetDiff = {
  ...mockAssetDiff,
  budget: 10,
};

const mockDiff: Diff = {
  chunks: {
    bigger: [mockAssetDiff],
    smaller: [
      {
        name: 'vendor.xyz789.js',
        baseSize: 200000,
        headSize: 190000,
        delta: -10000,
        ratio: -0.05,
      },
    ],
    added: [
      {
        name: 'new.chunk.js',
        baseSize: 0,
        headSize: 50000,
        delta: 50000,
        ratio: 1,
      },
    ],
    removed: [
      {
        name: 'old.chunk.js',
        baseSize: 30000,
        headSize: 0,
        delta: -30000,
        ratio: -1,
      },
    ],
    negligible: [
      {
        name: 'unchanged.js',
        baseSize: 10000,
        headSize: 10000,
        delta: 0,
        ratio: 0,
      },
    ],
    violations: [mockAssetDiffWithBudget],
  },
  totalBytes: {
    base: 340000,
    head: 355000,
  },
};

describe('render functions', () => {
  describe('formatRatio', () => {
    it('formats positive ratio as percentage', () => {
      expect(formatRatio(0.1234)).toBe('12%');
    });

    it('formats negative ratio as percentage', () => {
      expect(formatRatio(-0.0567)).toBe('-6%');
    });

    it('respects minimum fraction digits', () => {
      expect(
        formatRatio(0.1234, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      ).toBe('12.34%');
    });

    it('respects maximum fraction digits', () => {
      expect(formatRatio(0.123456, { maximumFractionDigits: 2 })).toBe(
        '12.35%',
      );
    });
  });

  describe('renderSection', () => {
    it('renders section with title and children', () => {
      const result = renderSection({
        title: 'Test Section',
        children: 'Test content',
      });
      expect(result).toBe(`
#### Test Section
Test content
`);
    });

    it('renders empty section with default message', () => {
      const result = renderSection({
        title: 'Empty Section',
        isEmpty: true,
        children: 'Should not appear',
      });
      expect(result).toBe(`
#### Empty Section
No significant changes.
`);
    });
  });

  describe('renderViolationSection', () => {
    it('renders section when not empty', () => {
      const result = renderViolationSection({
        title: 'Violations',
        children: 'Violation content',
      });
      expect(result).toBe(`
  #### Violations
  Violation content
`);
    });

    it('renders empty section with no content', () => {
      const result = renderViolationSection({
        title: 'Violations',
        isEmpty: true,
        children: 'Should not appear',
      });
      expect(result).toBe(`
  
  
`);
    });
  });

  describe('renderCollapsibleSection', () => {
    it('renders collapsible section with content', () => {
      const result = renderCollapsibleSection({
        title: 'Details',
        children: 'Hidden content',
      });
      expect(result).toBe(`
<details>
  <summary>Details</summary>

Hidden content

</details>
`);
    });

    it('renders empty section with default message', () => {
      const result = renderCollapsibleSection({
        title: 'Empty Details',
        isEmpty: true,
        children: 'Should not appear',
      });
      expect(result).toBe(`
<details>
  <summary>Empty Details</summary>

No other changes.

</details>
`);
    });

    it('renders empty section with custom message', () => {
      const result = renderCollapsibleSection({
        title: 'Empty Details',
        isEmpty: true,
        ifEmpty: 'Custom empty message',
        children: 'Should not appear',
      });
      expect(result).toBe(`
<details>
  <summary>Empty Details</summary>

Custom empty message

</details>
`);
    });
  });

  describe('renderSummaryTable', () => {
    it('renders summary table with all chunk types', () => {
      const result = renderSummaryTable({ diff: mockDiff });
      expect(result).toContain('| Bigger');
      expect(result).toContain('| Smaller');
      expect(result).toContain('| Added');
      expect(result).toContain('| Removed');
      expect(result).toContain('| **Total**');
      expect(result).toContain('`+5 kB`'); // bigger delta
      expect(result).toContain('`-10 kB`'); // smaller delta
    });

    it('calculates correct totals', () => {
      const result = renderSummaryTable({ diff: mockDiff });
      // Total: 5000 - 10000 + 50000 - 30000 = 15000 = +15 kB
      expect(result).toContain('`+15 kB`');
    });
  });

  describe('renderAddedTable', () => {
    it('renders table for added assets', () => {
      const assets = [
        {
          name: 'new1.js',
          baseSize: 0,
          headSize: 20000,
          delta: 20000,
          ratio: 1,
        },
        {
          name: 'new2.js',
          baseSize: 0,
          headSize: 10000,
          delta: 10000,
          ratio: 1,
        },
      ];
      const result = renderAddedTable({ assets });
      expect(result).toContain('| Asset');
      expect(result).toContain('Size ▾');
      expect(result).toContain('`new1.js`');
      expect(result).toContain('`20 kB`');
      expect(result).toContain('`new2.js`');
      expect(result).toContain('`10 kB`');
    });

    it('sorts assets by head size descending', () => {
      const assets = [
        {
          name: 'small.js',
          baseSize: 0,
          headSize: 10000,
          delta: 10000,
          ratio: 1,
        },
        {
          name: 'large.js',
          baseSize: 0,
          headSize: 50000,
          delta: 50000,
          ratio: 1,
        },
        {
          name: 'medium.js',
          baseSize: 0,
          headSize: 30000,
          delta: 30000,
          ratio: 1,
        },
      ];
      const result = renderAddedTable({ assets });
      const lines = result.split('\n');
      const assetLines = lines.slice(2); // Skip header rows
      expect(assetLines[0]).toContain('large.js');
      expect(assetLines[1]).toContain('medium.js');
      expect(assetLines[2]).toContain('small.js');
    });
  });

  describe('renderRemovedTable', () => {
    it('renders table for removed assets', () => {
      const assets = [
        {
          name: 'old1.js',
          baseSize: 20000,
          headSize: 0,
          delta: -20000,
          ratio: -1,
        },
        {
          name: 'old2.js',
          baseSize: 10000,
          headSize: 0,
          delta: -10000,
          ratio: -1,
        },
      ];
      const result = renderRemovedTable({ assets });
      expect(result).toContain('| Asset');
      expect(result).toContain('Size ▾');
      expect(result).toContain('`old1.js`');
      expect(result).toContain('`20 kB`');
    });

    it('sorts assets by base size descending', () => {
      const assets = [
        {
          name: 'small.js',
          baseSize: 10000,
          headSize: 0,
          delta: -10000,
          ratio: -1,
        },
        {
          name: 'large.js',
          baseSize: 50000,
          headSize: 0,
          delta: -50000,
          ratio: -1,
        },
      ];
      const result = renderRemovedTable({ assets });
      const lines = result.split('\n');
      expect(lines[2]).toContain('large.js');
      expect(lines[3]).toContain('small.js');
    });
  });

  describe('renderTotalDownloadedBytesTable', () => {
    it('renders total bytes comparison', () => {
      const result = renderTotalDownloadedBytesTable({ diff: mockDiff });
      expect(result).toContain('Base');
      expect(result).toContain('Head');
      expect(result).toContain('340 kB');
      expect(result).toContain('355 kB');
      expect(result).toContain('`+15 kB`'); // 355 - 340
    });
  });

  describe('renderLongTermCachingSummary', () => {
    it('renders caching impact summary', () => {
      const result = renderLongTermCachingSummary({ diff: mockDiff });
      expect(result).toContain('chunks will be invalidated');
      expect(result).toContain('chunk will be added');
      expect(result).toContain('Invalidated');
      expect(result).toContain('Added');
      expect(result).toContain('Total uncached');
      expect(result).toContain('Total cached');
      expect(result).toContain('ℹ️ Lower is better.');
    });

    it('handles singular/plural correctly', () => {
      const singleChunkDiff: Diff = {
        chunks: {
          bigger: [mockAssetDiff],
          smaller: [],
          added: [],
          removed: [],
          negligible: [],
          violations: [],
        },
        totalBytes: { base: 100000, head: 105000 },
      };
      const result = renderLongTermCachingSummary({ diff: singleChunkDiff });
      expect(result).toContain('1 chunk will be invalidated');
      expect(result).toContain('0 chunks will be added');
    });
  });

  describe('renderNegligibleTable', () => {
    it('renders negligible changes table with high precision', () => {
      const assets = [
        {
          name: 'small-change.js',
          baseSize: 100500,
          headSize: 100600,
          delta: 100,
          ratio: 0.001,
        },
      ];
      const result = renderNegligibleTable({ assets });
      expect(result).toContain('`small-change.js`');
      expect(result).toContain('`100.500 kB`'); // 3 decimal places
      expect(result).toContain('`100.600 kB`');
      expect(result).toContain('`+0.100 kB`');
      expect(result).toContain('`0.100%`');
    });

    it('sorts assets by delta descending', () => {
      const assets = [
        {
          name: 'small.js',
          baseSize: 10000,
          headSize: 10100,
          delta: 100,
          ratio: 0.01,
        },
        {
          name: 'large.js',
          baseSize: 10000,
          headSize: 10500,
          delta: 500,
          ratio: 0.05,
        },
      ];
      const result = renderNegligibleTable({ assets });
      const lines = result.split('\n');
      expect(lines[2]).toContain('large.js'); // Larger delta first
      expect(lines[3]).toContain('small.js');
    });
  });

  describe('renderViolationsTable', () => {
    it('renders violations table with budget column', () => {
      const violations = [mockAssetDiffWithBudget];
      const result = renderViolationsTable({ violations });
      expect(result).toContain('| Asset');
      expect(result).toContain('| Budget |');
      expect(result).toContain('`main.abc123.js`');
      expect(result).toContain('`10%`'); // budget value
    });
  });

  describe('renderBiggerTable', () => {
    it('renders bigger assets table', () => {
      const assets = [mockAssetDiff];
      const result = renderBiggerTable({ assets });
      expect(result).toContain('`main.abc123.js`');
      expect(result).toContain('`100 kB`'); // base size
      expect(result).toContain('`105 kB`'); // head size
      expect(result).toContain('`5 kB`'); // delta
      expect(result).toContain('`5%`'); // ratio
    });
  });

  describe('renderSmallerTable', () => {
    it('renders smaller assets table', () => {
      const asset = {
        name: 'smaller.js',
        baseSize: 100000,
        headSize: 95000,
        delta: -5000,
        ratio: -0.05,
      };
      const result = renderSmallerTable({ assets: [asset] });
      expect(result).toContain('`smaller.js`');
      expect(result).toContain('`-5%`');
    });
  });

  describe('renderUnchangedTable', () => {
    it('renders unchanged assets table', () => {
      const assets = [
        {
          name: 'unchanged1.js',
          baseSize: 20000,
          headSize: 20000,
          delta: 0,
          ratio: 0,
        },
        {
          name: 'unchanged2.js',
          baseSize: 10000,
          headSize: 10000,
          delta: 0,
          ratio: 0,
        },
      ];
      const result = renderUnchangedTable({ assets });
      expect(result).toContain('unchanged1.js'); // No backticks for unchanged table
      expect(result).toContain('20 kB');
      expect(result).toContain('unchanged2.js');
      expect(result).toContain('10 kB');
    });

    it('sorts by base size descending', () => {
      const assets = [
        {
          name: 'small.js',
          baseSize: 10000,
          headSize: 10000,
          delta: 0,
          ratio: 0,
        },
        {
          name: 'large.js',
          baseSize: 50000,
          headSize: 50000,
          delta: 0,
          ratio: 0,
        },
      ];
      const result = renderUnchangedTable({ assets });
      const lines = result.split('\n');
      expect(lines[2]).toContain('large.js');
      expect(lines[3]).toContain('small.js');
    });
  });

  describe('pluralize', () => {
    it('returns singular for count 1', () => {
      expect(pluralize(1, 'chunk', 'chunks')).toBe('chunk');
    });

    it('returns plural for count 0', () => {
      expect(pluralize(0, 'chunk', 'chunks')).toBe('chunks');
    });

    it('returns plural for count > 1', () => {
      expect(pluralize(5, 'chunk', 'chunks')).toBe('chunks');
    });
  });

  describe('shortSha', () => {
    it('truncates SHA to 9 characters', () => {
      expect(shortSha('abcdef1234567890')).toBe('abcdef123');
    });

    it('returns short SHA as-is if already short', () => {
      expect(shortSha('abc123')).toBe('abc123');
    });
  });

  describe('renderGithubCompareLink', () => {
    it('renders compare link with short SHAs', () => {
      const result = renderGithubCompareLink(
        'abcdef1234567890',
        '1234567890abcdef',
      );
      expect(result).toContain('[abcdef123…123456789]');
      expect(result).toContain(
        'https://github.com/launchdarkly/gonfalon/compare/abcdef1234567890...1234567890abcdef',
      );
      expect(result).toContain('Compare the head branch sha');
    });
  });

  describe('renderCommitSummary', () => {
    it('renders commit summary with link', () => {
      const result = renderCommitSummary({
        sha: 'abcdef1234567890',
        message: 'Add new feature',
        pullRequestId: 123,
      });
      expect(result).toContain('_Add new feature');
      expect(result).toContain('[abcdef123]');
      expect(result).toContain(
        'https://github.com/launchdarkly/gonfalon/pull/123/commits/abcdef1234567890',
      );
    });
  });

  describe('renderReductionCelebration', () => {
    it('renders celebration when only reductions occurred', () => {
      const reductionDiff: Diff = {
        chunks: {
          bigger: [],
          smaller: [mockAssetDiff],
          added: [],
          removed: [mockAssetDiff],
          negligible: [],
          violations: [],
        },
        totalBytes: { base: 100000, head: 90000 },
      };
      const result = renderReductionCelebration({ diff: reductionDiff });
      expect(result).toContain('Amazing! You reduced the amount of code');
      expect(result).toContain('![gif](https://i.gggl.es/zqN9EdmeD4aY.gif)');
    });

    it('returns undefined when there are additions', () => {
      const result = renderReductionCelebration({ diff: mockDiff });
      expect(result).toBeUndefined();
    });

    it('returns undefined when there are bigger chunks', () => {
      const mixedDiff: Diff = {
        chunks: {
          bigger: [mockAssetDiff],
          smaller: [mockAssetDiff],
          added: [],
          removed: [mockAssetDiff],
          negligible: [],
          violations: [],
        },
        totalBytes: { base: 100000, head: 90000 },
      };
      const result = renderReductionCelebration({ diff: mixedDiff });
      expect(result).toBeUndefined();
    });
  });

  describe('renderViolationWarning', () => {
    it('renders warning when violations exist and gating is enabled', () => {
      const result = renderViolationWarning({
        diff: mockDiff,
        shouldGateFailures: true,
      });
      expect(result).toContain('Sorry you exceeded the budget');
      expect(result).toContain('violation table');
      expect(result).toContain('Confluence');
      expect(result).toContain('![gif](https://i.gggl.es/sqJ_RRw-qU3J.gif)');
    });

    it('returns undefined when no violations exist', () => {
      const noViolationsDiff: Diff = {
        ...mockDiff,
        chunks: { ...mockDiff.chunks, violations: [] },
      };
      const result = renderViolationWarning({
        diff: noViolationsDiff,
        shouldGateFailures: true,
      });
      expect(result).toBeUndefined();
    });

    it('returns undefined when gating is disabled', () => {
      const result = renderViolationWarning({
        diff: mockDiff,
        shouldGateFailures: false,
      });
      expect(result).toBeUndefined();
    });
  });
});
