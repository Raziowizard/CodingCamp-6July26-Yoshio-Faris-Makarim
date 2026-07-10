// Expense & Budget Visualizer — app.js
// All application logic lives in this single file.

// ── State ────────────────────────────────────────────────
let transactions = [];
let chartInstance = null;
let spendingLimit = null; // null means no limit set

// ── Constants ─────────────────────────────────────────────
const STORAGE_KEY = 'expense_transactions';
const CUSTOM_CATEGORIES_KEY = 'expense_custom_categories';
const LIMIT_KEY = 'expense_spending_limit';
const THEME_KEY = 'expense_theme';
let CATEGORIES = ['Food', 'Transport', 'Fun'];

const CATEGORY_COLORS = {
  Food: '#4CAF50',
  Transport: '#2196F3',
  Fun: '#FF9800'
};
const PALETTE = ['#9C27B0','#00BCD4','#FF5722','#607D8B','#E91E63','#009688','#795548','#3F51B5'];
let paletteIndex = 0;

function getCategoryColor(cat) {
  if (CATEGORY_COLORS[cat]) return CATEGORY_COLORS[cat];
  return CATEGORY_COLORS[cat];
}

// ── ID Generation ─────────────────────────────────────────
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ── Storage Layer ─────────────────────────────────────────
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(function(tx) {
      return (
        tx &&
        typeof tx.id === 'string' &&
        typeof tx.name === 'string' &&
        typeof tx.amount === 'number' &&
        typeof tx.category === 'string' && tx.category.trim().length > 0 &&
        typeof tx.createdAt === 'number'
      );
    });
  } catch (e) {
    return [];
  }
}

function saveToStorage(txList) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(txList));
  } catch (e) {
    console.warn('Unable to save to localStorage:', e.message);
  }
}

// ── Custom Categories ─────────────────────────────────────
function loadCustomCategories() {
  try {
    const raw = localStorage.getItem(CUSTOM_CATEGORIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(function(c) { return typeof c === 'string' && c.trim().length > 0; }) : [];
  } catch (e) {
    return [];
  }
}

function saveCustomCategories() {
  const custom = CATEGORIES.filter(function(c) { return !['Food','Transport','Fun'].includes(c); });
  try {
    localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(custom));
  } catch (e) {
    console.warn('Unable to save custom categories:', e.message);
  }
}

function addCategory(name) {
  var trimmed = name.trim();
  if (!trimmed) return;
  trimmed = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  if (CATEGORIES.some(function(c) { return c.toLowerCase() === trimmed.toLowerCase(); })) return;
  CATEGORY_COLORS[trimmed] = PALETTE[paletteIndex % PALETTE.length];
  paletteIndex++;
  CATEGORIES.push(trimmed);
  saveCustomCategories();
  rebuildCategorySelect();
}

function rebuildCategorySelect() {
  var select = document.getElementById('item-category');
  var currentVal = select.value;
  select.innerHTML = '<option value="">-- Select --</option>';
  CATEGORIES.forEach(function(cat) {
    var opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });
  if (CATEGORIES.includes(currentVal)) select.value = currentVal;
}

function handleAddCategory() {
  var input = document.getElementById('new-category-input');
  var val = input.value.trim();
  if (!val) return;
  addCategory(val);
  input.value = '';
  input.focus();
}

// ── Spending Limit ────────────────────────────────────────
function loadLimit() {
  try {
    const raw = localStorage.getItem(LIMIT_KEY);
    if (raw === null) return null;
    const val = parseFloat(raw);
    return isNaN(val) || val <= 0 ? null : val;
  } catch (e) {
    return null;
  }
}

function saveLimit(val) {
  try {
    if (val === null) {
      localStorage.removeItem(LIMIT_KEY);
    } else {
      localStorage.setItem(LIMIT_KEY, String(val));
    }
  } catch (e) {
    console.warn('Unable to save limit:', e.message);
  }
}

