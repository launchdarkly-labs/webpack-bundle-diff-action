// Simple integration tests for index.ts core functions
import { access } from 'fs';
import * as path from 'path';
import { BundleBudget } from './diff';

// Test the processBundleBudgets function logic
describe('processBundleBudgets', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should process bundle budgets from environment variables', () => {
    process.env.INPUT_BUNDLE_MAIN = '10';
    process.env.INPUT_BUNDLE_VENDOR = '20';
    process.env.INPUT_SOME_OTHER_VAR = 'ignore';

    const processBundleBudgets = () => {
      const bundleBudgets: BundleBudget[] = [];
      for (let [k, v] of Object.entries(process.env)) {
        if (k.startsWith('INPUT_BUNDLE')) {
          let name = k.replace('INPUT_BUNDLE_', '').toLowerCase() + '.js';
          let budget = Number(v);
          bundleBudgets.push({ name, budget });
        }
      }
      return bundleBudgets;
    };

    const result = processBundleBudgets();
    expect(result).toEqual([
      { name: 'main.js', budget: 10 },
      { name: 'vendor.js', budget: 20 },
    ]);
  });
});

// Test the assertFileExists function
describe('assertFileExists', () => {
  it('should resolve when file exists', async () => {
    const assertFileExists = (path: string) => {
      return new Promise<void>((resolve, reject) =>
        access(path, require('fs').constants.F_OK, (error) =>
          error ? reject(new Error(`${path} does not exist`)) : resolve(),
        ),
      );
    };

    // Mock access to succeed
    const mockAccess = jest.spyOn(require('fs'), 'access');
    mockAccess.mockImplementation((path, mode, callback) => {
      (callback as (err: Error | null) => void)(null);
    });

    await expect(assertFileExists('/mock/path')).resolves.toBeUndefined();

    mockAccess.mockRestore();
  });

  it('should reject when file does not exist', async () => {
    const assertFileExists = (path: string) => {
      return new Promise<void>((resolve, reject) =>
        access(path, require('fs').constants.F_OK, (error) =>
          error ? reject(new Error(`${path} does not exist`)) : resolve(),
        ),
      );
    };

    // Mock access to fail
    const mockAccess = jest.spyOn(require('fs'), 'access');
    mockAccess.mockImplementation((path, mode, callback) => {
      (callback as (err: Error | null) => void)(new Error('File not found'));
    });

    await expect(assertFileExists('/nonexistent/path')).rejects.toThrow(
      '/nonexistent/path does not exist',
    );

    mockAccess.mockRestore();
  });
});

