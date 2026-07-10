# Requirements Document

## Introduction

The Expense and Budget Visualizer is a client-side web application that allows users to track personal expenses by entering transactions with a name, amount, and category. The app displays a running total balance, a scrollable transaction list with delete capability, and a pie chart showing spending distribution by category. All data is persisted in the browser's Local Storage. The app is built with plain HTML, CSS, and vanilla JavaScript — no frameworks, no backend, no build tools required.

## Glossary

- **App**: The Expense and Budget Visualizer web application.
- **Transaction**: A single expense entry consisting of an item name, a monetary amount, and a category.
- **Category**: One of three predefined spending classifications — Food, Transport, or Fun.
- **Transaction_List**: The scrollable UI component that displays all saved transactions.
- **Balance_Display**: The UI component at the top of the page that shows the current total of all transaction amounts.
- **Input_Form**: The UI component containing the fields and submit button used to create a new transaction.
- **Validator**: The logic component responsible for checking that all required fields contain valid values before a transaction is saved.
- **Storage**: The browser's Local Storage API used to persist transactions between page sessions.
- **Chart**: The pie chart component that visualizes spending distribution by category.
- **Chart_Library**: An external charting dependency (e.g., Chart.js) used to render the pie chart.

---

## Requirements

### Requirement 1: Add a Transaction

**User Story:** As a user, I want to fill in a form and submit a new expense, so that the transaction is recorded in my expense list.

#### Acceptance Criteria

1. THE Input_Form SHALL display three fields: Item Name (text), Amount (number), and Category (select with options Food, Transport, Fun).
2. THE Input_Form SHALL display a submit button labeled "Add".
3. WHEN the user submits the Input_Form with all fields filled and a valid positive Amount, THE App SHALL create a new Transaction and add it to the Transaction_List.
4. WHEN the user submits the Input_Form with all fields filled and a valid positive Amount, THE App SHALL save the updated Transaction list to Storage.
5. WHEN the user submits the Input_Form successfully, THE Input_Form SHALL reset all fields to their default empty/placeholder state.

---

### Requirement 2: Validate Input

**User Story:** As a user, I want the app to catch missing or invalid input before saving, so that my transaction list contains only well-formed entries.

#### Acceptance Criteria

1. WHEN the user submits the Input_Form with the Item Name field empty, THE Validator SHALL prevent the Transaction from being saved and display an inline error message indicating the Item Name is required.
2. WHEN the user submits the Input_Form with the Amount field empty, THE Validator SHALL prevent the Transaction from being saved and display an inline error message indicating the Amount is required.
3. WHEN the user submits the Input_Form with an Amount that is not a positive number greater than zero, THE Validator SHALL prevent the Transaction from being saved and display an inline error message indicating the Amount must be a positive number.
4. WHEN the user submits the Input_Form without selecting a Category, THE Validator SHALL prevent the Transaction from being saved and display an inline error message indicating the Category is required.

---

### Requirement 3: Display Transaction List

**User Story:** As a user, I want to see all my recorded transactions in a scrollable list, so that I can review my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display all saved Transactions in the order they were added, with the most recent entry shown last.
2. THE Transaction_List SHALL display the Item Name, Amount (formatted as a currency value), and Category for each Transaction.
3. WHILE the number of Transactions exceeds the visible height of the Transaction_List container, THE Transaction_List SHALL be scrollable to reveal all entries.
4. WHEN no Transactions have been saved, THE Transaction_List SHALL display a placeholder message such as "No transactions yet."

---

### Requirement 4: Delete a Transaction

**User Story:** As a user, I want to remove an individual transaction from the list, so that I can correct mistakes or remove outdated entries.

#### Acceptance Criteria

1. THE Transaction_List SHALL display a delete button for each Transaction entry.
2. WHEN the user clicks the delete button for a Transaction, THE App SHALL remove that Transaction from the Transaction_List.
3. WHEN the user clicks the delete button for a Transaction, THE App SHALL update Storage to reflect the removal.

---

### Requirement 5: Display Total Balance

**User Story:** As a user, I want to see my total spending at a glance, so that I can understand my overall expense level.

#### Acceptance Criteria

1. THE Balance_Display SHALL show the sum of all Transaction amounts as a formatted currency value.
2. WHEN a Transaction is added, THE Balance_Display SHALL update to reflect the new total without requiring a page reload.
3. WHEN a Transaction is deleted, THE Balance_Display SHALL update to reflect the new total without requiring a page reload.
4. WHEN no Transactions have been saved, THE Balance_Display SHALL display a total of 0.

---

### Requirement 6: Visualize Spending by Category

**User Story:** As a user, I want to see a pie chart of my spending by category, so that I can understand how my money is distributed.

#### Acceptance Criteria

1. THE Chart SHALL render a pie chart that divides spending proportionally among the categories Food, Transport, and Fun based on the sum of Transaction amounts in each category.
2. THE Chart SHALL display a distinct color for each of the three categories.
3. THE Chart SHALL display a legend identifying each category and its corresponding color.
4. WHEN a Transaction is added, THE Chart SHALL update to reflect the new spending distribution without requiring a page reload.
5. WHEN a Transaction is deleted, THE Chart SHALL update to reflect the new spending distribution without requiring a page reload.
6. WHEN no Transactions have been saved, THE Chart SHALL display a neutral empty state (e.g., a single gray segment or a "No data" message).

---

### Requirement 7: Persist Data Across Sessions

**User Story:** As a user, I want my transactions to be saved between browser sessions, so that I do not lose my expense history when I close and reopen the app.

#### Acceptance Criteria

1. WHEN the App loads, THE Storage SHALL be read to retrieve all previously saved Transactions.
2. WHEN the App loads with previously saved Transactions, THE Transaction_List, Balance_Display, and Chart SHALL all reflect the saved data immediately on page load.
3. WHEN a Transaction is added or deleted, THE App SHALL write the complete updated Transaction list to Storage before the UI updates are reflected.
4. IF Storage is unavailable or returns malformed data, THEN THE App SHALL initialize with an empty Transaction list and continue normal operation.

---

### Requirement 8: Responsive and Accessible UI

**User Story:** As a user, I want the app to be usable on different screen sizes and readable at a glance, so that I can use it comfortably on desktop or mobile browsers.

#### Acceptance Criteria

1. THE App SHALL use a single CSS file located at `css/styles.css` for all styling.
2. THE App SHALL use a single JavaScript file located at `js/app.js` for all application logic.
3. THE App SHALL render correctly and remain fully usable on viewport widths from 320px to 1920px.
4. THE App SHALL apply sufficient color contrast between text and background in all UI components to meet WCAG AA minimum contrast ratio of 4.5:1 for normal text.
5. THE Input_Form fields SHALL each have an associated `<label>` element to support screen readers.
6. WHEN the App is loaded, THE App SHALL display all core components — Input_Form, Balance_Display, Transaction_List, and Chart — without requiring additional user interaction.
