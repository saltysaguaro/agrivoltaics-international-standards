# Classification, ranking, and study scope

## Source and provenance

The demonstration uses `All Variables`, the first tab of `Agrivoltaics_Expert_Matrix_Summary_15.xlsx`: rows 2–642, eight descriptive columns and 90 expert-by-session columns. All 641 source rows are retained; none are merged, dropped, or replaced. The other thematic tabs are not pooled into the vote calculation. The workbook's expert-key explanation was consulted to interpret merged, contradictory cells.

`data/variables.json` records the workbook filename, SHA-256, sheet, source row, source-row references, import date, dataset version, and policy version. Every included non-NA cell is retained verbatim with an anonymous expert-session ID. Anonymous IDs track source columns, not unique individuals, and may shift if future workbook columns are reordered. NA counts are retained, not separate NA ledger entries.

The 90 columns cover 10 sessions. A researcher appearing in several sessions may contribute several source columns. The app implements the requested **column-based vote**, not a unique-person or session-balanced vote. Agreement is descriptive; it is not a confidence interval, validation score, or proof of expert independence.

## Target categories

The supplied classification image is the governing description of the four target tiers:

| Code | Category | Meaning |
| --- | --- | --- |
| CD | Core / Descriptive | Required site, system, agricultural, design, and management context; not measured response variables. |
| CU | Core / Universal | Basic microclimate, soil, and energy measurements to support comparison with reference treatments. |
| E | Enhanced | High-value measures constrained by cost, infrastructure, replication, or measurement burden. |
| S | Supplemental | Specialized, emerging, expensive, or insufficiently standardized measures. |

These descriptions do not license silently rewriting source votes. For example, a crop response receiving legacy `C` cannot safely be labelled universal across all agricultural systems merely because it is important within a crop session.

## Normalization policy: `conservative-50pct-v1`

Trim whitespace and compare without case. Ignore only blank, `NA`, and `N/A` cells. Recognize `CD`, `CU`, `C`, `E`, and `S`. Two explicitly documented source aliases are accepted: `C = Core` becomes `C`, and `E*` becomes `E`. Original literals remain in the ledger.

Any other non-NA cell—including `C | E`, conflicting merged values, conditional statements, and unknown codes—is unresolved. It remains in the denominator but supports no category. It is not split into multiple votes, down-weighted, or silently discarded. This conservative choice prevents contradictory cells from manufacturing a majority. A future alternative denominator requires a new policy version and side-by-side audit.

For each row:

```text
D = number of non-NA expert-session cells, including unresolved cells
V[k] = number of cells containing recognized category k
Q = { k : D > 0 and 2 × V[k] >= D }
```

| Condition | Stored outcome |
| --- | --- |
| D = 0 | `no-votes`; category null |
| More than one member of Q | `tie`; category null |
| Q is empty | `no-consensus`; category null |
| Q = {C} | `legacy-core`; majorityCode C, target category null |
| Q = {CD}, {CU}, {E}, or {S} | `classified`; the unique code is the category |

The requested inclusive 50% threshold is applied exactly without rounding. A 2/4 E share with the remainder split among other codes qualifies. A 2/4 E and 2/4 S tie does not. CD, CU, and C are not combined; their combination would not establish a specific subtype.

Agreement is `V[winner] / D` when a unique code qualifies. For unresolved rows, the maximum recognized share is available as `topShare` but is not presented as a successful majority. The UI rounds display percentages only. Rows based on one or two non-NA cells get a **limited evidence** marker; this is an editorial flag, not a new minimum-vote requirement.

## Results

13 CD, 13 CU, 171 E, 83 S, 245 legacy C, 75 below-threshold, 14 tied, and 27 unrated records. There are 7,641 non-NA cells, including 113 unresolved indications. Sixty-two variables have only one or two non-NA cells. See `data/classification-audit.csv` for every row.

## Ranking

The default display order is CD → CU → legacy C → E → S → other review states. Within a tier, sort by agreement descending, non-NA cell count descending, then variable name. This is a navigation order, not a numerical measure of scientific importance. Legacy C appears early to retain its source priority but remains explicitly unresolved. E and S are not described as universally required.

Alternative sorts are variable name, evidence count, and agreement. Filtering does not recompute the consensus or silently turn a global vote into a crop-specific vote. Low-agreement rows and unrated variables remain searchable.

## Scope rules and their limits

The eight study focuses are a navigation layer over seven original categories:

| Focus | Source mapping |
| --- | --- |
| Crop performance | `Crops` |
| Plant physiology | `Crops` with the Plant Growth & Physiology session, or subcategories Morphology, Physiology, Phenology, Metabolism, Resource Use Efficiency, Water, or Indices |
| Microclimate | `Microclimate` |
| Soil & water | `Soil` |
| Biodiversity | `Biodiversity` |
| Livestock & grazing | `Livestock` |
| PV systems & energy | `System Specifications` |
| Site & study design | `Metadata` |

