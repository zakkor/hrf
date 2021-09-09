# Simplified CSS selectors

# Attributes

## No attributes

`el`

`el[]`

## Single attribute with no value

`el[foo]`

## Multiple attributes with no value

`el[foo bar]`

## Attribute with value without any spaces

Simple form:

`el[foo=a]`

Quoted:

`el[foo="a"]`

## Attribute with value without any spaces followed by attribute without value

Simple form:

`el[foo=a, bar]`

Quoted:

`el[foo="a" bar]`

## Attribute with value containing spaces

Simple form:

`el[foo=a b c d]`

Quoted:

`el[foo="a b c d"]`

## Multiple attributes with values without any spaces

Simple form:

`el[foo=a bar=b]`

Quoted:

`el[foo="a" bar="b"]`

## Multiple attributes with values containing spaces

Simple form:

`el[foo=a b c d bar=e f g h]`

Quoted:

`el[foo="a b c d" bar="e f g h"]`

## Attribute with value containing spaces followed by attribute without value

Unquoted values should have a trailing comma to signify the value list ending:

`el[foo=a b c d, bar baz]`

Quoted values do not need a trailing comma:

`el[foo="a b c d" bar baz]`

## Class attribute has special "." shorthand

Value without spaces:

`el.foo // Equivalent to el[class=foo]`

With value containing spaces:

`el.foo bar baz // Equivalent to el[class=foo bar baz]`

Class terminator (for when there are multiple elements in the same command):

`firstEl.foo bar baz. secondEl`

## ID attribute has special "#" shorthand

`el#id`