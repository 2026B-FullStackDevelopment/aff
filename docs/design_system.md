# AFF Frontend Design System

This document defines the three role-based color themes used across the AFF portal. Every page built for a specific user role **must** use only its designated theme. Shared utilities (neutrals, semantic states, typography scale) apply to all themes.

---

## Role → Theme Mapping

| Role | Theme | Primary Color | Source Reference |
|---|---|---|---|
| **Admin** | Blue / Navy | `#5b7bc0` | `/login` page |
| **Recipient** | Green | `#3D6852` | `/register/recipient` page |
| **Donor** | Amber / Gold | `#F59E0B` | `/register/donor` page |

---

## Admin Theme (Blue / Navy)

Used by: Login page, all admin dashboard pages.

### Colors

| Token | Hex | Usage |
|---|---|---|
| `admin-bg` | `#f0f4f8` | Page background |
| `admin-surface` | `#ffffff` | Cards, panels |
| `admin-border` | `#dce3ec` | Panel borders |
| `admin-shadow` | `rgba(30, 58, 95, 0.08)` | Panel drop shadows |
| `admin-title` | `#1e3a5f` | Page and section titles |
| `admin-text` | `#1e3a5f` | Body text on panels |
| `admin-text-muted` | `#6B7280` | Taglines, helper text |
| `admin-label` | `#374151` | Form field labels (uppercase) |
| `admin-input-border` | `#d1d9e0` | Input / select default border |
| `admin-input-bg` | `#f8fafc` | Input / select background |
| `admin-input-placeholder` | `#9CA3AF` | Input placeholder text |
| `admin-primary` | `#5b7bc0` | Primary action button, focus ring, active input border |
| `admin-primary-hover` | `#4a6ab0` | Primary button hover state |
| `admin-input-focus-ring` | `rgba(91, 123, 192, 0.15)` | Input focus box-shadow |
| `admin-link-recipient` | `#4B5563` | "Sign up as Recipient" link |
| `admin-link-donor` | `#D97706` | "Sign up as Donor" link |

### Tailwind Equivalents (approximate)

```
admin-bg              → bg-slate-100 / bg-[#f0f4f8]
admin-surface         → bg-white
admin-border          → border-[#dce3ec]
admin-title / text    → text-[#1e3a5f]
admin-text-muted      → text-gray-500
admin-label           → text-gray-700
admin-primary         → bg-[#5b7bc0]  text-white
admin-primary-hover   → hover:bg-[#4a6ab0]
admin-input-bg        → bg-slate-50
admin-input-border    → border-[#d1d9e0]
focus ring            → focus-visible:border-[#5b7bc0] focus-visible:ring-[rgba(91,123,192,0.15)]
```

---

## Recipient Theme (Green)

Used by: Recipient registration page, all recipient-facing dashboard pages.

### Colors

| Token | Hex | Usage |
|---|---|---|
| `recipient-bg` | `linear-gradient(135deg, #f5faf7 → #e9f5ee)` | Page background |
| `recipient-surface` | `#ffffff` | Cards, panels |
| `recipient-border` | `#e9f5ee` | Panel borders |
| `recipient-title` | `#2E5A47` | Page title |
| `recipient-text` | `#1E293B` | Subtitle, body text |
| `recipient-text-muted` | `#6B7280` | Helper text, progress label |
| `recipient-label` | `#6B7280` | Form field labels (uppercase) |
| `recipient-input-border` | `#E5E7EB` | Input / select default border |
| `recipient-input-focus` | `#3D6852` | Input focus border |
| `recipient-input-focus-ring` | `rgba(61, 104, 82, 0.15)` | Input focus box-shadow |
| `recipient-primary` | `#3D6852` | Primary action button, section dividers, progress bar fill, links |
| `recipient-primary-hover` | `#2E5A47` | Primary button hover |
| `recipient-footer-bg` | `#f0f7f3` | Footer / secondary surface |
| `recipient-footer-border` | `#d1e2d8` | Footer top border |

### Tailwind Equivalents (approximate)

```
recipient-bg          → bg-gradient-to-br from-[#f5faf7] to-[#e9f5ee]
recipient-surface     → bg-white
recipient-border      → border-[#e9f5ee]
recipient-title       → text-[#2E5A47]
recipient-text        → text-slate-800
recipient-text-muted  → text-gray-500
recipient-primary     → bg-[#3D6852]  text-white
recipient-primary-hover → hover:bg-[#2E5A47]
recipient-input-border → border-[#E5E7EB]
focus                 → focus-visible:border-[#3D6852] focus-visible:ring-[rgba(61,104,82,0.15)]
recipient-footer-bg   → bg-[#f0f7f3]
```

---

## Donor Theme (Amber / Gold)

Used by: Donor registration page, all donor-facing dashboard pages.

### Colors

