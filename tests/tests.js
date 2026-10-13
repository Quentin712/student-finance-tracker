import {
  patterns, collapseSpaces, hasDuplicateWord, isRealDate, checkDescription, checkAmount,
  checkDate, checkCategory, checkCap, checkRate, parseCategoryList, validateRecord, validateImport
} from '../scripts/validators.js';
import { compileRegex, splitMatches, matchesAny } from '../scripts/search.js';
import { toDateString, round2, countRecords, sumAmounts, topCategory, lastSevenDays, monthTotal } from '../scripts/stats.js';
import { exportJson, parseJson } from '../scripts/storage.js';
import { sortRecords } from '../scripts/state.js';

const queue = [];
const results = [];

function test(name, fn) {
  queue.push({ name: name, fn: fn });
}

function equal(actual, expected, label) {
  if (actual !== expected) {
    throw new Error((label || 'value') + ': expected ' + JSON.stringify(expected) + ' but got ' + JSON.stringify(actual));
  }
}

function accepts(re, values) {
  values.forEach(function (v) { equal(re.test(v), true, 'should accept ' + JSON.stringify(v)); });
}

function rejects(re, values) {
  values.forEach(function (v) { equal(re.test(v), false, 'should reject ' + JSON.stringify(v)); });
}

function record(changes) {
  return Object.assign({
    id: 'txn_0001',
    description: 'Lunch at cafeteria',
    amount: 2500,
    category: 'Food',
    date: '2026-10-09',
    createdAt: '2026-10-09T12:00:00.000Z',
    updatedAt: '2026-10-09T12:00:00.000Z'
  }, changes);
}

function ids(list) {
  return list.map(function (r) { return r.id; }).join(',');
}

// ---------- validators ----------

test('description: no spaces at the start or end', function () {
  accepts(patterns.description, ['a', 'Lunch', 'Lunch at cafeteria']);
  rejects(patterns.description, ['', ' ', ' Lunch', 'Lunch ']);
  equal(checkDescription(''), 'Enter a description.');
  equal(checkDescription('Lunch'), '');
  equal(checkDescription(' Lunch') !== '', true, 'leading space gives a message');
});

test('description: double spaces collapse to one', function () {
  equal(collapseSpaces('Lunch   at  cafeteria'), 'Lunch at cafeteria');
});

test('amount: whole numbers and up to 2 decimals', function () {
  accepts(patterns.amount, ['0', '5', '12.50', '12.5', '2500', '0.05', '1250000.99']);
  rejects(patterns.amount, ['', '012', '12.345', '-5', 'abc', '1.', '.5', '1,000', '1e3']);
  equal(checkAmount(''), 'Enter an amount.');
  equal(checkAmount('12.50'), '');
});

test('date: format and real calendar days', function () {
  accepts(patterns.date, ['2026-10-12', '2024-02-29', '1999-01-01']);
  rejects(patterns.date, ['', '2026-13-01', '2026-00-10', '2026-10-32', '26-10-12', '2026/10/12', '2026-1-5']);
  equal(isRealDate('2024-02-29'), true, 'leap day 2024');
  equal(isRealDate('2025-02-29'), false, 'no leap day in 2025');
  equal(isRealDate('2026-04-31'), false, 'April has 30 days');
  equal(checkDate('2026-02-30'), 'That date does not exist on the calendar.');
  equal(checkDate('2026-10-12'), '');
});

test('category: letters with single spaces or hyphens', function () {
  accepts(patterns.category, ['Food', 'Mobile Data', 'Self-care', 'Fast-food court']);
  rejects(patterns.category, ['', 'Food2', '-Food', 'Food-', 'Food  Bar', 'Food--Bar', ' Food', 'Caf\u00e9']);
  equal(checkCategory(''), 'Enter a category.');
  equal(checkCategory('Food'), '');
});

test('advanced: back-reference finds repeated words', function () {
  equal(hasDuplicateWord('Airtime top up for for the week'), true);
  equal(hasDuplicateWord('The the cat'), true, 'ignores case');
  equal(hasDuplicateWord('coffee with tea'), false);
  equal(hasDuplicateWord('fork forks'), false, 'part of a word is not a repeat');
});

test('advanced: lookahead blocks a rate of zero', function () {
  accepts(patterns.rate, ['1', '1450', '0.5', '0.0001', '1680.1234']);
  rejects(patterns.rate, ['', '0', '0.00', '-1', '1.23456', 'abc', '.5']);
  equal(checkRate('0') !== '', true, 'zero gives a message');
  equal(checkRate('1450'), '');
});

