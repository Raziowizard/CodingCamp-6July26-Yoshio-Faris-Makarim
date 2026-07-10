# Implementation Plan: Expense and Budget Visualizer

## Overview

Build a pure client-side web app with three files: `index.html`, `css/styles.css`, and `js/app.js`. The implementation follows a state → render loop where every mutation to the `transactions` array is immediately persisted to `localStorage` and triggers a full re-render of all affected components.

## Tasks

- [x] 1. Scaffold project files
  - [x] 1.1 Create `index.html` with full HTML shell structure
    - Add `<link>` to `css/styles.css`
    - Add Chart.js CDN `<script>` tag before `app.js`
    - Add `<script src="js/app.js" defer>` tag
    - Add static markup for all four UI regions: `#balance-display`, `#input-form`, `#transaction-list`, `#chart-section`
    - Include the `<form id="transaction-form" novalidate>` with three `.form-group` divs, each containing a `<label>`, an input/select, and a `<span class="error-message">` with `aria-live="polite"`
    - Include `<ul id="transactions-ul">` and `<canvas id="spending-chart">` with `<p id="chart-empty-msg" hidden>`
    - Wrap the form and chart side-by-side inside a `<div class="main-grid">`
    - _Requirements: 1.1, 1.2, 8.1, 8.5, 8.6_
  - [x] 1.2 Create `css/styles.css` and `js/app.js` as empty skeleton files
    - `css/styles.css`: add a comment header; `js/app.js`: add a comment header
    - _Requirements: 8.1, 8.2_

- [x] 2. Implement the data layer in `js/app.js`
  - [x] 2.1 Define global state, constants, and storage functions
    - Declare `let transactions = []` and `let chartInstance = null`
    - Declare `const STORAGE_KEY = "expense_transactions"` and `const CATEGORIES = ["Food", "Transport", "Fun"]`
    - Implement `generateId()`: returns `Date.now().toString(36) + Math.random().toString(36).slice(2)`
    - Implement `loadFromStorage()`: reads `STORAGE_KEY`, JSON-parses, validates shape, filters malformed entries, returns `[]` on any error — all inside `try/catch`
    - Implement `saveToStorage(txList)`: JSON-stringifies and sets `STORAGE_KEY`, wrapped in `try/catch` with `console.warn` on failure
    - _Requirements: 7.1, 7.3, 7.4_
  - [ ]* 2.2 Write property test for `loadFromStorage` (Property 11)
    - **Property 11: Malformed storage triggers graceful fallback**
    - Use `fast-check` — for any value that is not a valid JSON array of transactions, `loadFromStorage()` returns `[]` without throwing
    - **Validates: Requirements 7.4**

- [x] 3. Implement validation in `js/app.js`
  - [x] 3.1 Implement `validate(name, amount, category)`
    - Returns `{ name: string|null, amount: string|null, category: string|null }` — `null` means no error
    - Name: null if `!name || name.trim().length === 0` → `"Item Name is required."`
    - Amount: null if empty/undefined → `"Amount is required."`; if `isNaN(parsed) || parsed <= 0` → `"Amount must be a positive number."`
    - Category: null if not in `CATEGORIES` → `"Category is required."`
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [ ]* 3.2 Write property test for whitespace-only name rejection (Property 3)
    - **Property 3: Whitespace-only name is rejected**
    - Use `fc.stringMatching(/^\s*$/)` — `validate` always returns a non-null `name` error
    - **Validates: Requirements 2.1**
  - [ ]* 3.3 Write property test for non-positive amount rejection (Property 4)
    - **Property 4: Non-positive amount is rejected**
    - Use `fc.oneof(fc.constant(0), fc.float({max: 0}), fc.constant(NaN), fc.constant(""))` — `validate` always returns a non-null `amount` error
    - **Validates: Requirements 2.2, 2.3**

