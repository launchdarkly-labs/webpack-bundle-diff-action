import { getDiff } from './diff';
import {
  getAddedTable,
  getBiggerTable,
  getRemovedTable,
  getSmallerTable,
  getUnchangedTable,
} from './format';

const diff = getDiff({
  base: {
    assets: [
      {
        name: 'app.fdab93ea16844a2d34ab.js',
        size: 94431,
      },
      {
        name: 'app.7358db5e2ca059853b2f.css',
        size: 321,
      },
      { name: 'vendor.96885f9121bed7076430.js', size: 677 },
      { name: 'manage-flag.08d925ff48fb570cfc47.js', size: 4513 },
      { name: 'manage-flag.bb7d49978ae0f1fdffb7.css', size: 991 },
      { name: 'legacy-modal.1588a8fdd7073896e790.js', size: 1123 },
      { name: 'legacy-modal.6fdb2eeae9b98d1bb177.css', size: 3442 },
    ],
  },
  head: {
    assets: [
      {
        name: 'app.c0c4cfd91f265f86630f.js',
        size: 75134,
      },
      {
        name: 'app.7358db5e2ca059853b2f.css',
        size: 321,
      },
      { name: 'vendor.96885f9121bed7076430.js', size: 677 },
      { name: 'manage-flag.741e6d5a3a2d5b7d0e2a.js', size: 7884 },
      { name: 'manage-flag.f9f60f318897c963f4f0.css', size: 1202 },
      { name: 'workflow-builder.9ad198b10aae5b5fe929.js', size: 6577 },
      { name: 'workflow-builder.07de19e11b77ba149d1e.css', size: 4331 },
    ],
  },
});

test('raw diff', () => {
  expect(diff).toMatchSnapshot();
});

test('added diff', () => {
  expect(getAddedTable(diff.added)).toMatchSnapshot();
});

test('removed diff', () => {
  expect(getRemovedTable(diff.removed)).toMatchSnapshot();
});

test('bigger diff', () => {
  expect(getBiggerTable(diff.bigger)).toMatchSnapshot();
});

test('smaller diff', () => {
  expect(getSmallerTable(diff.smaller)).toMatchSnapshot();
});

test('unchanged diff', () => {
  expect(getUnchangedTable(diff.unchanged)).toMatchSnapshot();
});