test('cap: empty is allowed, bad values are not', function () {
  equal(checkCap(''), '');
  equal(checkCap('5000'), '');
  equal(checkCap('abc') !== '', true);
  equal(checkCap('-5') !== '', true);
});

test('category list: trims, removes repeats, reports errors', function () {
  const ok = parseCategoryList('Food, Books, food, Self-care');
  equal(ok.list.length, 3, 'list length');
  equal(ok.list[0], 'Food');
  equal(ok.error, '');
  equal(parseCategoryList('').error, 'Add at least one category.');
  equal(parseCategoryList(' , ,').error, 'Add at least one category.');
  equal(parseCategoryList('Food, 123').error !== '', true, 'digits are rejected');
});

test('record: a good record has no problems', function () {
  equal(validateRecord(record()).length, 0);
});

test('record: bad records are caught', function () {
  equal(validateRecord(null).length > 0, true, 'null');
  equal(validateRecord([]).length > 0, true, 'array');
  equal(validateRecord(record({ amount: '12' })).length > 0, true, 'amount as text');
  equal(validateRecord(record({ date: '2026-02-30' })).length > 0, true, 'fake date');
  equal(validateRecord(record({ id: '' })).length > 0, true, 'empty id');
  equal(validateRecord(record({ createdAt: 'not a date' })).length > 0, true, 'bad timestamp');
  equal(validateRecord(record({ description: ' padded' })).length > 0, true, 'padded description');
});

test('import: whole file must be valid', function () {
  equal(validateImport({}).ok, false, 'object instead of list');
  equal(validateImport([]).ok, false, 'empty list');
  const good = validateImport([record(), record({ id: 'txn_0002' })]);
  equal(good.ok, true, 'two good records');
  equal(good.records.length, 2);
  const twins = validateImport([record(), record()]);
  equal(twins.ok, false, 'same id twice');
  equal(twins.errors[0].indexOf('repeats the id') !== -1, true, 'says which problem');
  const broken = validateImport([record(), record({ id: 'txn_0002', amount: -1 })]);
  equal(broken.ok, false, 'one bad record');
  equal(broken.errors[0].indexOf('Record 2 ') === 0, true, 'names the record number');
  equal(broken.records.length, 0, 'nothing is loaded');
});

// ---------- search ----------

test('compileRegex: safe for empty and broken patterns', function () {
  const empty = compileRegex('');
  equal(empty.regex, null);
  equal(empty.error, '');
  const broken = compileRegex('(');
  equal(broken.regex, null);
  equal(broken.error !== '', true, 'gives an error message');
  equal(compileRegex('(coffee|tea)').regex.test('Coffee'), true, 'ignores case');
  equal(compileRegex('(coffee|tea)', false).regex.test('Coffee'), false, 'respects case');
});

test('search patterns from the brief', function () {
  accepts(/\.\d{2}\b/, ['12.50', 'Paid 8.75 today']);
  rejects(/\.\d{2}\b/, ['12.5', '2500']);
  accepts(/(coffee|tea)/i, ['Coffee with friends', "Mama's tea"]);
  accepts(/\b(\w+)\s+\1\b/i, ['for for the week']);
  rejects(/\b(\w+)\s+\1\b/i, ['for the week']);
});

test('matchesAny checks every text', function () {
  equal(matchesAny(/tea/i, ['Lunch', 'Mama tea']), true);
  equal(matchesAny(/xyz/, ['a', 'b']), false);
});

test('splitMatches: marks the matched parts', function () {
  const parts = splitMatches('Coffee with tea', /(coffee|tea)/i);
  equal(parts.length, 3, 'three parts');
  equal(parts[0].text, 'Coffee');
  equal(parts[0].match, true);
  equal(parts[1].match, false);
  equal(parts[2].text, 'tea');
  const cents = splitMatches('Pay 12.50 now', /\.\d{2}\b/);
  equal(cents[1].text, '.50');
  equal(splitMatches('abc', null).length, 1, 'no regex gives one part');
});

test('splitMatches: an empty match does not loop forever', function () {
  const parts = splitMatches('abc', /x*/);
  equal(parts.length, 1);
  equal(parts[0].match, false);
});

// ---------- stats ----------

test('stats: date and rounding helpers', function () {
  equal(toDateString(new Date(2026, 9, 5)), '2026-10-05');
  equal(round2(0.1 + 0.2), 0.3);
});

