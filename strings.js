export function nthIndexOf(str, pat, n) {
  const len = str.length;
  let i = -1;
  while (n-- && i++ < len) {
    i = str.indexOf(pat, i);
    if (i < 0) {
      break;
    }
  }
  return i;
}
