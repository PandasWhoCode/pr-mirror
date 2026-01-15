#!/usr/bin/env node

import { prMirror } from './prmirror';

// Run the main function if this script is executed directly
if (require.main === module) {
  prMirror().catch((error) => {
    console.error(`Fatal error: ${error.message}`);
    process.exit(1);
  });
}

// Export the main function and sub-functions for library usage
export { prMirror } from './prmirror';
export { mirror } from './mirror';
export { sync } from './sync';
export { createPr } from './createpr';
export type { PrMirrorOptions, GitHubAuth } from './types';

