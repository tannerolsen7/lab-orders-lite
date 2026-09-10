# Patients — UI Flow

## List page (`/patients`)

### What the user sees
- Page header: "Patients" title, "New Patient" button (top right)
- Single search input filtering by first or last name as the user types (client-side)
- Table (desktop) or cards (mobile):
  - Name (Last, First), Date of Birth, Phone, Email
  - Sorted by last name ascending
  - Edit icon on each row
- Click row → patient detail page (`/patients/[id]`)
- Click edit icon → edit modal

### Search behavior
- Single input matches against first name or last name
- Clearing the input shows all patients
- No results: empty state "No patients match your search"

### Empty state (no patients exist)
- "No patients yet" with "Add your first patient" button → opens create modal

---

## Create modal (`/patients/new` — intercepting route)

### How the user gets here
- Clicks "New Patient" on list page
- URL changes to `/patients/new`
- Desktop: dialog overlays the list page
- Mobile: full-screen modal

### Form fields
- First Name (text, required)
- Last Name (text, required)
- Date of Birth (date input, required, must be in past)
- Phone (text, optional)
- Email (text, optional)

### Validation
- Inline field errors appear below each field on submit
- "At least one contact method (phone or email) is required" — form-level error
- DOB in the future → field error

### On success
- Modal closes, list refreshes with new patient, URL returns to `/patients`

### Dismiss
- Backdrop click (desktop), Cancel button, X button, Escape, browser back

---

## Edit modal (`/patients/[id]/edit` — intercepting route)

### How the user gets here
- Edit icon on list row, or Edit button on detail page
- From the list: intercepting route shows modal over list
- From the detail page or direct URL: renders as a full page

### What the user sees
- Same form as create, pre-filled with current values
- Title: "Edit Patient"
- Submit button: "Save Changes"

### On success
- Modal/page closes, data refreshes, URL returns to previous page

---

## Detail page (`/patients/[id]`)

### How the user gets here
- Clicks a patient row in the list

### What the user sees
- Patient info: full name, date of birth, phone, email
- Edit button → opens edit modal
- Order history section:
  - Table of orders for this patient: date, status, total, number of tests
  - Click order row → `/orders/[id]`
  - No orders: "No orders for this patient" with link to create one
- No delete action (patients with orders can't be deleted; no button shown)
