---
name: LinkChest
description: A quiet, tool-like bookmark archive for collecting, organizing, and sharing links from 91 platforms.
colors:
  the-vault: "#1B2A4A"
  the-vault-deep: "#111C31"
  the-vault-edge: "#3A4D75"
  wax-seal: "#B07A4F"
  wax-seal-bright: "#C8956C"
  wax-seal-pale: "#D8AE7E"
  parchment: "#F7F5F0"
  parchment-deep: "#E8E4DC"
  lampblack: "#0F1419"
  lampblack-soft: "#1A1F2A"
  ink-mute: "#2D3142"
  taupe: "#8A8175"
  sage: "#5B8A72"
  rust: "#B85C5C"
  vault-glow: "rgba(200, 149, 108, 0.2)"
typography:
  display:
    fontFamily: "Bodoni Moda, LXGW WenKai, PingFang SC, Microsoft YaHei, serif"
    fontSize: "clamp(2.5rem, 5vw, 4rem)"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "DM Sans, LXGW WenKai, PingFang SC, Microsoft YaHei, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  title:
    fontFamily: "DM Sans, LXGW WenKai, PingFang SC, Microsoft YaHei, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "DM Sans, LXGW WenKai, PingFang SC, Microsoft YaHei, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "DM Sans, LXGW WenKai, PingFang SC, Microsoft YaHei, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.02em"
  cjk-display:
    fontFamily: "LXGW WenKai, PingFang SC, Microsoft YaHei, system-ui, serif"
    fontSize: "clamp(2.5rem, 5vw, 4rem)"
    fontWeight: 500
    lineHeight: 1.2
rounded:
  sm: "4px"
  DEFAULT: "6px"
  md: "8px"
  lg: "10px"
  xl: "12px"
  2xl: "16px"
  3xl: "24px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
  3xl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.the-vault}"
    textColor: "{colors.parchment}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.the-vault-deep}"
    textColor: "{colors.parchment}"
  button-accent:
    backgroundColor: "{colors.wax-seal-bright}"
    textColor: "{colors.lampblack}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
    typography: "{typography.label}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.taupe}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
    typography: "{typography.label}"
  button-danger:
    backgroundColor: "{colors.rust}"
    textColor: "{colors.parchment}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
    typography: "{typography.label}"
  card:
    backgroundColor: "{colors.parchment}"
    textColor: "{colors.ink-mute}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
  card-elevated:
    backgroundColor: "{colors.parchment}"
    textColor: "{colors.ink-mute}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
  input:
    backgroundColor: "{colors.parchment}"
    textColor: "{colors.ink-mute}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  modal:
    backgroundColor: "{colors.parchment}"
    textColor: "{colors.ink-mute}"
    rounded: "{rounded.2xl}"
    padding: "{spacing.lg}"
  badge-accent:
    backgroundColor: "rgba(200, 149, 108, 0.15)"
    textColor: "{colors.wax-seal}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  badge-primary:
    backgroundColor: "rgba(27, 42, 74, 0.08)"
    textColor: "{colors.the-vault}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
---

# Design System: LinkChest

## 1. Overview

**Creative North Star: "The Archivist's Drawer"**

LinkChest is an archivist's drawer, not a social feed. Every link is a piece of evidence a person kept, labeled by the hand that filed it, and held inside a piece of furniture built to outlast the day. The surface should feel like a quiet desk drawer opened mid-afternoon: warm parchment, deep navy edges, a brass pull-tab, the faint smell of paper. No one is selling anything here, no algorithm is suggesting anything, no celebration animation is firing. The user came to put something away or to take something out, and the product should stay out of the way while they do it.

Density is a feature. A 30-item list at tight line-height is more respectful of a power user than five 320-px cards with avatars and timestamps. The product manages 91 platforms; the UI must not look like 91 widgets fighting for attention. Pick one rhythm and repeat it. Voice is matter-of-fact: button labels say what they do ("Save link", "Move to group", "Generate share link"). No "empower your workflow", no "Welcome back", no "Let's get started". The product opens, it works, it goes back into the drawer.

This system explicitly rejects the saturated 2026 AI monoculture: no purple-blue gradients, no glassmorphism, no identical 3-up card grids, no emoji in code, no Lucide icons on every surface, no "Trusted by 10,000+ teams" trust strip, no gradient-text hero, no glassmorphic floating panels. It also rejects the older Chrome Web Store aesthetic: no banner ads, no "Editor's Pick" ribbons, no countdown timers, no "FREE!" callouts, no fake review badges, no marketplace discount UI. The product is a tool for a person, not a storefront for a person.

