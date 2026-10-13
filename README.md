# Student Finance Tracker

Summative Assignment, Building Responsive UI. A student money tracker built with plain HTML, CSS and JavaScript. No frameworks.

**Demo video:* Link * 
**Theme chosen:** Student Finance Tracker

## What it does

- Add, edit and delete transactions (description, amount, category, date).
- Every record has a unique id and createdAt / updatedAt timestamps.
- Everything is saved in localStorage automatically.
- Search records with your own regex pattern, with a case toggle and highlighted matches.
- Sort by date, description (A to Z or Z to A) or amount (low to high or high to low).
- Dashboard with total records, total spent, top category, a monthly cap and a 7 day bar chart.
- The cap announces itself: a polite message while you are under it, an assertive one when you go over.
- Base currency RWF plus USD and EUR, with exchange rates you type in Settings. Amounts are always saved in RWF.
- Editable category list.
- Export all records to JSON and import them back. Imports are checked first and nothing loads if one record is bad.
- Sample data button that loads the 20 records from seed.json.
- Cards on phones, a full table from 768px.

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

localStorage keys: `sft:records` and `sft:settings`.

## Regex catalog

| Where | Pattern | What it does | Example |
| --- | --- | --- | --- |
| Description | `/^\S(?:.*\S)?$/` | No space at the start or end | `Lunch` passes, ` Lunch` fails |
| Amount | `/^(0\|[1-9]\d*)(\.\d{1,2})?$/` | Whole number or up to 2 decimals, no leading zeros | `12.50` passes, `012` and `12.345` fail |
| Date | `/^\d{4}-(0[1-9]\|1[0-2])-(0[1-9]\|[12]\d\|3[01])$/` | YYYY-MM-DD shape (a second check rejects days that do not exist, like 2026-02-30) | `2026-10-12` passes, `2026-13-01` fails |
| Category | `/^[A-Za-z]+(?:[ -][A-Za-z]+)*$/` | Letters with single spaces or hyphens between words | `Self-care` passes, `Food2` fails |
| Advanced: back-reference | `/\b(\w+)\s+\1\b/i` | Warns about a repeated word in the description | `Airtime top up for for the week` shows a warning |
| Advanced: lookahead | `/^(?!0+(?:\.0+)?$)\d+(?:\.\d{1,4})?$/` | Exchange rate must be above zero | `1450` passes, `0` and `0.00` fail |

Doubled spaces inside a description are collapsed to one space when you save.

Search patterns to try in the search box:

- `(coffee|tea)` finds drinks
- `\.\d{2}\b` finds amounts with cents
- `\b(\w+)\s+\1\b` finds repeated words
- `^Moto` finds descriptions that start with Moto

A broken pattern such as `(` never crashes the page. The search box shows a message and all records stay visible.

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

After adding, the cursor returns to the description field. After deleting, focus moves to the Records heading. After saving or cancelling an edit, focus returns to that row's Edit button.

## Accessibility notes

- Landmarks: header, nav, main, footer, and a heading order that never skips a level.
- Skip link is the first thing a keyboard user reaches.
- Every input has a label tied to it. Hints and errors are linked with `aria-describedby`, and invalid fields get `aria-invalid`.
- Status messages use `role="status"` (polite). Errors and the over cap warning use `role="alert"` (assertive).
- Visible focus ring on every control.
- Search matches use the `<mark>` element, built with DOM methods, never innerHTML.
- The bar chart has a text summary, so the numbers are not only in the picture.
- Colors were chosen for readable contrast. Errors never rely on color alone, they also have text.
- `prefers-reduced-motion` turns animations off.
- Table cells keep their table roles even when the layout switches to cards on phones.

## Responsive design

Mobile first. Base styles are for about 360px. Extra rules at 480px, 768px and 1024px.

## Run it

Modules do not load from a `file://` address, so use a small local server:

```
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Run the tests

With the server running, open http://localhost:8000/tests.html. The page lists every check as PASS or FAIL and shows a total at the top. The tests cover the regex rules, search, stats, sorting, JSON round trip, import validation and seed.json.

## Project structure

```
index.html
tests.html
seed.json
scripts/   main, state, storage, ui, validators, search, stats
styles/    base, layout, components
tests/     tests.js
docs/      wireframes
```

## Contact

- GitHub: https://github.com/Quentin712
- Email: q.ntore@alustudent.com
