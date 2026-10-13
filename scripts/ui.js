// Everything that touches the page: drawing the table, stats, chart and messages.

import { state, sortRecords } from './state.js';
import { CURRENCIES } from './storage.js';
import { countRecords, sumAmounts, topCategory, lastSevenDays, monthTotal } from './stats.js';
import { compileRegex, highlightInto, matchesAny } from './search.js';

function byId(id) {
  return document.getElementById(id);
}

function make(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  return el;
}

function setText(el, text) {
  if (el.textContent !== text) el.textContent = text;
}

export function formatMoney(amount) {
  const s = state.settings;
  const code = s.displayCurrency;
  const value = code === s.baseCurrency ? amount : amount / (s.rates[code] || 1);
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  } catch (err) {
    return code + ' ' + value.toFixed(2);
  }
}

// Messages

let messageTimer;

export function say(message, isError) {
  const ok = byId('app-status');
  const bad = byId('app-error');
  ok.textContent = '';
  bad.textContent = '';
  (isError ? bad : ok).textContent = message;
  clearTimeout(messageTimer);
  messageTimer = setTimeout(function () {
    ok.textContent = '';
    bad.textContent = '';
  }, 7000);
}

export function showError(inputId, message) {
  const input = byId(inputId);
  byId(inputId + '-error').textContent = message;
  if (message) {
    input.setAttribute('aria-invalid', 'true');
  } else {
    input.removeAttribute('aria-invalid');
  }
}

export function showDuplicateHint(show) {
  byId('txn-description-warning').textContent = show
    ? 'This looks like a repeated word. Check the spelling.'
    : '';
}

// Dashboard 

function renderCap() {
  const cap = state.settings.cap;
  const spent = monthTotal(state.records);
  const bar = byId('cap-progress');
  const left = byId('stat-cap-left');
  let polite = '';
  let assertive = '';

  if (!cap) {
    left.textContent = 'No cap set';
    bar.value = 0;
    bar.classList.remove('over');
  } else {
    const diff = Math.round((cap - spent) * 100) / 100;
    bar.value = Math.min(100, Math.round((spent / cap) * 100));
    if (diff >= 0) {
      left.textContent = formatMoney(diff);
      bar.classList.remove('over');
      polite = 'You have ' + formatMoney(diff) + ' left in this month\'s cap.';
    } else {
      left.textContent = 'Over by ' + formatMoney(-diff);
      bar.classList.add('over');
      assertive = 'You are over this month\'s cap by ' + formatMoney(-diff) + '.';
    }
  }
  setText(byId('cap-message-polite'), polite);
  setText(byId('cap-message-assertive'), assertive);
}

function renderChart() {
  const days = lastSevenDays(state.records);
  const chart = byId('trend-chart');
  chart.textContent = '';

  const biggest = Math.max.apply(null, days.map(function (d) { return d.total; }));
  let weekTotal = 0;
  let busiest = days[0];

  days.forEach(function (d) {
    weekTotal += d.total;
    if (d.total > busiest.total) busiest = d;

    const col = make('div', 'bar-col');
    const track = make('div', 'bar-track');
    const bar = make('div', 'bar');
    const percent = biggest > 0 && d.total > 0 ? Math.max(4, (d.total / biggest) * 100) : 0;
    bar.style.setProperty('--h', percent + '%');
    bar.title = d.label + ': ' + formatMoney(d.total);
    track.append(bar);
    col.append(track, make('span', 'bar-label', d.label));
    chart.append(col);
  });

  let summary = 'Nothing spent in the last 7 days.';
  if (weekTotal > 0) {
    summary = 'Spent ' + formatMoney(weekTotal) + ' in the last 7 days. Busiest day: ' +
      busiest.label + ' (' + formatMoney(busiest.total) + ').';
  }
  byId('trend-summary').textContent = summary;
}

export function renderStats() {
  const records = state.records;
  byId('stat-count').textContent = countRecords(records);
  byId('stat-sum').textContent = formatMoney(sumAmounts(records));
  const top = topCategory(records);
  byId('stat-top-category').textContent = top ? top.name + ' (' + formatMoney(top.total) + ')' : 'None yet';
  byId('currency-note').textContent = 'Amounts are saved in ' + state.settings.baseCurrency +
    ' and shown in ' + state.settings.displayCurrency + '.';
  renderCap();
  renderChart();
}

// Records table 

function recordTexts(r) {
  return [r.description, r.category, r.date, formatMoney(r.amount)];
}

function makeCell(label, className) {
  const td = make('td', className);
  td.setAttribute('role', 'cell');
  td.dataset.label = label;
  return td;
}

function textCell(label, text, re, className) {
  const td = makeCell(label, className);
  const value = make('span', 'cell-value');
  highlightInto(value, text, re);
  td.append(value);
  return td;
}

