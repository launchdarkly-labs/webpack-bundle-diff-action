import * as core from '@actions/core';
import * as github from '@actions/github';
import { constants } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getStatsDiff } from 'webpack-stats-diff';
import { markdownTable } from 'markdown-table';
import prettyBytes from 'pretty-bytes';

async function assertFileExists(path: string) {
  try {
    const f = await fs.access(path, constants.F_OK);
    return true;
  } catch (error) {
    throw new Error(`${path} does not exist`);
  }
}

async function run() {
  const baseStatsPath = path.resolve(process.cwd(), core.getInput('base-stats-path'));
  const prStatsPath = path.resolve(process.cwd(), core.getInput('pr-stats-path'));

  const octokit = github.getOctokit(core.getInput('github-token'));

  try {
    assertFileExists(baseStatsPath);
    assertFileExists(prStatsPath);

    const baseAssets = require(baseStatsPath).assets;
    const prAssets = require(prStatsPath).assets;

    const diff = getStatsDiff(baseAssets, prAssets, {});

    const summaryTable = markdownTable([
      ['Old size', 'New size', 'Diff'],
      [
        prettyBytes(diff.total.oldSize),
        prettyBytes(diff.total.newSize),
        `${prettyBytes(diff.total.diff)} (${diff.total.diffPercentage.toFixed(2)}%)`,
      ],
    ]);

    const owner = github.context.repo.owner;
    const repo = github.context.repo.repo;
    const pullRequestId = github.context.issue.number;
    if (!pullRequestId) {
      throw new Error('Could not find the PR id');
    }

    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: pullRequestId,
      body: `# Webpack bundle diff
${summaryTable}
`,
    });

    core.info(`Webpack bundle diff for PR ${repo}#${pullRequestId}`);
    core.info(summaryTable);
  } catch (error) {
    core.setFailed(error);
  }
}

run();