**Key Characteristics:**
- **Editorial, not promotional.** Type carries weight, color is rare, every label is precise.
- **Cover-first, text-second.** When a link has a cover image, the cover is the primary surface. Text supports the cover; it does not replace it.
- **State-driven motion.** Surfaces are flat at rest. Buttons lift on hover, scale on press, glow on focus. No idle decoration.
- **One accent, used sparingly.** Wax seal amber is the only color with emotional permission. It appears on ≤10% of any given surface.
- **Information density at rest.** Lists, grids, and tables beat illustrative cards for content the user came to read.

## 2. Colors

The palette is a piece of furniture: deep navy, warm parchment, and a single brass accent that only appears when something is being asked of the user. Black-and-white photography, with one warm color used to draw the eye.

### Primary
- **The Vault** (`#1B2A4A` / `the-vault`): The deep navy that anchors the whole system. Used for the main app shell, primary buttons in light mode, and high-weight text. It is the inside of the drawer. In dark mode, this role rotates to wax-seal-bright (a single amber anchor in a charcoal room), preserving the "one accent" doctrine.

### Secondary
- **Wax Seal** (`#B07A4F` / `wax-seal`): The single emotional accent. Used on save/sent/affirm states, on hover-elevated card borders, on the share-link affordance, and on focus rings that need to be unmissable. Wax Seal is the seal pressed into the envelope: used only when something is being committed or confirmed.

### Tertiary
- **Wax Seal Bright** (`#C8956C` / `wax-seal-bright`): The high-contrast variant used for the primary button in dark mode and for hover states on accent surfaces. Stays in the same family; never a different hue.

### Neutral
- **Parchment** (`#F7F5F0` / `parchment`): The body background in light mode. The page itself. Never use pure white; the slight warmth is what makes the surface feel like paper rather than a screen.
- **Lampblack** (`#0F1419` / `lampblack`): The body background in dark mode. Body text on parchment. Never pure black; the warmth in dark mode is handled by the parchment-deep tone used for elevated surfaces, not by warming the background.
- **Parchment Deep** (`#E8E4DC` / `parchment-deep`): The elevated-surface neutral in light mode. Cards sit on this when nested inside a parchment background. Never use opacity; use the discrete token.
- **Ink Mute** (`#2D3142` / `ink-mute`): Body text in light mode. Sits between pure charcoal and a warm gray; the small chroma shift toward navy ties body text to The Vault without crossing into hue territory.
- **Taupe** (`#8A8175` / `taupe`): Secondary text, ghost-button labels, hairline borders, placeholder text. Reads as "the ink has faded" rather than "this is disabled". Border-line usage: `taupe/20` for hairlines, `taupe/60` for placeholder text.
- **Sage** (`#5B8A72` / `sage`): Success and "saved" confirmation states. Muted by design; success is not celebratory here, it is just confirmed.
- **Rust** (`#B85C5C` / `rust`): Destructive states and error messages. Soft enough to live next to parchment without alarm; hard enough to be unread as anything other than "stop".

### Named Rules

**The Wax Seal Rule.** Wax Seal (the amber family) is the only color with emotional permission. It is used on ≤10% of any given surface, and only on: save/sent/confirm actions, hover-elevated card edges, focus rings, and the single share-link affordance. It is never used for body text, never for backgrounds larger than a button, and never for system messages that aren't affirmative. The rarity of the seal is what makes it feel pressed by hand.

**The Vault Outside the Drawer Rule.** The Vault (deep navy) is for the structural skeleton of the product: the app shell, primary buttons, high-weight headings, and dark-mode backgrounds. It is not for content surfaces. A card with a navy background is wrong; a card with navy text on parchment is right. Color describes the *type* of element, not its size.

**The Parchment Rule.** Parchment (the warm off-white body background) is mandatory. Pure white is forbidden anywhere the user can see; the warmth is what makes the surface feel like paper rather than a screen. In dark mode the rule inverts: pure black is forbidden; Lampblack carries the same slight warmth-into-elevation logic.

## 3. Typography

**Display Font:** Bodoni Moda (with LXGW WenKai / PingFang SC for CJK)
**Body Font:** DM Sans (with LXGW WenKai / PingFang SC for Microsoft YaHei for CJK)
**Label Font:** DM Sans Medium (uppercase NOT used)

