import * as core from '@actions/core';
import * as github from '@actions/github';
import { access, constants } from 'fs';
import * as path from 'path';

import { getDiff } from './diff';
import {
  renderSection,
  renderAddedTable,
  renderBiggerTable,
  renderRemovedTable,
  renderSmallerTable,
  renderReductionCelebration,
  renderSummaryTable,
  pluralize,
  renderGithubCompareLink,
} from './render';

const frontendExtensions = ['js', 'css', 'ts', 'tsx'];

async function assertFileExists(path: string) {
  return new Promise<void>((resolve, reject) =>
    access(path, constants.F_OK, (error) =>
      error ? reject(new Error(`${path} does not exist`)) : resolve(),
    ),
  );
}

async function run() {
  try {
    if (github.context.eventName !== 'pull_request') {
      core.setFailed(
        `This action only supports pull requests. ${github.context.eventName} events are not supported.`,
      );
    }

    const inputs = {
      base: {
        report: core.getInput('base-bundle-analysis-report-path'),
      },
      head: {
        report: core.getInput('head-bundle-analysis-report-path'),
      },
      githubToken: core.getInput('github-token'),
    };

    const runId = github.context.runId;
    const owner = github.context.repo.owner;
    const repo = github.context.repo.repo;
    const headSha = github.context.payload.pull_request?.head.sha;
    const baseSha = github.context.payload.pull_request?.base.sha;
    const pullRequestId = github.context.issue.number;
    if (!pullRequestId) {
      throw new Error('Could not find the PR id');
    }

    const octokit = github.getOctokit(inputs.githubToken);

    const commitComparison = await octokit.repos.compareCommits({
      base: baseSha,
      head: headSha,
      owner,
      repo,
    });

    if (commitComparison.status !== 200) {
      core.setFailed(
        `The GitHub API for comparing the base and head commits for this ${github.context.eventName} event returned ${commitComparison.status}, expected 200.`,
      );
    }

    const files = commitComparison.data.files ?? [];

    let hasFrontendChanges: boolean = false;
    for (let file of files) {
      const filename = file.filename;
      for (let extension of frontendExtensions) {
        if (filename.endsWith(extension)) {
          hasFrontendChanges = true;
        }
      }
    }

    if (!hasFrontendChanges) {
      core.info(
        `No frontend changes detected for ${repo}#${pullRequestId} at ${baseSha}…${headSha}. Nothing to do.`,
      );
      return;
    }

    const paths = {
      base: {
        report: path.resolve(process.cwd(), inputs.base.report),
      },
      head: {
        report: path.resolve(process.cwd(), inputs.head.report),
      },
    };

    assertFileExists(paths.base.report);
    assertFileExists(paths.head.report);

    const analysis = {
      base: {
        report: require(paths.base.report),
      },
      head: {
        report: require(paths.head.report),
      },
    };

    const diff = getDiff(analysis);

    const numberOfChanges = Object.entries(diff)
      .filter(([kind]) => kind !== 'unchanged')
      .map(([_, assets]) => assets.length)
      .reduce((total, size) => total + size, 0);

    let body: string;
    if (numberOfChanges === 0) {
      body = `No significant bundle changes for ${renderGithubCompareLink(
        baseSha,
        headSha,
      )}.`;
    } else {
      body = [
        `### Comparing bundles sizes for ${renderGithubCompareLink(
          baseSha,
          headSha,
        )}`,

        'Sizes are minified bytes, and not gzipped.',

        renderSection({
          title: 'Summary of changes',
          children: renderSummaryTable({ diff }),
        }),

        renderSection({
          title: `⚠️ ${diff.bigger.length} ${pluralize(
            diff.bigger.length,
            'bundle',
            'bundles',
          )} got bigger`,
          isEmpty: diff.bigger.length === 0,
          children: renderBiggerTable({ assets: diff.bigger }),
        }),

        renderSection({
          title: `🎉 ${diff.smaller.length} ${pluralize(
            diff.smaller.length,
            'bundle',
            'bundles',
          )} got smaller`,
          isEmpty: diff.smaller.length === 0,
          children: renderSmallerTable({ assets: diff.smaller }),
        }),

        renderSection({
          title: `🤔 ${diff.added.length} ${pluralize(
            diff.added.length,
            'bundle was',
            'bundles were',
          )} added`,
          isEmpty: diff.added.length === 0,
          children: renderAddedTable({ assets: diff.added }),
        }),

        renderSection({
          title: `👏 ${diff.removed.length} ${pluralize(
            diff.removed.length,
            'bundle was',
            'bundles were',
          )} removed`,
          isEmpty: diff.removed.length === 0,
          children: renderRemovedTable({ assets: diff.removed }),
        }),

        renderReductionCelebration({ diff }),

        '---',

        `[Visit the workflow page](https://github.com/launchdarkly/gonfalon/actions/runs/${runId}) to download the artifacts for this run. You can visualize those with [webpack-bundle-analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer) or online with [statoscope](https://statoscope.tech/).`,
      ].join('\n');
    }

    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: pullRequestId,
      body,
    });

    core.info(
      `Reported on webpack bundle diff for PR ${repo}#${pullRequestId} at ${baseSha}…${headSha} successfully`,
    );
  } catch (error) {
    core.setFailed(error);
  }
}

run();
