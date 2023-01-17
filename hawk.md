## hawk

> Like `awk`, but for HTML _(sort of)_.

Find HTML elements using (simplified!) CSS selectors and programmatically apply changes to them in any way you like, which makes large changes across your entire codebase a walk in the park. And there's no need to learn some arcane DSL - it's just JavaScript.

### Usage

```
hawk [...options] command ...files
```

### Hawk command syntax

```
/selector/ ...statements
```

Where the selector is a simplified CSS selector, and the statements are JavaScript statements.

[See the matcher documentation for more information on the simplified CSS selector syntax.](/matcher.md)

### Options

| Switch | Meaning            |
| ------ | ------------------ |
| -i     | Edit file in-place |

### Real-world examples

```
# Rename `kind="gradientRed"` and `kind="gradientGreen` to simply be "primary"
hawk -i '/Button[kind={(gradientRed)|(gradientGreen)}]/ a.kind = "primary";' src/**/*.svelte 

# Rename `kind="primary-outline"` and `kind="gradient"` to "outline"
hawk -i '/Button[kind={(primary-outline)|(outline)}]/ a.kind = "outline";' src/**/*.svelte 

# Rename `kind="destructive"` to "secondary"
hawk -i '/Button[kind=destructive]/ a.kind = "secondary";' src/**/*.svelte 

# Some of our buttons were using a custom `gradient-button` class to apply the gradient, but they now should be just "primary" buttons.
# So we select those, add the "primary" kind to them, then remove the class.
hawk -i '/Button.gradient-button[kind=custom]/ a.kind = "primary"; c["gradient-button"] = false;' src/**/*.svelte

# Add special "large", "medium", "true" props to our buttons according to which size class they have.
# I ended up changing my mind and passing the size in the size prop directly, which can be seen a few commands below.
hawk -i '/Button[size=h-14]/ a.large = true; da("size");' src/**/*.svelte
hawk -i '/Button[size=h-10]/ a.medium = true; da("size");' src/**/*.svelte
hawk -i '/Button[size=h-8]/ a.small = true; da("size");' src/**/*.svelte

# We've updated the default props for the Button component to something more sensible.
# Now we can go through all usages and delete the props that no longer need to be passed (due to already being the default).
# Font size for buttons with a defined size should always come from the preset, so we can delete it.
hawk -i '/Button[textSize large]/ da("textSize");' src/**/*.svelte
hawk -i '/Button[textSize medium]/ da("textSize");' src/**/*.svelte

# Rounded is always the default, so we can delete it.
hawk -i '/Button/ da("rounded");' src/**/*.svelte

# Padding should always come from the defaults, so we can delete it.
hawk -i '/Button[padding large]/ da("padding");' src/**/*.svelte
hawk -i '/Button[padding medium]/ da("padding");' src/**/*.svelte

# Font weight should always come from the defaults, so we can delete it.
hawk -i '/Button[fontWeight large]/ da("fontWeight");' src/**/*.svelte
hawk -i '/Button[fontWeight medium]/ da("fontWeight");' src/**/*.svelte

# Convert back to size="{size}" instead of passing boolean props directly.
hawk -i '/Button[kind={(primary)|(secondary)|(outline)|(basic)} large]/ if (a.large) { a.size="large"; da("large"); }' src/**/*.svelte
hawk -i '/Button[kind={(primary)|(secondary)|(outline)|(basic)} medium]/ if (a.medium) { a.size="medium"; da("medium"); }' src/**/*.svelte
hawk -i '/Button[medium]/ a.size="medium"; da("medium");' src/**/*.svelte

# Convert linear gradient text to simple accent text.
hawk -i "/.text-transparent bg-clip-text bg-gradient-to-r from-functional-r20 to-functional-b10/ delete c['text-transparent']; delete c['bg-clip-text']; delete c['bg-gradient-to-r']; delete c['from-functional-r20']; delete c['to-functional-b10']; c['text-a-5'] = true;" src/**/*.svelte
hawk -i "/.text-transparent bg-clip-text bg-gradient-to-r from-functional-r50 to-functional-b10/ delete c['text-transparent']; delete c['bg-clip-text']; delete c['bg-gradient-to-r']; delete c['from-functional-r50']; delete c['to-functional-b10']; c['text-a-5'] = true;" src/**/*.svelte
```

### Reference

---

#### Manipulating classnames

Classnames are available on the `c` object, where each key in the map is the classname, and the value is a boolean that indicates if the class exists or not.

#### Check for classname existence

```js
c.foo; // true | false
```

#### Enable classname

```js
c.foo = true;
```

#### Disable classname

```js
c.foo = false;

// Or using `delete`
delete c.foo;
```

#### Toggle classname

```js
c.foo = !c.foo;
```

---

#### Manipulating attributes

All component attributes are available on an object named `a`.

The attributes can be read or modified either by using the object syntax, or by using the provided free-form functions.

#### Get attribute

```js
a.foo;
```

#### Set attribute

```js
a.name = 'value';

// Or using function syntax
sa('name', 'value');
```

#### Delete attributes

```js
delete a.attr1;

// Or using function syntax
da('attr1', 'attr2', ...);
```

#### Rename attribute

```js
a.newname = a.oldname;
delete a.oldname;

// Or using function syntax
ra('oldname', 'newname');
```

#### Regex in identifiers

You can use regular expressions in any identifier by surrounding them in `{}`.

```
/h-{[0-6]}/
```

#### Using matched groups

The matched attributes can be accessed on the `m` object, for each attribute.

```
/Button.width-{.+} height-{.+}/
```

In this example, `m.class[0]` would be the matched width, and `m.class[1]` would be the matched height.

---

#### Manipulating component

Some functions operate on the whole matched component, rather than at the attribute or classname level.

#### Delete component

```js
d();
```
