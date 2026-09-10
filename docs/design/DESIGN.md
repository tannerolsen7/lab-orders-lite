# Design System — Lab Orders Lite

Single-theme, light-only. No dark mode planned (see scaffold spec: "Would add via shadcn's CSS variable theming").

---

## Colors

All colors are defined as CSS custom properties in `app/globals.css` via Tailwind's `@theme inline` block. Reference them by Tailwind class name — never hardcode hex, rgb, or hsl values.

### Core palette

| Token                | Value     | Usage                                      |
| -------------------- | --------- | ------------------------------------------ |
| `background`         | `#f7f5f1` | Page background (warm off-white)            |
| `foreground`         | `#1a1a1a` | Primary text                               |
| `card`               | `#ffffff` | Card / elevated surface background          |
| `card-foreground`    | `#1a1a1a` | Text on cards                              |
| `primary`            | `#00272a` | Primary buttons, sidebar background (dark teal) |
| `primary-foreground` | `#f7f5f1` | Text on primary                            |
| `secondary`          | `#f0ede8` | Secondary buttons, hover states             |
| `secondary-foreground` | `#1a1a1a` | Text on secondary                         |
| `muted`              | `#f0ede8` | Muted backgrounds                          |
| `muted-foreground`   | `#6b6b6b` | Placeholder text, descriptions              |
| `accent`             | `#dcff9f` | Accent highlights (lime green)              |
| `accent-foreground`  | `#00272a` | Text on accent                             |
| `destructive`        | `#dc2626` | Delete, cancel, error states                |
| `destructive-foreground` | `#ffffff` | Text on destructive                    |

### Functional colors

| Token        | Value     | Usage                           |
| ------------ | --------- | ------------------------------- |
| `border`     | `#e5e2dc` | Borders, dividers               |
| `input`      | `#e5e2dc` | Input field borders              |
| `ring`       | `#5cafb5` | Focus ring color (teal)          |
| `teal`       | `#5cafb5` | Accent teal for highlights       |

### Sidebar

| Token                | Value     |
| -------------------- | --------- |
| `sidebar`            | `#00272a` |
| `sidebar-foreground` | `#ffffff` |
| `sidebar-accent`     | `#dcff9f` |

### Status colors (Badge component)

Used exclusively in `Badge` variants for order status display. These use Tailwind's built-in palette, not custom tokens.

| Status        | Background     | Text           |
| ------------- | -------------- | -------------- |
| Pending       | `amber-100`    | `amber-800`    |
| In Progress   | `blue-100`     | `blue-800`     |
| Completed     | `emerald-100`  | `emerald-800`  |
| Cancelled     | `gray-100`     | `gray-600`     |

---

## Typography

- **Font family:** Inter, with system sans-serif fallback stack
- **Base size:** browser default (16px), components use Tailwind's `text-sm` (14px) as their working size
- **Headings:** `text-2xl font-semibold` (CardTitle), no other heading scale defined yet

---

## Spacing and radius

Spacing uses Tailwind defaults (multiples of 0.25rem). No custom spacing tokens.

| Token       | Value      | Usage              |
| ----------- | ---------- | ------------------ |
| `radius-sm` | `0.25rem`  | Small elements     |
| `radius-md` | `0.375rem` | Inputs, buttons    |
| `radius-lg` | `0.5rem`   | Cards              |
| `radius-xl` | `0.75rem`  | Large containers   |

---

## Component patterns

### Buttons
Six variants: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`. Four sizes: `default` (h-10), `sm` (h-9), `lg` (h-11), `icon` (h-10 w-10). All use `rounded-md`.

### Cards
White background with `shadow-sm` and `rounded-lg`. Standard padding is `p-6`.

### Inputs
Height `h-10`, `rounded-md`, border uses `border-input`. Focus ring uses `ring` token.

### Tables
Full-width with horizontal scroll wrapper. Row hover via `hover:bg-muted/50`.

### Badges
Rounded-full pills. Status variants use the status color table above.

---

## Rules

1. **No hardcoded colors.** The token-lint script blocks hex, rgb, and hsl values in component and CSS files. Use Tailwind classes that reference the tokens above.
2. **Status colors are the exception.** Badge status variants use Tailwind's built-in `amber`, `blue`, `emerald`, and `gray` scales because they need light/dark pairs that the core palette doesn't provide. If more status-like colors are needed, add them as Badge variants, not as new CSS tokens.
3. **Single theme.** No `dark:` variants, no `prefers-color-scheme` media queries.
