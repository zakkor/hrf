## Replace

```
{delim}{matcher}{delim} {
  {...commands}
}
```

```
/Button[size]/ {
    // Delete component
    d
    // Delete attribute
    da size
    // Delete attribute with no arguments = all matched attributes are passed
    da
    // Change component name
    c NewButton
    // Access matched data
    // Component name
    $c
    // Attributes
    // By position
    $a[0]
    // By name
    $a.size
    // Get name
    $a[0]

    // 
    $a[0] = $$a.0 + 1
    m.component.name = 'Ratton';
    m.attrs.size = '';
} 
```

Syntax sugar for

```
{
  d();
  da('size');
  da();
  c('NewButton');
}
```

### Example 1

Delete size attribute

```
<Button size="h-[40px]">
  Get started
</Button>
```

```
/Button[size]/ da
```

### Example 2

For "Button" components that have a size attribute, delete all attributes

```
<Button size="h-[40px]" foo="bar" bar="baz">
  Get started
</Button>
```

```
/Button[size]/ da $a
// aka
/Button[size]/ da size foo bar
```

### Example 3

For "Button" components that have a size attribute which matches the regex, transform

```
<Button size="h-[40px]">
  Get started
</Button>
```

```
/Button[size=h-\[([0-9]+)px\]]/ {
  console.log(name, 'is cool!');
}
```

