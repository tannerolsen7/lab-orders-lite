# App Shell — UI Flow

## Layout

### Desktop
- Top nav bar, full width
- Left: "Lab Orders Lite" branding (text)
- Center/left: visible nav links — Patients, Lab Tests, Orders (workflow order)
- Right: user badge showing current user name ("Dr. Test")
- Active route visually highlighted
- Main content area below, full width

### Mobile
- Top nav bar with "Lab Orders Lite" branding and hamburger menu
- Hamburger opens a drawer/sheet with nav links and user badge
- Main content area below

## Navigation behavior
- Clicking a nav link loads the list page for that feature
- Active state updates immediately
- Default route (`/`) redirects to `/patients`

## Responsive patterns (shared across all features)
- DataTable renders as a card layout below the mobile breakpoint
- FormDialog renders full-screen on mobile, centered dialog on desktop
- Search inputs stack vertically on mobile
- Dismiss modals via: backdrop click (desktop), Cancel button, X button, Escape key, browser back

## Empty states
- Each list page shows an EmptyState component when no items exist
- EmptyState includes a message and a call-to-action button to create the first item
- Search-specific empty state when filters return no results
