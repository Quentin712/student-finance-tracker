# Student Finance Tracker: Spec and Accessibility Plan

This is the M1 document: purpose, data model, wireframes, regex rules and accessibility plan.

Note: this file and the wireframes were written after the first build, to document the layout and decisions as they ended up. The commit history shows when they were added.

## Purpose

A simple finance tracker for students. It records spending, lets the user sort and search with regular expressions, and warns when a monthly spending cap is reached. All data stays in the browser (localStorage).

## Sections (single page, one section each)

1. About: purpose and contact (GitHub and email)
2. Dashboard: total records, total spent, top category, cap left, cap progress bar, 7 day chart
3. Records: search, case toggle, sort, table on wide screens and cards on phones, inline edit and delete
4. Add a transaction: form with validation
5. Settings: cap, display currency, exchange rates, categories, export, import, sample data, delete all

## Wireframes

- `wireframes/mobile-360.svg`: one column, records as cards
- `wireframes/tablet-768.svg`: header in a row, four stat boxes, records as a table
- `wireframes/desktop-1024.svg`: wider layout with the same structure

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

- `id` is unique and counts up (txn_0001, txn_0002, ...)
- `amount` is always saved in the base currency (RWF)
- `updatedAt` changes every time a record is edited
- Storage keys: `sft:records` and `sft:settings`

## Regex rules

| Field | Pattern | Purpose |
| --- | --- | --- |
| Description | `/^\S(?:.*\S)?$/` | No leading or trailing space |
| Amount | `/^(0\|[1-9]\d*)(\.\d{1,2})?$/` | Number with up to 2 decimals |
| Date | `/^\d{4}-(0[1-9]\|1[0-2])-(0[1-9]\|[12]\d\|3[01])$/` | YYYY-MM-DD |
| Category | `/^[A-Za-z]+(?:[ -][A-Za-z]+)*$/` | Letters, spaces, hyphens |
| Advanced: back-reference | `/\b(\w+)\s+\1\b/i` | Warn about repeated words |
| Advanced: lookahead | `/^(?!0+(?:\.0+)?$)\d+(?:\.\d{1,4})?$/` | Exchange rate above zero |

## Module plan

| File | Job |
| --- | --- |
| `scripts/storage.js` | Read and write localStorage, JSON export and parse |
| `scripts/state.js` | App data, add, update, delete, sort |
| `scripts/validators.js` | Regex rules, form checks, import validation |
| `scripts/search.js` | Safe regex compiler and match highlighting |
| `scripts/stats.js` | Dashboard numbers |
| `scripts/ui.js` | Everything that draws on the page |
| `scripts/main.js` | Starts the app and wires up events |

## Accessibility plan

- Landmarks: header, nav, main, footer. Headings go h1, h2, h3 without skipping a level.
- A skip link is the first focusable item.
- Every input has a visible label. Hints and error messages are tied to the input with `aria-describedby`. Invalid fields get `aria-invalid="true"`.
- Messages: `role="status"` for polite updates, `role="alert"` for errors and for going over the cap.
- Visible focus ring on every control (3px outline). Buttons are at least 44px tall on forms.
- Keyboard: everything works with Tab, Enter, Space and Escape. After add, delete, save and cancel, focus is moved to a sensible place.
- Search highlights use `<mark>`, built with DOM methods (no innerHTML), so the text stays safe and readable by screen readers.
- Contrast: dark text on light backgrounds, white on dark blue for the header and buttons. Errors also use text, not only color.
- Motion: short transitions only, switched off for people who ask for reduced motion.
- The bar chart has a text summary under it.

## Breakpoints

Mobile first. Base styles target about 360px. Extra rules at 480px, 768px and 1024px.
