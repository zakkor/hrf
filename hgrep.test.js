import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { hgrepData } from './hgrep.js';

function htest(name, { matcher, file, expect }) {
  test(name, async () => {
    const { file: actual } = await hgrepData(matcher, file);
    if (expect === undefined) {
      expect = file;
    }
    assert.equal(actual, expect);
  });
}

htest('element', {
  file: '<div>hello world</div>',
  matcher: 'div',
});
htest('element with class', {
  file: '<div class="foo">hello world</div>',
  matcher: 'div.foo',
});
htest('only class', {
  file: '<div class="foo">hello world</div>',
  matcher: '.foo',
});
htest('only attributes', {
  file: '<div class="foo">hello world</div>',
  matcher: '[class=foo]',
});
htest('element with true attribute', {
  file: '<div boolean>hello world</div>',
  matcher: 'div[boolean]',
});
htest('true attribute', {
  file: '<div boolean>hello world</div>',
  matcher: '[boolean]',
});
htest('true attribute by value', {
  file: '<div boolean>hello world</div>',
  matcher: '[boolean=true]',
});
htest('element with true attribute by value', {
  file: '<div boolean>hello world</div>',
  matcher: 'div[boolean=true]',
});

test.run();
