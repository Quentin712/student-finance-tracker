// Builds a regex from what the user typed
export function compileRegex(input, ignoreCase = true) {
  if (!input) return { regex: null, error: '' };
  try {
    return { regex: new RegExp(input, ignoreCase ? 'i' : ''), error: '' };
  } catch (err) {
    return { regex: null, error: err.message };
  }
}

export function matchesAny(re, texts) {
  return texts.some(function (text) { return re.test(text); });
}

// Cuts a string into pieces, marking which ones matched
export function splitMatches(text, re) {
  if (!re) return [{ text: text, match: false }];
  const flags = re.flags.indexOf('g') === -1 ? re.flags + 'g' : re.flags;
  const global = new RegExp(re.source, flags);
  const parts = [];
  let last = 0;
  let m;
  while ((m = global.exec(text)) !== null) {
    if (m[0] === '') {
      global.lastIndex++;
      continue;
    }
    if (m.index > last) parts.push({ text: text.slice(last, m.index), match: false });
    parts.push({ text: m[0], match: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), match: false });
  return parts;
}

// Puts the text into an element and wraps matches in <mark>
export function highlightInto(el, text, re) {
  el.textContent = '';
  splitMatches(text, re).forEach(function (part) {
    if (part.match) {
      const mark = document.createElement('mark');
      mark.textContent = part.text;
      el.append(mark);
    } else {
      el.append(part.text);
    }
  });
}
