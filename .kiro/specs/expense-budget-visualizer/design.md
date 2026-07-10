# Design Document — Expense and Budget Visualizer

## Overview

The Expense and Budget Visualizer is a self-contained, client-side web application built with plain HTML, CSS, and vanilla JavaScript. No frameworks, transpilers, or build tools are involved. The application runs entirely in the browser by opening `index.html` directly, relies on the browser's `localStorage` API for persistence, and uses Chart.js (loaded from a CDN) to render a pie chart of spending by category.

The design is intentionally minimal and file-flat: one HTML file, one CSS file, one JavaScript file. All application state lives in a single in-memory array inside `app.js`, and every UI update is a full re-render of the affected component triggered by state mutations.

---

## Architecture

```
Browser
  └── index.html  (HTML shell + CDN script tags)
       ├── css/styles.css    (all styling, single file)
       └── js/app.js         (all application logic, single file)

External dependency (CDN):
  └── Chart.js  https://cdn.jsdelivr.net/npm/chart.js
```

The architecture follows a simple **state → render** loop:

1. On `DOMContentLoaded`, `init()` loads persisted data from `localStorage` into the `transactions` array.
2. Any user action (add, delete) mutates `transactions`, saves to `localStorage`, then calls `renderAll()`.
3. `renderAll()` re-renders the balance display, the transaction list, and the chart in one pass.

There are no ES modules, no `import`/`export` statements, and no module bundlers. All functions are declared in the global scope of `app.js`.

---

## File Structure

```
index.html
css/
  styles.css
js/
  app.js
```

### `index.html`

The HTML shell provides:
- A `<link>` to `css/styles.css`
- A `<script src="https://cdn.jsdelivr.net/npm/chart.js">` tag **before** `app.js`
- A `<script src="js/app.js" defer>` tag
- Static markup for all four UI regions (see Component Breakdown below)

### `css/styles.css`

All visual styles, responsive breakpoints, and state classes (e.g., `.error-message`, `.empty-state`) live in this single file.

### `js/app.js`

All application logic. No external dependencies other than Chart.js available on `window.Chart`.

---

## Data Models

### Transaction Object

```js
{
  id: string,        // Unique identifier — Date.now().toString(36) + random suffix
  name: string,      // Item name entered by the user, max 100 chars
  amount: number,    // Positive float, e.g. 12.50 — max 999999999.99
  category: string,  // One of: "Food" | "Transport" | "Fun"
  createdAt: number  // Unix timestamp in milliseconds, from Date.now()
}
```

### localStorage Persistence

- **Key:** `"expense_transactions"`
- **Value:** JSON-serialized array of Transaction objects, e.g. `[{...}, {...}]`
- An empty list is stored as `"[]"`.

### In-Memory State

```js
let transactions = []; // Single source of truth; populated on init()
```

---

## Component Breakdown

### BalanceDisplay

**HTML structure:**
```html
<section id="balance-display">
  <h2>Total Spent</h2>
  <p id="balance-amount">$0.00</p>
</section>
```

**Responsibilities:**
- Show the sum of all `transaction.amount` values formatted as a currency string (e.g. `$42.50`).
- Display `$0.00` when the transactions array is empty.

**Key DOM interactions:**
- `renderBalance()` updates the `textContent` of `#balance-amount`.

---

### InputForm

**HTML structure:**
```html
<section id="input-form">
  <form id="transaction-form" novalidate>
    <div class="form-group">
      <label for="item-name">Item Name</label>
      <input type="text" id="item-name" name="item-name" placeholder="e.g. Coffee" maxlength="100">
      <span class="error-message" id="error-name" aria-live="polite"></span>
    </div>
    <div class="form-group">
      <label for="item-amount">Amount</label>
      <input type="number" id="item-amount" name="item-amount" placeholder="0.00" min="0.01" step="0.01">
      <span class="error-message" id="error-amount" aria-live="polite"></span>
    </div>
    <div class="form-group">
      <label for="item-category">Category</label>
      <select id="item-category" name="item-category">
        <option value="">-- Select --</option>
        <option value="Food">Food</option>
        <option value="Transport">Transport</option>
        <option value="Fun">Fun</option>
      </select>
      <span class="error-message" id="error-category" aria-live="polite"></span>
    </div>
    <button type="submit" id="add-btn">Add</button>
  </form>
</section>
```