- [x] 4. Checkpoint — Verify data layer and validation
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement render functions in `js/app.js`
  - [x] 5.1 Implement `formatCurrency(amount)`
    - Use `Intl.NumberFormat` for locale-aware USD formatting; fallback to `amount.toFixed(2)` prefixed with `$`
    - _Requirements: 3.2, 5.1_
  - [x] 5.2 Implement `renderBalance()`
    - Sum all `transactions[i].amount` values; update `#balance-amount` textContent with `formatCurrency(sum)`
    - When `transactions` is empty, display `$0.00`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [ ]* 5.3 Write property test for balance display (Property 9)
    - **Property 9: Balance display equals the sum of all transaction amounts**
    - Use `fc.array(arbitraryTransaction())` — after `renderBalance()`, `#balance-amount` textContent equals `formatCurrency(sum of amounts)`
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
  - [x] 5.4 Implement `renderList()`
    - Clear `#transactions-ul` innerHTML and rebuild it from `transactions`
    - Each `<li class="transaction-item" data-id="...">` contains `.tx-name`, `.tx-amount` (formatted), `.tx-category`, and a `<button class="delete-btn" data-id="..." aria-label="Delete {name}">Delete</button>`
    - When `transactions` is empty, append `<li class="empty-state">No transactions yet.</li>`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1_
  - [ ]* 5.5 Write property test for transaction list insertion order (Property 5)
    - **Property 5: Transaction list preserves insertion order**
    - Use `fc.array(arbitraryTransaction())` — rendered `data-id` attributes appear in the same order as `transactions` array
    - **Validates: Requirements 3.1**
  - [ ]* 5.6 Write property test for rendered row completeness (Property 6)
    - **Property 6: Each rendered row contains all required data and a delete button**
    - For any non-empty transactions array, each `<li>` has `.tx-name`, `.tx-amount`, `.tx-category`, and a `.delete-btn` with matching `data-id`
    - **Validates: Requirements 3.2, 4.1**
  - [x] 5.7 Implement `renderChart()`
    - Destroy existing `chartInstance` if non-null; reset to `null`
    - When `transactions` is empty: set `canvas.hidden = true`, set `emptyMsg.hidden = false`, return
    - Otherwise: set `canvas.hidden = false`, `emptyMsg.hidden = true`
    - Aggregate `totals` per category, then create `new Chart(canvas, { type: 'pie', ... })` with colors `['#4CAF50', '#2196F3', '#FF9800']`, responsive true, legend at bottom, tooltip using `formatCurrency`
    - Assign result to `chartInstance`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  - [ ]* 5.8 Write property test for chart data (Property 10)
    - **Property 10: Chart data matches per-category sums**
    - Use `fc.array(arbitraryTransaction(), {minLength: 1})` — after `renderChart()`, the Chart instance's `data.datasets[0].data` equals `[sum(Food), sum(Transport), sum(Fun)]`
    - **Validates: Requirements 6.1, 6.4, 6.5**
  - [x] 5.9 Implement `renderAll()`
    - Call `renderBalance()`, `renderList()`, `renderChart()` in sequence
    - _Requirements: 1.3, 4.2, 5.2, 5.3, 6.4, 6.5_

- [x] 6. Implement event handlers and `init()` in `js/app.js`
  - [x] 6.1 Implement `handleFormSubmit(event)`
    - Call `event.preventDefault()`
    - Read values from `#item-name`, `#item-amount`, `#item-category`
    - Call `validate(name, amount, category)`; if any error is non-null, write each error message into the corresponding `#error-name`, `#error-amount`, `#error-category` spans and return
    - If valid: clear all error spans, create Transaction object (`id`, `name`, `amount: parseFloat(amount)`, `category`, `createdAt: Date.now()`), push to `transactions`, call `saveToStorage(transactions)`, call `renderAll()`, call `form.reset()`
    - _Requirements: 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4_
  - [ ]* 6.2 Write property test for valid transaction addition (Property 1)
    - **Property 1: Valid transaction addition grows the list**
    - Use `fc.string({minLength:1})`, `fc.float({min: 0.01})`, `fc.constantFrom(...CATEGORIES)` — after `handleFormSubmit` with valid input, `transactions.length` increases by 1 and the new transaction is last
    - **Validates: Requirements 1.3**
  - [ ]* 6.3 Write property test for form reset after valid submission (Property 2)
    - **Property 2: Form resets after valid submission**
    - For any valid transaction input, after submit completes, `#item-name`, `#item-amount`, and `#item-category` are all empty/default
    - **Validates: Requirements 1.5**
  - [x] 6.4 Implement `handleDeleteClick(event)` with event delegation
    - Check `event.target.classList.contains('delete-btn')`; if not, return
    - Read `id` from `event.target.dataset.id`
    - Set `transactions = transactions.filter(tx => tx.id !== id)`
    - Call `saveToStorage(transactions)`, then `renderAll()`
    - _Requirements: 4.2, 4.3_
  - [ ]* 6.5 Write property test for delete removes exactly one transaction (Property 7)
    - **Property 7: Deleting a transaction removes it from the list**
    - Use `fc.array(arbitraryTransaction(), {minLength: 1})` — after delete handler, array no longer contains the id and length decreases by exactly 1
    - **Validates: Requirements 4.2**
  - [ ]* 6.6 Write property test for storage consistency (Property 8)
    - **Property 8: Storage always reflects the current transactions state**
    - For any sequence of add/delete operations, `JSON.parse(localStorage.getItem(STORAGE_KEY))` equals the in-memory `transactions` array after each operation
    - **Validates: Requirements 1.4, 4.3**
  - [x] 6.7 Implement `init()`
    - Set `transactions = loadFromStorage()`
    - Attach `handleFormSubmit` as `submit` listener on `#transaction-form`
    - Attach `handleDeleteClick` as `click` listener on `#transactions-ul`
    - Call `renderAll()`
    - Wire `document.addEventListener('DOMContentLoaded', init)` at the bottom of the file
    - _Requirements: 7.1, 7.2, 8.6_

