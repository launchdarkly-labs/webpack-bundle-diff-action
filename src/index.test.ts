import * as github from '@actions/github';
import * as core from '@actions/core';
import { run } from './index';
import * as path from 'path';

// Mock the core and github packages
jest.mock('@actions/core');
jest.mock('@actions/github');
jest.mock('path', () => ({
  ...jest.requireActual('path'),
  resolve: jest.fn((cwd, file) => file),
}));
jest.mock('fs', () => ({
  access: jest.fn((path, mode, callback) => callback(null)),
  constants: { F_OK: 0 },
  promises: {
    access: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock report data to match the actual file structure
const mockReportData = [
  {
    label: 'common.398d730bb297033ed400.js',
    isAsset: true,
    statSize: 2008121,
    parsedSize: 863938,
    gzipSize: 230213,
    groups: [], // Simplified for test
  },
];

const mockLargerReportData = [
  {
    label: 'common.90aad3b1c5894fb1dce5.js',
    isAsset: true,
    statSize: 2008121,
    parsedSize: 863938,
    gzipSize: 230213,
    groups: [], // Simplified for test
  },
];

describe('bundle analysis action', () => {
  let mockAddLabels: jest.Mock;
  let mockCreateComment: jest.Mock;
  let mockUpdateComment: jest.Mock;
  let mockListComments: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock functions
    mockAddLabels = jest.fn();
    mockCreateComment = jest.fn();
    mockUpdateComment = jest.fn();
    mockListComments = jest.fn();

    // Mock the GitHub context
    (github.context as any) = {
      eventName: 'pull_request',
      repo: {
        owner: 'test-owner',
        repo: 'test-repo',
      },
      issue: {
        number: 123,
      },
      payload: {
        pull_request: {
          number: 123,
          head: { sha: 'headsha' },
          base: { sha: 'basesha' },
        },
      },
      runId: 456,
    };

    // Mock the Octokit instance
    const mockOctokit = {
      rest: {
        issues: {
          addLabels: mockAddLabels,
          createComment: mockCreateComment,
          updateComment: mockUpdateComment,
          listComments: mockListComments,
          listLabelsOnIssue: jest.fn().mockResolvedValue({ data: [] }),
          removeLabel: jest.fn(),
        },
        repos: {
          compareCommits: jest.fn().mockResolvedValue({
            status: 200,
            data: {
              files: [{ filename: 'src/index.js' }],
            },
          }),
        },
        git: {
          getCommit: jest.fn().mockResolvedValue({
            status: 200,
            data: {
              sha: 'testsha',
              message: 'test commit',
            },
          }),
        },
        actions: {
          listWorkflowRunArtifacts: jest.fn().mockResolvedValue({
            status: 200,
            data: {
              artifacts: [],
            },
          }),
        },
      },
    };

    (github.getOctokit as jest.Mock).mockReturnValue(mockOctokit);

    // Mock core.getInput with correct paths
    (core.getInput as jest.Mock).mockImplementation((name: string) => {
      const inputs: { [key: string]: string } = {
        'diff-threshold': '0.01',
        'increase-label': 'size-increase',
        'decrease-label': 'size-decrease',
        'violation-label': 'size-violation',
        'base-bundle-analysis-report-path':
          '../violation-base-webpack-bundle-analyzer-report.json',
        'head-bundle-analysis-report-path':
          '../violation-head-webpack-bundle-analyzer-report.json',
        'github-token': 'fake-token',
        'should-block-pr-on-exceeded-budget': 'false',
      };
      return inputs[name] || '';
    });

    // Mock the report files with correct paths
    jest.mock(
      '../violation-base-webpack-bundle-analyzer-report.json',
      () => mockReportData,
      { virtual: true },
    );
    jest.mock(
      '../violation-head-webpack-bundle-analyzer-report.json',
      () => mockLargerReportData,
      { virtual: true },
    );

    // Simplify core mocks to just be empty functions
    (core.info as jest.Mock).mockImplementation(() => {});
    (core.warning as jest.Mock).mockImplementation(() => {});
    (core.setFailed as jest.Mock).mockImplementation(() => {});
  });

  it('creates a new comment when no existing bundle analysis comment exists', async () => {
    mockListComments.mockResolvedValue({
      data: [{ body: 'some other comment' }],
    });

    await run();

    expect(mockCreateComment).toHaveBeenCalledTimes(1);
    expect(mockUpdateComment).not.toHaveBeenCalled();
  });

  it('updates existing comment when bundle analysis comment exists', async () => {
    mockListComments.mockResolvedValue({
      data: [
        {
          id: 789,
          body: 'old analysis\n\n<!-- bundle-analysis-comment -->',
        },
      ],
    });

    await run();

    expect(mockCreateComment).not.toHaveBeenCalled();
    expect(mockUpdateComment).toHaveBeenCalledTimes(1);
    expect(mockUpdateComment).toHaveBeenCalledWith(
      expect.objectContaining({
        comment_id: 789,
      }),
    );
  });
});
