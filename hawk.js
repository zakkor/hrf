import { relative } from 'path';
import util from 'util';
import { processFile, parseHTML, shiftAST } from './index.js';
import { parseMatcher, match } from './matcher.js';
import { nthIndexOf, findFirstIndexReverse, findFirstIndex } from './strings.js';

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
        return { path, ...(await executeCommand(file, ast, matcher, cmd)) };
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
      // Rename element
      globalThis.r = name => {
        file = renameElement(file, ast, node, name);
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

// Regular element:
// <Comp> hello world </Comp>
//  ^^^^                ^^^^
//   n1                  n2
//
// Self-closing element:
// <Comp />
//  ^^^^
//   n1
function renameElement(file, ast, node, name) {
  // Change `n1`
  const firstNameStart = node.start + 1; // <
  const firstNameEnd = findFirstIndex(file, ['\n', ' '], node.start); // Newline or space, whichever comes first
  file = file.substring(0, firstNameStart) + name + file.substring(firstNameEnd);
  shiftAST({
    ast,
    start: node.start - 1,
    shiftLeft: node.name.length - name.length,
  });

  // If tag is self-closing, nothing more to do
  const selfClosing = findFirstIndexReverse(file, '/>', node.end, '<');
  if (!selfClosing) {
    // Change `n2`
    const closingTagStart = findFirstIndexReverse(file, '</', node.end);
    const lastNameStart = closingTagStart + 2; // </
    const lastNameEnd = node.end - 1; // >
    file = file.substring(0, lastNameStart) + name + file.substring(lastNameEnd);
    // `end` has moved to the right again
    node.end += node.name.length - name.length;
    // Shift all nodes after this one
    shiftAST({
      ast,
      start: node.end,
      shiftLeft: node.name.length - name.length,
    });
  }

  node.name = name;

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

function setAttr(file, ast, node, name, value) {
  const attr = node.attributes?.find(a => a.name === name);
  if (!attr) {
    return createAttr(file, ast, node, name, value);
  }

  if (attr.value.length === 0 || attr.value === true) {
    const insvalue = attr.value === true ? `="${value}"` : value;
    const attrvaluestart = attr.start + attr.name.length + '="'.length;
    const pos = attr.value === true ? attr.end : attrvaluestart;

    file = insert(file, ast, insvalue, pos);

    attr.value = [
      {
        start: attrvaluestart,
        end: attrvaluestart + value.length,
        type: 'Text',
        raw: value,
        data: value,
      },
    ];

    node.end += insvalue.length;
    attr.end += insvalue.length;

    return file;
  }

  const attrvalue = attr.value[0];
  if (!attrvalue) {
    throw new Error('trying to set attribute value that does not exist');
  }

  const [newfile, shiftLeft] = replace(file, ast, attrvalue.start, attrvalue.end, value);
  file = newfile;

  node.end -= shiftLeft;
  attr.end -= shiftLeft;
  attrvalue.end -= shiftLeft;

  attrvalue.data = value;
  attrvalue.raw = value;

  return file;
}

function createAttr(file, ast, node, name, value) {
  const newattr = ` ${name}="${value}"`;
  const pos = node.start + node.name.length + 1;
  file = insert(file, ast, newattr, pos);
  // Node at position has become longer by the length of the new attribute
  node.end += newattr.length;
  // Insert new attribute node into the AST
  const attrstart = pos + ' '.length;
  const attrend = pos + newattr.length;

  node.attributes.push({
    start: attrstart,
    end: attrend,
    type: 'Attribute',
    name,
    value: [
      {
        start: attrstart + `${name}="`.length,
        end: attrend - '"'.length,
        type: 'Text',
        raw: value,
        data: value,
      },
    ],
  });

  return file;
}

function renameAttr(file, ast, node, name, newName) {
  const attr = node.attributes?.find(a => a.name === name);
  if (!attr) return file;

  const [newfile, shiftLeft] = replace(file, ast, attr.start, attr.start + attr.name.length, newName);
  file = newfile;

  attr.name = newName;

  node.end -= shiftLeft;
  attr.end -= shiftLeft;

  return file;
}

// Insert string at file position and shift all nodes after.
function insert(file, ast, str, pos) {
  file = file.substring(0, pos) + str + file.substring(pos);
  shiftAST({ ast, start: pos, shiftLeft: -str.length });
  return file;
}

/** Replace string at specified range and shift all nodes.
 * @param {string} file
 * @param {import('estree-walker').BaseNode} ast
 * @param {number} start
 * @param {number} end
 * @param {string} str
 * @returns {[string, number]} */
function replace(file, ast, start, end, str) {
  file = file.substring(0, start) + str + file.substring(end);
  const oldlen = end - start;
  const shiftLeft = oldlen - str.length;
  shiftAST({ ast, start, shiftLeft });
  return [file, shiftLeft];
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

function printLocation(file, start, end) {
  console.log(`location [${file.substring(start, end)}]`);
}

function printNode(file, node) {
  console.log(
    'node [%s], contents [%s], range [%s - %s]',
    node.name || node.type,
    file.substring(node.start, node.end),
    node.start,
    node.end
  );
  for (const n of node.attributes) {
    console.log(
      '\tattribute [%s], contents [%s], range [%s - %s]',
      n.name,
      file.substring(n.start, n.end),
      n.start,
      n.end
    );
    for (const val of n.value) {
      console.log(
        '\t\tvalue [%s], contents [%s], range [%s - %s]',
        val.data,
        file.substring(val.start, val.end),
        val.start,
        val.end
      );
    }
  }
}
