# Student Finance Tracker

A money tracker for students, built with plain HTML, CSS and JavaScript. No frameworks. It was made for the **Building Responsive UI** summative assignment.

| | |
| --- | --- |
| **Theme chosen** | Student Finance Tracker |
| **Live site (GitHub Pages)** | https://quentin712.github.io/student-finance-tracker/ |
| **Repository** | https://github.com/Quentin712/student-finance-tracker |
| **Demo video** | ADD YOUR VIDEO LINK HERE |
| **Author** | Quentin Ntore, [GitHub](https://github.com/Quentin712), q.ntore@alustudent.com |

## Contents

1. [What it does](#what-it-does)
2. [How to use it](#how-to-use-it)
3. [Data model](#data-model)
4. [Regex catalog](#regex-catalog)
5. [Import and export](#import-and-export)
6. [Settings and currencies](#settings-and-currencies)
7. [Keyboard map](#keyboard-map)
8. [Accessibility notes](#accessibility-notes)
9. [Responsive design](#responsive-design)
10. [Run it locally](#run-it-locally)
11. [Run the tests](#run-the-tests)
12. [Project structure](#project-structure)
13. [Planning documents](#planning-documents)
14. [Known limits](#known-limits)

## What it does

- Add, edit and delete transactions (description, amount, category, date).
- Every record has a unique id and `createdAt` / `updatedAt` timestamps.
- Everything is saved in `localStorage` automatically. Nothing leaves your device.
- Search with your own regex pattern, with a case toggle and highlighted matches.
- Sort by date, description (A to Z or Z to A) or amount (low to high or high to low).
- Dashboard: total records, total spent, top category, monthly cap and a 7 day bar chart.
- The cap announces itself: a polite message while you are under it, an assertive one when you go over.
- Base currency RWF, plus USD and EUR with exchange rates you type yourself. No API.
- Editable category list.
- Export to JSON and import it back. Imports are checked first, and nothing loads if one record is bad.
- A button that loads the 20 sample records from `seed.json`.
- Cards on phones, a full table from 768px.

## How to use it

1. **Add a transaction.** Fill in the form in "Add transaction". Errors show under each field while you type. After a successful add, the cursor goes back to the description field.
2. **Edit or delete.** Use the buttons on each row. Edit turns the row into inputs. Enter saves, Escape cancels. Delete asks for confirmation first.
3. **Search.** Type a regex in the search box. Matches are highlighted and a message says how many records match.
4. **Sort.** Pick an order in the "Sort by" dropdown.
5. **Set a cap.** Go to Settings, type a monthly cap in RWF and save. The dashboard shows what is left, or how far over you are.
6. **Back up your data.** Use Export JSON, and Import JSON file to restore it.

## Data model

```json
{
  "id": "txn_0001",
  "description": "Lunch at cafeteria",
  "amount": 2500,
  "category": "Food",
  "date": "2026-10-09",
  "createdAt": "2026-10-09T12:41:08.000Z",
  "updatedAt": "2026-10-09T12:41:08.000Z"
}
```

- `amount` is always stored in RWF, as a number.
- New ids continue from the highest existing one (`txn_0021`, `txn_0022`, ...).
- `updatedAt` changes every time a record is edited.
- localStorage keys: `sft:records` and `sft:settings`.

## Regex catalog

### Validation rules

| Where | Pattern | What it does | Example |
| --- | --- | --- | --- |
| Description | `/^\S(?:.*\S)?$/` | No space at the start or end | `Lunch` passes, ` Lunch` fails |
| Amount | `/^(0\|[1-9]\d*)(\.\d{1,2})?$/` | Whole number or up to 2 decimals, no leading zeros | `12.50` passes, `012` and `12.345` fail |
| Date | `/^\d{4}-(0[1-9]\|1[0-2])-(0[1-9]\|[12]\d\|3[01])$/` | YYYY-MM-DD shape. A second check rejects days that do not exist | `2026-10-12` passes, `2026-13-01` and `2026-02-30` fail |
| Category | `/^[A-Za-z]+(?:[ -][A-Za-z]+)*$/` | Letters, with single spaces or hyphens between words | `Self-care` passes, `Food2` fails |
| **Advanced:** back-reference | `/\b(\w+)\s+\1\b/i` | Warns about a repeated word in the description | `Airtime top up for for the week` shows a warning |
| **Advanced:** lookahead | `/^(?!0+(?:\.0+)?$)\d+(?:\.\d{1,4})?$/` | An exchange rate must be above zero | `1450` passes, `0` and `0.00` fail |

Doubled spaces inside a description are collapsed to one space when you save.

### Search patterns to try

The search looks at the description, category, date and the amount as it is shown on screen. Results below were counted in the app with the 20 sample records.

| Pattern | What it finds | Matches |
| --- | --- | --- |
| `(coffee\|tea)` | Drink keywords | 2 records |
| `\.\d{2}\b` | Cents. Every amount is shown with 2 decimals (`RWF 2,500.00`), so this matches all records | 20 records |
| `\b(\w+)\s+\1\b` | A repeated word | 1 record ("for for") |
| `^Moto` | Descriptions starting with Moto | 2 records |
| `<b>` | Literal HTML text, shown as plain text and never run as HTML | 1 record |

Edge cases that are handled:

- A broken pattern such as `(` never crashes the page. A message appears and all records stay visible.
- A pattern that matches empty text, such as `x*`, does not freeze the page.
- The "Ignore upper and lower case" checkbox switches the `i` flag on and off.

## Import and export

**Export** downloads `finance-tracker-YYYY-MM-DD.json` with all your records.

**Import** reads a JSON file and checks it before loading anything. The import is cancelled with a clear message if:

| Problem | Message starts with |
| --- | --- |
| The file is not valid JSON | "That file is not valid JSON." |
| The file is not a list of records | "The file must contain a list of records." |
| The list is empty | "The file has no records." |
| A record breaks a rule (bad amount, fake date, missing field, ...) | "Record 2 has an invalid amount." |
| Two records share the same id | "Record 2 repeats the id txn_0001." |

It is all or nothing: if one record is bad, none are loaded. If the file is good, the app asks you to confirm before it replaces your current records. Categories found in the file are added to your category list.

When the app starts and finds a damaged record in localStorage, it skips that record and tells you how many were skipped.

## Settings and currencies

- **Monthly spending cap**, in RWF. Leave it empty for no cap.
- **Show amounts in** RWF, USD or EUR. Amounts you type are always saved in RWF.
- **Exchange rates**: "1 USD equals ... RWF". The default is 1450 for USD and 1680 for EUR. A rate must be above zero (lookahead rule).
- Conversion is `shown amount = saved RWF amount / rate`.
- **Categories**: a comma separated list. Repeats are removed.

## Keyboard map

| Key | What it does |
| --- | --- |
| Tab / Shift + Tab | Move to the next / previous control |
| Enter on "Skip to main content" | Jump past the header |
| Enter | Submit the add form or the settings form |
| Enter or Space on a button | Press it |
| Enter inside an edit row | Save the row |
| Escape inside an edit row | Cancel the edit |
| Arrow keys on a dropdown | Change the sort order or currency |

Focus moves where you would expect:

- After adding, the cursor returns to the description field.
- After deleting, focus moves to the Records heading.
- After saving or cancelling an edit, focus returns to that row's Edit button.
- When a form has errors, focus jumps to the first invalid field.

## Accessibility notes

- Landmarks: header, nav, main, footer, and a heading order that never skips a level.
- The skip link is the first thing a keyboard user reaches.
- Every input has a label tied to it. Hints and errors are linked with `aria-describedby`, and invalid fields get `aria-invalid`.
- Status messages use `role="status"` (polite). Errors and the over cap warning use `role="alert"` (assertive).
- A visible focus ring on every control.
- Search matches use the `<mark>` element, built with DOM methods and never `innerHTML`.
- The bar chart has a text summary, so the numbers are not only in the picture.
- Colors were chosen for readable contrast (numbers in the table below). Errors never rely on color alone, they also have text.
- `prefers-reduced-motion` turns animations off.
- Table cells keep their table roles even when the layout switches to cards on phones.
- Touch targets are at least 44px tall on inputs and main buttons. The Edit and Delete buttons inside rows are 36px tall.

### Contrast check

Ratios were calculated from the CSS colors with the WCAG formula. Normal text needs 4.5 or more, and input borders need 3 or more.

| Pair | Ratio |
| --- | --- |
| Body text on white | 17.40 |
| Muted text on white / on the stat boxes | 8.86 / 7.80 |
| Links and secondary buttons on white | 6.67 |
| White text on primary buttons (normal / hover) | 6.67 / 8.87 |
| White text on the header | 13.49 |
| Error text on white / on the error background | 7.33 / 6.42 |
| Warning text on white | 7.41 |
| Highlighted match text | 12.58 |
| White text on message toasts (normal / error) | 14.68 / 7.33 |
| Input borders on white | 4.54 |

These come from a calculation, not from a browser audit tool. Running Lighthouse or axe in the browser is a good second check.

## Responsive design

Mobile first. The base styles are for about 360px, with extra rules at 480px, 768px and 1024px.

| Width | What changes |
| --- | --- |
| 360px (base) | One column. Records are cards. Stats in 1 column. |
| 480px | Stats, exchange rate fields and data buttons go into 2 columns. |
| 768px | Header in one row. Records become a real table. Stats in 4 columns. Form in 2 columns. |
| 1024px | More padding and wider spacing. |

Animations: the bar chart grows when it appears, the cap progress bar slides, messages pop in, and buttons and rows have short color transitions.

## Run it locally

Browsers block JavaScript modules on `file://` addresses, so double clicking `index.html` will not work. Use a small local server instead.

1. Clone the repository:
   ```bash
   git clone https://github.com/Quentin712/student-finance-tracker.git
   ```
2. Go into the project folder:
   ```bash
   cd student-finance-tracker
   ```
3. Start the server:
   ```bash
   python3 -m http.server 8000
   ```
4. Open http://localhost:8000 in your browser. Stop the server with Ctrl + C.

The VS Code Live Server extension works too. Right click `index.html` and choose "Open with Live Server".

## Run the tests

With the server running, open http://localhost:8000/tests.html. The page lists every check as PASS or FAIL and shows a total at the top. A full pass reads **25 of 25 tests passed.**

The tests cover:

- the six validation patterns and their messages
- search (safe regex compiler, matching, splitting for highlights)
- stats (count, sum, top category, last 7 days, month total)
- sorting
- the JSON export and import round trip, and import validation
- `seed.json` (at least 10 records, all valid)

The same page works on the live site: add `/tests.html` to the GitHub Pages address.

## Project structure

```
index.html            the app
tests.html            test runner page
seed.json             20 sample records (edge dates, tiny and huge amounts, tricky text)
scripts/
  main.js             starts the app and connects events
  state.js            the data and the functions that change it
  storage.js          localStorage, settings defaults, JSON export and parse
  ui.js               draws the table, stats, chart and messages
  validators.js       regex rules and import validation
  search.js           safe regex compiler and highlighting
  stats.js            numbers for the dashboard
styles/
  base.css            colors, typography, focus, skip link
  layout.css          page layout and breakpoints
  components.css      buttons, forms, chart, messages
tests/
  tests.js            the test cases
docs/                 planning documents (see below)
  spec.md
  wireframes/
```

## Planning documents

The `docs/` folder holds the milestone M1 material:

- [docs/spec.md](docs/spec.md): the app spec, data model and accessibility plan.
- [docs/wireframes/](docs/wireframes/): wireframes for phone (360px), tablet (768px) and desktop (1024px).

## Known limits

- The base currency is fixed to RWF. USD and EUR are display currencies.
- There is one monthly cap, counted from the first day of the current calendar month. The sample data is dated October 2026, so the cap numbers only make sense for sample data while it is October 2026.
- The "last 7 days" chart only fills up with recent dates. The sample data is dated early October 2026, so add a transaction dated today to see the chart move.
- Data lives in one browser. Use Export JSON to move it to another device.
- Delete and import confirmations use the browser's built-in dialogs.
- Search runs on the text shown on screen, so amounts are matched as formatted text like `RWF 1,500.75`, not as raw numbers.
- A regex that is valid but very slow on long text (for example `(a+)+$`) is not blocked. The compiler only catches patterns that are invalid.