test('stats: count and sum', function () {
  equal(countRecords([record(), record()]), 2);
  equal(sumAmounts([]), 0);
  equal(sumAmounts([record({ amount: 0.1 }), record({ amount: 0.2 })]), 0.3);
});

test('stats: top category is the one with the most spending', function () {
  equal(topCategory([]), null);
  const top = topCategory([
    record({ category: 'Food', amount: 10 }),
    record({ category: 'Food', amount: 20 }),
    record({ category: 'Books', amount: 25 })
  ]);
  equal(top.name, 'Food');
  equal(top.total, 30);
});

test('stats: last 7 days', function () {
  const today = new Date(2026, 9, 13);
  const days = lastSevenDays([
    record({ date: '2026-10-13', amount: 100 }),
    record({ date: '2026-10-13', amount: 20.5 }),
    record({ date: '2026-10-06', amount: 50 })
  ], today);
  equal(days.length, 7);
  equal(days[0].date, '2026-10-07');
  equal(days[6].date, '2026-10-13');
  equal(days[6].total, 120.5);
  equal(days.reduce(function (t, d) { return t + d.total; }, 0), 120.5, 'older records are left out');
});

test('stats: month total only counts the current month', function () {
  const today = new Date(2026, 9, 13);
  const total = monthTotal([
    record({ date: '2026-10-01', amount: 10 }),
    record({ date: '2026-10-31', amount: 15 }),
    record({ date: '2026-09-30', amount: 99 })
  ], today);
  equal(total, 25);
});

// ---------- state and storage ----------

test('sortRecords: amount, description and date', function () {
  const list = [
    record({ id: 'a', amount: 30, description: 'banana', date: '2026-10-02', createdAt: '2026-10-02T00:00:00.000Z' }),
    record({ id: 'b', amount: 5, description: 'Apple', date: '2026-10-09', createdAt: '2026-10-09T00:00:00.000Z' }),
    record({ id: 'c', amount: 100, description: 'cherry', date: '2026-10-05', createdAt: '2026-10-05T00:00:00.000Z' })
  ];
  equal(ids(sortRecords(list, 'amount-asc')), 'b,a,c');
  equal(ids(sortRecords(list, 'amount-desc')), 'c,a,b');
  equal(ids(sortRecords(list, 'description-asc')), 'b,a,c');
  equal(ids(sortRecords(list, 'description-desc')), 'c,a,b');
  equal(ids(sortRecords(list, 'date-desc')), 'b,c,a');
  equal(ids(sortRecords(list, 'date-asc')), 'a,c,b');
  equal(ids(list), 'a,b,c', 'original list is not changed');
});

test('JSON: export then parse gives the same records', function () {
  const list = [record(), record({ id: 'txn_0002', amount: 12.5 })];
  const back = parseJson(exportJson(list));
  equal(back.error, '');
  equal(JSON.stringify(back.data), JSON.stringify(list));
  const bad = parseJson('{oops');
  equal(bad.data, null);
  equal(bad.error !== '', true, 'bad JSON gives a message');
});

test('seed.json has at least 10 valid records', async function () {
  const response = await fetch('../seed.json');
  equal(response.ok, true, 'seed.json loads');
  const data = await response.json();
  equal(data.length >= 10, true, 'at least 10 records');
  const check = validateImport(data);
  equal(check.ok, true, check.errors.join(' '));
});

// ---------- run and report ----------

function report() {
  const failed = results.filter(function (r) { return !r.ok; });
  const summary = (results.length - failed.length) + ' of ' + results.length + ' tests passed.';

  if (typeof document === 'undefined') {
    results.forEach(function (r) {
      console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.ok ? '' : ' : ' + r.error));
    });
    console.log(summary);
    return;
  }

  const list = document.getElementById('results');
  results.forEach(function (r) {
    const li = document.createElement('li');
    li.className = r.ok ? 'pass' : 'fail';
    li.textContent = (r.ok ? 'PASS: ' : 'FAIL: ') + r.name + (r.ok ? '' : ' (' + r.error + ')');
    list.append(li);
  });
  const status = document.getElementById('summary');
  status.textContent = summary;
  status.className = failed.length ? 'fail' : 'pass';
}

async function run() {
  for (const t of queue) {
    try {
      await t.fn();
      results.push({ name: t.name, ok: true, error: '' });
    } catch (err) {
      results.push({ name: t.name, ok: false, error: err.message });
    }
  }
  report();
}

run();
