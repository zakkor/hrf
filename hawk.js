import { relative } from 'path';
import util from 'util';
import { processFile, parseHTML, shiftAST } from './index.js';
import { parseMatcher, match } from './matcher.js';
import { nthIndexOf } from './strings.js';

export async function hawk(cmdexp, paths, options) {
  const cmd = parseCommand(cmdexp);
  const matcher = parseMatcher(cmd.matcher);
  /** @type {Cache} */
  const cache = {};
  const promises = paths.map(async path => {
    path = relative(process.cwd(), path);
    return processFile(
      path,
      async (file, ast) => {
        return new Promise(resolve => {
          executeCommand(file, ast, matcher, cmd).then(res => {
            resolve({ path, ...res });
          });
        });
      },
      options,
      cache
    );
  });
  return Promise.all(promises);
}

export async function hawkData(cmdexp, file, options = {}) {
  const cmd = parseCommand(cmdexp);
  const matcher = parseMatcher(cmd.matcher);
  /** @type {Cache} */
  const cache = {};
  return parseHTML(
    '.',
    file,
    (file, ast) => {
      return executeCommand(file, ast, matcher, cmd);
    },
    options,
    cache
  );
}

async function executeCommand(file, ast, matcher, cmd) {
  return new Promise(resolve => {
    match(ast, matcher, (node, groups) => {
      // Logging
      let output = '';
      globalThis.log = (...args) => {
        output += util.format(...args) + '\n';
      };

      // TODO: Attributes should be an object with a .toString representation. Assigning to keys of the attribute object should enable/disable individual attribute values.
      // Assigning a plain string to an attribute will just override the whole thing.

      // Attributes
      const attrs = node.attributes.reduce((acc, v) => {
        acc[v.name] = flattenValue(v.value);
        return acc;
      }, {});
      globalThis.a = new Proxy(attrs, {
        // Get attribute value
        get(target, name) {
          return target[name];
        },
        // Set attribute value
        set(target, name, value) {
          file = setAttr(file, ast, node, name, value);
          target[name] = value;
          return true;
        },
        // Delete attribute
        deleteProperty(target, name) {
          file = deleteAttr(file, ast, node, name);
          delete target[name];
          return true;
        },
      });

      // TODO: Proxify classlist
      // Class list (classnames as array)
      let classlist = flattenValue(node.attributes.find(a => a.name === 'class')?.value)?.split(' ');
      globalThis.cl = classlist;

      // Class object (classnames as map)
      const classes =
        classlist?.length === 1 && classlist?.[0] === 'true'
          ? {}
          : classlist?.reduce((acc, v) => {
              acc[v] = true;
              return acc;
            }, {});
      if (classes) {
        globalThis.c = new Proxy(classes, {
          get(target, name) {
            if (!(name in target)) {
              return false;
            }
            return target[name];
          },
          // Add/remove classname
          set(target, name, value) {
            if (value) {
              classlist = classlist?.filter(c => c !== name).concat(name);
            } else {
              classlist = classlist?.filter(c => c !== name);
            }
            globalThis.cl = classlist;
            file = setAttr(file, ast, node, 'class', classlist.join(' '));
            target[name] = value;
            return true;
          },
          deleteProperty(target, name) {
            classlist = classlist?.filter(c => c !== name);
            globalThis.cl = classlist;
            file = setAttr(file, ast, node, 'class', classlist.join(' '));
            delete target[name];
            return true;
          },
        });
      }

      // Matched regex groups
      globalThis.m = groups;

      // Delete element
      globalThis.d = () => {
        file = deleteElement(file, ast, node);
      };
      // Delete attributes
      globalThis.da = (...names) => {
        for (const name of names) {
          file = deleteAttr(file, ast, node, name);
        }
      };
      // Set attribute (value)
      globalThis.sa = (name, value) => {
        file = setAttr(file, ast, node, name, value);
      };
      // Rename attribute (key)
      globalThis.ra = (name, value) => {
        file = renameAttr(file, ast, node, name, value);
      };

      const ret = eval(cmd.body);
      if (typeof ret === 'function') {
        ret();
      }
      return { file, output };
    }).then(res => {
      if (res.file === undefined || res.file === '') {
        res.file = file;
      }
      resolve(res);
    });
  });
}

