import { asyncWalk } from 'estree-walker';

/**
 * @typedef {{
 *  type: 'InlineComponent' | 'Element',
 *  name: string,
 *  attributes: { name: string, operator: () => boolean, value: string }[],
 * }} Matcher
 * @param {string} s
 * @returns {Matcher}
 */
export function parseMatcher(s) {
  const tokens = tokenize(s);
  const r = {};

  let skip = 0;
  const firstToken = tokens[0];
  if (firstToken.t === 'IDENT') {
    r.type = firstToken.repr >= 'A' && firstToken.repr <= 'Z' ? 'InlineComponent' : 'Element';
    r.name = firstToken.repr;
    skip++;
  }

  let gatherAttrs = false;
  const attrs = [];
  let attr = {};
  const push = () => {
    attrs.push(attr);
    attr = {};
  };
  const rollback = operator => {
    attr.value = attr.value.split(' ');
    const name = attr.value.pop();
    attr.value = attr.value.join(' ');
    push();
    attr = {
      name,
      operator,
    };
  };

  for (let i = skip; i < tokens.length; i++) {
    const tok = tokens[i];

    if (tok.t === 'LBRACE') {
      if (gatherAttrs) {
        push();
      }
      gatherAttrs = true;
      continue;
    } else if (tok.t === 'DOT') {
      gatherAttrs = true;
      if (attr.name === 'class' || attrs.find(a => a.name === 'class')) {
        attr.value += tok.repr;
      } else {
        attr.name = 'class';
        attr.operator = includes;
      }
      continue;
    } else if (tok.t === 'ID') {
      gatherAttrs = true;
      attr.name = 'id';
      attr.operator = exact;
      continue;
    }

    if (!gatherAttrs) {
      if (tok.t === 'RBRACE') {
        throw new Error('attempted to close attribute list that was not open');
      }
      continue;
    }

    if (tok.t === 'IDENT') {
      if (!attr.name) {
        attr.name = tok.repr;
      } else if (!attr.value) {
        attr.value = tok.repr;
      } else {
        attr.value += tok.repr;
      }
    } else if (tok.t === 'EQ') {
      if (attr.value) {
        rollback(exact);
      } else {
        attr.operator = exact;
      }
    } else if (tok.t === 'INCL') {
      if (attr.value) {
        rollback(includes);
      } else {
        attr.operator = includes;
      }
    } else if (tok.t === 'COMMA') {
      if (attr.name && !attr.operator) {
        attr.operator = exists;
      }
      push();
    } else if (tok.t === 'SPACE') {
      if (attr.name) {
        if (!attr.operator) {
          attr.operator = exists;
          push();
          continue;
        }
        attr.value += tok.repr;
      }
    } else if (tok.t === 'RBRACE') {
      gatherAttrs = false;
      if (!attr.operator) {
        attr.operator = exists;
      }
      push();
    }
  }

  // Push final attribute
  if (attr.name) {
    push();
  }

  r.attributes = attrs;
  return r;
}

function exists(name, _, attrs = []) {
  const test = matchRegex(name);
  for (const attr of attrs) {
    const res = test(attr.name);
    if (res.matched) {
      return res;
    }
  }
  return { matched: false, groups: [] };
}

function exact(name, value, attrs = []) {
  // TODO: Name should support regex too
  const attr = attrs.find(a => a.name === name);
  if (!attr) return false;
  const data = typeof attr.value === 'object' && attr.value.length > 0 ? attr.value[0].data : attr.value;
  if (!data) return false;
  return matchRegex(value, true)(data);
}

function includes(name, value, attrs = []) {
  // TODO: Name should support regex too
  const attr = attrs.find(a => a.name === name);
  if (!attr) return false;
  const data = typeof attr.value === 'object' && attr.value.length > 0 ? attr.value[0].data : attr.value;
  if (!data) return false;

  let groups = [];
  const matched = value.split(' ').every(v => {
    const test = matchRegex(v);
    return data.split(' ').find(nv => {
      return test(nv, groups).matched;
    });
  });
  return { matched, groups };
}

