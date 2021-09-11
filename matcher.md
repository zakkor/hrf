## Simplified CSS selectors

> Just plain old CSS selectors, but made super easy to type.

No need for double quotes in attribute lists, inserting dots before each classname, or other pesky stuff.

### Class lists don't need a space before each class

Instead of:

```
Button.this.is.a.long.classname
```

Just do:

```
Button.this is a long classname
```

### Attribute values do not need to be double quoted

Instead of:

```
Button[attr="value"]
```

Just do:

```
Button[attr=value]
```

It works even if the value has spaces in it:

```
Button[attr=this is a long value] // Still works
```

Or if there are multiple attributes with spaces in them:

```
Button[attr=this is a long value, anotherattr=this is another long value]
```

### Comma is optional

The comma to separate different attributes is optional:

```
Button[attr=this is a long value anotherattr=this is another long value]
```

But if you wish to have an attribute without a value immediately after, the comma becomes mandatory:

```
Button[attr=this is a long value, anotherattr]
```

### Currently supported operators

https://developer.mozilla.org/en-US/docs/Web/CSS/Attribute_selectors#syntax

- `=` (exact equals)
- `~=` (includes)
- Others will be added in the near future