- [x] 7. Checkpoint — Verify full app logic
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Style the app in `css/styles.css`
  - [x] 8.1 Write base and reset styles
    - Apply `box-sizing: border-box` globally; set `body` font-family, background color, margin, and padding
    - _Requirements: 8.1, 8.3_
  - [x] 8.2 Style the Balance Display
    - Style `#balance-display` with heading and prominent `#balance-amount` text; ensure 4.5:1 contrast ratio
    - _Requirements: 5.1, 8.4_
  - [x] 8.3 Style the Input Form
    - Style `.form-group` with vertical label/input stacking; style error spans with `.error-message` class (red, small text); style the submit button
    - _Requirements: 1.1, 2.1, 8.4, 8.5_
  - [x] 8.4 Style the Transaction List
    - Style `#transaction-list` with `max-height` and `overflow-y: auto` for scrollability; style `.transaction-item` rows with flex layout for name/amount/category/delete button; style `.empty-state`
    - _Requirements: 3.2, 3.3, 3.4, 4.1_
  - [x] 8.5 Style the Chart section
    - Style `#chart-section` container and `#chart-container`; ensure the canvas is responsive; style `#chart-empty-msg`
    - _Requirements: 6.6_
  - [x] 8.6 Implement responsive two-column layout
    - Style `.main-grid` with `display: flex; flex-wrap: wrap; gap: 1rem`
    - Set `#input-form { flex: 1 1 300px }` and `#chart-section { flex: 1 1 300px }`
    - Add `@media (max-width: 600px) { .main-grid { flex-direction: column } }` for single-column mobile
    - Ensure `min-width: 0` and `width: 100%` on flexible items to prevent overflow at 320px
    - _Requirements: 8.3_
  - [ ]* 8.7 Verify accessibility: all form inputs have associated labels (Property 12)
    - **Property 12: All form input fields have associated label elements**
    - Static DOM assertion — for each `<input>` and `<select>` with an `id`, a `<label for="...">` with the same value must exist
    - **Validates: Requirements 8.5**

- [x] 9. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation between logical phases
- Property tests use [fast-check](https://github.com/dubzzz/fast-check) and can be run via Node.js without a build tool
- Unit tests validate specific examples and edge cases; property tests validate universal correctness invariants
- The app requires no build step — open `index.html` directly in a browser to run it
- Chart.js is loaded from CDN; tests that exercise `renderChart()` may need a DOM environment such as jsdom

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "5.1"] },
    { "id": 4, "tasks": ["5.2", "5.4"] },
    { "id": 5, "tasks": ["5.3", "5.5", "5.6", "5.7"] },
    { "id": 6, "tasks": ["5.8", "5.9"] },
    { "id": 7, "tasks": ["6.1"] },
    { "id": 8, "tasks": ["6.2", "6.3", "6.4"] },
    { "id": 9, "tasks": ["6.5", "6.6", "6.7"] },
    { "id": 10, "tasks": ["8.1"] },
    { "id": 11, "tasks": ["8.2", "8.3", "8.4", "8.5"] },
    { "id": 12, "tasks": ["8.6"] },
    { "id": 13, "tasks": ["8.7"] }
  ]
}
```
