# Test Project for Bundle Diff Dogfooding

This directory contains a simple test project used to generate webpack bundle stats for testing the webpack-bundle-diff-action on its own PRs.

## Structure

- `src/index.js` - Main application entry point
- `src/vendor.js` - Vendor/third-party dependencies simulation
- `src/utils/` - Utility modules that create separate chunks

## Purpose

The test project is designed to:
1. Generate realistic bundle sizes and splits
2. Include common dependencies (lodash) to create meaningful diffs
3. Provide multiple chunks (main, vendor, common) to test various scenarios
4. Create files that can be modified to demonstrate bundle size changes

## Usage

The webpack configuration at the project root builds this test project and generates:
- Bundle analyzer reports (JSON format)
- Webpack stats (JSON format)

These files are used by the dogfooding workflow to test the action against its own changes.