function deleteElement(file, ast, node) {
  file = safeDelete(file, node);
  shiftAST({
    ast,
    remove: node,
    start: node.start,
    shiftLeft: node.end - node.start,
  });
  return file;
}

function deleteAttr(file, ast, node, name) {
  const attr = node.attributes.find(a => a.name === name);
  if (!attr) return file;
  file = safeDelete(file, attr);
  shiftAST({
    ast,
    remove: attr,
    start: node.start,
    shiftLeft: attr.end - attr.start,
  });
  return file;
}


// FIXME: Wherever we change node values, we need to actually mutate the nodes too, not just the file.
function setAttr(file, ast, node, name, value) {
  const attr = node.attributes?.find(a => a.name === name);
  // TODO: Write this in a nicer way
  // FIXME: These indices are very tricky
  if (!attr) {
    // Go from <Comp> to <Comp attr="value">
    const nameWithValue = `${name}="${value}"`;

    const start = node.start + node.name.length + 1; // "<" and " "
    const end = start + nameWithValue.length;

    file = file.substring(0, start) + ' ' + nameWithValue + file.substring(start);

    const n = end - start + 1;
    node.end += n;
    shiftAST({
      ast,
      start: node.start,
      shiftLeft: -n,
    });

    node.attributes.push({
      start: start + 1,
      end,
      type: 'Attribute',
      name,
      value: [
        {
          start: start + name.length + 2, // ="
          end: end,
          type: 'Text',
          raw: value,
          data: value,
        },
      ],
    });
    return file;
  }
  if (attr.value.length <= 0) {
    attr.value.push({
      start: attr.start + attr.name.length + 2,
      end: attr.start + attr.name.length + 2,
      type: 'Text',
      raw: '',
      data: '',
    });
  }

  const val = attr.value[0];
  file = replace(file, val, value);
  const shiftl = determineShift(val, value);
  node.end -= shiftl;
  attr.end -= shiftl;
  val.end -= shiftl;
  shiftAST({
    ast,
    start: val.start,
    shiftLeft: shiftl,
  });

  return file;
}

function renameAttr(file, ast, node, name, newName) {
  const attr = node.attributes?.find(a => a.name === name);
  if (!attr) return file;
  file = file.substring(0, attr.start) + newName + file.substring(attr.start + name.length);
  const n = name.length;
  attr.name = newName;
  shiftAST({
    ast,
    start: node.start,
    shiftLeft: n < newName.length ? n - newName.length : newName.length - n,
  });
  return file;
}

function replace(file, { start, end }, value) {
  return file.substring(0, start) + value + file.substring(end);
}

function determineShift(node, s) {
  const oldlen = node.end - node.start;
  const newlen = s.length;
  return oldlen - newlen;
}

function safeDelete(file, node) {
  cleanWhitespace(file, node);
  return file.substring(0, node.start) + file.substring(node.end);
}

function cleanWhitespace(file, node) {
  const deleted = cleanPrecedingWhitespace(file, node);
  if (!deleted) {
    cleanTrailingWhitespace(file, node);
  }
}

function cleanPrecedingWhitespace(file, node) {
  if ([' ', '\n', '\r', '\t'].includes(file.charAt(node.start - 1))) {
    node.start--;
    return true;
  }
  return false;
}

function cleanTrailingWhitespace(file, node) {
  if ([' ', '\n', '\r', '\t'].includes(file.charAt(node.end))) {
    node.end++;
  }
}

function flattenValue(value) {
  if (value === undefined) {
    return;
  }
  if (typeof value === 'object') {
    return value.map(v => v.data).join('');
  }
  return value.toString();
}

/**
 * @typedef {{ matcher: string, body: string }} HawkCommand
 * @param {string} str
 * @returns {HawkCommand}
 * @example `/Foo[bar]/ a.bar` => { matcher: 'Foo[bar]', body: 'a.bar' }
 */
function parseCommand(str) {
  const delim = '/';
  const opat = str.indexOf(delim);
  const cpat = nthIndexOf(str, delim, 2);
  const pat = str.substring(opat + 1, cpat);
  return { matcher: pat, body: str.slice(cpat + 1, str.length) };
}

function printLocation(file, { start, end }, expect) {
  console.log(
    `location: [${file.substring(start, end)}]`,
    ...(expect ? [`expected: [${expect}]`, 'matches:', file.substring(start, end) === expect] : [])
  );
}
