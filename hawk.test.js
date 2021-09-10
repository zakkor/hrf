import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { hawkData } from './hawk.js';

function htest(name, { cmd, file, expect, expectOutput = null }) {
  test(name, async () => {
    const { file: result, output } = await hawkData(cmd, file);
    if (expect != null) {
      assert.equal(result, expect);
    }
    if (expectOutput != null) {
      assert.equal(output, expectOutput);
    }
  });
}

htest('output is separate from result', {
  cmd: '/Comp/ log(a.foo); d();',
  file: `<Comp foo="hello" bar="world">Hello world</Comp>`,
  expect: ``,
  expectOutput: 'hello\n',
});
htest('can chain commands', {
  cmd: '/Comp/ da("foo"); da("qux");',
  file: `<Comp foo bar qux>Hello world</Comp>`,
  expect: `<Comp bar>Hello world</Comp>`,
});
htest('script template style', {
  cmd: '/Comp/ d',
  file: `<script>export let foo;</script> <Comp foo bar qux>Hello world</Comp> <Another bar /> <Comp /> <style>a { pointer-events: none }</style>`,
  expect: `<script>export let foo;</script> <Another bar /> <style>a { pointer-events: none }</style>`,
});
htest('script style template', {
  cmd: '/Comp/ d',
  file: `<script context="module">let module;</script><script>export let foo;</script> <style>a { pointer-events: none }</style> <Comp /> <Another bar />`,
  expect: `<script context="module">let module;</script><script>export let foo;</script> <style>a { pointer-events: none }</style> <Another bar />`,
});

htest('read attributes', {
  cmd: '/Comp/ log(a.foo, a.bar)',
  file: `<Comp foo="hello" bar="world">Hello world</Comp>`,
  expectOutput: 'hello world\n',
});
htest('set attributes through proxy', {
  cmd: '/Comp/ a.foo += " world"',
  file: `<Comp foo="hello" />`,
  expect: '<Comp foo="hello world" />',
});
htest('set attribute with empty value', {
  cmd: '/Comp/ a.foo = "world"',
  file: `<Comp foo="" />`,
  expect: '<Comp foo="world" />',
});
htest('create attribute', {
  cmd: '/Comp/ a.foo = "hello"',
  file: `<Comp />`,
  expect: '<Comp foo="hello" />',
});
htest('create attribute with nodes before and after', {
  cmd: '/Comp/ a.foo = "hello"; a.baz = "another"',
  file: `<Before /> <Comp bar="world" /> <After />`,
  expect: '<Before /> <Comp baz="another" foo="hello" bar="world" /> <After />',
});
htest('create attribute shifts AST correctly', {
  cmd: '/Comp/ a.foo = "hello"; a.baz = "another"; d();',
  file: `<Before /> <Comp bar="world" /> <After />`,
  expect: '<Before /> <After />',
});
htest('delete attributes through proxy', {
  cmd: '/Comp/ delete a.foo',
  file: `<Comp foo="hello" />`,
  expect: '<Comp />',
});
htest('delete one attribute', {
  cmd: "/Comp/ da('foo');",
  file: `<Comp foo="hello">
  Hello world
</Comp>`,
  expect: `<Comp>
  Hello world
</Comp>`,
});
htest('delete multiple attributes', {
  cmd: "/Comp/ da('foo', 'bar');",
  file: `<Comp foo="hello" bar="world">
  Hello world
</Comp>`,
  expect: `<Comp>
  Hello world
</Comp>`,
});
htest('rename attribute', {
  cmd: "/Comp/ ra('foo', 'bar');",
  file: `<Comp foo="hello" />`,
  expect: `<Comp bar="hello" />`,
});
htest('rename attribute with nodes before and after', {
  cmd: "/Comp/ ra('foo', 'bar');",
  file: `<Another foo="hello" /> <Comp foo="hello" /> <Another foo="hello" />`,
  expect: `<Another foo="hello" /> <Comp bar="hello" /> <Another foo="hello" />`,
});

htest('read class string', {
  cmd: '/Comp/ log(a.class)',
  file: `<Comp class="foo bar" />`,
  expect: `<Comp class="foo bar" />`,
  expectOutput: 'foo bar\n',
});

