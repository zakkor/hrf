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

export function findFirstIndex(str, pat, start = 0, stop = false) {
  if (typeof pat !== 'object') {
    pat = [pat];
  }
  for (let i = start; i < str.length; i++) {
    if (stop && str.substr(i, Math.min(stop.length, str.length)) === stop) {
      return;
    }
    for (let p of pat) {
      if (str.substr(i, Math.min(p.length, str.length)) === p) {
        return i;
      }
    }
  }
}

export function findFirstIndexReverse(str, pat, start = 0, stop = false) {
  for (let i = start; i >= 0; i--) {
    if (stop && str.substr(Math.max(i - stop.length, 0), stop.length) === stop) {
      return;
    }
    if (str.substr(Math.max(i - pat.length, 0), pat.length) === pat) {
      return i - pat.length;
    }
  }
}
