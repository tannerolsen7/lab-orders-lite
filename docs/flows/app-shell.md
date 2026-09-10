# App Shell — UI Flow

## Layout

### Desktop
- 76px sidebar icon rail on the left, fixed
- Nav items stacked vertically: icon + 9px label (Patients, Tests, Orders)
- Active nav item: rgba(255,255,255,0.1) background + lime (#dcff9f) text/icon
- Inactive: 35% white opacity
- Bottom of sidebar: user avatar circle (gradient #dcff9f→#5cafb5) with initials "DT"
- Background: #00272a (dark teal)
- Main content area fills the remaining width, background #f7f5f1

### Mobile
- Bottom tab bar with same nav items (Patients, Tests, Orders)
- 44px minimum touch targets
- No sidebar on mobile

## Navigation behavior
- Clicking a nav link loads the list page for that feature
- Active state updates immediately
- Default route (`/`) redirects to `/patients`

## Responsive patterns (shared across all features)
- DataTable renders as a card layout below the mobile breakpoint
- FormDialog renders full-screen on mobile, centered dialog on desktop
- Search inputs stack vertically on mobile
- Sticky sidebar (desktop) / fixed footer (mobile) for order creation summary
- Dismiss modals via: backdrop click (desktop), Cancel button, X button, Escape key, browser back

## Empty states
- Each list page shows an EmptyState component when no items exist
- EmptyState includes a message and a call-to-action button to create the first item
- Search-specific empty state when filters return no results