htest('read class map empty', {
  cmd: '/Comp/ log(c)',
  file: `<Comp class />`,
  expect: `<Comp class />`,
  expectOutput: '{}\n',
});
htest('read class map', {
  cmd: '/Comp/ log(c)',
  file: `<Comp class="first second third" />`,
  expect: `<Comp class="first second third" />`,
  expectOutput: '{ first: true, second: true, third: true }\n',
});
htest('check for classname existence', {
  cmd: '/Comp/ log(c.second)',
  file: `<Comp class="first second third" />`,
  expect: `<Comp class="first second third" />`,
  expectOutput: 'true\n',
});
htest('add classname', {
  cmd: '/Comp/ c.fourth = true; log(c.fourth)',
  file: `<Comp class="first second third" />`,
  expect: `<Comp class="first second third fourth" />`,
  expectOutput: 'true\n',
});
htest('delete classname by setting to false', {
  cmd: '/Comp/ c.first = false; log(c.first)',
  file: `<Comp class="first second third" />`,
  expect: `<Comp class="second third" />`,
  expectOutput: 'false\n',
});
htest('delete classname', {
  cmd: '/Comp/ delete c.first; log(c.first)',
  file: `<Comp class="first second third" />`,
  expect: `<Comp class="second third" />`,
  expectOutput: 'false\n',
});
// TODO: Is there any point in having the class list?
htest('read class list empty', {
  cmd: '/Comp/ log(cl)',
  file: `<Comp class bar="world">Hello world</Comp>`,
  expectOutput: "[ 'true' ]\n",
});
htest('read class list', {
  cmd: '/Comp/ log(cl)',
  file: `<Comp class="first second third" bar="world">Hello world</Comp>`,
  expectOutput: "[ 'first', 'second', 'third' ]\n",
});
htest('read class list element', {
  cmd: '/Comp/ log(cl[0])',
  file: `<Comp class="first second third" bar="world">Hello world</Comp>`,
  expectOutput: 'first\n',
});

htest('delete node', {
  cmd: '/Comp/ d',
  file: `<Comp foo="hello">Hello world</Comp>`,
  expect: ``,
});
htest('delete node, but not the node after it', {
  cmd: '/Comp/ d',
  file: `<Comp foo="hello">
  Hello world
</Comp>
<NotComp foo="hello"></NotComp>`,
  expect: `<NotComp foo="hello"></NotComp>`,
});
htest('delete node, but not the node before it', {
  cmd: '/Comp/ d',
  file: `<NotComp foo="hello"></NotComp>
<Comp foo="hello">
  Hello world
</Comp>`,
  expect: `<NotComp foo="hello"></NotComp>`,
});
htest('delete multiple nodes', {
  cmd: '/Comp/ d',
  file: `<Comp first>Hello world</Comp>
<Comp second>Hello world</Comp>
<Comp third>Hello world</Comp>`,
  expect: ``,
});
htest('delete multiple nodes interspersed with nodes not to be deleted', {
  cmd: '/Comp/ d',
  file: `<Comp first>Hello world</Comp>
<NotComp></NotComp>
<Comp second>Hello world</Comp>
<NotComp></NotComp>
<Comp third>Hello world</Comp>`,
  expect: `<NotComp></NotComp>
<NotComp></NotComp>`,
});

htest('no match returns the same file', {
  cmd: '/Comp.nope/ d',
  file: `<Comp class="foo" />`,
  expect: `<Comp class="foo" />`,
});

htest('regex simple', {
  cmd: '/Comp.{[a-z][a-z][a-z]}/ d',
  file: `<Comp class="abc" />`,
  expect: ``,
});
htest('regex in class', {
  cmd: '/Comp.w-{[0-9]}/ d',
  file: `<Comp class="w-a" /><Comp class="w-0" /><Comp class="w-bc" /><Comp class="w-3" /><Comp class="w-23" />`,
  expect: `<Comp class="w-a" /><Comp class="w-bc" /><Comp class="w-23" />`,
});
htest('regex in attribute exact', {
  cmd: '/Comp[class=w-{[0-9]}]/ d',
  file: `<Comp class="w-a" /><Comp class="w-0" /><Comp class="w-bc" /><Comp class="w-3 not exact" /><Comp class="w-23" />`,
  expect: `<Comp class="w-a" /><Comp class="w-bc" /><Comp class="w-3 not exact" /><Comp class="w-23" />`,
});
htest('regex matched group', {
  cmd: '/Button.h-{[0-9]+}/ a.size = m.class[0]; c[m.class[0]] = false',
  file: `<Button class="h-10 w-full" padding="px-6">Click</Button>`,
  expect: `<Button size="h-10" class="w-full" padding="px-6">Click</Button>`,
});

test.run();
