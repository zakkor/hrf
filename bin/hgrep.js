#!/usr/bin/env node

import { parseArgs } from '../index.js';
import { hgrep } from '../hgrep.js';

/** @type {import('../index').ArgTemplate} */
const args = {
  v: 'boolean',
  n: 'boolean',
  H: 'boolean',
  A: 'number',
};
const [options, matcherexp, ...paths] = parseArgs(args, process.argv);
options.verbose = options.v;

hgrep(matcherexp, paths, options);
