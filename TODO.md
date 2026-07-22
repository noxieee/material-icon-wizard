# TODO

Backlog from a colleague code review (2026-07-16). Each item keeps the original
note for reference.

## Architecture / foundations

- [ ] **Rewrite in TypeScript.** Without types the codebase is too risky for
      others to touch and maintain.
      _("přepsal bych to do TS. Jinak se toho žádný člověk nedotkne — too risky")_
- [ ] **Rename the project to something generic** (drop "Material") — other icon
      sources may be added later, so the name shouldn't be tied to Material Icons.
      Touches: package names, repo/GitHub Pages base path, npm package, docs.
      _("název projektu víc generický (bez material). Možno bude i jiný source.")_
- [ ] **Audit and update dependencies** — several flagged as outdated by years;
      review and bump.
      _("updatovat knihovny. Hodně věcí outdated několik let")_

## Search / add flow (web)

- [x] **Exclude already-selected icons from the autocomplete** suggestions.
      _("ikony které jsou již vybrané by neměli být v autocomplete")_
- [ ] **Replace the dropdown suggestion list with a grid / picker.** The current
      vertical dropdown is space-inefficient for browsing icons.
      _("mít ty ikony v dropdown je prostorově neúsporné. Spíš by tam byl grid nebo možná picker")_
- [x] **Keep the search open after selecting so several icons can be added from
      one query.** Right now, typing e.g. "arrow", picking "left", then wanting
      "right" fails — the dropdown closes and the search clears. Also improve
      keyboard/arrow-key control for speed.
      _("když napíšu arrow a označím ikonu left a chci ještě přidat right, tak dropdown se zavře a
      vyclearuje search. Rovnako vytunit víc ovládání šipkama kvůli rychlosti atd…")_

## Gallery cards (web)

- [ ] **Rethink the per-card "re-run transform" action** — it doesn't make sense
      on an individual card. Instead, visually mark cards that don't yet have a
      transformation.
      _("re-run transform na kartě ikony mi nějak nedává smysl. Označil bych karty, které ještě
      nemají transformaci.")_

## Code inspector (web)

- [ ] **Rework the diff legend / explanations** — the removed/added labels feel
      off; the presentation doesn't sit right.
      _("vysvětlivky v diff jsou trochu divné. Pocit v podbřišku nemám dobrý")_

## Export (web)

- [ ] **Consolidate export into a single split/dropdown button** with zip / raw
      (and folder) options. The separate "Save to folder" and "Download .zip"
      buttons are misleading.
      _("Save to folder a Download .zip je misleading. Raději dropdown button s možností zip/raw.")_
