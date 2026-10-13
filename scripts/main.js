// Starts the app and connects page events to the other modules.

import { state, initState, addRecord, updateRecord, deleteRecord, replaceRecords, saveSettings } from './state.js';
import {
  checkDescription, checkAmount, checkDate, checkCategory, checkCap, checkRate,
  collapseSpaces, hasDuplicateWord, parseCategoryList, validateImport
} from './validators.js';
import { exportJson, parseJson, CURRENCIES } from './storage.js';
import { toDateString } from './stats.js';
import * as ui from './ui.js';

const checkers = {
  description: checkDescription,
  amount: checkAmount,
  category: checkCategory,
  date: checkDate
};
const fieldNames = ['description', 'amount', 'category', 'date'];

function byId(id) {
  return document.getElementById(id);
}

function afterChange(message) {
  ui.renderAll();
  if (state.saveFailed) {
    ui.say('Could not save to this browser. Your changes may be lost when you reload.', true);
  } else {
    ui.say(message);
  }
}

function setToday() {
  byId('txn-date').value = toDateString(new Date());
}

// ---------- add form ----------

function checkField(name) {
  const message = checkers[name](byId('txn-' + name).value);
  ui.showError('txn-' + name, message);
  return message;
}

function handleAdd(event) {
  event.preventDefault();
  let firstBad = null;
  fieldNames.forEach(function (name) {
    if (checkField(name) && firstBad === null) firstBad = name;
  });
  if (firstBad) {
    byId('txn-' + firstBad).focus();
    ui.say('Please fix the fields marked with an error.', true);
    return;
  }

  addRecord({
    description: collapseSpaces(byId('txn-description').value),
    amount: byId('txn-amount').value,
    category: byId('txn-category').value,
    date: byId('txn-date').value
  });

  byId('txn-form').reset();
  setToday();
  fieldNames.forEach(function (name) { ui.showError('txn-' + name, ''); });
  ui.showDuplicateHint(false);
  afterChange('Transaction added.');
  byId('txn-description').focus();
}

// ---------- table actions ----------

function focusButton(id, action) {
  const button = document.querySelector('[data-action="' + action + '"][data-id="' + id + '"]');
  if (button) button.focus();
}

function startEdit(id) {
  state.editingId = id;
  ui.renderTable();
  const first = document.querySelector('tr[data-id="' + id + '"] input');
  if (first) first.focus();
}

function cancelEdit(id) {
  state.editingId = null;
  ui.renderTable();
  focusButton(id, 'edit');
}

function saveEdit(tr) {
  const id = tr.dataset.id;
  const values = {};
  for (const name of fieldNames) {
    const input = tr.querySelector('[data-field="' + name + '"]');
    const message = checkers[name](input.value);
    if (message) {
      ui.showRowError(tr, name + ': ' + message);
      input.focus();
      return;
    }
    values[name] = input.value;
  }
  values.description = collapseSpaces(values.description);
  updateRecord(id, values);
  state.editingId = null;
  afterChange('Transaction updated.');
  focusButton(id, 'edit');
}

function removeRecord(id) {
  const record = state.records.find(function (r) { return r.id === id; });
  if (!record) return;
  if (!confirm('Delete "' + record.description + '"?')) return;
  deleteRecord(id);
  afterChange('Transaction deleted.');
  byId('records-heading').focus();
}

function handleTableClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const id = button.dataset.id;
  const action = button.dataset.action;
  if (action === 'edit') startEdit(id);
  if (action === 'cancel') cancelEdit(id);
  if (action === 'save') saveEdit(button.closest('tr'));
  if (action === 'delete') removeRecord(id);
}

function handleTableKeys(event) {
  if (!state.editingId || event.target.tagName !== 'INPUT') return;
  if (event.key === 'Enter') {
    event.preventDefault();
    saveEdit(event.target.closest('tr'));
  }
  if (event.key === 'Escape') {
    cancelEdit(state.editingId);
  }
}

// ---------- settings ----------

