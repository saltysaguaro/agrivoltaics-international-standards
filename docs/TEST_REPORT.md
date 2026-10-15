# Verification report

Release: Agrivoltaics International Standards 0.2.0. Tested 2026-10-15 with matrix-v15 / conservative-50pct-v1.

## Results

- **51 Node tests passed:** source classifications and totals, filters, units, CSV escaping, plan validation, all 26 CD/CU defaults, required metadata, legacy-plan migration, preservation of current-plan omissions, and required-metadata export flags, label/source integrity, abbreviation search, display-label exports, combined Core grouping without pooled votes, and field-site/PV ordering.
- **12 Python tests passed:** importer classification policy, source data, units, and curation validation.
- **18 browser integration groups passed in both HTTP and standalone modes.** HTTP tests exercised the built `_site` with real browser local storage. Project-subdirectory hosting was also verified in the initial publication checks. Standalone tests used inline HTML and the test-only storage adapter.
- **Both builds passed:** public site and standalone HTML. The build recalculated all 641 classifications from their raw vote ledgers.

Browser checks cover domain tabs, keyboard navigation, sidebar priority filters, domain ordering in both layouts, expanded names and abbreviations, list/tile selection and pagination parity, required-field locking in tiles, responsive tiles, the light theme under a dark OS preference, PNG branding, absence of the promotional banner, 92 initial selections, the 285-variable crop/microclimate/Field Crops shortlist, mandatory-field protection (including page selection and clearing), preservation of required-field notes, source evidence, units and sampling fields, filters, all export formats, valid/invalid imports, reload persistence, local feedback drafts, keyboard tabs/Escape, privacy erasure, and print styles. No JavaScript errors or external runtime requests occurred.

Additional checks passed for storage-denied fallback and direct `file://` startup. A computed-color spot check found no text below 4.5:1 on the four initial main views after correcting secondary labels; this is not a full accessibility audit.

Layout overflow checks passed at 320, 390, 768 and 1440 pixels. Desktop and mobile screenshots were visually inspected. `preview.png` is a current browser capture. Test evidence is recorded in `browser-results.json` and `unit-test-results.txt`.

## Repeat tests

```sh
npm test
npm run demo
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r tests/requirements-browser.txt
python -m playwright install chromium

# In a separate terminal:
python3 -m http.server 8000 --bind 127.0.0.1 --directory _site

python tests/browser_smoke.py --url http://127.0.0.1:8000 --screenshots test-output
python tests/browser_smoke.py --inline
```

The Pages workflow installs the pinned browser-test dependency and runs the HTTP browser suite against the built public site before deployment. The application has no runtime dependencies. Inline mode uses a test-only storage adapter; HTTP mode tests actual persistence. The adapter is never shipped.

## Limits

These local results cover the combined Core and domain-navigation update. The repository was uploaded and GitHub Actions publishing enabled on 2026-10-15; see the [deployment workflow](https://github.com/saltysaguaro/agrivoltaics-international-standards/actions/workflows/pages.yml) for hosted build and deployment results. Chromium testing does not certify Firefox, Safari, formal screen-reader/WCAG compliance, or scientific validity. The source workbook was not available for a new import; tests audit the supplied derived dataset and importer fixtures. Data redistribution rights remain as documented in `DATA_NOTICE.md`.