**Responsibilities:**
- Accept user input for name, amount, and category.
- Display inline validation errors beneath each field.
- Reset all fields after a successful submission.

**Key DOM interactions:**
- `submit` event on `#transaction-form` triggers validation and, if valid, creates a new Transaction.
- Error messages are written into the `.error-message` `<span>` elements.
- On success, `form.reset()` is called to clear all fields.

---

### TransactionList

**HTML structure:**
```html
<section id="transaction-list">
  <h2>Transactions</h2>
  <ul id="transactions-ul">
    <!-- Populated by renderList() -->
  </ul>
</section>
```

Each list item rendered by `renderList()`:
```html
<li class="transaction-item" data-id="abc123">
  <span class="tx-name">Coffee</span>
  <span class="tx-amount">$3.50</span>
  <span class="tx-category">Food</span>
  <button class="delete-btn" data-id="abc123" aria-label="Delete Coffee">Delete</button>
</li>
```

**Responsibilities:**
- Render one `<li>` per transaction, in insertion order (oldest first).
- Display `<li class="empty-state">No transactions yet.</li>` when the array is empty.
- Handle delete button clicks via event delegation on `#transactions-ul`.

**Key DOM interactions:**
- `renderList()` clears `#transactions-ul` and rebuilds its `innerHTML`.
- A single delegated `click` listener on `#transactions-ul` checks `event.target.classList.contains('delete-btn')` and reads `event.target.dataset.id` to identify the transaction to remove.

---

### Chart

**HTML structure:**
```html
<section id="chart-section">
  <h2>Spending by Category</h2>
  <div id="chart-container">
    <canvas id="spending-chart"></canvas>
    <p id="chart-empty-msg" hidden>No data yet.</p>
  </div>
</section>
```

**Responsibilities:**
- Render a Chart.js pie chart showing per-category spending totals.
- Show `#chart-empty-msg` and hide the canvas when no transactions exist.
- Use distinct, accessible colors for each category:
  - Food — `#4CAF50` (green)
  - Transport — `#2196F3` (blue)
  - Fun — `#FF9800` (orange)
- Display a legend with category labels.

**Key DOM interactions:**
- `renderChart()` destroys the existing Chart instance (if any) and creates a new one.
- When transactions is empty, the canvas is hidden and the empty message is shown.

---

## JavaScript Architecture

All code resides in `js/app.js` as plain global functions and variables.

```js
// ── State ────────────────────────────────────────────────
let transactions = [];
let chartInstance = null;

const STORAGE_KEY = "expense_transactions";
const CATEGORIES  = ["Food", "Transport", "Fun"];

// ── Storage Layer ─────────────────────────────────────────
function loadFromStorage() { ... }   // Returns Transaction[] or []
function saveToStorage(txList) { ... } // JSON.stringify then localStorage.setItem

// ── Validation ────────────────────────────────────────────
function validate(name, amount, category) { ... }
// Returns: { name: string|null, amount: string|null, category: string|null }
// null means no error for that field

// ── ID Generation ─────────────────────────────────────────
function generateId() { ... }
// Returns: Date.now().toString(36) + Math.random().toString(36).slice(2)

// ── Render Functions ──────────────────────────────────────
function renderAll() { renderBalance(); renderList(); renderChart(); }
function renderBalance() { ... }  // Updates #balance-amount textContent
function renderList() { ... }     // Rebuilds #transactions-ul innerHTML
function renderChart() { ... }    // Destroys + recreates Chart.js instance

// ── Currency Formatter ────────────────────────────────────
function formatCurrency(amount) { ... }
// Uses Intl.NumberFormat for locale-aware formatting, fallback to toFixed(2)

// ── Event Handlers ────────────────────────────────────────
function handleFormSubmit(event) { ... }
// 1. event.preventDefault()
// 2. Read input values
// 3. validate() → show errors or clear them
// 4. If valid: create Transaction, push to transactions, saveToStorage, renderAll, form.reset()

function handleDeleteClick(event) { ... }
// Delegated handler on #transactions-ul
// If delete-btn clicked: filter transactions by id, saveToStorage, renderAll

// ── Init ──────────────────────────────────────────────────
function init() {
  transactions = loadFromStorage();
  document.getElementById('transaction-form').addEventListener('submit', handleFormSubmit);
  document.getElementById('transactions-ul').addEventListener('click', handleDeleteClick);
  renderAll();
}

document.addEventListener('DOMContentLoaded', init);
```