**Character:** Bodoni Moda does the heavy lifting on editorial moments — a quiet serif that earns its weight on hero text and page titles. DM Sans carries everything else with a humanist geometry that doesn't fight the display. The CJK fallback (LXGW WenKai → PingFang SC → Microsoft YaHei) keeps the same vertical rhythm and the same restraint. The pairing is chosen so the system can express a magazine-quality cover title and a 30-item list at the same line-height, on the same page, without contradiction.

### Hierarchy
- **Display** (500, clamp(2.5rem, 5vw, 4rem), lh 1.1, -0.02em): Reserved for hero headlines and the page title on share pages. Never inside product UI chrome. Letter-spacing floor is -0.02em; tighter is cramped.
- **Headline** (600, 1.5rem, lh 1.3, -0.01em): Section titles, modal titles, the primary label on a featured card. The second-largest weight in the system.
- **Title** (600, 1.125rem, lh 1.4): Card titles, list item primary labels, drawer section headers. The workhorse weight.
- **Body** (400, 0.9375rem / 15px, lh 1.55): All running copy, notes, descriptions, link metadata. Cap line length at 65–75ch inside cards; full-width on detail pages is fine.
- **Label** (500, 0.75rem, lh 1.3, +0.02em): Form labels, button text, badges, tab labels. NEVER uppercase with extra letter-spacing. The 0.02em is the only letter-spacing in the system; treat it as "label is a label, not a shout".

### Named Rules

**The Two Voice Rule.** The system has exactly two type voices: Bodoni Moda (display, editorial) and DM Sans (everything else). Mono and uppercase tracking are forbidden. Adding a third face is a brand break.

**The CJK Continuity Rule.** CJK fallback fonts are mandatory in every stack; products that ship with a Bodoni / DM Sans pair and no CJK fallback ship broken in zh / ja / ko. LXGW WenKai carries handwritten tone for CJK display; PingFang SC carries the system default. Both must be in the stack in that order.

## 4. Elevation

This system uses state-driven micro-elevation, not resting shadows. The default state of every surface is flat. Shadow appears as a response to user action (hover, focus, active) and disappears as soon as the action resolves. The product should look like a piece of furniture at rest, not a piece of glass on a stand.

### Shadow Vocabulary
- **card** (`box-shadow: 0 1px 3px rgba(27,42,74,0.04), 0 1px 2px rgba(27,42,74,0.02)`): The resting card. Barely-there ambient. Sits on parchment without announcing itself.
- **card-hover** (`box-shadow: 0 8px 24px rgba(27,42,74,0.08), 0 2px 8px rgba(27,42,74,0.04)`): The hover state. The drawer opens one notch. Pairs with `-translate-y-1`.
- **elevated** (`box-shadow: 0 4px 12px rgba(27,42,74,0.06), 0 2px 4px rgba(27,42,74,0.03)`): Reserved for raised controls (primary buttons at rest, focus rings, sticky toolbars).
- **floating** (`box-shadow: 0 12px 40px rgba(15,20,25,0.12), 0 4px 12px rgba(15,20,25,0.06)`): Reserved for modals, command palettes, toasts. The drawer has been pulled out of the desk.
- **glow** (`box-shadow: 0 0 24px rgba(200,149,108,0.2)`): Wax Seal halo. Used on focus rings and on the share-link affordance. Soft, never saturated.

### Named Rules

**The Flat-at-Rest Rule.** Surfaces are flat at rest. Shadows appear only as a response to state (hover, focus, active, modal-open). A card that ships with `shadow-elevated` permanently is wrong. If something needs to feel "above" the surface, give it border + a one-step translate on hover, not a permanent shadow.

**The No-Stacking Rule.** Two stacked shadows per element maximum. A surface that is `card + floating` is over-engineered; pick the one that fits the state.

**The Wax Seal Glow Rule.** The `glow` shadow uses the wax-seal hue (`rgba(200,149,108,…)`) and never the vault hue. Glow is a confirmation, not a callout.

## 5. Components

The component feel is "工具感、按了会动": a tool that responds to a hand, not a surface that decorates itself. Buttons lift on hover, scale on press, glow on focus. Cards are flat at rest and open one notch on hover. Inputs have a soft focus ring that feels like the user just placed a stamp on the field.

