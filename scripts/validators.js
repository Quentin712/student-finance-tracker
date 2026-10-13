export const patterns = {
  // no space at the start or end
  description: /^\S(?:.*\S)?$/,
  // whole number or up to 2 decimals, no leading zeros
  amount: /^(0|[1-9]\d*)(\.\d{1,2})?$/,
  // YYYY-MM-DD
  date: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
  // letters, with single spaces or hyphens between words
  category: /^[A-Za-z]+(?:[ -][A-Za-z]+)*$/,
  // advanced: back-reference finds a repeated word like "for for"
  duplicateWord: /\b(\w+)\s+\1\b/i,
  // advanced: lookahead refuses 0 and 0.00 so a rate is always above zero
  rate: /^(?!0+(?:\.0+)?$)\d+(?:\.\d{1,4})?$/
};

export function collapseSpaces(text) {
  return text.replace(/\s{2,}/g, ' ');
}

export function hasDuplicateWord(text) {
  return patterns.duplicateWord.test(text);
}

export function isRealDate(text) {
  const parts = text.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return d.getFullYear() === parts[0] && d.getMonth() === parts[1] - 1 && d.getDate() === parts[2];
}

// Each check returns an empty string when the value is fine,
// or a message that tells the user what to change.

export function checkDescription(value) {
  if (value === '') return 'Enter a description.';
  if (!patterns.description.test(value)) return 'Remove the spaces at the start or end.';
  return '';
}

export function checkAmount(value) {
  if (value === '') return 'Enter an amount.';
  if (!patterns.amount.test(value)) return 'Use a number like 2500 or 12.50, with no leading zeros and at most 2 decimals.';
  return '';
}

export function checkDate(value) {
  if (value === '') return 'Enter a date.';
  if (!patterns.date.test(value)) return 'Use the format YYYY-MM-DD, for example 2026-10-12.';
  if (!isRealDate(value)) return 'That date does not exist on the calendar.';
  return '';
}

export function checkCategory(value) {
  if (value === '') return 'Enter a category.';
  if (!patterns.category.test(value)) return 'Use letters only. Single spaces or hyphens can go between words.';
  return '';
}

export function checkCap(value) {
  if (value === '') return '';
  return checkAmount(value);
}

export function checkRate(value) {
  if (!patterns.rate.test(value)) return 'Enter a number above 0 with up to 4 decimals.';
  return '';
}

export function parseCategoryList(text) {
  const list = [];
  const parts = text.split(',');
  for (const part of parts) {
    const name = part.trim();
    if (name === '') continue;
    if (!patterns.category.test(name)) {
      return { list: [], error: '"' + name + '" is not valid. Use letters, spaces and hyphens only.' };
    }
    const exists = list.some(function (item) { return item.toLowerCase() === name.toLowerCase(); });
    if (!exists) list.push(name);
  }
  if (list.length === 0) return { list: list, error: 'Add at least one category.' };
  return { list: list, error: '' };
}

// Returns a list of problems for one record. Empty list means the record is fine.
export function validateRecord(r) {
  const problems = [];
  if (!r || typeof r !== 'object' || Array.isArray(r)) return ['is not an object'];

  if (typeof r.id !== 'string' || !/^[A-Za-z0-9_-]+$/.test(r.id)) problems.push('has a missing or invalid id');
  if (typeof r.description !== 'string' || checkDescription(r.description)) problems.push('has an invalid description');
  if (typeof r.amount !== 'number' || !isFinite(r.amount) || checkAmount(String(r.amount))) problems.push('has an invalid amount');
  if (typeof r.category !== 'string' || checkCategory(r.category)) problems.push('has an invalid category');
  if (typeof r.date !== 'string' || checkDate(r.date)) problems.push('has an invalid date');
  ['createdAt', 'updatedAt'].forEach(function (key) {
    if (typeof r[key] !== 'string' || isNaN(Date.parse(r[key]))) problems.push('has an invalid ' + key);
  });
  return problems;
}

// Checks a whole imported file. Nothing is loaded unless every record passes.
export function validateImport(data) {
  const errors = [];
  if (!Array.isArray(data)) {
    return { ok: false, errors: ['The file must contain a list of records.'], records: [] };
  }
  if (data.length === 0) {
    return { ok: false, errors: ['The file has no records.'], records: [] };
  }
  const seen = {};
  data.forEach(function (r, i) {
    const problems = validateRecord(r);
    if (problems.length > 0) {
      errors.push('Record ' + (i + 1) + ' ' + problems.join(', ') + '.');
    } else if (seen[r.id]) {
      errors.push('Record ' + (i + 1) + ' repeats the id ' + r.id + '.');
    } else {
      seen[r.id] = true;
    }
  });
  return { ok: errors.length === 0, errors: errors, records: errors.length === 0 ? data : [] };
}