### Execution Flow: Add a Transaction

```
User fills form → clicks "Add"
  → handleFormSubmit()
    → validate(name, amount, category)
    → if errors: display inline error messages, return
    → else: clearErrors()
             create Transaction object
             transactions.push(transaction)
             saveToStorage(transactions)
             renderAll()
             form.reset()
```

### Execution Flow: Delete a Transaction

```
User clicks "Delete" on a row
  → handleDeleteClick() (delegated)
    → read data-id from button
    → transactions = transactions.filter(tx => tx.id !== id)
    → saveToStorage(transactions)
    → renderAll()
```

---

## Validation Logic

```js
function validate(name, amount, category) {
  const errors = { name: null, amount: null, category: null };

  // Name: required, must not be empty or whitespace-only
  if (!name || name.trim().length === 0) {
    errors.name = "Item Name is required.";
  }

  // Amount: required, must parse to a finite number greater than 0
  const parsed = parseFloat(amount);
  if (amount === "" || amount === null || amount === undefined) {
    errors.amount = "Amount is required.";
  } else if (isNaN(parsed) || parsed <= 0) {
    errors.amount = "Amount must be a positive number.";
  }

  // Category: must be one of the valid options
  if (!category || !CATEGORIES.includes(category)) {
    errors.category = "Category is required.";
  }

  return errors;
}
```

The function always returns the `errors` object — it never throws. The caller checks whether all three error fields are `null` to determine if the form is valid. Error display and clearing are the caller's responsibility.

---

## Chart Integration

Chart.js is loaded via CDN and accessed via the global `window.Chart`.

```js
function renderChart() {
  const canvas = document.getElementById('spending-chart');
  const emptyMsg = document.getElementById('chart-empty-msg');

  // Destroy existing instance to prevent memory leaks and ghost datasets
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  if (transactions.length === 0) {
    canvas.hidden = true;
    emptyMsg.hidden = false;
    return;
  }

  canvas.hidden = false;
  emptyMsg.hidden = true;

  // Aggregate amounts per category
  const totals = {
    Food:      0,
    Transport: 0,
    Fun:       0
  };
  transactions.forEach(tx => {
    totals[tx.category] += tx.amount;
  });

  chartInstance = new Chart(canvas, {
    type: 'pie',
    data: {
      labels: CATEGORIES,
      datasets: [{
        data: CATEGORIES.map(cat => totals[cat]),
        backgroundColor: ['#4CAF50', '#2196F3', '#FF9800'],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: true,
          position: 'bottom'
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${formatCurrency(ctx.parsed)}`
          }
        }
      }
    }
  });
}
```

The chart instance is held in the module-level `chartInstance` variable. Every call to `renderChart()` destroys the previous instance before creating a new one. This prevents Chart.js from layering multiple canvases and leaking memory.

---

## Responsive Layout Strategy

The layout uses **CSS Flexbox** for both the overall page structure and the form controls.

### Desktop layout (≥ 600px)

```
┌─────────────────────────────────┐
│  Balance Display (full width)   │
├─────────────────┬───────────────┤
│  Input Form     │  Chart        │
├─────────────────┴───────────────┤
│  Transaction List (full width)  │
└─────────────────────────────────┘
```

The two-column middle row is achieved with:
```css
.main-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}
#input-form   { flex: 1 1 300px; }
#chart-section { flex: 1 1 300px; }
```

### Mobile layout (< 600px)

```css
@media (max-width: 600px) {
  .main-grid {
    flex-direction: column;
  }
}
```

All sections stack into a single column. The transaction list uses `max-height` and `overflow-y: auto` to remain scrollable when it contains many items regardless of viewport size.

### Minimum supported width

All elements have `min-width: 0` or `box-sizing: border-box` to prevent overflow at 320px.

---

## Error Handling

### localStorage Unavailability

`localStorage` can be unavailable (e.g., in private browsing mode with certain browser settings, or when storage quota is exceeded). Both `loadFromStorage()` and `saveToStorage()` are wrapped in `try/catch`:

```js
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Validate that parsed value is an array of valid-looking objects
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(tx =>
      tx &&
      typeof tx.id === 'string' &&
      typeof tx.name === 'string' &&
      typeof tx.amount === 'number' &&
      CATEGORIES.includes(tx.category) &&
      typeof tx.createdAt === 'number'
    );
  } catch (e) {
    // JSON.parse failure, SecurityError, or QuotaExceededError on read
    return [];
  }
}

