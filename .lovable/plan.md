# Plan: Cleaner Wall URLs + Editable Footer

## 1. Cleaner shared wall URLs

Change shared link format from `/?wall=mithu` to `/deyal=mithu`.

Note: A true clean URL like `/deyal/mithu` would be more conventional, but per your request we'll use the literal `/deyal=username` pattern (the `=` becomes part of the path).

**Changes:**
- `src/lib/wallLinks.ts` — `getWallShareUrl()` returns `${origin}/deyal=${username}`.
- `src/App.tsx` — add a new route `/deyal=:username` that redirects to `/u/:username`. Keep the old `?wall=` query handler in `SharedWallRedirect` as a backward-compatible fallback so previously shared links keep working.

This keeps the existing `/u/:username` page as the single source of truth; the new path is just a friendlier share alias.

## 2. Editable footer (admin-only)

Store footer settings in the database so the admin can edit them from the Admin Dashboard, and they apply globally.

**New table** `site_settings` (single-row key/value style):
- `key` (text, primary key)
- `value` (jsonb)
- `updated_at` (timestamptz)

Seed three keys:
- `footer_text` — free-form text the admin can edit (shown above the credit line).
- `footer_show_credit` — boolean toggle for "Made by — Monirul Hasan Mithu".
- `footer_copyright_text` — defaults to `© {year} Deyal Likhon. All rights reserved.` (admin can edit).

RLS:
- SELECT: public (everyone needs to read footer).
- UPDATE/INSERT: admins only (via `has_role(auth.uid(), 'admin')`).

## 3. Footer rendering

Update `src/pages/Index.tsx` footer to:
- Show post count (existing).
- Show Facebook community link (existing, kept).
- Show admin-editable `footer_text` if set.
- Show "Made by Monirul Hasan Mithu" only when `footer_show_credit` is true.
- Show `© {currentYear} Deyal Likhon. All rights reserved.` (uses live current year, with admin-overridable template).
- Keep Admin Login link for logged-out users.

Also apply the same footer to:
- `src/pages/UserWall.tsx`
- `src/pages/Profiles.tsx`

To avoid duplication, extract a new `src/components/SiteFooter.tsx` that fetches settings once and renders the footer. Use it on Index, UserWall, and Profiles.

## 4. Admin Dashboard — footer controls

Add a new "Footer Settings" card in `src/pages/AdminDashboard.tsx` with:
- Textarea for `footer_text`.
- Toggle (Switch) for `footer_show_credit` — "Show 'Made by Monirul Hasan Mithu'".
- Input for `footer_copyright_text` (with hint that `{year}` is replaced automatically).
- Save button → upserts to `site_settings`.

## Technical summary

**Files created:**
- `src/components/SiteFooter.tsx`
- `supabase/migrations/<timestamp>_site_settings.sql` (table + RLS + seed rows)

**Files modified:**
- `src/lib/wallLinks.ts` — new URL format.
- `src/App.tsx` — add `/deyal=:username` route.
- `src/pages/Index.tsx` — replace inline footer with `<SiteFooter />`.
- `src/pages/UserWall.tsx` — add `<SiteFooter />`.
- `src/pages/Profiles.tsx` — add `<SiteFooter />`.
- `src/pages/AdminDashboard.tsx` — add Footer Settings card.

**Backward compatibility:** Old `?wall=username` links continue to work via the existing `SharedWallRedirect`.
