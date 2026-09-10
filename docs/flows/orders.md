# Orders — UI Flow

## List page (`/orders`)

### What the user sees
- Page header: "Orders" title, "New Order" button (top right)
- Status filter as chips: All | Pending | In Progress | Completed | Cancelled
- Single search input filtering by patient name (first or last, client-side)
- Table (desktop) or cards (mobile):
  - Patient Name, Status (badge), Total, Est. Ready Date, Created Date, Created By
  - Click row → order detail page (`/orders/[id]`)

### Terminal status display
- Completed orders: show completion date instead of est. ready date
- Cancelled orders: show cancelled status clearly, no est. ready date

### Mobile cards
- Patient name as card header (bold)
- All fields shown with labels, proper visual hierarchy
- Status as colored badge

### Empty states
- No orders: "No orders yet" with "Create your first order" button
- No search/filter results: "No orders match your filters"

---

## Create page (`/orders/new` — dedicated page)

### How the user gets here
- "New Order" button on list page, or CTA from empty state

### Layout

#### Patient selection
- Searchable combobox to select a patient
- Searches against first and last name

#### Test selection
- List of all active lab tests with checkboxes
- Search input above to filter the list by code or name
- Each row shows: checkbox, code, name, price, turnaround time

#### Summary (sticky sidebar on desktop, fixed footer on mobile)
- List of selected tests with individual prices
- Running total (sum of selected test prices)
- Estimated ready date (current time + max turnaround of selected tests)
- "Create Order" submit button

### Validation
- Patient is required
- At least one test must be selected
- All selected tests must be active at submit time

### Error handling
- If a test was retired between page load and submit, the service rejects the order
- Form-level error displayed, user adjusts selection and resubmits

### Price snapshotting
- Prices shown during creation are current catalog prices (preview)
- On submit, the server snapshots the current prices at that moment
- The order detail page shows snapshotted prices (source of truth)
- At demo scale these will always match; a production version would re-validate and confirm if prices changed

### On success
- Redirect to the new order's detail page (`/orders/[id]`)

---

## Detail page (`/orders/[id]`)

### Layout (top to bottom)

#### 1. Header section
- Patient name (linked to patient detail page) + status badge
- Status transition buttons (prominent, not behind a menu)
- Available transitions depend on current status:
  - PENDING → "Start Processing", "Cancel Order"
  - IN_PROGRESS → "Mark Completed", "Cancel Order"
  - COMPLETED → no buttons (terminal)
  - CANCELLED → no buttons (terminal)

#### 2. Summary section
- Total cost
- Estimated ready date (or completion/cancellation info for terminal orders)

#### 3. Line items
- Table of ordered tests: code, name, snapshotted price, snapshotted turnaround
- These are frozen values from order creation — no edit actions shown

### Cancel flow
- User clicks "Cancel Order"
- Confirmation dialog with text field: "Why is this order being cancelled?"
- Cancel reason is required (non-empty)
- Confirm → order status changes to CANCELLED, page refreshes
- Dismiss → no change

### No edit actions on order content
- No buttons to add/remove tests, change patient, or modify prices
- The UI simply doesn't offer these actions — no banner explaining why
