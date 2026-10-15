# GitHub Pages deployment

This is a static site with relative asset paths and no backend. The included workflow deploys from `main`.

Repository: [saltysaguaro/agrivoltaics-international-standards](https://github.com/saltysaguaro/agrivoltaics-international-standards).

Pages: [Open the planner](https://saltysaguaro.github.io/agrivoltaics-international-standards/). GitHub Actions publishing was enabled on 2026-10-15; [deployment runs](https://github.com/saltysaguaro/agrivoltaics-international-standards/actions/workflows/pages.yml) show the current status.

## Before publication

Confirm the matrix owner permits publishing the derived variables, source notes and anonymous vote ledger. The source workbook and expert initials are not shipped, but the derived dataset is public site content. GitHub warns that Pages sites are publicly available even when the repository is private, subject to product/organization access configuration. Do not treat a private source repository as a privacy guarantee for the website. See GitHub's publishing-source documentation below.

Review `DATA_NOTICE.md`, choose the project's final data license with the rights holder, and check the brand name. The supplied application-code license does not confer rights to the source research data.

## Create and populate the repository

Create an empty GitHub repository under the intended owner. A suggested project name is `agrivoltaics-international-standards`; the code does not depend on that name. Commit the project contents directly to the repository root. Keep the hidden `.github` folder.

With Git installed, an example is:

```sh
cd agrivoltaics-international-standards
git init -b main
git add .
git commit -m "Add Agrivoltaics International Standards research planner demonstration"
# Replace OWNER and REPOSITORY with the actual destination:
git remote add origin https://github.com/OWNER/REPOSITORY.git
git push -u origin main
```

Generated `_site/`, `dist/`, source workbooks and a local `plans/` folder are ignored. Save real research exports outside this repository or inside `plans/`; arbitrary export filenames elsewhere are not automatically ignored. The workflow builds public files from source.

## Enable Pages and deploy

Open repository **Settings → Pages → Build and deployment → Source → GitHub Actions**. Do not select the unrelated `docs` documentation folder as the publishing source. The custom workflow is already included; no suggested template needs to replace it.

Open **Actions → Test and deploy Pages → Run workflow**, choosing `main`, or push a new commit to `main` after enabling Pages. The workflow runs the Node/Python tests, validates all vote classifications, builds `_site`, runs the Chromium browser suite against the built site, uploads a Pages artifact, and deploys using the `github-pages` environment. Its deployment output provides the live address. Pull requests run tests/build but do not deploy.

The deploy job has only the required Pages write and OIDC token permissions; the build job has repository read permission. No personal access token belongs in client code or config. Default-branch deployment protection is recommended. Organization policy may require an administrator to approve GitHub Actions/Pages.

Once published, check the real URL on desktop and mobile: setup → shortlist → variable details → plan → export/import. Confirm refresh loading, JSON fetches, resource links, issue drafts, storage persistence, and HTTPS. Future pushes to `main` automatically run tests and deploy successful builds.

## Configure feedback

`assets/config.js` contains the public brand and `repositoryUrl`. Leave it null to infer a standard `OWNER.github.io/REPOSITORY/` project site. For a custom domain or nonstandard owner site, set:

```js
repositoryUrl: 'https://github.com/OWNER/REPOSITORY'
```

The app opens a prefilled **new issue draft**; it does not submit it automatically. Without a configured/detected repository, feedback downloads as a local Markdown file. There is no feedback database or email service. Enable Issues on the repository for this workflow. The user should review public content before submitting.

## Local and alternative hosting

```sh
npm test
npm run build
python3 -m http.server 8000 --bind 127.0.0.1 --directory _site
```

Any static HTTPS host serving the contents of `_site` can host the tool. No rewrite rule or root-relative base path is required because navigation is in-page and assets are relative. Preserve the `assets` and `data` directories; serve `.js`/`.mjs` with JavaScript-compatible MIME types and JSON correctly.

`npm run demo` additionally creates `dist/agrivoltaics-standards-demo.html`, a self-contained evaluation copy. It has no external runtime requests. Browser policies may restrict persistence for directly opened files; the app warns when storage is unavailable. JSON export is the portable backup.

## Troubleshooting

**First workflow fails to configure Pages:** enable the GitHub Actions publishing source, verify repository/organization permissions, and rerun from `main`.

**Blank loading screen after manual upload:** check that index.html is at the published root and assets/data remain beside it. Use an HTTP server for the modular version; use the standalone demo for direct file opening.

**Workflow not visible:** the hidden `.github/workflows/pages.yml` may not have been committed. Verify that the repository contains it at the root, not nested inside a ZIP wrapper folder.

**Tests fail after a matrix change:** inspect the audit. Tests deliberately encode v15 counts and fixtures so new data requires deliberate review and expected-result updates. Do not remove failing assertions merely to publish.

**Plans missing on another domain/browser:** local storage belongs to the browser/site and is not a synchronized account. Export JSON before moving hosts and import it at the new host.

**No resource links:** expected until scientifically reviewed entries are supplied in the curation overlay and the dataset is reimported.

## Official deployment references

Reviewed against official documentation, 2026-10-15:

- GitHub: [Using custom workflows with GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
- GitHub: [Configuring a publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
- Official [setup-node](https://github.com/actions/setup-node) and [setup-python](https://github.com/actions/setup-python) action documentation.

Workflow versions are pinned to published major versions, not immutable commit SHAs. Review and pin full SHAs for stricter organizational supply-chain requirements.