function handleSetLimit() {
  var input = document.getElementById('limit-input');
  var val = parseFloat(input.value);
  if (isNaN(val) || val <= 0) return;
  spendingLimit = val;
  saveLimit(spendingLimit);
  document.getElementById('clear-limit-btn').hidden = false;
  renderBalance();
}

function handleClearLimit() {
  spendingLimit = null;
  saveLimit(null);
  document.getElementById('limit-input').value = '';
  document.getElementById('clear-limit-btn').hidden = true;
  renderBalance();
}

// ── Theme ─────────────────────────────────────────────────
function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    var btn = document.getElementById('theme-toggle');
    if (btn) { btn.textContent = '☀ Light mode'; btn.setAttribute('aria-label', 'Switch to light mode'); }
  } else {
    document.documentElement.removeAttribute('data-theme');
    var btn = document.getElementById('theme-toggle');
    if (btn) { btn.textContent = '🌙 Dark mode'; btn.setAttribute('aria-label', 'Switch to dark mode'); }
  }
}

function handleThemeToggle() {
  var current = document.documentElement.getAttribute('data-theme');
  var next = current === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem(THEME_KEY, next); } catch(e) {}
  applyTheme(next);
}

// ── Validation ────────────────────────────────────────────
function validate(name, amount, category) {
  var errors = { name: null, amount: null, category: null };

  // Name: required, must not be empty or whitespace-only
  if (!name || name.trim().length === 0) {
    errors.name = 'Item Name is required.';
  }

  // Amount: required, must be a positive finite number
  if (amount === '' || amount === null || amount === undefined) {
    errors.amount = 'Amount is required.';
  } else {
    var parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      errors.amount = 'Amount must be a positive number.';
    }
  }

  // Category: must be one of the valid options
  if (!category || !CATEGORIES.includes(category)) {
    errors.category = 'Category is required.';
  }
  return errors;
}

// ── Currency Formatter ────────────────────────────────────
function formatCurrency(amount) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (e) {
    return '$' + Number(amount).toFixed(2);
  }
}

// ── Render: Balance ───────────────────────────────────────
function renderBalance() {
  var sum = transactions.reduce(function(acc, tx) {
    return acc + tx.amount;
  }, 0);
  document.getElementById('balance-amount').textContent = formatCurrency(sum);

  var warning = document.getElementById('limit-warning');
  var balanceSection = document.getElementById('balance-display');
  if (spendingLimit !== null && sum > spendingLimit) {
    balanceSection.classList.add('over-limit');
    warning.hidden = false;
  } else {
    balanceSection.classList.remove('over-limit');
    warning.hidden = true;
  }
}

// ── Render: Transaction List ──────────────────────────────
function renderList() {
  var ul = document.getElementById('transactions-ul');
  ul.innerHTML = '';

  if (transactions.length === 0) {
    var empty = document.createElement('li');
    empty.className = 'empty-state';
    empty.textContent = 'No transactions yet.';
    ul.appendChild(empty);
    return;
  }

  transactions.forEach(function(tx) {
    var li = document.createElement('li');
    li.className = 'transaction-item';
    li.dataset.id = tx.id;

    var name = document.createElement('span');
    name.className = 'tx-name';
    name.textContent = tx.name.length > 50 ? tx.name.slice(0, 50) + '…' : tx.name;

    var amount = document.createElement('span');
    amount.className = 'tx-amount';
    amount.textContent = formatCurrency(tx.amount);

    var category = document.createElement('span');
    category.className = 'tx-category';
    category.textContent = tx.category;

    var btn = document.createElement('button');
    btn.className = 'delete-btn';
    btn.dataset.id = tx.id;
    btn.setAttribute('aria-label', 'Delete ' + tx.name);
    btn.textContent = 'Delete';

    li.appendChild(name);
    li.appendChild(amount);
    li.appendChild(category);
    li.appendChild(btn);
    ul.appendChild(li);
  });
}

