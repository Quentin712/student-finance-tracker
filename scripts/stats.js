// Numbers for the dashboard. These functions only read data.

export function toDateString(d) {
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + month + '-' + day;
}

export function round2(n) {
  return Math.round(n * 100) / 100;
}

export function countRecords(records) {
  return records.length;
}

export function sumAmounts(records) {
  return round2(records.reduce(function (total, r) { return total + r.amount; }, 0));
}

// The category with the highest total spending.
export function topCategory(records) {
  const totals = {};
  records.forEach(function (r) {
    totals[r.category] = (totals[r.category] || 0) + r.amount;
  });
  let best = null;
  for (const name in totals) {
    if (best === null || totals[name] > best.total) {
      best = { name: name, total: round2(totals[name]) };
    }
  }
  return best;
}

// Seven items, oldest first, ending with today.
export function lastSevenDays(records, today = new Date()) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    days.push({
      date: toDateString(d),
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      total: 0
    });
  }
  records.forEach(function (r) {
    const day = days.find(function (x) { return x.date === r.date; });
    if (day) day.total += r.amount;
  });
  days.forEach(function (d) { d.total = round2(d.total); });
  return days;
}

// Spending in the same month as "today".
export function monthTotal(records, today = new Date()) {
  const prefix = toDateString(today).slice(0, 7);
  const inMonth = records.filter(function (r) { return r.date.indexOf(prefix) === 0; });
  return sumAmounts(inMonth);
}
