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

function exists(name, _, attrs) {
  return attrs.some(a => a.name === name);
}

function exact(name, value, attrs) {
  const attr = attrs.find(a => a.name === name);
  if (!attr) return false;
  const data = attr.value[0].data;
  if (!data) return false;
  return value === data;
}

function includes(name, value, attrs) {
  const attr = attrs.find(a => a.name === name);
  if (!attr) return false;
  const data = attr.value[0].data;
  if (!data) return false;
  return value.split(' ').every(v => data.split(' ').find(nv => nv === v));
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
    while (isAllowedIdent(s[i])) {
      // Escape next character
      if (s[i] === '\\') {
        ident += s[++i];
      } else {
        ident += s[i];
      }
      i++;
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
  return (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || ['\\', '-', '_'].includes(c);
}

/**
 * @param {import('svelte/types/compiler/interfaces').Ast} ast
 * @param {Matcher} matcher
 * @param {Function} fn
 * @returns {Promise<string>}
 */
export async function match(ast, matcher, fn) {
  let file;
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
      if (matcher.attributes.length > 0) {
        const attrsMatch = matcher.attributes.every(({ name, operator, value }) =>
          operator(name, value, node.attributes)
        );
        if (!attrsMatch) {
          return;
        }
      }
      const res = fn(node);
      if (!res) {
        return;
      }
      const { file: newfile, output } = res;
      if (newfile !== null && newfile !== undefined) {
        file = newfile;
      }
      allOutput += output;
    },
  });
  return { file, output: allOutput };
}
