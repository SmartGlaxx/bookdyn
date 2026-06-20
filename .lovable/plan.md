## Goal

Rebuild the app shell to match the four uploaded mockups exactly, then re-skin the New Book wizard steps to mirror the screenshots pixel-for-pixel. The sidebar must be **dynamic** — items change based on the current page.

## 1. New app shell (`AppShell`)

A single layout wrapping every authenticated route.

```text
┌─────────────────────────────────────────────────────────────┐
│  [📖 Authoryti]  [New Book Project ▼]    [🔥 2] [+ New Book] [M] [?] │  ← top header (64px, dark)
├──────────┬──────────────────────────────────────────────────┤
│ 📖 Over  │                                                  │
│ 📄 Cont  │                                                  │
│ 👥 Char  │    page content inside large rounded card        │
│ 🌐 World │    (border, ~24px margins from edges)            │
│ 📈 Anal  │                                                  │
│ 📝 Notes │                                                  │
│ ─────    │                                                  │
│ ⚙ Set    │                                                  │
└──────────┴──────────────────────────────────────────────────┘
```

- Left rail: ~96px, icon + label stacked, active item amber-tinted with rounded background (matches mockup).
- Top header: 64px, logo left, "New Book Project" project switcher dropdown, streak chip, "+ New Book" pill (amber), avatar, help icon.
- Main: dark bg, page renders inside a large `rounded-2xl border border-border` card with internal padding.

Files:
- New `src/components/shell/AppShell.tsx` — layout with `<Outlet />`.
- New `src/components/shell/AppHeader.tsx` — top header, reuses streak / new-book / avatar dropdown from the existing `Navigation`.
- New `src/components/shell/AppSidebar.tsx` — dynamic sidebar (see below).
- New `src/components/shell/PageCard.tsx` — wrapper for the bordered card.

## 2. Dynamic sidebar

`AppSidebar` decides items from `useLocation()` + route context:

| Route family | Items |
|---|---|
| `/dashboard` (library) | Overview · Content · Characters · World · Analytics · Notes · Settings |
| `/dashboard/new-book` | Overview · Content · Characters · World · Analytics · Notes · Settings (same as mockup) |
| `/dashboard/:bookId` (book detail) | Overview · Chapters · Characters · World · Continuity · Cover · Export · Book Settings |
| `/admin/*` | Users · Feedback · Errors · Settings |
| `/onboarding`, `/auth`, `/waitlist` | no shell (keep current public layout) |

Items linking to routes that don't exist yet render a `ComingSoonPage` (`<h1>Coming Soon</h1>` + subtitle) under a new route like `/dashboard/content`, `/dashboard/analytics`, `/dashboard/notes`.

## 3. Migrate existing top-nav items

The current `Navigation` dropdown contains: profile, billing/subscription, sign out, plus the streak meter and "+ New Book" CTA. Mapping:

- Streak chip → top-header right cluster.
- "+ New Book" → top-header amber pill (already in mockup).
- Avatar dropdown (M) → keep `UserMenuDropdown` content (profile, manage subscription, admin links if admin, sign out).
- Help (?) → opens existing help / docs link (or a "Coming soon" tooltip for now).
- Project switcher ("New Book Project ▼") → dropdown listing the user's books, navigates to `/dashboard/:id`; the currently-open book is the active label.

`Navigation.tsx` is then deleted (or kept only for public pages if needed); all `<Navigation />` usages in pages are removed because the shell renders the header now.

## 4. Re-skin the New Book wizard

Rebuild `CanvasSetupWizard.tsx` to match the 4 screenshots exactly:

- **Stepper** (top of card): back arrow · numbered pill chips with labels (`Book Setup`, `Story Summary`, `Story Arc`, `Characters`, `World`, `Chapter Matrix`), green check for completed, amber filled for current, muted for upcoming, `›` separators.
- **Step 1 Book Setup**: 2-column grid (Title / Book Type, Genre / Tone, Historical Time Period / AI Creativity), serif "Book Setup ✨" heading, muted subtitle, amber-bordered focused input.
- **Step 3 Story Arc**: "Global Timeline Board ✨" heading, "Ask AI a guiding question 3/3" pill on the right, horizontal scrolling row of `BEAT n` cards with colored borders/labels (blue=Setup, green=Rising, purple=Midpoint, etc.) and a category select at the bottom of each card. Scroll indicator + arrow chip on the right.
- **Step 4 Characters**: "Character Arcs" heading with people icon, "+ Add character" button top-right, grid of character cards each with name input, AI-suggest sparkles button, trash button, `PERSONALITY TRAITS (n)` row with "Add trait ▾", italic empty hint.
- **Step 6 Chapter Matrix**: header row with title + star, right cluster of pills (`10 Chapters`, `0 Links Created`, `View as List`); left panel "STORY ELEMENTS" with Plot Points / Characters / World groups (each with `+` add button); right panel "Drag a plot point, character, or location here to create a new chapter" drop hint above a grid of numbered chapter cards (colored number badge, title, description, `LINKED ELEMENTS` section, pencil + ⋯ buttons, last cell is the dashed `+ Add Chapter` tile). Drop the SVG link-drawing simulator from the current build in favor of the drag-into-card pattern shown in the mockup.
- **Footer**: Back · `n chapters · 0 links created` · `Create Book →` (purple gradient pill on the last step, amber on others).

## 5. Routing

- Wrap all `/dashboard/*` and `/admin/*` routes inside a single `<Route element={<AppShell />}>` in `App.tsx`.
- Public routes (`/`, `/auth`, `/onboarding`, `/waitlist`, `/check-email`, `/reset-password`) stay outside the shell.
- Add stub routes: `/dashboard/content`, `/dashboard/analytics`, `/dashboard/notes` → `ComingSoonPage`.

## Technical notes

- Use semantic tokens only (`bg-card`, `border-border`, `bg-muted`, `text-foreground`, etc.). Amber accent already exists as `amber-glow` / `accent`; reuse.
- Keep `dark` class on `<html>` (already set in `main.tsx`).
- The shell is a single component, not the shadcn `Sidebar` primitive — the mockup's rail is a custom narrow icon+label rail, not a collapsible drawer, so a thin custom component is simpler and matches exactly.
- All existing functional code (book creation, canvas state, AI calls) is preserved; only the chrome and step layouts change.
- Files touched (estimate): 4 new shell files, 1 new `ComingSoonPage`, `App.tsx`, `CanvasSetupWizard.tsx` (heavy rewrite of step layouts), `NewBookPage.tsx` (remove `Navigation`), and remove `<Navigation />` from `Index.tsx`, `BookDetail.tsx`, admin pages.

## What I will NOT change

- Book generation logic, Supabase calls, edge functions, canvas data model.
- Public landing / auth / onboarding pages.
- The 4 wizard steps not shown in mockups (Story Summary, World) keep their current layout, just re-themed to sit inside the new card.

Approve to start.
