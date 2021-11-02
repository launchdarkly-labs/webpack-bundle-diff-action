import { getDiff } from './diff';
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
  { diffThreshold: 0.05 },
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
