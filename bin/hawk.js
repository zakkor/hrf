#!/usr/bin/env node

import fs from 'fs';
import util from 'util';
import { parseArgs } from '../index.js';
import { hawk } from '../hawk.js';

const writeFile = util.promisify(fs.writeFile);

/** @type {import('../index').ArgTemplate} */
const args = {
  v: 'boolean',
  n: 'boolean',
  H: 'boolean',
  A: 'number',
  i: 'boolean',
};
const [options, cmdexp, ...paths] = parseArgs(args, process.argv);
options.verbose = options.v;
options.follow = false;

// TODO: Debug mode shows output
hawk(cmdexp, paths, options).then(results => {
  results.forEach(({ path, file, output }) => {
    if (options.i) {
      // Modify in-place
      if (file) writeFile(path, file);
    } else {
      console.log(file);
    }
    if (output) {
      process.stdout.write('\noutput: ');
      process.stdout.write(output);
    }
  });
});
