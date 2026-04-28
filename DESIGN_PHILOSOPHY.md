# EGS Design Philosophy

This file is our working memory for future pages.

It captures the visual system, voice, page structure, and decision rules established by the current `index`, `exhibitions`, and `events` pages.

## Core Idea

EGS is not presented as a generic vendor.

The brand position is:

- a production house with memory
- a craft partner that improves through repetition
- operationally calm, aesthetically refined, commercially sharp
- premium without corporate coldness

The recurring promise is not only "we build."

It is "we remember what worked."

## Brand Narrative

Every page should feel like it belongs to the same worldview:

- beautiful spaces are backed by disciplined systems
- emotional moments are supported by invisible operational rigor
- repeat engagements are better than one-off transactions
- the team is calm, experienced, and quietly confident
- debriefs, dossiers, continuity, and carry-forward learning are part of the product

## Tone Of Voice

Write with:

- literary precision
- quiet confidence
- specificity over hype
- restrained elegance
- operational credibility

Use:

- short declarative lines
- contrast lines like "Most firms do X. We do Y."
- emotionally intelligent phrasing
- concrete nouns: dossier, crew, debrief, cue sheet, shell, foreman, floor plan, load-out
- soft authority rather than marketing noise

Avoid:

- generic agency language
- buzzwords like innovative, cutting-edge, world-class
- loud sales copy
- dense corporate paragraphs
- overexplaining obvious things

## Visual Philosophy

The site feels editorial, tactile, and premium.

It is not SaaS-looking, startup-looking, or template-looking.

Key traits:

- warm paper backgrounds instead of flat white
- dark ink typography instead of harsh black
- serif-led display typography for emotion and authority
- sans-serif for support text and UI chrome
- restrained accent colors used surgically
- strong hierarchy through scale, spacing, and rhythm
- layouts that feel like spreads, dossiers, or exhibition placards

## Shared Design Tokens

From `shared.css`:

- Backgrounds: `--paper`, `--paper-2`, `--paper-3`, `--paper-4`
- Text: `--ink`, `--ink-2`, `--ink-soft`, `--ink-faint`
- Rules: `--rule`, `--rule-soft`
- Accent palette:
  - `--ochre`
  - `--terracotta`
  - `--olive`
  - `--ink-blue`
  - `--claret`
  - `--sky`
  - `--blush`

Typography:

- Display/headlines: `var(--serif)` using Instrument Serif
- UI/body: `var(--sans)` using Instrument Sans

## Recurring UI Language

These patterns appear across pages and should keep returning:

- sticky nav with refined transparency and blur
- `chip` labels for audience, case number, or section signal
- `eyebrow` labels with a dot for section framing
- pill buttons with simple motion on hover
- audience switcher to place pages in the broader site system
- image-led sections with captions, tags, or dossier-style labels
- metrics presented as elegant artifacts, not dashboard widgets
- footer with the line: "We remember every project."

## Composition Rules

Each page should balance:

- one big emotional hero
- one systems/credibility section
- one portfolio or image-led section
- one "who this is for" section
- one FAQ or objections section
- one strong CTA at the end

The pages should feel curated, not assembled from interchangeable blocks.

## Content Structure Blueprint

A strong EGS page usually follows this rhythm:

1. Hero:
   audience chip, bold editorial headline, poetic but concrete lede, visual proof
2. Framing section:
   the problem with the default industry approach
3. Systems proof:
   timeline, dossier, cue sheet, tracked metrics, continuity proof
4. Portfolio:
   recent work or selected moments
5. Fit section:
   who the offering is for
6. FAQ:
   practical buying questions
7. CTA:
   low-friction ask with confidence and specificity

## What Makes EGS Different On The Page

The site repeatedly turns invisible backend discipline into front-of-stage value.

Examples already established:

- exhibition stands: debriefs, re-use rate, cost-per-sqm improvement, same carpenters
- events: cue sheets, missed-cue discipline, same crew, post-show debriefs

For future pages, do the same:

- fitouts should show continuity, site discipline, phased delivery, brand fidelity, material logic
- retail should show rollout consistency, shopper behavior, fabrication quality, repeatable store systems

## Fitouts Page Direction

Fitouts should feel:

- architectural
- measured
- material-aware
- calm and exact

Likely storytelling angle:

- spaces that need to work every day, not just look good on handover
- joinery, signage, circulation, finish quality, and handover discipline
- the same memory theme, translated into site execution and operational longevity

Useful section ideas:

- hero around spaces people work inside, not just admire
- before/after operational improvement section
- material palette or finish logic section
- phased delivery / site process section
- dossier-style handover section
- sectors served: offices, showrooms, hospitality, institutional interiors

Fitouts accent leaning:

- `--olive`
- `--ink-blue`
- restrained warm neutrals

## Retail Page Direction

Retail should feel:

- sharper
- more visible
- shopper-aware
- modular and scalable

Likely storytelling angle:

- stores and branded environments that convert attention into movement
- consistency across locations without killing local practicality
- fabrication and rollout memory across branches and campaigns

Useful section ideas:

- hero around how a shopper notices, pauses, enters, and navigates
- rollout system across multiple branches
- signage and display hierarchy section
- seasonal campaign adaptability section
- gallery or strip of branded environments
- who it is for: mall retail, kiosks, brand teams, rollout managers

Retail accent leaning:

- `--terracotta`
- `--ochre`
- selective `--claret`

## Writing Rules For New Pages

Every major section should answer one of these:

- What is broken in the default market behavior?
- What does EGS remember or carry forward?
- What system sits under the beauty?
- Who is this exactly for?
- What proof makes this believable?

## Interaction Rules

Motion should stay subtle and meaningful:

- hover lift on cards
- image scale on hover
- restrained marquee movement
- reveal-on-scroll for section pacing

Avoid:

- flashy transitions
- excessive parallax
- noisy animation stacks

## Non-Negotiables

When building fitouts and retail, keep these intact:

- editorial serif-led headline system
- warm tactile palette
- premium spacing and slow rhythm
- proof through operational detail
- repeated "memory" theme in a domain-specific way
- audience-specific messaging rather than broad generic service copy

## Implementation Note

If we later rebuild the legacy pages as native React components, use this file as the source of truth for:

- section sequencing
- copy tone
- color decisions
- typography behavior
- proof artifacts
- CTA style
