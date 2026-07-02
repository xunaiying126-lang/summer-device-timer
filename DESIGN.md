# Summer Device Timer Design System

## 1. Atmosphere & Identity

This is a calm family command center for summer screen-time agreements. It should feel clear enough for a parent to operate quickly and warm enough for a child to understand without anxiety. The signature is a pale-blue household dashboard with friendly rounded panels, blue-green action color, and learning/reward cues that feel encouraging rather than childish.

The app has two linked role surfaces: a child-facing timer and learning check-in view, and a parent backend view for corrections, manual entries, deletion, and weekly reset. Both surfaces must feel like the same household system while clearly limiting destructive controls to the parent view.

## 2. Color

### Palette

| Role | Token | Light | Dark | Usage |
|------|-------|-------|------|-------|
| Page background | --bg | #eef7fb | #0f1720 | App canvas |
| Soft background | --bg-soft | #f7fbfa | #14212a | Secondary bands |
| Surface | --surface | #ffffff | #172631 | Cards and panels |
| Blue surface | --surface-blue | #f1f8ff | #182b3a | Cool utility chips |
| Text primary | --text | #162238 | #f6fbff | Headlines and body |
| Text muted | --muted | #687388 | #a9b5c3 | Hints and captions |
| Border | --line | #d7e3ec | #2e4454 | Panel boundaries |
| Primary | --primary | #087f8c | #25b6c3 | Main actions |
| Primary strong | --primary-strong | #006d77 | #39ccd8 | Hover and emphasis |
| Blue | --blue | #1774d2 | #64a9ef | Week and section emphasis |
| Success | --green | #2fad58 | #5fd483 | Safe progress and completed tasks |
| Warning | --orange | #ef8f25 | #ffb15f | Nearly used quota |
| Error | --red | #e64a45 | #ff7b74 | Overtime and destructive states |
| Error strong | --dark-red | #a92724 | #ff9b94 | Used-up quota |

### Rules

- Primary is reserved for action and selection states.
- Green, orange, and red are semantic status colors only.
- Learning rewards use the same green/primary family so they read as earned time, not a separate product mode.

## 3. Typography

### Scale

| Level | Size | Weight | Line Height | Tracking | Usage |
|-------|------|--------|-------------|----------|-------|
| Display | 50px to 74px | 850 | 1 | 0 | Timer digits |
| H1 | 34px to 56px | 850 | 1.05 | 0 | Page title |
| H2 | 22px to 26px | 850 | 1.2 | 0 | Panel titles |
| H3 | 17px to 20px | 800 | 1.3 | 0 | Card titles |
| Body | 16px | 400 to 700 | 1.6 | 0 | Main copy |
| Body small | 14px | 400 to 800 | 1.5 | 0 | Rows, chips, task text |
| Caption | 12px to 13px | 650 to 850 | 1.4 | 0 | Metadata and status |

### Font Stack

- Primary: "Inter", "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", system-ui, sans-serif.
- Mono: system UI tabular numerals through `font-variant-numeric`.

### Rules

- Chinese labels must stay readable on mobile, with no viewport-scaled font sizing.
- Timer digits use tabular numerals.

## 4. Spacing & Layout

### Base Unit

All spacing derives from 4px.

| Token | Value | Usage |
|-------|-------|-------|
| --space-1 | 4px | Icon gaps |
| --space-2 | 8px | Compact internal gaps |
| --space-3 | 12px | Form and chip spacing |
| --space-4 | 16px | Standard card gaps |
| --space-5 | 20px | Modal and section padding |
| --space-6 | 24px | Panel split spacing |
| --space-8 | 32px | Page rhythm |

### Grid

- Max content width: 1180px.
- Desktop: two-column child cards, two-column lower panels.
- Tablet: timer panel collapses to one column around 1100px; child cards stay in two columns until about 760px.
- Mobile: all primary sections collapse to one column at 760px and below, and records turn into stacked cards around 720px.

### Rules

- Cards use 8px radius.
- Major panels stay un-nested; repeated items can be cards or rows.

## 5. Components

### Button

- Structure: icon plus Chinese label.
- Variants: primary, secondary, warning, ghost, danger ghost.
- States: hover lift, disabled opacity, visible focus through browser outline.
- Accessibility: use real `<button>` and clear labels.

### Mode Switch

- Structure: compact links for child view and parent backend.
- States: active entry uses the primary tint and border.
- Rule: child view never renders manual entry, weekly reset, or record deletion controls.

### Progress Bar

- Variants: safe, warning, danger, done.
- States: width transitions at 220ms.
- Accessibility: surrounding text carries exact numbers.

### Child Card

- Structure: avatar initial, name, role, status tag, used/remaining text, progress.
- Variants: sun and leaf avatar tones.
- States: selected outline and hover lift.

### Learning Task Card

- Structure: task title, requirement, reward value, completion button.
- Variants: pending and completed.
- States: completed task turns green; the same task can be checked again on a later day, so the child can repeat daily progress across the week.

## 6. Motion & Interaction

### Timing

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Micro | 140ms | ease | Button hover |
| Standard | 220ms | ease | Progress and selected states |

### Rules

- Motion stays subtle and functional.
- Do not animate layout-heavy properties.

## 7. Depth & Surface

### Strategy

Mixed depth: soft borders plus tinted shadows.

| Level | Value | Usage |
|-------|-------|-------|
| Panel | 0 12px 28px rgba(42, 78, 104, 0.12) | Main sections |
| Card | 0 8px 18px rgba(42, 78, 104, 0.08) | Child/task cards |

### Rules

- Shadows are cool-tinted, never pure black.
- Destructive and used-up states rely on color plus text, not only color.
