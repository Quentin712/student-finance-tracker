// The app's data and the functions that change it.

import * as storage from './storage.js';

export const state = {
  records: [],
  settings: storage.loadSettings(),
  sortBy: 'date-desc',
  query: '',
  ignoreCase: true,
  editingId: null,
  saveFailed: false
};

// Returns true if records were found in storage.
export function initState() {
  const saved = storage.loadRecords();
  state.records = saved === null ? [] : saved;
  state.settings = storage.loadSettings();
  return saved !== null;
}

function persist() {
  state.saveFailed = !storage.saveRecords(state.records);
}

function makeId() {
  let highest = 0;
  state.records.forEach(function (r) {
    const match = /^txn_(\d+)$/.exec(r.id);
    if (match && Number(match[1]) > highest) highest = Number(match[1]);
  });
  return 'txn_' + String(highest + 1).padStart(4, '0');
}

export function addRecord(fields) {
  const now = new Date().toISOString();
  const record = {
    id: makeId(),
    description: fields.description,
    amount: Number(fields.amount),
    category: fields.category,
    date: fields.date,
    createdAt: now,
    updatedAt: now
  };
  state.records.push(record);
  persist();
  return record;
}

export function updateRecord(id, fields) {
  const record = state.records.find(function (r) { return r.id === id; });
  if (!record) return null;
  record.description = fields.description;
  record.amount = Number(fields.amount);
  record.category = fields.category;
  record.date = fields.date;
  record.updatedAt = new Date().toISOString();
  persist();
  return record;
}

export function deleteRecord(id) {
  state.records = state.records.filter(function (r) { return r.id !== id; });
  persist();
}

export function replaceRecords(list) {
  state.records = list;
  state.editingId = null;
  persist();
}

export function saveSettings(settings) {
  state.settings = settings;
  state.saveFailed = !storage.saveSettings(settings);
}

// Returns a sorted copy. The original list is left alone.
export function sortRecords(list, sortBy) {
  const parts = sortBy.split('-');
  const field = parts[0];
  const sign = parts[1] === 'asc' ? 1 : -1;
  return list.slice().sort(function (a, b) {
    let result;
    if (field === 'amount') {
      result = a.amount - b.amount;
    } else if (field === 'description') {
      result = a.description.localeCompare(b.description, undefined, { sensitivity: 'base' });
    } else {
      result = a.date.localeCompare(b.date);
    }
    if (result === 0) result = a.createdAt.localeCompare(b.createdAt);
    return result * sign;
  });
}
