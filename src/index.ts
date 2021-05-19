import * as core from '@actions/core';
import * as github from '@actions/github';
import { access, constants } from 'fs';
import * as path from 'path';

import { getDiff } from './diff';
import {
  getAddedTable,
  getBiggerTable,
  getRemovedTable,
  getSmallerTable,
  getUnchangedTable,
} from './format';

async function assertFileExists(path: string) {
  return new Promise<void>((resolve, reject) =>
    access(path, constants.F_OK, (error) =>
      error ? reject(new Error(`${path} does not exist`)) : resolve(),
    ),
  );
}

async function run() {
  try {
    const inputs = {
      base: core.getInput('base-stats-path'),
      head: core.getInput('head-stats-path'),
      githubToken: core.getInput('github-token'),
    };

    const paths = {
      base: path.resolve(process.cwd(), inputs.base),
      head: path.resolve(process.cwd(), inputs.head),
    };

    assertFileExists(paths.base);
    assertFileExists(paths.head);

    const stats = {
      base: require(paths.base),
      head: require(paths.head),
    };

    const diff = getDiff(stats);

    const octokit = github.getOctokit(inputs.githubToken);

    const owner = github.context.repo.owner;
    const repo = github.context.repo.repo;
    const pullRequestId = github.context.issue.number;
    if (!pullRequestId) {
      throw new Error('Could not find the PR id');
    }

    const body = `### Webpack bundle diff

#### Bundle size increased 🔼
${getAddedTable(diff.added)}

#### Bundle size decreased 🔽
${getAddedTable(diff.added)}

#### New bundles 🆕
${getAddedTable(diff.added)}

#### Removed bundles 🚮
${getAddedTable(diff.added)}
`;

    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: pullRequestId,
      body,
    });

    core.info(`Webpack bundle diff for PR ${repo}#${pullRequestId}`);
    core.info(body);
  } catch (error) {
    core.setFailed(error);
  }
}

run();
