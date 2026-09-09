# AFF Frontend Design System

This document defines the three role-based color themes used across the AFF portal. Every page built for a specific user role **must** use only its designated theme. Shared utilities (neutrals, semantic states, typography scale) apply to all themes.

---

## Role → Theme Mapping

| Role | Theme | Primary Color | Source Reference |
|---|---|---|---|
| **Admin** | Blue / Navy | `#5b7bc0` | `/login` page |
| **Recipient** | Green | `#3D6852` | `/register/recipient` page |
| **Donor** | Dark Brown / Gold | `#805300` | Approved AFF Figma donor wireframes |
| **Courier** | Teal | `#0f766e` | Delivery queue / active delivery screens |

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

## Donor Theme (Dark Brown / Gold)

Used by: Donor registration page and all donor-facing portal pages.

The approved donor palette follows the AFF Figma wireframes. Dark brown
`#805300` is the primary donor colour and must be used consistently for
navigation, primary actions, active controls, and donor-specific focus states.

### Colors

| Token | Hex | Usage |
|---|---|---|
| `donor-bg` | `#FBF9F8` | Donor page background |
| `donor-surface` | `#FFFFFF` | Cards and panels |
| `donor-border` | `#E4E2E1` | Card, divider and panel borders |
| `donor-title` | `#1B1C1C` | Page and section titles |
| `donor-text` | `#414844` | Body text |
| `donor-text-muted` | `#6B7280` | Helper text |
| `donor-label` | `#414844` | Form labels |
| `donor-input-border` | `#C1C8C2` | Input and select borders |
| `donor-primary` | `#805300` | Navigation and primary actions |
| `donor-primary-hover` | `#694400` | Primary action hover state |
| `donor-active-accent` | `#F3A000` | Active navigation underline and accents |
| `donor-on-primary` | `#FFFFFF` | Text and icons on dark brown |
| `donor-primary-container` | `#FFF6E3` | Subtle donor buttons and highlighted surfaces |
| `donor-input-focus-ring` | `rgba(128, 83, 0, 0.15)` | Input focus ring |

### Tailwind Equivalents

```text
donor-bg                → bg-[#FBF9F8]
donor-surface           → bg-white
donor-border            → border-[#E4E2E1]
donor-title             → text-[#1B1C1C]
donor-text              → text-[#414844]
donor-primary           → bg-[#805300] text-white
donor-primary-hover     → hover:bg-[#694400]
donor-active-accent     → border-[#F3A000]
donor-primary-container → bg-[#FFF6E3]
donor-input-border      → border-[#C1C8C2]
focus ring              → focus-visible:ring-[#805300]/15
```

---

## Courier Theme (Teal)

Used by: the Courier delivery queue and active delivery screens.

Teal `#0f766e` is the primary Courier colour and must be used consistently
for navigation, primary actions, active controls, and Courier-specific focus
states. Unlike the other three themes, Courier tokens are defined once as
Tailwind v4 `@theme` custom properties in `frontend/src/styles/global.css`
and consumed via the generated utility classes — never as inline hex.

### Colors

| Token | Hex | Usage |
|---|---|---|
| `courier-bg` | `#f2faf9` | Page background |
| `courier-surface` | `#ffffff` | Cards and panels |
| `courier-border` | `#d6e9e6` | Card, divider, and panel borders |
| `courier-title` | `#134e4a` | Page and section titles |
| `courier-text` | `#1e293b` | Body text |
| `courier-text-muted` | `#6b7280` | Helper text |
| `courier-label` | `#6b7280` | Form labels (uppercase) |
| `courier-input-border` | `#e5e7eb` | Input / select default border |
| `courier-input-focus` | `#0f766e` | Input focus border |
| `courier-input-focus-ring` | `rgba(15, 118, 110, 0.15)` | Input focus box-shadow |
| `courier-primary` | `#0f766e` | Navigation, primary actions, focus ring |
| `courier-primary-hover` | `#115e59` | Primary action hover state |
| `courier-accent` | `#14b8a6` | Active nav header, progress-stepper current marker |
| `courier-on-primary` | `#ffffff` | Text and icons on teal |
| `courier-primary-container` | `#f0fdfa` | Subtle highlighted surfaces |

`courier-label` and the `courier-input-*` tokens are reference values only —
they are not yet in the `@theme` block because the Courier screens have no
form inputs beyond one checkbox. Add them to `global.css` when the first
Courier input lands.

### Tailwind Equivalents

These are real generated classes (via `@theme` in `global.css`), not approximations.

```text
courier-bg                → bg-courier-bg
courier-surface           → bg-courier-surface
courier-border            → border-courier-border
courier-title             → text-courier-title
courier-text              → text-courier-text
courier-primary           → bg-courier-primary text-courier-on-primary
courier-primary-hover     → hover:bg-courier-primary-hover
courier-accent            → bg-courier-accent
courier-primary-container → bg-courier-primary-container
focus ring                → focus-visible:ring-courier-primary/40
```

---

## Shared Tokens (All Themes)

These values are consistent across all three role themes; the Courier theme
also draws on the same neutrals and semantic states.

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

`shared-error-text` (`#b91c1c`) and `shared-progress-track` (`#e5e7eb`) are
also available as `@theme` utilities: `text-shared-error-text`,
`bg-shared-progress-track`. The other shared values remain reference-only
until a consumer needs them.

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
6. **Courier tokens come from `@theme`.** Consume Courier colours via the
   generated utilities (`bg-courier-primary`, `text-courier-title`, …). Do
   not reintroduce arbitrary hex values (`bg-[#0f766e]`) in Courier code.