function matchRegex(s, exact = false) {
  const search = splitRegexes(s)
    .map(p => {
      if (p.kind === 'plain') {
        return escapeRegex(p.data);
      }
      return p.data;
    })
    .join('');
  const re = new RegExp(exact ? `^${search}$` : search);

  return function (s, groups = []) {
    const matched = re.test(s);
    if (matched) {
      groups.push(s);
    }
    return { matched, groups };
  };
}

function splitRegexes(s) {
  let parts = [];
  let buf = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '{') {
      parts.push({ kind: 'plain', data: buf });
      buf = '';
    } else if (s[i] === '}') {
      parts.push({ kind: 'regex', data: buf });
      buf = '';
    } else {
      buf += s[i];
    }
  }
  return [...parts, { kind: 'plain', data: buf }];
}

function escapeRegex(s) {
  return s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

const lookupTokens = {
  ' ': 'SPACE',
  ',': 'COMMA',
  '=': 'EQ',
  '~=': 'INCL',
  '[': 'LBRACE',
  ']': 'RBRACE',
  '#': 'ID',
  '.': 'DOT',
};

/**
 * @typedef {'IDENT' | 'SPACE' | 'COMMA' | 'EQ' | 'INCL' | 'LBRACE' | 'RBRACE' | 'ID' | 'DOT'} Token
 * @param {string} s
 * @returns {{ t: Token, repr: string }[]}
 */
export function tokenize(s) {
  const tokens = [];

  const lookupToken = repr => {
    const t = lookupTokens[repr];
    if (t) {
      tokens.push({ t, repr });
      return true;
    }
    return false;
  };

  let ident = '';
  for (let i = 0; i < s.length; i++) {
    // Identifier
    let regex = s[i] === '{';
    while (isAllowedIdent(s[i]) || regex) {
      if (regex && s[i] === '}') {
        regex = false;
      }
      ident += s[i++];
      if (!regex) {
        regex = s[i] === '{';
      }
    }
    if (ident.length > 0) {
      tokens.push({ t: 'IDENT', repr: ident });
      ident = '';
    }
    // First look-up 2-character tokens
    if (i + 1 < s.length && lookupToken(s[i] + s[i + 1])) {
      i++;
      continue;
    }
    // Then look-up single-character tokens
    if (lookupToken(s[i])) continue;
  }
  return tokens;
}

function isAllowedIdent(c) {
  return (
    (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || ['\\', '-', '_', '/'].includes(c)
  );
}

/**
 * @param {import('svelte/types/compiler/interfaces').Ast} ast
 * @param {Matcher} matcher
 * @param {Function} fn
 * @returns {Promise<{ file: string, output: string }>}
 */
export async function match(ast, matcher, fn) {
  let file = '';
  let allOutput = '';
  await asyncWalk(ast, {
    enter(node) {
      if (
        matcher.type !== undefined &&
        matcher.name !== undefined &&
        (node.type !== matcher.type || node.name !== matcher.name)
      ) {
        return;
      }
      let allGroups = {};
      if (matcher.attributes.length > 0) {
        const attrsMatch = matcher.attributes.every(({ name, operator, value }) => {
          const { matched, groups } = operator(name, value, node.attributes);
          if (matched) {
            allGroups[name] = groups;
          }
          return matched;
        });
        if (!attrsMatch) {
          return;
        }
      }
      const res = fn(node, allGroups);
      if (!res) {
        return;
      }
      if (typeof res === 'object') {
        const { file: newfile, output } = res;
        if (newfile !== null && newfile !== undefined) {
          file = newfile;
        }
        allOutput += output;
      } else if (typeof res === 'string') {
        file = res;
      }
    },
  });
  return { file, output: allOutput };
}
