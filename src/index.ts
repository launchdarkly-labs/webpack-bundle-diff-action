import * as core from '@actions/core';
import * as github from '@actions/github';
import { access, constants } from 'fs';
import * as path from 'path';
import { affectsLongTermCaching, BundleBudget, getDiff } from './diff';
import {
  renderSection,
  renderCollapsibleSection,
  renderAddedTable,
  renderBiggerTable,
  renderRemovedTable,
  renderSmallerTable,
  renderReductionCelebration,
  renderSummaryTable,
  renderNegligibleTable,
  pluralize,
  formatRatio,
  renderGithubCompareLink,
  renderCommitSummary,
  renderLongTermCachingSummary,
  renderViolationsTable,
  renderViolationSection,
  renderViolationWarning,
} from './render';

const frontendExtensions = ['js', 'css', 'ts', 'tsx', 'json'];

async function assertFileExists(path: string) {
  return new Promise<void>((resolve, reject) =>
    access(path, constants.F_OK, (error) =>
      error ? reject(new Error(`${path} does not exist`)) : resolve(),
    ),
  );
}

function processBundleBudgets() {
  // bundles inputs will be dynamic
  // e.g bundle-{name}: 50
  const bundleBudgets: BundleBudget[] = [];
  for (let [k, v] of Object.entries(process.env)) {
    // all github action inputs have this prefix "INPUT_", the real input starts with bundle-
    if (k.startsWith('INPUT_BUNDLE')) {
      let name = k.replace('INPUT_BUNDLE-', '').toLowerCase() + '.js';
      let budget = Number(v);
      bundleBudgets.push({ name, budget });
    }
  }
  return bundleBudgets;
}

