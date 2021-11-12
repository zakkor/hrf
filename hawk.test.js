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
htest('create attribute, then set', {
  cmd: '/Comp/ a.new = "hello"; a.new = "world";',
  file: `<Comp foo="hello" />`,
  expect: '<Comp new="world" foo="hello" />',
});
htest('set same attribute multiple times', {
  cmd: '/Comp/ a.foo = "world"; a.foo = "z";',
  file: `<Comp baz="first" foo="hello" qux="third" />`,
  expect: '<Comp baz="first" foo="z" qux="third" />',
});
htest('create two attrs', {
  cmd: '/Button/ a.height = "h-10"; a.width = "w-10";',
  file: `<Button>Click</Button>`,
  expect: `<Button width="w-10" height="h-10">Click</Button>`,
});
htest('create attr when other attrs already exist', {
  cmd: '/Button.h-10/ a.size = "h-10";',
  file: `<Button class="h-10 w-full" padding="px-6">Click</Button>`,
  expect: `<Button size="h-10" class="h-10 w-full" padding="px-6">Click</Button>`,
});
htest('create attr when other attrs already exist then delete attr', {
  cmd: '/Button.h-10/ a.size = "h-10"; da("class")',
  file: `<Button class="h-10 w-full" padding="px-6">Click</Button>`,
  expect: `<Button size="h-10" padding="px-6">Click</Button>`,
});
htest('set attribute multiple', {
  cmd: '/Comp/ a.foo = "bar"',
  file: `<Comp foo="hello" /><Another /><Comp foo="hello" />`,
  expect: '<Comp foo="bar" /><Another /><Comp foo="bar" />',
});
htest('set attribute with empty value', {
  cmd: '/Comp/ a.foo = "world"',
  file: `<Comp foo="" />`,
  expect: '<Comp foo="world" />',
});
htest('set attribute from true value to string value', {
  cmd: "/div/ a.foo = 'bar';",
  file: `<div foo></div>`,
  expect: `<div foo="bar"></div>`,
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
htest('delete js handler attribute', {
  cmd: "/Comp/ da('onFoo');",
  file: `<Comp onFoo={event => (isFoo = event.target.foo > 0)}>
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
htest('rename attr then delete other attr', {
  cmd: "/div/ ra('foo', 'quux'); da('bar')",
  file: `<div foo="first" bar="second" zop="third"></div>`,
  expect: `<div quux="first" zop="third"></div>`,
});
htest('rename attr, set attr, then delete other attr', {
  cmd: "/div/ ra('foo', 'quux'); a.bar = 'new'; da('zop')",
  file: `<div foo="first" bar="second" zop="third"></div>`,
  expect: `<div quux="first" bar="new"></div>`,
});
htest('rename attr, create attr, then delete last attr', {
  cmd: "/div/ ra('foo', 'quux'); a.bar = 'new'; da('zop')",
  file: `<div foo="first" zop="third"></div>`,
  expect: `<div bar="new" quux="first"></div>`,
});
htest('rename attr, create attr, then delete first attr', {
  cmd: "/div/ ra('foo', 'quux'); a.bar = 'new'; da('height')",
  file: `<div height="h-64" foo="first"></div>`,
  expect: `<div bar="new" quux="first"></div>`,
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
htest('delete classname multiple', {
  cmd: '/Comp/ delete c.first',
  file: `<Comp class="first second third" /><Another /><Comp class="second third first" />`,
  expect: `<Comp class="second third" /><Another /><Comp class="second third" />`,
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

htest('rename node', {
  cmd: "/Comp/ r('NewName')",
  file: `<Comp foo="hello">Hello world</Comp>`,
  expect: `<NewName foo="hello">Hello world</NewName>`,
});
htest('rename node with newline', {
  cmd: "/Comp/ r('NewName')",
  file: `<Comp
  class="foo">
</Comp>`,
  expect: `<NewName
  class="foo">
</NewName>`,
});
htest('rename node check shift', {
  cmd: "/Comp/ r('NewName'); a.new = 'world'; da('attr');",
  file: `<Comp class="foo" attr="bar">Hello world</Comp>`,
  expect: `<NewName new="world" class="foo">Hello world</NewName>`,
});
htest('rename node, but not the node after it', {
  cmd: "/Comp/ r('NewName')",
  file: `<Comp foo="hello">
  Hello world
</Comp>
<NotComp foo="hello"></NotComp>`,
  expect: `<NewName foo="hello">
  Hello world
</NewName>
<NotComp foo="hello"></NotComp>`,
});
htest('rename node, but not the node before it', {
  cmd: "/Comp/ r('NewName')",
  file: `<NotComp foo="hello"></NotComp>
<Comp foo="hello">
  Hello world
</Comp>`,
  expect: `<NotComp foo="hello"></NotComp>
<NewName foo="hello">
  Hello world
</NewName>`,
});
htest('rename multiple nodes', {
  cmd: "/Comp/ r('NewName')",
  file: `<Comp first>Hello world</Comp>
<Comp second>Hello world</Comp>
<Comp third>Hello world</Comp>`,
  expect: `<NewName first>Hello world</NewName>
<NewName second>Hello world</NewName>
<NewName third>Hello world</NewName>`,
});
htest('rename multiple nodes interspersed with nodes not to be renamed', {
  cmd: "/Comp/ r('NewName')",
  file: `<Comp first>Hello world</Comp>
<NotComp></NotComp>
<Comp second>Hello world</Comp>
<NotComp></NotComp>
<Comp third>Hello world</Comp>`,
  expect: `<NewName first>Hello world</NewName>
<NotComp></NotComp>
<NewName second>Hello world</NewName>
<NotComp></NotComp>
<NewName third>Hello world</NewName>`,
});

htest('rename node self-closing', {
  cmd: "/Comp/ r('NewName')",
  file: `<Comp foo="hello" />`,
  expect: `<NewName foo="hello" />`,
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

// More random test cases that I can't bother to simplify down to basic usages
htest('real 1', {
  cmd: "/div/ ra('onScroll', 'on:scroll'); a.class = 'overflow-y-auto'; a.class = 'foo'; da('height')",
  file: `<div height="max-h-64" onScroll={event => (isScrolling = event.target.scrollTop > 0)}></div>`,
  expect: `<div class="foo" on:scroll={event => (isScrolling = event.target.scrollTop > 0)}></div>`,
});
htest('real 2', {
  cmd: "/div/ ra('onScroll', 'on:scroll'); a.class = 'overflow-y-auto'; da('height')",
  file: `<div height="max-h-64" onScroll={event => (isScrolling = event.target.scrollTop > 0)}></div>`,
  expect: `<div class="overflow-y-auto" on:scroll={event => (isScrolling = event.target.scrollTop > 0)}></div>`,
});
htest('real 3', {
  cmd: "/div/ ra('onScroll', 'on:scroll'); a.class = 'overflow-y-auto';",
  file: `<div height="max-h-64" onScroll={event => (isScrolling = event.target.scrollTop > 0)}></div>`,
  expect: `<div class="overflow-y-auto" height="max-h-64" on:scroll={event => (isScrolling = event.target.scrollTop > 0)}></div>`,
});

test.run();