function handleSettings(event) {
  event.preventDefault();
  const base = state.settings.baseCurrency;
  let firstBad = null;

  const capText = byId('set-cap').value.trim();
  const capError = checkCap(capText);
  ui.showError('set-cap', capError);
  if (capError) firstBad = byId('set-cap');

  const rates = Object.assign({}, state.settings.rates);
  let rateError = '';
  CURRENCIES.forEach(function (code) {
    if (code === base) return;
    const input = byId('rate-' + code);
    const message = checkRate(input.value.trim());
    if (message && !rateError) {
      rateError = code + ': ' + message;
      if (!firstBad) firstBad = input;
    }
    if (!message) rates[code] = Number(input.value.trim());
  });
  byId('rates-error').textContent = rateError;

  const parsed = parseCategoryList(byId('set-categories').value);
  ui.showError('set-categories', parsed.error);
  if (parsed.error && !firstBad) firstBad = byId('set-categories');

  if (firstBad) {
    firstBad.focus();
    ui.say('Settings were not saved. Fix the errors and try again.', true);
    return;
  }

  saveSettings({
    baseCurrency: base,
    displayCurrency: byId('set-display').value,
    rates: rates,
    cap: capText === '' ? 0 : Number(capText),
    categories: parsed.list
  });
  ui.fillCategories();
  ui.fillSettingsForm();
  afterChange('Settings saved.');
}

// ---------- data: export, import, sample ----------

function handleExport() {
  const blob = new Blob([exportJson(state.records)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'finance-tracker-' + toDateString(new Date()) + '.json';
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  ui.say('Exported ' + state.records.length + ' records.');
}

async function handleImport(event) {
  const input = event.target;
  const file = input.files[0];
  if (!file) return;

  let text;
  try {
    text = await file.text();
  } catch (err) {
    ui.say('Could not read that file.', true);
    input.value = '';
    return;
  }
  input.value = '';

  const parsed = parseJson(text);
  if (parsed.error) {
    ui.say(parsed.error, true);
    return;
  }
  const check = validateImport(parsed.data);
  if (!check.ok) {
    const shown = check.errors.slice(0, 3).join(' ');
    const extra = check.errors.length > 3 ? ' (and ' + (check.errors.length - 3) + ' more problems)' : '';
    ui.say('Import cancelled. ' + shown + extra, true);
    return;
  }
  if (!confirm('Replace your ' + state.records.length + ' records with the ' + check.records.length + ' from this file?')) return;
  replaceRecords(check.records);
  afterChange('Imported ' + check.records.length + ' records.');
}

async function loadSample(userAsked) {
  if (userAsked && state.records.length > 0 &&
      !confirm('Loading the sample data replaces your current records. Continue?')) {
    return;
  }
  try {
    const response = await fetch('seed.json');
    if (!response.ok) throw new Error('seed.json was not found');
    const check = validateImport(await response.json());
    if (!check.ok) throw new Error(check.errors[0]);
    replaceRecords(check.records);
    afterChange('Sample data loaded (' + check.records.length + ' records).');
  } catch (err) {
    if (userAsked) ui.say('Could not load the sample data: ' + err.message, true);
  }
}

function clearAll() {
  if (state.records.length === 0) {
    ui.say('There are no records to delete.');
    return;
  }
  if (!confirm('Delete all ' + state.records.length + ' records? This cannot be undone.')) return;
  replaceRecords([]);
  afterChange('All records deleted.');
}

// ---------- start ----------

function bindEvents() {
  byId('txn-form').addEventListener('submit', handleAdd);
  fieldNames.forEach(function (name) {
    byId('txn-' + name).addEventListener('input', function () {
      checkField(name);
      if (name === 'description') ui.showDuplicateHint(hasDuplicateWord(byId('txn-description').value));
    });
  });

  byId('search-input').addEventListener('input', function (e) {
    state.query = e.target.value;
    ui.renderTable();
  });
  byId('search-case').addEventListener('change', function (e) {
    state.ignoreCase = e.target.checked;
    ui.renderTable();
  });
  byId('sort-select').addEventListener('change', function (e) {
    state.sortBy = e.target.value;
    ui.renderTable();
  });

  byId('records-body').addEventListener('click', handleTableClick);
  byId('records-body').addEventListener('keydown', handleTableKeys);

  byId('settings-form').addEventListener('submit', handleSettings);
  byId('export-btn').addEventListener('click', handleExport);
  byId('import-file').addEventListener('change', handleImport);
  byId('sample-btn').addEventListener('click', function () { loadSample(true); });
  byId('clear-btn').addEventListener('click', clearAll);
}

function init() {
  const hadSavedData = initState();
  ui.fillCategories();
  ui.fillSettingsForm();
  setToday();
  ui.renderAll();
  bindEvents();
  if (!hadSavedData) loadSample(false);
}

init();