| Token | Hex | Usage |
|---|---|---|
| `donor-bg` | `linear-gradient(135deg, #FDF9F3 → #FFFDF8)` | Page background |
| `donor-surface` | `#ffffff` | Cards, panels |
| `donor-border` | `#f4efe8` | Panel borders |
| `donor-title` | `#996515` | Page title |
| `donor-text` | `#1E293B` | Subtitle, body text |
| `donor-text-muted` | `#6B7280` | Helper text, progress label |
| `donor-label` | `#6B7280` | Form field labels (uppercase) |
| `donor-input-border` | `#E5E7EB` | Input / select default border |
| `donor-input-focus` | `#996515` | Input focus border |
| `donor-input-focus-ring` | `rgba(153, 101, 21, 0.15)` | Input focus box-shadow |
| `donor-primary` | `#F59E0B` | Primary action button, progress bar fill |
| `donor-primary-hover` | `#D97706` | Primary button hover |
| `donor-primary-dark` | `#996515` | Section titles, active accents, progress % text |
| `donor-footer-bg` | `#FDF9F3` | Footer / secondary surface |
| `donor-link` | `#F59E0B` | Inline links |
| `donor-link-hover` | `#B45309` | Inline link hover |

### Tailwind Equivalents (approximate)

```
donor-bg              → bg-gradient-to-br from-[#FDF9F3] to-[#FFFDF8]
donor-surface         → bg-white
donor-border          → border-[#f4efe8]
donor-title           → text-[#996515]
donor-text            → text-slate-800
donor-text-muted      → text-gray-500
donor-primary         → bg-amber-400  text-white  (or bg-[#F59E0B])
donor-primary-hover   → hover:bg-amber-500  (or hover:bg-[#D97706])
donor-primary-dark    → text-[#996515]
donor-input-border    → border-[#E5E7EB]
focus                 → focus-visible:border-[#996515] focus-visible:ring-[rgba(153,101,21,0.15)]
donor-footer-bg       → bg-[#FDF9F3]
```

---

## Shared Tokens (All Themes)

These values are consistent across all three themes.

| Token | Hex | Usage |
|---|---|---|
| `shared-required` | `#DC2626` | Required field asterisk `*` |
| `shared-error-text` | `#b91c1c` | Inline field error text |
| `shared-error-bg` | `#fef2f2` | Alert / feedback error banner background |
| `shared-error-border` | `#fecaca` | Alert / feedback error banner border |
| `shared-placeholder` | `#9CA3AF` | All input placeholder text |
| `shared-label-muted` | `#6B7280` | Uppercase field labels |
| `shared-input-divider` | `#E5E7EB` | Section divider lines |
| `shared-progress-track` | `#E5E7EB` | Progress bar track background |
| `shared-icon` | `#9CA3AF` | Input prefix/suffix icons (at rest) |

### Password Strength Indicator Colors (shared across all themes)

| Strength | Rules met | Color |
|---|---|---|
| Too weak | ≤ 1 | `#DC2626` (red-600) |
| Weak | 2 | `#F59E0B` (amber-400) |
| Good | 3 | `#10B981` (emerald-500) |
| Strong | 4 | `#059669` (emerald-600) |

---

## Motion & Interaction Guidelines (Smoothness Requirement)

To preserve the premium UX and smooth micro-interactions from original custom CSS:

1. **Form Controls (Inputs, Selects, Autocomplete):**
   - Must ALWAYS include `transition-all duration-200 ease-out` (never just `transition-colors`).
   - This ensures focus ring glow, border-color change, background shift, and box-shadow interpolate smoothly when clicked or typed into.
2. **Buttons & Clickable Actions:**
   - Must include `transition-all duration-200 ease-out hover:shadow-md active:scale-[0.98]`.
   - Provides tactile press feedback and smooth color hover.
3. **Collapsible / Expandable Panels (e.g. Password Strength, Accordions):**
   - Must use smooth CSS height & opacity transitions (e.g. `transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1)` with max-height/opacity) rather than instant DOM unmounting.
4. **Input Prefix Icons:**
   - Group container must use `group/field` and icon should highlight on focus: `text-slate-400 group-focus-within/field:text-themePrimary transition-colors duration-200`.

---

## Typography Scale

All themes share the same type scale.

| Level | Tailwind classes | Element |
|---|---|---|
| Page title | `text-3xl font-extrabold tracking-tight` | `<h1>` |
| Subtitle | `text-lg font-bold` | Role line below `<h1>` |
| Section heading | `text-[0.85rem] font-bold uppercase tracking-[0.05em]` | Form section dividers |
| Body | `text-sm` | Helper text, paragraphs |
| Field label | `text-[0.75rem] font-bold uppercase tracking-wider` | `<label>` |
| Field error | `text-xs font-semibold` | Inline validation messages |

---

## Usage Rules

1. **Role determines theme.** If you are building any admin page (dashboard, user management, reports), use the Admin (blue) theme throughout — regardless of what the feature does.
2. **Use the `primary` token for CTAs.** Each theme's primary color belongs on call-to-action buttons. Do not use it for decorative backgrounds or icons.
3. **Never mix theme colors across roles.** Do not use `recipient-primary` (#3D6852) inside a donor page.
4. **Shared tokens are always shared.** Error colors, placeholder text, dividers, and progress-bar tracks are the same across all themes.
5. **Always enforce Smoothness.** Every input, button, select, and modal must have smooth 	ransition-all duration-200 ease-out micro-animations.
