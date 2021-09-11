## hawk

> `hgrep` is like `grep`, but for HTML.

Search through a multitude of files using (simplified!) CSS selectors.

### Usage

```
hawk [...options] command ...files
```

### Hawk command syntax

```
/selector/ ...commands
```

[See the matcher documentation for more information on the simplified CSS selector syntax.](/matcher.md)

### Options

| Switch | Meaning            |
| ------ | ------------------ |
| -i     | Edit file in-place |

### Examples

#### Scenario 1:

Add a scenario here!

#### Scenario 2:

Add a scenario here!

#### Scenario 3:

Add a scenario here!

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
