# 00 Global Page Rules

Use this file with `EGS_WEBSITE_CONTENT_BIBLE.md`, `DESIGN_PHILOSOPHY.md`, and `09-visual-audit-and-page-system.md` before updating any React page.

These specs are implementation guides, not runtime CMS content.

## Codex Usage Prompt

```text
Use EGS_WEBSITE_CONTENT_BIBLE.md, DESIGN_PHILOSOPHY.md, 09-visual-audit-and-page-system.md, and this page spec.

Update only the relevant page.
Keep the existing visual/design language, typography, color system, spacing rhythm, nav style, image-led structure, and premium editorial feel.
Do not redesign the website from scratch.
Do not invent claims.
Do not add generic AI/corporate copy.
Follow the page spec section order and word budgets.
If the existing layout has a matching section, rewrite it in place.
If a required section is missing, add it using the closest existing component style.
Make the page visual-first: use cards, proof chips, image captions, steppers, annotated images, stats, and concise sections instead of long explanatory blocks.
```

## Page Rules

- Preserve the current EGS design language: warm, editorial, visual, premium, image-led, and operationally sharp.
- Use existing layouts and components first. Add new sections only when the spec requires them.
- Keep pages visual-first. Text supports the images and proof; it should not become a proposal.
- Every page must answer: what EGS does, who it is for, why trust EGS, what proof exists, and what to do next.
- Every page needs one clear H1, one primary CTA, one softer CTA, proof before the final CTA, internal links, and an FAQ section.
- Every service page needs a practical process section. Buyers should understand what happens after they contact EGS.
- Every service page needs buyer-reassurance copy that answers timing, quality, venue/location pressure, scope changes, and handover readiness.
- Use only claims from the Content Bible or the page spec.
- Do not expose sister-company, agency, or commercial-routing details.
- Do not infer exact Carrefour locations or emirate breakdown.
- Do not imply public articles name EGS unless the article directly does.

## Render Discipline

Each page spec has three kinds of material:

- `Rendered content`: copy, labels, headings, proof cards, CTAs, and FAQs that may appear on the website.
- `Visual direction`: instructions for how to show the idea through layout, cards, images, stats, marquees, steppers, or captions.
- `Guidance only`: strategy notes, guardrails, warnings, and implementation instructions. These must never appear as public website copy.

When implementing pages, render only the content intended for visitors. Do not render headings such as `Page Goal`, `Audience`, `What Not To Say`, `Implementation Notes`, `Guardrail`, `Use carefully`, or `Do not`.

## Above-The-Fold Rules

Every page should show these before or near the first viewport:

- one clear H1,
- one short hero paragraph,
- primary CTA,
- secondary CTA,
- real image or strong proof visual,
- a quick signal of trust: client names, proof number, or relevant case link.

Avoid putting long process sections, FAQs, dense service lists, or internal explanation above the fold.

## Render As Visual, Not Text

Use visual treatment wherever possible:

- Process becomes a stepper or compact numbered strip.
- Proof becomes clickable cards with one metric and one sentence.
- Client credibility becomes a muted logo/name marquee.
- Buyer reassurance becomes compact cards or icon rows.
- Case studies become cards plus anchored detail sections, not one long article wall.
- Contact intake becomes brief cards, field groups, direct buttons, and a short next-step strip.
- Public source notes become small captions or footnotes, not big paragraphs.

If a section would become more than 90-120 visible words, split it into cards or reduce it.

## Show, Do Not Tell Rules

- Do not say EGS is fast without showing a time window or operational constraint.
- Do not say EGS is reliable without showing what was delivered, where, and under what pressure.
- Do not say EGS is experienced without showing client names, years, project counts, locations, or ceremony scale.
- Do not say EGS adapts without showing the physical change: stage extension, ultrasound display, extra chillers, location rollout.
- Do not use abstract claims where a concrete noun can do the work.
- A strong proof card beats a long paragraph.

## Word Budgets

- Hero H1: 8-12 words preferred, 16 max.
- Hero paragraph: 45-65 words.
- Section intro: 35-70 words.
- Proof card: 35-50 words.
- Service card: 25-45 words.
- Case study summary: 120-180 words.
- FAQ answer: 45-70 words.
- CTA section paragraph: 25-40 words.

## Copy Style

- Write in Modern Operator Voice.
- Use concrete nouns: stand, stage, chiller, display counter, venue, crew, vehicle, mall access, install, handover.
- Prefer short active sentences.
- Use proof instead of adjectives.
- Headings should be clear before clever.
- Avoid long paragraphs and padded setup lines.
- Avoid any banned phrases from the Content Bible.

## Standard Process Layer

Use this structure as the default process section on service pages. Adapt the nouns to the service.

1. `Brief`: collect deadline, venue/location, scope, photos/drawings, and what has changed.
2. `Feasibility`: check timing, access, materials, production risk, and what must move first.
3. `Plan`: agree the build direction, deliverables, installation window, and approvals needed.
4. `Produce`: fabricate, print, source, assemble, and prepare the team.
5. `Install`: execute on site around venue, mall, or event constraints.
6. `Check and hand over`: QA/QC the physical work before opening, launch, or showtime.

Do not make the process sound slow or bureaucratic. It should feel controlled, practical, and fast.

## Buyer Reassurance Layer

Each page should quietly answer:

- What does EGS need from me to start?
- What can EGS handle directly?
- How does EGS reduce deadline risk?
- How does EGS keep finish quality visible under pressure?
- What proof exists for this specific service?
- What happens after I send the brief?

## Visual Rules

- Use real project imagery near the top of every page.
- Keep image captions factual.
- Every major proof story needs at least one image slot or factual caption, even if the final image is added later.
- Prefer real work, installation, venue, detail, and handover imagery over decorative photos.
- Use short captions to make proof clearer: client/event, place, year, and what was delivered if confirmed.
- Use client logos/names as credibility, but do not turn logo mentions into case studies unless details are confirmed.
- Case-study/proof cards should look clickable and should link to `/case-studies#anchor`.
- Use marquees sparingly: logos and proof navigation are good uses.

## Standard CTAs

Primary CTAs:

- Send us your brief
- Brief us on your stand
- Brief us on your ceremony
- Start a retail rollout brief
- Start a fitout brief

Softer CTAs:

- See case studies
- See relevant work
- Send the deadline and scope
- Get a quick feasibility read
- Share the location list
- Send the stand layout

## Standard Internal Links

- Home: `/`
- Exhibitions: `/exhibitions`
- Events: `/events`
- Fitouts: `/fitouts`
- Retail: `/retail`
- Case studies: `/case-studies`
- Contact: `/contact`

Case-study anchors:

- `/case-studies#hct-graduation-program`
- `/case-studies#hct-fujairah-stage-extension`
- `/case-studies#sadia-carrefour-rollout`
- `/case-studies#philips-global-health-riyadh`
- `/case-studies#kazakhstan-pavilion-gulfood`
- `/case-studies#money-kicks-activation`

## Implementation Checklist

- One H1 only.
- Proof appears before final CTA.
- FAQ exists.
- Primary CTA exists.
- Internal links work.
- Page copy stays within word budgets.
- No invented claims.
- Design language is preserved.
- Case-study anchors match homepage proof-card links.
