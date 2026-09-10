# Lab Tests — UI Flow

## List page (`/tests`)

### What the user sees
- Page header: "Lab Tests" title, "New Test" button (top right)
- Single search input filtering by code or name as the user types (client-side)
- Toggle to show/hide retired tests (default: active only)
- Table (desktop) or cards (mobile):
  - Code, Name, Price, Turnaround, Status (active/retired)
  - Sorted by name ascending
  - Active tests display normally; retired tests are visually dimmed
  - "..." menu on each row: Edit, Retire (or Reactivate if retired)

### Retire flow
- User clicks Retire in the "..." menu
- Confirmation dialog: "Retire [test name]? This test will no longer be available for new orders. Existing orders are not affected."
- Confirm → test marked inactive, row updates in place
- Cancel → no change

### Reactivate flow
- User clicks Reactivate in the "..." menu
- Immediate — no confirmation needed (safe, reversible)

### Empty states
- No tests exist: "No lab tests yet" with "Add your first test" button
- Search returns nothing: "No tests match your search"

---

## Create modal (`/tests/new` — intercepting route)

### How the user gets here
- Clicks "New Test" on list page
- Desktop: dialog overlays list
- Mobile: full-screen modal

### Form fields
- Code (text, required, auto-uppercased)
- Name (text, required)
- Price (dollar input with "$" prefix, required, must be > $0)
- Turnaround Time (number input with "hours" suffix, required, positive integer)

### Validation
- Inline field errors on submit
- Code already exists → "A test with this code already exists" (server-side)
- Price zero or negative → "Price must be greater than zero"

### On success
- Modal closes, list refreshes, URL returns to `/tests`

---

## Edit modal (`/tests/[id]/edit` — intercepting route)

### How the user gets here
- "Edit" in the "..." menu on a row

### What the user sees
- Same form as create, pre-filled with current values
- Price displayed as dollars (converted from stored cents)
- Title: "Edit Lab Test"
- Submit button: "Save Changes"

### Validation
- Same as create; code uniqueness checked against other tests (not itself)

### On success
- Modal closes, list refreshes with updated data, URL returns to `/tests`