// ── Render: Chart ─────────────────────────────────────────
function renderChart() {
  var canvas = document.getElementById('spending-chart');
  var emptyMsg = document.getElementById('chart-empty-msg');

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

  var totals = {};
  CATEGORIES.forEach(function(cat) { totals[cat] = 0; });
  transactions.forEach(function(tx) {
    if (totals[tx.category] === undefined) totals[tx.category] = 0;
    totals[tx.category] += tx.amount;
  });

  // Only include categories with a non-zero total
  var labels = [];
  var data = [];
  var colors = [];
  CATEGORIES.forEach(function(cat) {
    if (totals[cat] > 0) {
      labels.push(cat);
      data.push(totals[cat]);
      colors.push(CATEGORY_COLORS[cat] || '#999999');
    }
  });

  chartInstance = new Chart(canvas, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors,
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
            label: function(ctx) {
              return ' ' + ctx.label + ': ' + formatCurrency(ctx.parsed);
            }
          }
        }
      }
    }
  });
}

// ── Render: All ───────────────────────────────────────────
function renderAll() {
  renderBalance();
  renderList();
  renderChart();
}

// ── Event Handlers ────────────────────────────────────────
function handleFormSubmit(event) {
  event.preventDefault();

  var nameInput = document.getElementById('item-name');
  var amountInput = document.getElementById('item-amount');
  var categoryInput = document.getElementById('item-category');

  var name = nameInput.value.trim();
  var amount = amountInput.value;
  var category = categoryInput.value;

  var errors = validate(name, amount, category);

  // Display or clear error messages
  document.getElementById('error-name').textContent = errors.name || '';
  document.getElementById('error-amount').textContent = errors.amount || '';
  document.getElementById('error-category').textContent = errors.category || '';

  // If any error exists, stop here
  if (errors.name || errors.amount || errors.category) {
    return;
  }

  // Create and save the new transaction
  var tx = {
    id: generateId(),
    name: name,
    amount: parseFloat(amount),
    category: category,
    createdAt: Date.now()
  };

  transactions.push(tx);
  saveToStorage(transactions);
  renderAll();

  // Reset form to defaults
  event.target.reset();
}

function handleDeleteClick(event) {
  if (!event.target.classList.contains('delete-btn')) {
    return;
  }
  var id = event.target.dataset.id;
  transactions = transactions.filter(function(tx) {
    return tx.id !== id;
  });
  saveToStorage(transactions);
  renderAll();
}

// ── Init ──────────────────────────────────────────────────
function init() {
  // Theme
  var savedTheme = 'light';
  try { savedTheme = localStorage.getItem(THEME_KEY) || 'light'; } catch(e) {}
  applyTheme(savedTheme);
  document.getElementById('theme-toggle').addEventListener('click', handleThemeToggle);

  // Custom categories
  var custom = loadCustomCategories();
  custom.forEach(function(cat) { addCategory(cat); });
  rebuildCategorySelect();
  document.getElementById('add-category-btn').addEventListener('click', handleAddCategory);
  document.getElementById('new-category-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); }
  });

  // Spending limit
  spendingLimit = loadLimit();
  if (spendingLimit !== null) {
    document.getElementById('limit-input').value = spendingLimit;
    document.getElementById('clear-limit-btn').hidden = false;
  }
  document.getElementById('set-limit-btn').addEventListener('click', handleSetLimit);
  document.getElementById('clear-limit-btn').addEventListener('click', handleClearLimit);
  document.getElementById('limit-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); handleSetLimit(); }
  });

  transactions = loadFromStorage();
  document.getElementById('transaction-form').addEventListener('submit', handleFormSubmit);
  document.getElementById('transactions-ul').addEventListener('click', handleDeleteClick);
  renderAll();
}

document.addEventListener('DOMContentLoaded', init);
