# Security and privacy

The app has no backend, authentication, embedded credentials, analytics, or automatic uploads. Plans are stored in the browser and exported by the user. Do not enter confidential information on a shared machine. GitHub issue drafts may become public only after the user submits them.

Text inserted into rendered HTML is escaped. Resource URLs must use HTTPS. JSON imports are size/shape/ID-checked and require confirmation before replacing a plan. CSV exports guard formula-like fields. These safeguards are not a substitute for security review before a larger deployment.

Do not report secrets or confidential research data in public issues. Maintainers should enable private vulnerability reporting and establish a private contact before public launch. Until a private route is established, report reproducible non-sensitive UI/data bugs through ordinary feedback, not confidential vulnerability details.

Only trusted, approved source workbooks should be imported by maintainers. The offline importer rejects formulas and workbook errors; it is not a sandbox for arbitrary untrusted XLSX archives. Review GitHub workflow permissions and action versions under organizational policy. Never add a personal access token to assets/config.js.