function actionButton(text, action, record, extraClass) {
  const b = make('button', 'btn btn-small ' + (extraClass || ''), text);
  b.type = 'button';
  b.dataset.action = action;
  b.dataset.id = record.id;
  if (action === 'edit' || action === 'delete') {
    b.setAttribute('aria-label', text + ' ' + record.description);
  }
  return b;
}

function buildRow(r, re) {
  const tr = make('tr');
  tr.setAttribute('role', 'row');
  tr.dataset.id = r.id;
  tr.append(
    textCell('Date', r.date, re),
    textCell('Description', r.description, re),
    textCell('Category', r.category, re),
    textCell('Amount', formatMoney(r.amount), re, 'num')
  );
  const actions = makeCell('Actions', 'actions');
  actions.append(
    actionButton('Edit', 'edit', r, 'btn-secondary'),
    actionButton('Delete', 'delete', r, 'btn-danger')
  );
  tr.append(actions);
  return tr;
}

function inputCell(label, field, value) {
  const td = makeCell(label);
  const input = make('input');
  input.type = 'text';
  input.value = value;
  input.dataset.field = field;
  input.autocomplete = 'off';
  input.setAttribute('aria-label', label);
  if (field === 'category') input.setAttribute('list', 'category-list');
  if (field === 'amount') input.inputMode = 'decimal';
  td.append(input);
  return td;
}

function buildEditRow(r) {
  const tr = make('tr', 'editing');
  tr.setAttribute('role', 'row');
  tr.dataset.id = r.id;
  tr.append(
    inputCell('Date', 'date', r.date),
    inputCell('Description', 'description', r.description),
    inputCell('Category', 'category', r.category),
    inputCell('Amount', 'amount', String(r.amount))
  );
  const actions = makeCell('Actions', 'actions');
  const error = make('span', 'row-error');
  error.setAttribute('role', 'alert');
  actions.append(
    actionButton('Save', 'save', r),
    actionButton('Cancel', 'cancel', r, 'btn-secondary'),
    error
  );
  tr.append(actions);
  return tr;
}

export function showRowError(tr, message) {
  tr.querySelector('.row-error').textContent = message;
}

export function renderTable() {
  const body = byId('records-body');
  body.textContent = '';

  const compiled = compileRegex(state.query, state.ignoreCase);
  const re = compiled.regex;
  const search = byId('search-input');

  let list = state.records;
  if (re) {
    list = list.filter(function (r) { return matchesAny(re, recordTexts(r)); });
  }
  list = sortRecords(list, state.sortBy);

  if (compiled.error) {
    search.setAttribute('aria-invalid', 'true');
    setText(byId('search-feedback'), 'That pattern is not valid yet, so all records are shown.');
  } else {
    search.removeAttribute('aria-invalid');
    setText(byId('search-feedback'), re ? list.length + ' of ' + state.records.length + ' records match.' : '');
  }

  const empty = byId('empty-state');
  if (state.records.length === 0) {
    empty.textContent = 'No transactions yet. Add your first one in the form below.';
    empty.hidden = false;
  } else if (list.length === 0) {
    empty.textContent = 'No records match your search. Try a different pattern.';
    empty.hidden = false;
  } else {
    empty.hidden = true;
  }

  if (state.editingId && !list.some(function (r) { return r.id === state.editingId; })) {
    state.editingId = null;
  }

  list.forEach(function (r) {
    body.append(r.id === state.editingId ? buildEditRow(r) : buildRow(r, re));
  });
}

export function renderAll() {
  renderStats();
  renderTable();
}

// Form and settings

export function fillCategories() {
  const list = byId('category-list');
  list.textContent = '';
  state.settings.categories.forEach(function (name) {
    const option = make('option');
    option.value = name;
    list.append(option);
  });
}

export function renderRates() {
  const box = byId('rates-fields');
  const base = state.settings.baseCurrency;
  box.textContent = '';
  CURRENCIES.filter(function (code) { return code !== base; }).forEach(function (code) {
    const wrap = make('div', 'field');
    const label = make('label', '', '1 ' + code + ' equals (in ' + base + ')');
    const input = make('input');
    input.type = 'text';
    input.id = 'rate-' + code;
    input.inputMode = 'decimal';
    input.autocomplete = 'off';
    input.value = state.settings.rates[code];
    label.htmlFor = input.id;
    wrap.append(label, input);
    box.append(wrap);
  });
}

export function fillSettingsForm() {
  const s = state.settings;
  byId('set-cap').value = s.cap ? s.cap : '';
  byId('set-display').value = s.displayCurrency;
  byId('set-categories').value = s.categories.join(', ');
  document.querySelectorAll('.base-currency-label').forEach(function (el) {
    el.textContent = s.baseCurrency;
  });
  renderRates();
}
