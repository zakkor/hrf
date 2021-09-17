import fs from 'fs';
import util from 'util';
import * as svelte from 'svelte/compiler';
import { walk } from 'estree-walker';

const readFile = util.promisify(fs.readFile);

// TODO: Show dependency tree
// TODO: Find unused components

/** @typedef {Object.<string, boolean>} Cache */

/**
 * @param {string} path
 * @param {function} fn
 * @param {Object} options
 * @param {Cache} cache
 * @returns {Promise<string>}
 */
export async function processFile(path, fn, options, cache) {
  // TODO: Is this cache even needed anymore?
  if (path in cache) {
    if (options.verbose) console.log('skipped:', path);
    return;
  }

  let file;
  try {
    file = await readFile(path, 'utf8');
  } catch (err) {
    console.error(`could not read file: ${path} ${err}`);
    return;
  }
  return parseHTML(path, file, fn, options, cache);
}

// TODO: remove the cache completely - we will never get duplicate files passed, so it has no point
export async function parseHTML(path, file, fn, options, cache) {
  // Strip all styles - trying to `svelte.parse` style tags that require special preprocessing
  // (like PostCSS for example), would result in an error.

  // Have to shift line numbers to account for the missing style tags.
  let shiftCSS = 0;
  const { code: stripped } = await svelte.preprocess(file, {
    style: ({ content }) => {
      shiftCSS = content.length;
      return { code: '' };
    },
  });

  const ast = svelte.parse(stripped);
  if (ast.css) {
    shiftAST({
      ast,
      start: ast.css.start,
      shiftLeft: -shiftCSS,
    });
  }

  const res = fn(file, ast);
  cache[path] = true;
  if (options.verbose) console.log('parsed:', path);
  return res;
}

/** @typedef {'boolean' | 'string' | 'number'} Arg */
/** @typedef {Object.<string, Arg>} ArgTemplate */
/**
 * @param {ArgTemplate} tmpl
 */
export function parseArgs(tmpl, [_, __, ...args]) {
  const options = {};
  let adv = 0;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!['--', '-'].some(d => args[i].startsWith(d))) {
      continue;
    }
    const name = arg.substring(arg.lastIndexOf('-') + 1);
    if (!(name in tmpl)) {
      throw new Error('unrecognized option: ' + arg);
    }
    if (tmpl[name] === 'boolean') {
      options[name] = true;
      adv++;
      continue;
    }
    if (tmpl[name] === 'number') {
      options[name] = parseInt(args[++i], 10);
    } else {
      options[name] = args[++i];
    }
    adv += 2;
  }
  const [cmd, ...files] = args.slice(adv);
  return [options, cmd, ...files];
}

export function shiftAST({ ast, remove, start, shiftLeft }) {
  walk(ast, {
    enter(node) {
      if (remove && node === remove) {
        this.remove();
        return;
      }
      if (node.start > start) {
        node.start -= shiftLeft;
        node.end -= shiftLeft;
      }
    },
  });
}
