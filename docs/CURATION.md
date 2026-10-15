# Adding reviewed methods and publications

Resource slots are empty in this demonstration. Source methodology notes are not automatically promoted to reviewed methods, and a URL placeholder must never be published as a real citation.

## Workflow

Locate a variable by its stable `av-…` ID in the detail dialog or audit. Verify that the source describes the same measured quantity, context, unit basis, and agricultural or PV system. For methods, review replication, sensor placement, sampling schedule, calibration, aggregation, and uncertainty where relevant. For publications, verify the bibliographic details and that the paper actually reports this variable.

Edit `data/curation.json`. Each entry may contain only `methods` and `publications` arrays. Every resource requires a title, HTTPS URL, reviewer and review date. Methods require a summary; publications require a citation. Prefer a DOI or stable publisher/institutional source. Do not store credentials in URLs. Summarize in original wording rather than copying protected methods text.

The following is **structural documentation only**, not a ready-to-publish resource. Replace every uppercase placeholder, including the ID and URL, with verified content before saving.

```json
{
  "schemaVersion": "1.0.0",
  "entries": {
    "REPLACE_WITH_EXISTING_VARIABLE_ID": {
      "methods": [
        {
          "title": "VERIFIED_METHOD_TITLE",
          "url": "https://VERIFIED_SOURCE_HOST/VERIFIED_PATH",
          "summary": "REVIEWED_APPLICABILITY_AND_METHOD_SUMMARY",
          "reviewer": "REVIEWER_NAME_OR_APPROVED_ID",
          "reviewedOn": "2026-10-14"
        }
      ],
      "publications": [
        {
          "title": "VERIFIED_PUBLICATION_TITLE",
          "url": "https://VERIFIED_SOURCE_HOST/VERIFIED_PATH",
          "citation": "VERIFIED_AUTHORS_YEAR_TITLE_AND_PUBLICATION_DETAILS",
          "reviewer": "REVIEWER_NAME_OR_APPROVED_ID",
          "reviewedOn": "2026-10-14"
        }
      ]
    }
  }
}
```

Run the importer against the approved workbook, then tests and build:

```sh
python3 scripts/import_matrix.py /path/to/approved-matrix.xlsx --curation data/curation.json
npm test
npm run demo
```

This reapplies the overlay after rebuilding source records. Unknown IDs and incomplete/invalid reviewed-resource entries stop import. Inspect the UI's Methods & sources tab and the generated diff before merging. A local-only edit to `variables.json` can be lost at the next import; it is not the resource source of truth.

## Keep decisions separate

The overlay deliberately cannot change source votes, units, names, or classifications. To resolve legacy C or unit errors, document the expert decision and update the approved source matrix; reimport and review the new audit. A future editorial-unit/taxonomy overlay must be designed separately with reviewer, citation, date, decision history, and a clear distinction from source consensus.

Maintain review status and editorial ownership outside the public app until accepted. GitHub correction issues are proposals, not automatic scientific approvals. Never put confidential participant/site information in a public issue.
