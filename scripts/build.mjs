#!/usr/bin/env node
/** Copy only public assets; optional single-file demo works without a web server. */
import {readFile,writeFile,mkdir,rm,cp} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {auditRows,toCSV,classifyVotes} from '../assets/core.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const site=path.join(root,'_site');
const data=JSON.parse(await readFile(path.join(root,'data/variables.json'),'utf8'));
if(data.variables.length!==data.stats.variables) throw new Error('Dataset count mismatch.');
for(const v of data.variables){
  const computed=classifyVotes([...v.voteCells.map(c=>c.raw),...Array(data.stats.expertSessionColumns-v.voteCells.length).fill('NA')]);
  if(JSON.stringify(computed)!==JSON.stringify(v.consensus))throw new Error(`Classification mismatch: ${v.id}`);
}
await rm(site,{recursive:true,force:true});await mkdir(site,{recursive:true});
await cp(path.join(root,'assets'),path.join(site,'assets'),{recursive:true});
await mkdir(path.join(site,'data'),{recursive:true});
await writeFile(path.join(site,'data/variables.json'),JSON.stringify(data));
await cp(path.join(root,'index.html'),path.join(site,'index.html'));
await cp(path.join(root,'standards_logo.png'),path.join(site,'standards_logo.png'));
await writeFile(path.join(site,'.nojekyll'),'');
await cp(path.join(root,'LICENSE'),path.join(site,'LICENSE.txt'));
await cp(path.join(root,'DATA_NOTICE.md'),path.join(site,'DATA_NOTICE.md'));
const csv=toCSV(auditRows(data.variables));
await writeFile(path.join(root,'data/classification-audit.csv'),csv);
await writeFile(path.join(root,'data/quality-summary.json'),JSON.stringify(data.stats,null,2)+'\n');
await writeFile(path.join(site,'data/classification-audit.csv'),csv);
console.log(`Validated ${data.variables.length} records; static site built in _site/.`);
if(process.argv.includes('--demo')){
  const escapeScript=s=>s.replace(/<\//g,'<\\/');
  let html=await readFile(path.join(root,'index.html'),'utf8');
  const license=await readFile(path.join(root,'LICENSE'),'utf8');
  const dataNotice=await readFile(path.join(root,'DATA_NOTICE.md'),'utf8');
  html=html.replace('<html lang="en">', `<html lang="en">\n<!--\n${(license+'\n'+dataNotice).replace(/--/g,'—')}-->`);
  const css=await readFile(path.join(root,'assets/styles.css'),'utf8');
  const core=(await readFile(path.join(root,'assets/core.mjs'),'utf8')).replace(/^export /gm,'');
  const app=(await readFile(path.join(root,'assets/app.js'),'utf8')).replace(/^import \{[\s\S]*?\} from '\.\/core\.mjs';\s*/, '');
  const config=await readFile(path.join(root,'assets/config.js'),'utf8');
  const logo='data:image/png;base64,'+(await readFile(path.join(root,'standards_logo.png'))).toString('base64');
  html=html.replace('<link rel="stylesheet" href="./assets/styles.css">',`<style>${css}</style>`)
    .replace('<script src="./assets/config.js"></script>',`<script>${escapeScript(config)}\nwindow.AIS_LOGO=${JSON.stringify(logo)};document.querySelector('link[rel="icon"]').href=window.AIS_LOGO;\nwindow.AV_DATA=${JSON.stringify(data).replace(/</g,'\\u003c')};</script>`)
    .replace('href="./standards_logo.png"','')
    .replace('src="./standards_logo.png"','')
    .replace('<script type="module" src="./assets/app.js"></script>',`<script type="module">${escapeScript(core+'\n'+app.replace('href="./standards_logo.png"','')
    .replace('src="./standards_logo.png"',''))}</script>`);
  await mkdir(path.join(root,'dist'),{recursive:true});
  await writeFile(path.join(root,'dist/agrivoltaics-standards-demo.html'),html);
  console.log('Standalone demo built in dist/agrivoltaics-standards-demo.html.');
}
