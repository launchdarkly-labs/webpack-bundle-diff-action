# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Building and Development
- `npm run build` - Compile TypeScript to JavaScript
- `npm run package` - Build and package with ncc for distribution (creates `dist/` folder)
- `npm test` - Run Jest tests
- `npm test:watch` - Run tests in watch mode
- `npm run format` - Format code with Prettier
- `npm run format-check` - Check code formatting
- `npm run ts` - Type check with TypeScript compiler

### Testing and Development Workflow
- `npm run webpack:stats` - Generate webpack stats and bundle analyzer reports (test data)
- `npm run clean:test-dist` - Clean test distribution files

### Release Process
After making changes, run:
1. `npm run build`
2. `npm run package` 
3. Commit changes including updated `dist/` folder

## Project Architecture

This is a GitHub Action that analyzes webpack bundle size changes between PR branches and posts detailed comments with size comparisons, budget violations, and caching impact analysis.

### Core Components

**Main Entry Point (`src/index.ts`)**
- Orchestrates the entire bundle diff workflow
- Handles GitHub API interactions (comments, labels, artifacts)
- Processes bundle budgets from environment variables with `INPUT_BUNDLE_` prefix
- Implements smart commenting logic (can skip comments on insignificant changes)
- Manages PR labeling based on bundle size changes

**Bundle Analysis (`src/diff.ts`)**
- Compares webpack-bundle-analyzer reports between base and head branches
- Parses asset names with regex patterns (supports both hashed and simple filenames)
- Categorizes changes: added, removed, bigger, smaller, negligible, violations
- Implements bundle budget checking and violation detection
- Provides caching impact analysis

**Report Rendering (`src/render.ts`)**
- Generates markdown tables and formatted output for PR comments
- Handles pluralization, byte formatting, and percentage calculations
- Creates collapsible sections for detailed breakdowns
- Renders summary tables, violation warnings, and caching impact analysis

### Key Features

**Bundle Budgets**: Set via environment variables like `INPUT_BUNDLE_MAIN: 250000` for 250KB budget on main.js
**Smart Commenting**: Can skip PR comments when `skip-comment-on-no-changes: true` and no significant changes detected
**Asset Name Parsing**: Supports both hashed assets (`main.abc123.js`) and simple assets (`vendor.js`)
**Caching Analysis**: Calculates impact on long-term caching strategies
**GitHub Integration**: Manages PR labels and posts formatted comments with detailed analysis

### Testing

Tests use Jest with sample webpack bundle analyzer reports. Test files include both unit tests and integration tests for the core diff and render logic.

### GitHub Action Configuration

The action expects webpack-bundle-analyzer JSON reports as inputs and requires a GitHub token for PR commenting. It processes bundle size changes and posts comprehensive analysis including violations, size changes, and caching impact.