function saveToStorage(txList) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(txList));
  } catch (e) {
    // Storage quota exceeded or SecurityError — silently degrade
    // The in-memory state is still valid; user just loses persistence
    console.warn('Unable to save to localStorage:', e.message);
  }
}
```

**Degradation behavior:**
- If `loadFromStorage()` returns `[]` due to any error (malformed JSON, wrong type, missing key), the app initializes with an empty list and operates normally.
- If `saveToStorage()` fails, the in-memory state (`transactions` array) remains correct for the current session. The user is not notified unless the app is extended to include a status indicator, but no crash or data corruption occurs.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Valid transaction addition grows the list

*For any* non-empty name string, positive numeric amount, and valid category, calling `addTransaction` should result in the `transactions` array growing in length by exactly one and the new transaction appearing at the end.

**Validates: Requirements 1.3**

---

### Property 2: Form resets after valid submission

*For any* valid transaction input, after a successful form submission the input fields for name, amount, and category SHALL each return to their default/empty state.

**Validates: Requirements 1.5**

---

### Property 3: Whitespace-only name is rejected

*For any* string composed entirely of whitespace characters (including the empty string), `validate(name, amount, category)` SHALL return a non-null error for the `name` field.

**Validates: Requirements 2.1**

---

### Property 4: Non-positive amount is rejected

*For any* amount value that is zero, negative, NaN, or the empty string, `validate(name, amount, category)` SHALL return a non-null error for the `amount` field.

**Validates: Requirements 2.2, 2.3**

---

### Property 5: Transaction list preserves insertion order

*For any* sequence of transactions added in a defined order, the IDs rendered in `#transactions-ul` SHALL appear in the same order as they were inserted into the `transactions` array (oldest first).

**Validates: Requirements 3.1**

---

### Property 6: Each rendered row contains all required data and a delete button

*For any* transaction in the `transactions` array, its corresponding rendered `<li>` element SHALL contain the transaction's name, formatted amount, category, and a delete button with a `data-id` attribute matching the transaction's id.

**Validates: Requirements 3.2, 4.1**

---

### Property 7: Deleting a transaction removes it from the list

*For any* transaction present in `transactions`, after calling the delete handler with that transaction's id, the `transactions` array SHALL no longer contain any element with that id, and the array length SHALL decrease by exactly one.

**Validates: Requirements 4.2**

---

### Property 8: Storage always reflects the current transactions state

*For any* sequence of add and delete operations, after each operation `localStorage.getItem("expense_transactions")` SHALL deserialize to an array that is structurally equal to the current in-memory `transactions` array.

**Validates: Requirements 1.4, 4.3**

---

### Property 9: Balance display equals the sum of all transaction amounts

*For any* array of transactions (including the empty array), the value displayed in `#balance-amount` SHALL equal the formatted result of summing all `transaction.amount` values. An empty array SHALL produce `$0.00`.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

---

### Property 10: Chart data matches per-category sums

*For any* non-empty array of transactions, the `data` array passed to the Chart.js instance SHALL contain exactly the sum of `amount` values for `Food`, `Transport`, and `Fun` respectively, in that order.

