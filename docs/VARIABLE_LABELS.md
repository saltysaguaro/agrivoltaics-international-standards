# Variable names and abbreviations

The library uses display-only labels in `assets/variable-labels.mjs`. Every override is keyed by stable variable ID and records the expected original name. Tests reject stale IDs or mismatched source names. The imported matrix, IDs, votes, units, and existing saved plans are unchanged.

Names spell out the quantity; the adjacent Abbreviation column holds established acronyms and scientific symbols where applicable. A dash means no abbreviation has been assigned. Chemical formulas and quantity symbols are included because researchers search for them in the same way as acronyms. Diagram letters are retained in source details, not presented as standard abbreviations. Framework names in feed variables are displayed as “French ruminant feeding system, 2018”; the exact original reference remains available in source details.

Both list and tile layouts use the same labels, filters, sorting, selection rules, details, and pagination. Searching accepts display names, abbreviations, and original source wording. Labels also appear in plans and printouts. Measurement-plan and observation-template CSVs append `display_name` and `abbreviation`; the existing `variable` column retains the source name. Source JSON and classification audit remain unchanged.

## Editorial references

- [LI-COR leaf physiology definitions](https://www.licor.com/support/Photosynthesis/topics/complementary-photosynthesis-measurements.html): photosynthetic rates and capacities.
- [LI-COR chlorophyll fluorescence definitions](https://www.licor.com/support/LI-6800/topics/fluorometer-introduction.html): maximum and effective quantum yields of photosystem II.
- [INRA, CIRAD and AFZ ruminant feed tables](https://feedtables.com/content/ruminants-0) and [parameter definitions](https://feedtables.com/content/parameters?parameter_cat=77): feed units for lactation/meat production and intestinal digestible protein.
- [Julius Kühn Institute phenological growth stages](https://www.julius-kuehn.de/media/Veroeffentlichungen/bbch%20epaper%20en/page.pdf): BBCH growth stages.
- [System Advisor Model system design](https://samrepo.nlr.gov/help/pv_system_design.html): ground coverage ratio and plane-of-array terminology.
- [FAO reference evapotranspiration](https://www.fao.org/4/x0490e/x0490e05.htm): reference surface and notation.

These references support display terminology; they do not validate the source records or supply measurement protocols. Combined source entries remain combined. For example, ground coverage ratio and row-to-row pitch are distinct quantities. Source evapotranspiration notation is inconsistent: the potential-evapotranspiration entry uses ET0, conventionally reference evapotranspiration, and the corrected entry uses ETP0 for its input. Detail notes flag these ambiguities rather than silently changing the scientific definitions. pH is described as acidity and alkalinity with the extraction medium retained; it is not expanded into an invented acronym.
