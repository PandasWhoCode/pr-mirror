#!/usr/bin/env node

import { prMirror } from './prmirror';

export function handleFatalError(error: any): void {
  console.error(`Fatal error: ${error.message}`);
  process.exit(1);
}

export async function runCli(isMain: boolean = require.main === module): Promise<void> {
  if (!isMain) return;

  try {
    await prMirror();
  } catch (error: any) {
    handleFatalError(error);
  }
}

void runCli();

// Export the main function and sub-functions for library usage
export { prMirror } from './prmirror';
export { mirror } from './mirror';
export { sync } from './sync';
export { createPr } from './createpr';
export type { PrMirrorOptions, GitHubAuth } from './types';
