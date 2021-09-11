## hgrep

`hgrep` is like `grep`, but for HTML. Search through a multitude of files using (simplified!) CSS selectors.

[See the matcher documentation for more information on the simplified CSS selector syntax.](/matcher.md)

### Command syntax

```
hgrep [...options] selector ...files
```

### Options

| Switch       | Meaning                                         |
| ------------ | ----------------------------------------------- |
| -v (verbose) | Print more information about the current search |
| -n           | Show line numbers in output                     |
| -H           | Show file name in output                        |
| -A           | How many lines after the result should be shown |
