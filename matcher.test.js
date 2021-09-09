import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { parseMatcher as m, tokenize } from './matcher.js';

function testattr(name, c, expected) {
  test(name, () => {
    const mt = m(c);
    for (let i = 0; i < expected.length; i++) {
      const actual = mt.attributes[i];
      const exp = expected[i];
      assert.equal(actual.name, exp.name);
      assert.equal(actual.operator.name, exp.operator);
      assert.equal(actual.value, exp.value);
    }
  });
}

function testtokenize(name, s, expected) {
  test(name, () => {
    const actual = tokenize(s);
    assert.equal(actual, expected);
  });
}

testtokenize('tokenize identifier', 'el', [{ t: 'IDENT', repr: 'el' }]);
// prettier-ignore
testtokenize('escaped characters', 'el-\\.\\:', [
    { t: 'IDENT', repr: `el-.:` },
  ]);
testtokenize('element and classname', 'el.foo', [
  { t: 'IDENT', repr: 'el' },
  { t: 'DOT', repr: '.' },
  { t: 'IDENT', repr: 'foo' },
]);
testtokenize('element with attributes list', 'el[]', [
  { t: 'IDENT', repr: 'el' },
  { t: 'LBRACE', repr: '[' },
  { t: 'RBRACE', repr: ']' },
]);
testtokenize('element with empty attributes', 'el[foo bar baz]', [
  { t: 'IDENT', repr: 'el' },
  { t: 'LBRACE', repr: '[' },
  { t: 'IDENT', repr: 'foo' },
  { t: 'SPACE', repr: ' ' },
  { t: 'IDENT', repr: 'bar' },
  { t: 'SPACE', repr: ' ' },
  { t: 'IDENT', repr: 'baz' },
  { t: 'RBRACE', repr: ']' },
]);
testtokenize('element with empty attributes separated by comma', 'el[foo, bar, baz]', [
  { t: 'IDENT', repr: 'el' },
  { t: 'LBRACE', repr: '[' },
  { t: 'IDENT', repr: 'foo' },
  { t: 'COMMA', repr: ',' },
  { t: 'SPACE', repr: ' ' },
  { t: 'IDENT', repr: 'bar' },
  { t: 'COMMA', repr: ',' },
  { t: 'SPACE', repr: ' ' },
  { t: 'IDENT', repr: 'baz' },
  { t: 'RBRACE', repr: ']' },
]);
testtokenize(
  'element with classlist and attributes list, with different operators',
  'el.first second[foo=a b bar~=c d]',
  [
    { t: 'IDENT', repr: 'el' },
    { t: 'DOT', repr: '.' },
    { t: 'IDENT', repr: 'first' },
    { t: 'SPACE', repr: ' ' },
    { t: 'IDENT', repr: 'second' },
    { t: 'LBRACE', repr: '[' },
    { t: 'IDENT', repr: 'foo' },
    { t: 'EQ', repr: '=' },
    { t: 'IDENT', repr: 'a' },
    { t: 'SPACE', repr: ' ' },
    { t: 'IDENT', repr: 'b' },
    { t: 'SPACE', repr: ' ' },
    { t: 'IDENT', repr: 'bar' },
    { t: 'INCL', repr: '~=' },
    { t: 'IDENT', repr: 'c' },
    { t: 'SPACE', repr: ' ' },
    { t: 'IDENT', repr: 'd' },
    { t: 'RBRACE', repr: ']' },
  ]
);

test('element', () => {
  const mt = m('element');
  assert.equal(mt.name, 'element');
  assert.equal(mt.type, 'Element');
  assert.equal(mt.attributes, []);
});
test('component', () => {
  const mt = m('Component');
  assert.equal(mt.name, 'Component');
  assert.equal(mt.type, 'InlineComponent');
  assert.equal(mt.attributes, []);
});
testattr('No attributes', 'el', []);
testattr('No attributes, empty attribute selector', 'el[]', []);
// prettier-ignore
testattr('Single attribute with no value', 'el[foo]', [
  { name: 'foo', operator: 'exists' },
]);
testattr('Multiple attributes with no value', 'el[foo bar]', [
  { name: 'foo', operator: 'exists' },
  { name: 'bar', operator: 'exists' },
]);
testattr('Multiple attributes with no value, comma separated', 'el[foo, bar, baz]', [
  { name: 'foo', operator: 'exists' },
  { name: 'bar', operator: 'exists' },
  { name: 'baz', operator: 'exists' },
]);

