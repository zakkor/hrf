import { relative } from 'path';

import { processFile, parseHTML } from './index.js';
import { parseMatcher, match } from './matcher.js';
import { nthIndexOf } from './strings.js';

export async function hgrep(matcherexp, paths, options = {}) {
  const matcher = parseMatcher(matcherexp);
  /** @type {import('./index').Cache} */
  const cache = {};
  for (let path of paths) {
    path = relative(process.cwd(), path);
    processFile(
      path,
      (file, ast) => {
        if (options.verbose) console.log('searching in file:', path);
        match(ast, matcher, node => {
          console.log(location(path, file, node, options));
        });
      },
      options,
      cache
    );
  }
}

/**
 *
 * @param {string} matcherexp
 * @param {string} file
 * @param {{
      v: boolean,
      n: boolean,
      H: boolean,
      A: number,
    }} options
 * @returns {Promise<string>}
 */
export async function hgrepData(matcherexp, file, options = {}) {
  const matcher = parseMatcher(matcherexp);
  /** @type {import('./index').Cache} */
  const cache = {};
  return parseHTML(
    '.',
    file,
    (file, ast) => {
      return match(ast, matcher, node => {
        return location('.', file, node, options);
      });
    },
    options,
    cache
  );
}

function location(path, file, { start, end }, options) {
  start = file.lastIndexOf('\n', start) + 1 || start;
  let sec = file.substring(start, end);
  if (options.A) {
    sec = sec.slice(0, nthIndexOf(sec, '\n', options.A));
  }
  if (options.n || options.H) {
    return sec
      .split('\n')
      .map(
        (line, i) =>
          (options.H ? path + ':' : '') +
          (options.n ? Array.from(file.slice(0, start)).filter(c => c === '\n').length + 1 + i + ':' : '') +
          line
      )
      .join('\n');
  }
  return sec;
}