**Validates: Requirements 6.1, 6.4, 6.5**

---

### Property 11: Malformed storage triggers graceful fallback

*For any* string stored in `localStorage` under `"expense_transactions"` that is not valid JSON, not an array, or contains elements missing required fields, `loadFromStorage()` SHALL return an empty array without throwing and the app SHALL initialize normally.

**Validates: Requirements 7.4**

---

### Property 12: All form input fields have associated label elements

*For any* `<input>` or `<select>` element with an `id` attribute in the Input_Form, there SHALL exist a `<label>` element in the document with a `for` attribute equal to that `id`.

**Validates: Requirements 8.5**

---

## Testing Strategy

### Unit Tests (Example-Based)

These cover specific behaviors and edge cases that are not universal:

| Test | Covers |
|---|---|
| Input form renders three fields and an "Add" button | 1.1, 1.2 |
| Empty transactions list shows "No transactions yet." | 3.4 |
| Chart shows empty state when no transactions exist | 6.6 |
| Chart config uses three distinct colors and enables legend | 6.2, 6.3 |
| `init()` reads pre-populated localStorage and renders all components | 7.1, 7.2 |
| All four core components are visible on page load | 8.6 |

### Property-Based Tests

Property-based testing (PBT) is applicable here because the core logic functions (`validate`, `renderBalance`, `renderChart` data aggregation, `renderList`, `loadFromStorage`) are pure or near-pure with clear input/output behavior and large input spaces.

**Library:** [fast-check](https://github.com/dubzzz/fast-check) (JavaScript, works without build tools via CDN or Node.js)

**Configuration:** Each property test runs a minimum of **100 iterations**.

**Tag format:** `// Feature: expense-budget-visualizer, Property {N}: {property_text}`

| Property | Test Description |
|---|---|
| Property 1 | `fc.property(fc.string({minLength:1}), fc.float({min:0.01}), fc.constantFrom(...CATEGORIES), ...)` |
| Property 2 | Generate valid inputs, simulate submit, assert `form.reset()` was called or fields are empty |
| Property 3 | `fc.property(fc.stringMatching(/^\s*$/), ...)` → `validate` returns name error |
| Property 4 | `fc.property(fc.oneof(fc.constant(0), fc.float({max:0}), fc.constant(NaN), fc.constant("")), ...)` |
| Property 5 | `fc.property(fc.array(arbitraryTransaction()), ...)` → rendered order matches array order |
| Property 6 | `fc.property(fc.array(arbitraryTransaction(), {minLength:1}), ...)` → each row has required spans + delete btn |
| Property 7 | `fc.property(fc.array(arbitraryTransaction(), {minLength:1}), ...)` → delete removes exactly one |
| Property 8 | `fc.property(fc.array(arbitraryTransaction()), ...)` → storage equals in-memory after each op |
| Property 9 | `fc.property(fc.array(arbitraryTransaction()), ...)` → balance equals computed sum |
| Property 10 | `fc.property(fc.array(arbitraryTransaction(), {minLength:1}), ...)` → chart data equals category sums |
| Property 11 | `fc.property(fc.oneof(fc.string(), fc.constant(null), fc.anything()), ...)` → `loadFromStorage` returns `[]` |
| Property 12 | Static DOM assertion — for each input/select id, a matching label `for` exists |

### Integration Tests

These verify the end-to-end wiring between components that cannot be validated by pure function tests:

- Load the app with data pre-seeded in `localStorage`, verify the DOM reflects the data (covers 7.2)
- Add a transaction via form submission, verify balance, list, and chart all update (covers 1.3, 5.2, 6.4)
- Delete a transaction, verify balance, list, and chart all update (covers 4.2, 5.3, 6.5)

### Smoke Tests

One-time checks that do not benefit from repeated execution:

- `css/styles.css` file exists (8.1)
- `js/app.js` file exists (8.2)
- Page renders without errors at 320px and 1920px viewport widths (8.3)
- Color contrast meets WCAG AA (8.4) — verified with an automated accessibility tool
