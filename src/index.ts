import * as core from '@actions/core';
import * as github from '@actions/github';
import { access, constants } from 'fs';
import * as path from 'path';
import { getStatsDiff } from 'webpack-stats-diff';
import { markdownTable } from 'markdown-table';
import prettyBytes from 'pretty-bytes';

async function assertFileExists(path: string) {
  return new Promise<void>((resolve, reject) =>
    access(path, constants.F_OK, (error) => (error ? reject(new Error(`${path} does not exist`)) : resolve())),
  );
}

async function run() {
  try {
    const inputs = {
      base: core.getInput('base-stats-path'),
      pr: core.getInput('pr-stats-path'),
      githubToken: core.getInput('github-token'),
    };

    const paths = {
      base: path.resolve(process.cwd(), inputs.base),
      pr: path.resolve(process.cwd(), inputs.pr),
    };

    assertFileExists(paths.base);
    assertFileExists(paths.pr);

    const assets = {
      base: require(paths.base).assets,
      pr: require(paths.pr).assets,
    };

    const diff = getStatsDiff(assets.base, assets.pr, {});

    const summaryTable = markdownTable([
      ['Old size', 'New size', 'Diff'],
      [
        prettyBytes(diff.total.oldSize),
        prettyBytes(diff.total.newSize),
        `${prettyBytes(diff.total.diff)} (${diff.total.diffPercentage.toFixed(2)}%)`,
      ],
    ]);

    const octokit = github.getOctokit(inputs.githubToken);

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