testattr('Attribute with exact value without any spaces', 'el[foo=a]', [
  { name: 'foo', operator: 'exact', value: 'a' },
]);
testattr('Attribute with exact value without any spaces followed by attribute without value', 'el[foo=a, bar]', [
  { name: 'foo', operator: 'exact', value: 'a' },
  { name: 'bar', operator: 'exists' },
]);
testattr('Attribute without value followed by attribute with exact value without any spaces', 'el[bar, foo=a]', [
  { name: 'bar', operator: 'exists' },
  { name: 'foo', operator: 'exact', value: 'a' },
]);
// prettier-ignore
testattr('Attribute with exact values', 'el[foo=a b c d]', [
  { name: 'foo', operator: 'exact', value: 'a b c d' },
]);
testattr('Multiple attributes with exact values without any spaces', 'el[foo=a bar=b]', [
  { name: 'foo', operator: 'exact', value: 'a' },
  { name: 'bar', operator: 'exact', value: 'b' },
]);
testattr('Multiple attributes with exact values containing spaces', 'el[foo=a b c d bar=e f g h]', [
  { name: 'foo', operator: 'exact', value: 'a b c d' },
  { name: 'bar', operator: 'exact', value: 'e f g h' },
]);
testattr('Attribute with exact value containing spaces followed by attribute without value', 'el[foo=a b c d, bar]', [
  { name: 'foo', operator: 'exact', value: 'a b c d' },
  { name: 'bar', operator: 'exists' },
]);

// prettier-ignore
testattr('Attribute with value without any spaces', 'el[foo~=a]', [
  { name: 'foo', operator: 'includes', value: 'a' },
]);
testattr('Attribute with value without any spaces followed by attribute without value', 'el[foo~=a, bar]', [
  { name: 'foo', operator: 'includes', value: 'a' },
  { name: 'bar', operator: 'exists' },
]);
testattr('Attribute without value followed by attribute with value without any spaces', 'el[bar, foo~=a]', [
  { name: 'bar', operator: 'exists' },
  { name: 'foo', operator: 'includes', value: 'a' },
]);
// prettier-ignore
testattr('Attribute with value containing spaces', 'el[foo~=a b c d]', [
  { name: 'foo', operator: 'includes', value: 'a b c d' },
]);
testattr('Multiple attributes with values without any spaces', 'el[foo~=a bar~=b]', [
  { name: 'foo', operator: 'includes', value: 'a' },
  { name: 'bar', operator: 'includes', value: 'b' },
]);
testattr('Multiple attributes with values containing spaces', 'el[foo~=a b c d bar~=e f g h]', [
  { name: 'foo', operator: 'includes', value: 'a b c d' },
  { name: 'bar', operator: 'includes', value: 'e f g h' },
]);
testattr('Attribute with value containing spaces followed by attribute without value', 'el[foo~=a b c d, bar]', [
  { name: 'foo', operator: 'includes', value: 'a b c d' },
  { name: 'bar', operator: 'exists' },
]);

// prettier-ignore
testattr('Class shorthand', 'el.foo', [
  { name: 'class', operator: 'includes', value: 'foo' },
]);
// prettier-ignore
testattr('Class shorthand with value containing spaces', 'el.foo bar baz', [
  { name: 'class', operator: 'includes', value: 'foo bar baz' },
]);
// prettier-ignore
testattr('Class shorthand with value containing a dot', 'el.foo bar mt-1.5', [
  { name: 'class', operator: 'includes', value: 'foo bar mt-1.5' },
]);
testattr('Class shorthand and attribute selector', 'el.foo bar baz[qux=boz]', [
  { name: 'class', operator: 'includes', value: 'foo bar baz' },
  { name: 'qux', operator: 'exact', value: 'boz' },
]);
// prettier-ignore
testattr('ID shorthand', 'el#foo', [
  { name: 'id', operator: 'exact', value: 'foo' },
]);
testattr('ID shorthand and attribute selector', 'el#foo[qux=boz]', [
  { name: 'id', operator: 'exact', value: 'foo' },
  { name: 'qux', operator: 'exact', value: 'boz' },
]);
test.run();
