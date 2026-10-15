# Data model and exports

## Dataset envelope: `data/variables.json`

| Field | Meaning |
| --- | --- |
| `schemaVersion` | Data structure version, currently `1.0.0`. |
| `datasetVersion` | Source release label, currently `matrix-v15`. Update in importer for a new matrix release. |
| `importDate` | Import date as YYYY-MM-DD; may be supplied for reproducibility. |
| `source` | Original filename, sheet name and workbook SHA-256. |
| `policyVersion`, `policy` | Vote/units policy identifier and explicit settings. |
| `curationSha256` | Hash of the applied resource overlay, when present. |
| `stats` | Recomputed counts by domain, classification, unit state, and evidence. |
| `expertSessions` | Anonymous source-column IDs and their session names. |
| `variables` | Source-ordered array; one record per non-empty source row. |

## Variable record

| Field | Meaning |
| --- | --- |
| `id` | `av-` plus the first 12 hex digits of SHA-256 of casefolded category, original subcategory, and standardized name joined by null separators. |
| `name`, `category` | Original standardized variable name and category, trimmed. |
| `subcategory`, `sourceSubcategory` | Display label and original source label. Five known spelling/capitalization corrections affect display only. |
| `units.raw` | Original units/classification string, including source NA or TBD. |
| `units.display`, `status` | Display string and `provided` / `missing` / `tbd`. |
| `units.notes`, `needsReview` | Editorial ambiguity warnings and unit decision flag. |
| `sessions`, `sessionCount`, `sourceSessionCount` | Ordered distinct source-session names and validated session count. |
| `notes` | Existing source methodology/explanatory text; not a validated method. |
| `source.sheet`, `row`, `rows` | Worksheet name, first-sheet row number, and the original source-row reference string. |
| `consensus` | Auditable vote result, described below. |
| `voteCells` | Non-NA cell ledger: anonymous expert-session ID and verbatim `raw` content. |
| `foundation` | Optional starter group: site/system/design/crop/measurement; null otherwise. |
| `condition` | `tracking`, `cell-geometry`, or null; navigation rule only. |
| `methods`, `publications` | Reviewed resources applied from the curation overlay; empty in this release. |

IDs are stable across row reordering and changes to votes, units, and source notes. Renaming a category, original subcategory, or variable changes its ID. Plan import rejects unknown IDs rather than attaching a plan to a different variable. Review renames explicitly and design a migration before publishing a breaking dataset change. Display-only typo correction does not change IDs.

## Consensus record

`category` is CD/CU/E/S or null. `majorityCode` may also be C. `status` is classified, legacy-core, no-consensus, tie, or no-votes. `counts` includes CD/CU/C/E/S. `denominator` counts non-NA cells; `recognized` excludes ambiguous indications; `unresolved` counts them; `na` is the excluded count. `qualifiers` retains every code meeting ≥50%. `agreement` is the unique winner's fraction or null; `topShare` is the maximum recognized share or null. `limitedEvidence` is true for one or two non-NA cells.

For every variable, `sum(counts) + unresolved = denominator`, and `denominator + na = 90` in this dataset. The build and tests recompute the full result from the ledger and NA count.

## Plan JSON

Plan files have `type: "agrivoltaics-standards-plan"`, `schemaVersion: "1.1.0"`, datasetVersion, sourceSha256, policyVersion, exportedAt, study, context, and plan.

`study` holds name and notes. `context` holds topic and crop-group IDs, PV configuration, optional cell geometry, design/report mode, and starter-toggle state. `plan` maps variable IDs to these fields:

| Field | Meaning |
| --- | --- |
| `unitOverride` | Researcher-entered reporting unit/format; blank means use a provided source unit. |
| `schedule` | Frequency, interval, aggregation and/or timing, as entered. |
| `position` | Treatment, reference location, height, depth, or spatial layout, as entered. |
| `method` | Researcher-entered method text, not a reviewed catalog method. |
| `notes` | Variable-specific notes. |
| `status` | planned / collected / not-collected / not-applicable; researcher-controlled. |

Imports are validated, require confirmation before replacement, reject unknown IDs, bound text lengths, and warn on different source hashes or classification policies. The browser file input limits files to 5 MB. Import is not a merge, and importing JSON never changes the public variable catalog. Dataset/source identity differences are not evidence that a plan remains scientifically comparable.

Automatically selected or restored fields always start as planned, so migration never asserts collection. For manually added variables, design mode initially marks selections planned; reporting mode initially marks them collected. The UI explicitly says these are editable, unverified defaults. Changing mode does not rewrite existing collection statuses.

## CSV outputs

**Measurement plan:** one row per selected variable. Contains original and researcher-entered units separately, source-unit warnings, category/status/majority and all vote counts, sampling details, method, researcher notes, collection status, source sheet/row, and dataset/policy versions. Study-level notes, full context and source hash are in the companion JSON, not every CSV row.

**Blank observation template:** one blank row per selected variable. Fields include study, observation ID, timestamp/time zone, treatment, replicate, sampling position, sensor height (m), soil depth (cm), variable ID/name, blank value, reporting unit, method, quality flag and notes. Duplicate rows for repeated measurements. It does not contain fabricated observations or validate tabular inputs. Metadata can use the value field as text where appropriate.

**Classification audit:** all 641 variables, original and display subcategories, decision/status, vote counts, NA/unresolved counts, source units and warnings, sessions, sheet and row. A raw vote-cell ledger remains available in JSON and the detail dialog.

CSV files use UTF-8 with BOM, CRLF row endings, quote escaping, and a leading apostrophe for spreadsheet formula-like values. This can add an apostrophe to a literal beginning with `=`, `+`, `-`, or `@`; JSON preserves exact text. Fractional agreement is exported as 0–1, not an integer percentage.

## Public data boundaries

The build publishes only index.html, standards_logo.png, assets, variables.json, classification-audit.csv, license/data notices and .nojekyll. It does not publish the source workbook, developer tests, saved research plans, or the separate editable curation file. Reviewed resources already applied to variables.json are public. The repository itself may expose additional tracked documentation and data; inspect everything before making the repository public.

Legacy `agrifield-measurement-plan` version 1.0 files remain importable. Required metadata is restored on import without overwriting researcher entries; legacy imports also receive the CD/CU defaults. Source dataset schema remains 1.0.0. Measurement-plan CSV includes `required_metadata` separately from the source classification.

## Display labels

`assets/variable-labels.mjs` provides full display names, abbreviations/scientific symbols, and occasional terminology notes, keyed by unchanged variable ID. Original `name` values remain in source data and detail provenance. See [label conventions and references](VARIABLE_LABELS.md). Measurement-plan and observation CSVs append `display_name` and `abbreviation` without changing the existing source-name column or other column positions.