async function run() {
  try {
    if (github.context.eventName !== 'pull_request') {
      throw new Error(
        `This action only supports pull requests. ${github.context.eventName} events are not supported.`,
      );
    }

    const inputs = {
      diffThreshold: parseFloat(core.getInput('diff-threshold')),
      increaseLabel: core.getInput('increase-label'),
      decreaseLabel: core.getInput('decrease-label'),
      violationLabel: core.getInput('violation-label'),
      base: {
        report: core.getInput('base-bundle-analysis-report-path'),
      },
      head: {
        report: core.getInput('head-bundle-analysis-report-path'),
      },
      githubToken: core.getInput('github-token'),
      bundleBudgets: processBundleBudgets(),
      shouldGateFailures: core.getInput('should-block-pr-on-exceeded-budget'),
    };

    // Input validation
    if (!inputs.base.report) {
      throw new Error('base-bundle-analysis-report-path is required but not provided');
    }
    if (!inputs.head.report) {
      throw new Error('head-bundle-analysis-report-path is required but not provided');
    }
    if (!inputs.githubToken) {
      throw new Error('github-token is required but not provided');
    }
    if (isNaN(inputs.diffThreshold) || inputs.diffThreshold < 0) {
      throw new Error('diff-threshold must be a non-negative number');
    }

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

    const commitComparison = await octokit.rest.repos.compareCommits({
      base: baseSha,
      head: headSha,
      owner,
      repo,
    });

    if (commitComparison.status !== 200) {
      throw new Error(
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

    const commit = await octokit.rest.git.getCommit({
      commit_sha: headSha,
      owner,
      repo,
    });

    let commitMessage;
    if (commit.status === 200) {
      commitMessage = renderCommitSummary({
        sha: commit.data.sha,
        message: commit.data.message,
        pullRequestId,
      });
    }

    const artifacts = await octokit.rest.actions.listWorkflowRunArtifacts({
      owner,
      repo,
      run_id: runId,
    });
    if (artifacts.status !== 200) {
      throw new Error(`Failed to retrieve artifacts for run ${runId}.`);
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

    const diff = getDiff(analysis, {
      diffThreshold: inputs.diffThreshold,
      bundleBudgets: inputs.bundleBudgets,
    });
    core.info(JSON.stringify(diff.chunks));

    // Optimize change counting with direct property access
    const numberOfChanges = 
      diff.chunks.added.length + 
      diff.chunks.removed.length + 
      diff.chunks.bigger.length + 
      diff.chunks.smaller.length + 
      diff.chunks.violations.length;

    let body: string;
    if (numberOfChanges === 0) {
      body = [
        commitMessage,

        `No significant bundle changes for ${renderGithubCompareLink(
          baseSha,
          headSha,
        )}.`,

        renderCollapsibleSection({
          title: `${
            diff.chunks.negligible.filter(
              (asset) => Math.abs(asset.ratio) > 0.0001,
            ).length
          } ${pluralize(
            diff.chunks.negligible.length,
            'bundle',
            'bundles',
          )} changed by less than ${formatRatio(inputs.diffThreshold)} 🧐`,
          isEmpty: diff.chunks.negligible.length === 0,
          children: renderNegligibleTable({
            assets: diff.chunks.negligible.filter(
              (asset) => Math.abs(asset.ratio) > 0.0001,
            ),
          }),
        }),

        renderCollapsibleSection({
          title: 'Long-term caching impact',
          isEmpty: !affectsLongTermCaching(diff),
          ifEmpty: 'No impact.',
          children: renderLongTermCachingSummary({ diff }),
        }),

        '---',

        `[Visit the workflow page](https://github.com/launchdarkly/gonfalon/actions/runs/${runId}) to download the artifacts for this run. You can visualize those with [webpack-bundle-analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer) or online with [statoscope](https://statoscope.tech/).`,
      ].join('\n');
    } else {
      body = [
        commitMessage,

        `### Comparing bundles sizes for ${renderGithubCompareLink(
          baseSha,
          headSha,
        )}`,

        'Sizes are minified bytes, and not gzipped.',

        renderSection({
          title: 'Summary of changes',
          children: renderSummaryTable({ diff }),
        }),

        renderViolationSection({
          title: `❌❌❌❌❌❌❌❌❌❌ ${
            diff.chunks.violations.length
          } ${pluralize(
            diff.chunks.violations.length,
            'bundle',
            'bundles',
          )} violated budgets ❌❌❌❌❌❌❌❌❌❌`,
          isEmpty: diff.chunks.violations.length === 0,
          children: renderViolationsTable({
            violations: diff.chunks.violations,
          }),
        }),

        renderSection({
          title: `⚠️ ${diff.chunks.bigger.length} ${pluralize(
            diff.chunks.bigger.length,
            'bundle',
            'bundles',
          )} got bigger`,
          isEmpty: diff.chunks.bigger.length === 0,
          children: renderBiggerTable({
            assets: diff.chunks.bigger,
          }),
        }),

        renderSection({
          title: `🎉 ${diff.chunks.smaller.length} ${pluralize(
            diff.chunks.smaller.length,
            'bundle',
            'bundles',
          )} got smaller`,
          isEmpty: diff.chunks.smaller.length === 0,
          children: renderSmallerTable({ assets: diff.chunks.smaller }),
        }),

        renderSection({
          title: `🤔 ${diff.chunks.added.length} ${pluralize(
            diff.chunks.added.length,
            'bundle was',
            'bundles were',
          )} added`,
          isEmpty: diff.chunks.added.length === 0,
          children: renderAddedTable({ assets: diff.chunks.added }),
        }),

        renderSection({
          title: `👏 ${diff.chunks.removed.length} ${pluralize(
            diff.chunks.removed.length,
            'bundle was',
            'bundles were',
          )} removed`,
          isEmpty: diff.chunks.removed.length === 0,
          children: renderRemovedTable({ assets: diff.chunks.removed }),
        }),

        renderCollapsibleSection({
          title: `${
            diff.chunks.negligible.filter(
              (asset) => Math.abs(asset.ratio) > 0.0001,
            ).length
          } ${pluralize(
            diff.chunks.negligible.length,
            'bundle',
            'bundles',
          )} changed by less than ${formatRatio(inputs.diffThreshold)} 🧐`,
          isEmpty: diff.chunks.negligible.length === 0,
          children: renderNegligibleTable({
            assets: diff.chunks.negligible.filter(
              (asset) => Math.abs(asset.ratio) > 0.0001,
            ),
          }),
        }),

        renderCollapsibleSection({
          title: 'Long-term caching impact',
          isEmpty: !affectsLongTermCaching(diff),
          ifEmpty: 'No impact.',
          children: renderLongTermCachingSummary({ diff }),
        }),

        renderReductionCelebration({ diff }),
        renderViolationWarning({
          diff,
          shouldGateFailures: Boolean(inputs.shouldGateFailures),
        }),

        '---',

        `[Visit the workflow page](https://github.com/launchdarkly/gonfalon/actions/runs/${runId}) to download the artifacts for this run. You can visualize those with [webpack-bundle-analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer) or online with [statoscope](https://statoscope.tech/).`,
      ].join('\n');
    }

    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: pullRequestId,
      body,
    });

    if (diff.chunks.violations.length === 0) {
      const violationlabels = await octokit.rest.issues.listLabelsOnIssue({
        owner,
        repo,
        issue_number: pullRequestId,
      });

      if (
        violationlabels.data.find(
          (label) => label.name === inputs.violationLabel,
        )
      ) {
        try {
          await octokit.rest.issues.removeLabel({
            owner,
            repo,
            issue_number: pullRequestId,
            name: inputs.violationLabel,
          });
        } catch (error) {
          core.warning(
            `Failed to remove "${inputs.violationLabel}" label from PR ${pullRequestId}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }
    // If there was an increase in bundle size, add a label to the pull request
    // It's possible there was a net decrease, and that some critical bundles
    // increased.
    if (diff.chunks.added.length > 0 || diff.chunks.bigger.length > 0) {
      await octokit.rest.issues.addLabels({
        owner,
        repo,
        issue_number: pullRequestId,
        labels: [inputs.increaseLabel],
      });
      if (diff.chunks.violations.length > 0) {
        await octokit.rest.issues.addLabels({
          owner,
          repo,
          issue_number: pullRequestId,
          labels: [inputs.violationLabel],
        });
      }
    } else {
      const labels = await octokit.rest.issues.listLabelsOnIssue({
        owner,
        repo,
        issue_number: pullRequestId,
      });

      if (labels.data.find((label) => label.name === inputs.increaseLabel)) {
        try {
          await octokit.rest.issues.removeLabel({
            owner,
            repo,
            issue_number: pullRequestId,
            name: inputs.increaseLabel,
          });
        } catch (error) {
          core.warning(
            `Failed to remove "${inputs.increaseLabel}" label from PR ${pullRequestId}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }

    // If there was a decrease in bundle size, add a label to the pull request
    // It's possible there was a net increase, and that some critical bundles
    // decreased.
    if (diff.chunks.removed.length > 0 || diff.chunks.smaller.length > 0) {
      await octokit.rest.issues.addLabels({
        owner,
        repo,
        issue_number: pullRequestId,
        labels: [inputs.decreaseLabel],
      });
    } else {
      const labels = await octokit.rest.issues.listLabelsOnIssue({
        owner,
        repo,
        issue_number: pullRequestId,
      });

      if (labels.data.find((label) => label.name === inputs.decreaseLabel)) {
        try {
          await octokit.rest.issues.removeLabel({
            owner,
            repo,
            issue_number: pullRequestId,
            name: inputs.decreaseLabel,
          });
        } catch (error) {
          core.warning(
            `Failed to remove "${inputs.decreaseLabel}" label from PR ${pullRequestId}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }

    if (inputs.shouldGateFailures && diff.chunks.violations.length) {
      core.setFailed(
        'exceeded budget for critical bundles; please double check the above table and your code imports and run npm:webpack to diagnose',
      );
    }

    core.info(
      `Reported on webpack bundle diff for PR ${repo}#${pullRequestId} at ${baseSha}…${headSha} successfully`,
    );
  } catch (error) {
    core.setFailed(error as Error);
  }
}

run();
