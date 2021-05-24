import { getDiff } from './diff';
import {
  renderSection,
  renderAddedTable,
  renderBiggerTable,
  renderRemovedTable,
  renderSmallerTable,
  renderUnchangedTable,
  renderSummaryTable,
  renderReductionCelebration,
  pluralize,
} from './render';

const diff = getDiff({
  base: {
    stats: require('../base-webpack-stats.json'),
    report: require('../base-webpack-bundle-analyzer-report.json'),
  },
  head: {
    stats: require('../head-webpack-stats.json'),
    report: require('../head-webpack-bundle-analyzer-report.json'),
  },
});

test('section', () => {
  expect(
    renderSection({
      title: `⚠️ ${diff.bigger.length} ${pluralize(
        diff.bigger.length,
        'bundle',
        'bundles',
      )} got bigger`,
      isEmpty: diff.bigger.length === 0,
      children: renderBiggerTable({ assets: diff.bigger }),
    }),
  ).toMatchSnapshot();
});

test('empty section', () => {
  expect(
    renderSection({
      title: `⚠️ ${diff.bigger.length} ${pluralize(
        diff.bigger.length,
        'bundle',
        'bundles',
      )} got bigger`,
      isEmpty: true,
      children: renderBiggerTable({ assets: [] }),
    }),
  ).toMatchSnapshot();
});

test('added diff', () => {
  expect(renderAddedTable({ assets: diff.added })).toMatchSnapshot();
});

test('removed diff', () => {
  expect(renderRemovedTable({ assets: diff.removed })).toMatchSnapshot();
});

test('bigger diff', () => {
  expect(renderBiggerTable({ assets: diff.bigger })).toMatchSnapshot();
});

test('smaller diff', () => {
  expect(renderSmallerTable({ assets: diff.smaller })).toMatchSnapshot();
});

test('unchanged diff', () => {
  expect(renderUnchangedTable({ assets: diff.unchanged })).toMatchSnapshot();
});

test('summary', () => {
  expect(renderSummaryTable({ diff })).toMatchSnapshot();
});

test('reduction celebration', () => {
  expect(renderReductionCelebration({ diff })).toMatchSnapshot();
});
