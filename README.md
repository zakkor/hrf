## hrf

`hrf` is a collection of refactoring and code discovery tools designed for use with HTML and HTML-like languages, with a twist of Unix philosophy.

## hgrep

> Like `grep`, but for HTML.

Search through a multitude of files using (simplified!) CSS selectors.

[See the documentation page for `hgrep`.](/hgrep.md)

## hawk

> Like `awk`, but for HTML _(sort of)_.

Find HTML elements using (simplified!) CSS selectors and programmatically apply changes to them in any way you like, which makes large changes across your entire codebase a walk in the park. And there's no need to learn some arcane DSL - it's just JavaScript.

[See the documentation page for `hawk`.](/hawk.md)

### Simplified CSS selectors

Just plain old CSS selectors, but made super easy to type. No need for double quotes in attribute lists, inserting dots before each classname, or other pesky stuff.

[See the documentation page for simplified CSS selectors.](/matcher.md)

#### Language support

- [x] Plain HTML - yes
- [x] Svelte - yes
- [ ] JSX - no (but planned)
- [ ] Vue - no (but planned)
- [ ] Others - maybe! Please open an issue if you'd like support for your language.