Focuses combine with OR. “Soil & water” does not infer every hydrological dependency; add Microclimate for the broader source microclimate/water-balance category. The starter checklist retains basic water measurements.

Five crop-group choices use **recorded source-session coverage**, not a reviewed crop applicability ontology. Selected groups combine with OR and restrict the Crops category when using crop/physiology focuses. No selected groups retains all crop groups. Group selection does not filter away soil, microclimate, livestock, or system variables. Biodiversity and livestock are separate focuses, not crop groups.

All exact expert-voted CD/CU variables are included across focuses, subject to explicit configuration exclusions. Their source classification remains visible; it does not establish actual relevance to every study. The plan shows omitted CD/CU records so researchers can consider them and document exceptions. No missing-core warning blocks export or certifies completeness.

Required site/PV metadata always stays in the shortlist, including tracking and cell-geometry specifications. Mark these fields not applicable when appropriate, with a reason in their notes. Configuration filters apply only to optional variables. Unspecified configurations keep everything available. The full library bypasses these scope rules. Changing study scope does not delete already-selected variables.

## Starter checklist

An optional **32-variable editorial checklist** maps examples in the supplied classification framework to existing matrix records: site coordinates/climate, system geometry/technology/capacity, study design, crop identity/management, and basic measurements. The exact mapping is `FOUNDATION` in `scripts/import_matrix.py`. Crop-context suggestions require crop, physiology, or livestock research or a crop-group selection. Configuration exclusions still apply.

This is separate from expert classification. A starter marker never converts C into CD/CU, never changes a vote count, and never inserts a variable missing from the workbook. Researchers choose optional suggestions. Planner requirements below are maintained separately from these suggestions and from expert classifications.

## Units and reporting

Source strings are preserved; only surrounding whitespace is trimmed. Missing/NA units display “Not specified”; `TBD` displays “To be defined.” The file has 339 missing and 9 TBD units. An additional 35 provided strings are flagged, yielding 383 unit decisions. Not every possible source-unit defect has been identified.

Editorial warnings cover energy versus capacity, AC/DC capacity basis, ambiguous moisture percentages, calendar conventions, a cumulative-water name paired with a rate, ambiguous `-` or `C` notation, and a variable combining GCR with row pitch. These warnings request a definition, not a conversion. Researcher-entered units/formats are separate fields and labelled accordingly; merely filling the field is not unit validation.

The tool performs **no measurement conversion**, dimensional analysis, normalization, or acceptance checking of collected values. A reporting unit does not establish a valid sampling interval, spatial scale, sensor method, aggregation basis, reference treatment, or uncertainty model. Researchers must supply and review these.

Existing workbook methodology notes are labelled source text, not reviewed protocols. Methods and publication slots are empty until maintainers curate and attribute them. No literature is synthesized into fabricated citations.

## Versioning and governance

Maintain a separate review process for taxonomy, unit recommendations, methods, and applicability rules. Do not hand-edit a generated majority merely to make it fit a desired category. Resolve source records with documented expert input, reimport, compare the audit, and version the decision. A later editorial taxonomy may coexist with raw consensus but must be clearly labelled and separately attributable.

This demonstration is a planning aid, not a claim of scientific consensus beyond the supplied cells and explicit policy.


## Required metadata and default selections

New plans start with all 13 CD and 13 CU variables selected, plus 67 required metadata records (92 distinct selections). CD/CU records outside the required metadata set remain removable; record omissions in study notes.

`isRequiredVariable` in `assets/core.mjs` defines the mandatory set: site/design foundation records in Metadata; country, city, geographical location details, latitude/longitude, climate classification, soil type, site slope, prior land use, installation year and institution; and PV system foundation records plus facility identity/land indicators, module configuration and dimensions, system geometry, spacing, optical properties, cell geometry, site geometry and tracking specifications. Economics, maintenance and electricity-production measurements remain optional unless added by the researcher.

Required records remain selected across topic/configuration filters, individual and bulk removal, clearing optional variables, imports and reloads. Conditional fields remain visible so researchers can explicitly report non-applicability. Required means inclusion in the measurement plan, not a claim that measurements are complete or validated. Draft exports remain available before values or methods are known.

The optional starter toggle only affects additional suggestions. Neither requirements nor defaults relabel expert votes. CSV exports carry a separate `required_metadata` column. Legacy version 1.0 plans are migrated to the defaults while preserving all existing entries. Version 1.1 plans retain deliberate CD/CU omissions and restore any missing required metadata.