### Buttons
- **Shape:** Gently rounded (8px / `rounded-md`). The corner is enough to feel handled, not so much that the button feels toy-like.
- **Primary (Light mode):** `bg-the-vault`, `text-parchment`, `shadow-elevated` at rest, `hover:bg-the-vault-deep + shadow-card-hover + scale-[1.02]`, `active:scale-[0.98] + shadow-card`. The default action button; one per primary action surface.
- **Primary (Dark mode):** `bg-wax-seal-bright`, `text-lampblack`, `hover:bg-wax-seal + shadow-glow`. The amber anchor replaces the vault in dark mode (preserves the "one accent" doctrine).
- **Accent:** `bg-wax-seal-bright`, `text-lampblack`. Used for the share-link affordance and any affirmative action that wants to be unmistakable.
- **Secondary:** `bg-white`, `text-ink-mute`, `border: taupe/20`. The paired choice on a primary; never the only choice.
- **Ghost:** `transparent`, `text-taupe`, `hover:bg-the-vault/5 + text-the-vault`. The "third" button. Used for cancel, close, dismiss.
- **Danger:** `bg-rust/10`, `text-rust`, `border-rust/15`. Soft enough to live next to a primary without alarm; never the same weight as primary.

### Cards
- **Corner Style:** 10px (`rounded-lg`). Larger than buttons; smaller than modals.
- **Background:** Parchment (light) / Lampblack-soft (dark). On a nested surface, parchment-deep.
- **Border:** `the-vault/6` (1px). The hairline draws the card edge without a shadow.
- **Shadow Strategy:** Resting = `shadow-card` only (almost invisible). Hover = `shadow-card-hover` + `border: wax-seal/20` + `-translate-y-1`. The card opens a notch.
- **Internal Padding:** 16px (default), 24px (featured), 12px (list-style).
- **Cover-First Rule:** When a card carries a cover image, the cover occupies the top 60% of the card. Text sits below, never overlaid unless the cover has a designated gradient mask zone.

### Inputs
- **Style:** `bg-white`, `border: taupe/20` (1px), `rounded-md` (8px), `text-ink-mute`, `placeholder-taupe/60`.
- **Focus:** `ring-2 ring-the-vault/20 + border-the-vault/40 + shadow-glow` in light mode. `ring-wax-seal/20 + border-wax-seal/40 + shadow-glow` in dark mode. The focus state is the stamp being placed on the field.
- **Padding:** 10px vertical, 16px horizontal.
- **Error:** `border-rust/50 + ring-rust/20`. Same shape, different stamp.
- **Disabled:** `opacity: 0.5`, `cursor: not-allowed`, no scale on hover.

### Modals
- **Shape:** 16px (`rounded-2xl`). The largest corner radius in the system; the modal is the piece of furniture being pulled out of the desk.
- **Background:** Parchment (light) / Lampblack-soft (dark).
- **Border:** `the-vault/6` (1px), same as cards.
- **Shadow:** `shadow-floating`. The strongest shadow in the system; reserved for modals, command palettes, toasts.
- **Overlay:** `bg-lampblack/40 + backdrop-blur(4px)`. The drawer is closed; the world behind it is out of focus.
- **Entry Animation:** `scaleIn 0.2s cubic-bezier(0.4, 0, 0.2, 1)` from 0.96 → 1. No bounce, no overshoot.

### Toasts
- **Shape:** 12px (`rounded-xl`).
- **Background:** The Vault (light) / Wax Seal (dark). Color carries the message: a vault toast is a system message, a wax-seal toast is a confirmation.
- **Position:** Bottom-center, fixed.
- **Entry Animation:** `toastSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)`. The single allowed "spring" easing in the system; the toast coming up to confirm feels right with a small overshoot.

### Chips / Badges
- **Shape:** 4px (`rounded-sm`). Pill-like but not a pill; the badge sits inside a label slot, not on its own.
- **Background / Text:** Muted variant of the role color: `the-vault/8 + text-the-vault` for primary, `wax-seal/15 + text-wax-seal` for accent, `sage/10 + text-sage` for success, `rust/10 + text-rust` for danger, `the-vault/4 + text-taupe` for neutral.
- **Padding:** 2px vertical, 8px horizontal.
- **Case:** Mixed case. Never uppercase. The badge is a label, not a stamp.

### Navigation (Sidebar)
- **Style:** Vertical list, label + count, no icons on the primary items. The list IS the navigation; an icon would compete with the label.
- **Item:** `text-ink-mute` at rest, `text-wax-seal + translate-x-0.5` on hover. The hover state slides the label one notch toward the user's cursor; no background fill, no underline.
- **Active Item:** `text-the-vault (or wax-seal in dark mode) + font-weight: 600 + border-left: 2px wax-seal`. The active section is the one the drawer is open to.
- **Mobile Treatment:** Drawer pattern, slides in from the left at 240px width. Same hairline border, no overlay.