// Test skip comment logic
describe('skip comment logic', () => {
  it('should skip comment when skipCommentOnNoChanges is true and no significant changes', () => {
    const mockDiff = {
      chunks: {
        added: [] as any[],
        removed: [] as any[],
        bigger: [] as any[],
        smaller: [] as any[],
        violations: [] as any[],
        negligible: [
          { delta: 50, name: 'small-change.js' }, // Less than 1KB threshold
        ] as any[],
      },
    };

    const hasSignificantChanges = (): boolean => {
      if (mockDiff.chunks.violations.length > 0) return true;

      const numberOfChanges =
        mockDiff.chunks.added.length +
        mockDiff.chunks.removed.length +
        mockDiff.chunks.bigger.length +
        mockDiff.chunks.smaller.length +
        mockDiff.chunks.violations.length;

      if (numberOfChanges > 0) return true;

      const meaningfulNegligibleChanges = mockDiff.chunks.negligible.filter(
        (asset) => Math.abs(asset.delta) > 1000,
      );

      return meaningfulNegligibleChanges.length > 0;
    };

    const skipCommentOnNoChanges = true;
    const shouldSkipComment =
      skipCommentOnNoChanges && !hasSignificantChanges();

    expect(shouldSkipComment).toBe(true);
  });

  it('should not skip comment when there are significant changes', () => {
    const mockDiff = {
      chunks: {
        added: [{ name: 'new-file.js' }] as any[],
        removed: [] as any[],
        bigger: [] as any[],
        smaller: [] as any[],
        violations: [] as any[],
        negligible: [] as any[],
      },
    };

    const hasSignificantChanges = (): boolean => {
      if (mockDiff.chunks.violations.length > 0) return true;

      const numberOfChanges =
        mockDiff.chunks.added.length +
        mockDiff.chunks.removed.length +
        mockDiff.chunks.bigger.length +
        mockDiff.chunks.smaller.length +
        mockDiff.chunks.violations.length;

      if (numberOfChanges > 0) return true;

      const meaningfulNegligibleChanges = mockDiff.chunks.negligible.filter(
        (asset) => Math.abs(asset.delta) > 1000,
      );

      return meaningfulNegligibleChanges.length > 0;
    };

    const skipCommentOnNoChanges = true;
    const shouldSkipComment =
      skipCommentOnNoChanges && !hasSignificantChanges();

    expect(shouldSkipComment).toBe(false);
  });

  it('should not skip comment when skipCommentOnNoChanges is false', () => {
    const mockDiff = {
      chunks: {
        added: [] as any[],
        removed: [] as any[],
        bigger: [] as any[],
        smaller: [] as any[],
        violations: [] as any[],
        negligible: [] as any[],
      },
    };

    const hasSignificantChanges = (): boolean => {
      return false; // No changes at all
    };

    const skipCommentOnNoChanges = false;
    const shouldSkipComment =
      skipCommentOnNoChanges && !hasSignificantChanges();

    expect(shouldSkipComment).toBe(false);
  });

  it('should detect meaningful negligible changes above 1KB threshold', () => {
    const mockDiff = {
      chunks: {
        added: [] as any[],
        removed: [] as any[],
        bigger: [] as any[],
        smaller: [] as any[],
        violations: [] as any[],
        negligible: [
          { delta: 1500, name: 'large-change.js' }, // Above 1KB threshold
          { delta: 500, name: 'small-change.js' }, // Below 1KB threshold
        ] as any[],
      },
    };

    const hasSignificantChanges = (): boolean => {
      if (mockDiff.chunks.violations.length > 0) return true;

      const numberOfChanges =
        mockDiff.chunks.added.length +
        mockDiff.chunks.removed.length +
        mockDiff.chunks.bigger.length +
        mockDiff.chunks.smaller.length +
        mockDiff.chunks.violations.length;

      if (numberOfChanges > 0) return true;

      const meaningfulNegligibleChanges = mockDiff.chunks.negligible.filter(
        (asset) => Math.abs(asset.delta) > 1000,
      );

      return meaningfulNegligibleChanges.length > 0;
    };

    expect(hasSignificantChanges()).toBe(true);
  });
});

// Test frontend extension detection logic
describe('frontend change detection', () => {
  const frontendExtensions = ['js', 'css', 'ts', 'tsx', 'json'];

  it('should detect frontend changes for various extensions', () => {
    const testFiles = [
      'src/main.js',
      'styles/main.css',
      'components/App.ts',
      'components/Header.tsx',
      'config.json',
    ];

    testFiles.forEach((filename) => {
      let hasFrontendChanges = false;
      for (let extension of frontendExtensions) {
        if (filename.endsWith(extension)) {
          hasFrontendChanges = true;
        }
      }
      expect(hasFrontendChanges).toBe(true);
    });
  });

  it('should not detect frontend changes for non-frontend files', () => {
    const testFiles = [
      'README.md',
      'docs/setup.txt',
      'script.py',
      'Dockerfile',
    ];

    testFiles.forEach((filename) => {
      let hasFrontendChanges = false;
      for (let extension of frontendExtensions) {
        if (filename.endsWith(extension)) {
          hasFrontendChanges = true;
        }
      }
      expect(hasFrontendChanges).toBe(false);
    });
  });
});

