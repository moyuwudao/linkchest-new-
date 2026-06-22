# Product

## Register

product

## Users

Cross-platform content collectors who save links from 91 platforms (Douyin, Xiaohongshu, Bilibili, YouTube, etc.) and need those links organized, searchable, and shareable. The audience is in transition: solo learners, designers, developers, creators, and small-team curators all use the product, but the dominant persona is still being discovered. Do not over-optimize the experience for any single persona yet. Optimize for the common needs: fast add, robust organization (3-level groups, tags, notes), reliable search, frictionless public sharing.

Two market brands share one product surface: 链藏 (China) and LinkChest (Global). Six supported languages: zh, en, ja, ko, fr, de.

## Product Purpose

LinkChest is a cross-platform bookmark and content aggregator. It helps users collect, organize, retrieve, and share links from 91 platforms via Android app, web admin, Chrome extension, and a public share page. Three paid tiers (medium / heavy / super) gate storage, groups, and share volume. Success means a user saves something today, finds it again weeks later, and shares a curated list with someone who can read it without signing up.

## Brand Personality

Three words: 克制, 工具感, 不喧哗 (Restrained, tool-like, quiet).

Inspired by Linear and Raycast. The product should feel like a precision instrument: fast, sharp, opinionated, monochrome with one carefully chosen accent. It should not feel like a social network, a content feed, or a marketing site. It should feel like a place you go to think, find, and decide — not to be entertained.

Voice: matter-of-fact, specific, no marketing buzzwords. No "empower your workflow" copy. Buttons say what they do: "Save link", "Move to group", "Generate share link".

Emotional goals: confidence, calm focus, expert trust. Not delight, not surprise, not warmth.

## Anti-references

- Old-style Chrome Web Store listings: banner ads, fake review badges, dense footers, "Editor's Pick" ribbons, "Verified" stamps.
- Marketplace / online-store aesthetics: discount badges, countdown timers, "X people viewing now" badges, "FREE!" callouts, red envelopes, gift boxes, "share to unlock" popups.
- SaaS templates that imitate Linear / Notion visually but feel hollow: pastel hero, 3-column feature grid, "Trusted by 10,000+ teams" line, mascot illustrations.
- The AI slop defaults: purple-blue gradients, glassmorphism, identical 3-up card grids, emoji in code, Lucide icons everywhere, centered hero with gradient text.

## Design Principles

1. Practice what you preach. The product manages 91 platforms. The UI should not look like 91 widgets fighting for attention. Pick one rhythm, repeat it.
2. Show, don't tell. Empty states should show the cover grid, not "Add your first bookmark". Feature copy should be specific: "Save 300 links across 30 groups" beats "Unlimited organization".
3. Expert confidence, not beginner enthusiasm. No "Welcome!", no "Let's get started!", no celebration animations. Just open the app and it works.
4. Information density over decoration. A 30-item list at tight line-height is more respectful of power users than 5-item cards with avatars and timestamps.
5. Cover-first for the content curator. When a link has a cover image, the cover is the primary surface. Text supports the cover; it does not replace it.

## Accessibility & Inclusion

Pragmatic baseline, no over-claiming:

- Honor `prefers-reduced-motion`: every animation needs a reduced-motion alternative (crossfade or instant).
- Full keyboard navigation across all flows: add, edit, delete, batch, share.
- Visible focus states (not just color change).
- Minimum text contrast 4.5:1 for body, 3:1 for large text.
- Internationalization is a first-class concern: 6 languages, all UI strings externalized, no hardcoded copy in components.

WCAG 2.1 AA is a stretch goal, not a v1 requirement. Don't gate releases on full AA conformance; do gate on the four items above.