## 6. Do's and Don'ts

Every anti-reference in `PRODUCT.md` is restated here as a "Don't" with the same language, so the visual spec enforces the strategic line. Every "Do" is concrete and exact; the goal is a spec an AI agent can read in isolation and not produce a generic landing page.

### Do
- **Do** use the Wax Seal (amber) for the share-link affordance, the save confirmation, and any affirmative state. It is the only color with emotional permission.
- **Do** keep the body background as Parchment (`#F7F5F0`) in light mode and Lampblack (`#0F1419`) in dark mode. Never pure white, never pure black.
- **Do** set the primary button to The Vault (light) or Wax Seal Bright (dark). One primary per action surface.
- **Do** keep cards flat at rest; use `shadow-card-hover + border-wax-seal/20 + -translate-y-1` for the hover state. Surfaces are quiet until the user touches them.
- **Do** use Bodoni Moda only for display headlines and the page title on share pages. Never inside product UI chrome.
- **Do** keep the CJK fallback chain intact in every font stack: LXGW WenKai → PingFang SC → Microsoft YaHei. The product ships in 6 languages; a broken CJK stack is a broken product.
- **Do** prefer dense lists over illustrative cards for content the user came to read. A 30-item list at tight line-height beats 5 cards with avatars and timestamps.
- **Do** cap body line length at 65–75ch inside cards. Long-form copy on detail pages is fine; running copy in cards is not.
- **Do** write button labels as verb + object: "Save link", "Move to group", "Generate share link". The label says what will happen.
- **Do** honor `prefers-reduced-motion`. Every animation needs a crossfade or instant transition as a fallback. The `0.01ms` global override in `globals.css` is acceptable.
- **Do** show, don't tell. Empty states show the cover grid, not "Add your first bookmark". Feature copy is specific: "Save 300 links across 30 groups" beats "Unlimited organization".

### Don't
- **Don't** use purple-blue gradients, glassmorphism, identical 3-up card grids, emoji in code, or Lucide icons everywhere. These are the 2026 AI defaults; they read as templated.
- **Don't** use side-stripe borders (`border-left` or `border-right` greater than 1px as a colored accent on cards, list items, callouts, or alerts). Never intentional.
- **Don't** use gradient text. `background-clip: text` with a gradient is decorative, never meaningful. Use a single solid color; emphasize via weight or size.
- **Don't** use the hero-metric template. No "big number + small label + supporting stats + gradient accent" SaaS cliché.
- **Don't** put a tiny uppercase tracked eyebrow ("ABOUT", "PROCESS", "PRICING") above every section. One deliberate kicker per page is voice; an eyebrow on every section is AI grammar.
- **Don't** number sections by reflex (`01 / 02 / 03`). Numbers earn their place when the section IS a sequence. Section markers on every section are scaffolding.
- **Don't** use old-style Chrome Web Store aesthetics: no banner ads, no "Editor's Pick" ribbons, no fake review badges, no "Verified" stamps, no dense footers, no "X people viewing now" badges.
- **Don't** use marketplace / online-store aesthetics: no discount badges, no countdown timers, no "FREE!" callouts, no red envelopes, no gift boxes, no "share to unlock" popups.
- **Don't** imitate Linear / Notion visually with a pastel hero, 3-column feature grid, "Trusted by 10,000+ teams" line, or mascot illustrations. The product is a tool, not a SaaS landing page.
- **Don't** use a hero heading that exceeds 6rem (`clamp()` max). Above that the page is shouting, not designing. Display letter-spacing floor is -0.02em; tighter is cramped.
- **Don't** use Wax Seal on body text, on backgrounds larger than a button, or on system messages that aren't affirmative. The rarity of the seal is the point.
- **Don't** add a third typeface. Bodoni Moda + DM Sans + the CJK fallback is the entire type system. A third face is a brand break.
- **Don't** use all-caps body copy. Sentences in ALL CAPS are unreadable at body sizes. Labels are mixed case; that's the rule.
- **Don't** gate content visibility on a class-triggered transition. Reveal animations must enhance an already-visible default; transitions pause on hidden tabs and the section ships blank.
- **Don't** add a "Layout Principles" or "Motion" or "Responsive Behavior" top-level section. Fold that content into Overview and Components where it belongs.