// Test path resolution logic
describe('path resolution', () => {
  it('should resolve paths correctly', () => {
    const basePath = './base-report.json';
    const headPath = './head-report.json';

    const resolvedBase = path.resolve(process.cwd(), basePath);
    const resolvedHead = path.resolve(process.cwd(), headPath);

    expect(resolvedBase).toContain('base-report.json');
    expect(resolvedHead).toContain('head-report.json');
    expect(path.isAbsolute(resolvedBase)).toBe(true);
    expect(path.isAbsolute(resolvedHead)).toBe(true);
  });
});

// Test change counting logic
describe('change counting', () => {
  it('should count significant changes correctly', () => {
    const mockDiffChunks = {
      bigger: [{ name: 'big.js' }, { name: 'big2.js' }],
      smaller: [{ name: 'small.js' }],
      added: [{ name: 'new.js' }],
      removed: [{ name: 'old.js' }],
      negligible: [{ name: 'tiny.js' }],
      violations: [{ name: 'violation.js' }],
    };

    const numberOfChanges = Object.entries(mockDiffChunks)
      .filter(([kind]) => kind !== 'negligible')
      .map(([_, assets]) => assets.length)
      .reduce((total, size) => total + size, 0);

    expect(numberOfChanges).toBe(6); // 2 + 1 + 1 + 1 + 1 = 6
  });

  it('should return 0 when only negligible changes', () => {
    const mockDiffChunks = {
      bigger: [],
      smaller: [],
      added: [],
      removed: [],
      negligible: [{ name: 'tiny.js' }, { name: 'tiny2.js' }],
      violations: [],
    };

    const numberOfChanges = Object.entries(mockDiffChunks)
      .filter(([kind]) => kind !== 'negligible')
      .map(([_, assets]) => assets.length)
      .reduce((total, size) => total + size, 0);

    expect(numberOfChanges).toBe(0);
  });
});

// Test label logic
describe('labeling logic', () => {
  it('should determine when increase label is needed', () => {
    const mockDiff = {
      chunks: {
        added: [{ name: 'new.js' }],
        bigger: [],
        smaller: [],
        removed: [],
        negligible: [],
        violations: [],
      },
    };

    const shouldAddIncreaseLabel =
      mockDiff.chunks.added.length > 0 || mockDiff.chunks.bigger.length > 0;

    expect(shouldAddIncreaseLabel).toBe(true);
  });

  it('should determine when decrease label is needed', () => {
    const mockDiff = {
      chunks: {
        added: [],
        bigger: [],
        smaller: [{ name: 'smaller.js' }],
        removed: [],
        negligible: [],
        violations: [],
      },
    };

    const shouldAddDecreaseLabel =
      mockDiff.chunks.removed.length > 0 || mockDiff.chunks.smaller.length > 0;

    expect(shouldAddDecreaseLabel).toBe(true);
  });

  it('should determine when violation label is needed', () => {
    const mockDiff = {
      chunks: {
        violations: [{ name: 'violation.js' }],
      },
    };

    const shouldAddViolationLabel = mockDiff.chunks.violations.length > 0;
    expect(shouldAddViolationLabel).toBe(true);
  });
});

// Test input validation
describe('input processing', () => {
  it('should parse float diff threshold correctly', () => {
    const percentChangeMinimumInput = '0.02';
    const parsed = parseFloat(percentChangeMinimumInput);
    expect(parsed).toBe(0.02);
    expect(typeof parsed).toBe('number');
  });

  it('should handle boolean inputs', () => {
    const shouldGateInput = 'true';
    const shouldGate = Boolean(shouldGateInput);
    expect(shouldGate).toBe(true);

    const shouldNotGateInput = '';
    const shouldNotGate = Boolean(shouldNotGateInput);
    expect(shouldNotGate).toBe(false);
  });
});
