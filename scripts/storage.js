// Reads and writes localStorage. 

const RECORDS_KEY = 'sft:records';
const SETTINGS_KEY = 'sft:settings';

export const CURRENCIES = ['RWF', 'USD', 'EUR'];

export const defaultSettings = {
  baseCurrency: 'RWF',
  displayCurrency: 'RWF',
  rates: { RWF: 1, USD: 1450, EUR: 1680 },
  cap: 0,
  categories: ['Food', 'Books', 'Transport', 'Entertainment', 'Fees', 'Other']
};

// Returns null if nothing was ever saved, so the app knows it is the first visit.
export function loadRecords() {
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    if (raw === null) return null;
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('Could not read saved records:', err);
    return [];
  }
}

export function saveRecords(records) {
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
    return true;
  } catch (err) {
    console.warn('Could not save records:', err);
    return false;
  }
}

export function loadSettings() {
  const settings = JSON.parse(JSON.stringify(defaultSettings));
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved && typeof saved === 'object') {
        Object.assign(settings, saved);
        settings.rates = Object.assign({}, defaultSettings.rates, saved.rates);
      }
    }
  } catch (err) {
    console.warn('Could not read saved settings:', err);
  }
  settings.baseCurrency = defaultSettings.baseCurrency;
  if (CURRENCIES.indexOf(settings.displayCurrency) === -1) settings.displayCurrency = settings.baseCurrency;
  if (typeof settings.cap !== 'number' || settings.cap < 0) settings.cap = 0;
  if (!Array.isArray(settings.categories) || settings.categories.length === 0) {
    settings.categories = defaultSettings.categories.slice();
  }
  return settings;
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch (err) {
    console.warn('Could not save settings:', err);
    return false;
  }
}

export function exportJson(records) {
  return JSON.stringify(records, null, 2);
}

export function parseJson(text) {
  try {
    return { data: JSON.parse(text), error: '' };
  } catch (err) {
    return { data: null, error: 'That file is not valid JSON.' };
  }
}
