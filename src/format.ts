import markdownTable from 'markdown-table';
import prettyBytes from 'pretty-bytes';

import { AssetDiff } from './diff';

const formatBytes = (bytes: number) => prettyBytes(bytes);

const formatRatio = (ratio: number) =>
  ratio.toLocaleString('en', { style: 'percent', maximumFractionDigits: 2 });

export function getAddedTable(assets: AssetDiff[]) {
  return markdownTable([
    ['Asset', 'Size'],
    ...assets.map((asset) => [asset.name, formatBytes(asset.headSize)]),
  ]);
}

export function getRemovedTable(assets: AssetDiff[]) {
  return markdownTable([
    ['Asset', 'Size'],
    ...assets.map((asset) => [asset.name, formatBytes(asset.baseSize)]),
  ]);
}

export function getBiggerTable(assets: AssetDiff[]) {
  return markdownTable([
    ['Asset', 'Base size', 'Head size', 'Delta', 'Delta %'],
    ...assets.map((asset) => [
      asset.name,
      formatBytes(asset.baseSize),
      formatBytes(asset.headSize),
      formatBytes(asset.delta),
      formatRatio(asset.ratio),
    ]),
  ]);
}

export function getSmallerTable(assets: AssetDiff[]) {
  return markdownTable([
    ['Asset', 'Base size', 'Head size', 'Delta', 'Delta %'],
    ...assets.map((asset) => [
      asset.name,
      formatBytes(asset.baseSize),
      formatBytes(asset.headSize),
      formatBytes(asset.delta),
      formatRatio(asset.ratio),
    ]),
  ]);
}

export function getUnchangedTable(assets: AssetDiff[]) {
  return markdownTable([
    ['Asset', 'Size'],
    ...assets.map((asset) => [asset.name, formatBytes(asset.headSize)]),
  ]);
}
