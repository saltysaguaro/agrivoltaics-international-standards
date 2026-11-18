# Verification report

Release: Agrivoltaics International Standards 0.2.0. Tested 2026-11-18 with matrix-v15 / conservative-50pct-v1.

## Results

- **51 Node tests passed:** source classifications and totals, filters, units, CSV escaping, plan validation, all 26 CD/CU defaults, required metadata, legacy-plan migration, preservation of current-plan omissions, and required-metadata export flags, label/source integrity, abbreviation search, display-label exports, combined Core grouping without pooled votes, and field-site/PV ordering.
- **12 Python tests passed:** importer classification policy, source data, units, and curation validation.
- **19 HTTP browser integration groups passed:** full-library landing, selected-only shortlist, navigation cleanup, session-only state, legacy storage cleanup, JSON restoration, blocked storage, responsive layouts and the existing details/export/feedback workflow.
- **18 standalone browser integration groups passed:** the same workflow in the self-contained demo, with a test-only storage adapter.
- **Both builds passed:** public site and standalone HTML. The build recalculated all 641 classifications from their raw vote ledgers.

Browser checks cover domain tabs, keyboard navigation, sidebar priorities, list/tile selection and pagination, required metadata protection, source evidence, sampling fields, all export formats, valid/invalid JSON imports, clear-plan behavior, fresh visits and reloads, privacy copy, feedback, and print styles. No JavaScript errors or external runtime requests occurred. Old `#setup` and unknown routes resolve to the variable library.

Layout overflow checks passed at 320, 390, 768 and 1440 pixels. Desktop and mobile screenshots were visually inspected. A positioned table container keeps its accessible hidden labels inside the horizontal scroll region at tablet widths. The mobile navigation uses three equal columns.

The 92 default selections (67 required metadata fields plus the exact CD/CU defaults) remain unchanged. The shortlist now reflects actual selections instead of planner scope recommendations. Tests verify adding and removing an optional variable immediately updates both the shortlist and its count.

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

The Pages build job uses Ubuntu 24.04 because pinned Playwright 1.60.0 does not support the Ubuntu 26.04 runner. The Pages workflow installs the pinned browser-test dependency and runs the HTTP browser suite against the built public site before deployment. The application has no runtime dependencies. Inline mode uses a test-only storage adapter; HTTP mode verifies that study data is not persisted. The adapter is never shipped.

## Limits

These local results cover the library-first, session-only workflow update. The repository was uploaded and GitHub Actions publishing enabled on 2026-10-15; see the [deployment workflow](https://github.com/saltysaguaro/agrivoltaics-international-standards/actions/workflows/pages.yml) for hosted build and deployment results. Chromium testing does not certify Firefox, Safari, formal screen-reader/WCAG compliance, or scientific validity. The source workbook was not available for a new import; tests audit the supplied derived dataset and importer fixtures. Data redistribution rights remain as documented in `DATA_NOTICE.md`.
