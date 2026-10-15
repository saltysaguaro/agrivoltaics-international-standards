import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PRIORITIES,priorityKey,summarizePriorities,CATEGORY_ORDER,isRequiredVariable,requiredPlan,defaultPlan,TIERS,DEFAULT_CONTEXT,normalizeVote,classifyVotes,tierKey,conditionMatches,foundationMatches,scopeReasons,scopedVariables,filterVariables,sortVariables,summarize,csvCell,toCSV,blankEntry,reportingUnit,planRows,measurementRows,auditRows,exportPlan,validatePlan,safeURL} from '../assets/core.mjs';
const dataset=JSON.parse(await readFile(new URL('../data/variables.json',import.meta.url),'utf8'));
const vars=dataset.variables, get=name=>{const found=vars.find(v=>v.name===name);assert.ok(found,`Missing fixture ${name}`);return found;};
const context=(extra={})=>({...structuredClone(DEFAULT_CONTEXT),...extra});
const state=()=>({study:{name:'Trial 1',notes:'Reference plot'},context:context({topics:['crops']}),plan:{}});

test('NA and blank expert indications are ignored, not treated as supplemental',()=>{
  const c=classifyVotes(['NA',null,'','n/a','E','e','S']);assert.equal(c.denominator,3);assert.equal(c.na,4);assert.equal(c.category,'E');assert.equal(c.agreement,2/3);
});
test('exactly 50% is accepted when the qualifying category is unique',()=>{
  const c=classifyVotes(['CU','cu','E','S']);assert.equal(c.category,'CU');assert.equal(c.agreement,.5);
});
test('a 50/50 tie is never broken by category order',()=>{
  const c=classifyVotes(['E','S','E','S']);assert.equal(c.category,null);assert.equal(c.status,'tie');assert.deepEqual(c.qualifiers,['E','S']);
});
test('a plurality below 50% is not a majority classification',()=>{
  const c=classifyVotes(['E','E','E','S','S','C','CD']);assert.equal(c.status,'no-consensus');assert.equal(c.category,null);
});
test('all-NA rows remain unrated',()=>{const c=classifyVotes(Array(90).fill('NA'));assert.equal(c.denominator,0);assert.equal(c.status,'no-votes');assert.equal(c.agreement,null);});
test('legacy C is not silently mapped to CD or CU',()=>{const c=classifyVotes(['C','c','E']);assert.equal(c.majorityCode,'C');assert.equal(c.category,null);assert.equal(c.status,'legacy-core');});
test('distinct core subtypes are not collapsed to manufacture a subtype vote',()=>{const c=classifyVotes(['CD','CU','C','E']);assert.equal(c.majorityCode,null);assert.equal(c.category,null);});
test('one mixed expert cell is unresolved, never two votes',()=>{const c=classifyVotes(['E','E | S','S']);assert.equal(c.denominator,3);assert.equal(c.unresolved,1);assert.equal(c.counts.E,1);assert.equal(c.counts.S,1);assert.equal(c.category,null);});
test('unknown and conditional indications remain in the conservative denominator',()=>{const c=classifyVotes(['E','E','S','?','depends']);assert.equal(c.denominator,5);assert.equal(c.recognized,3);assert.equal(c.category,null);});
test('only documented aliases are normalized',()=>{assert.equal(normalizeVote(' C = Core '),'C');assert.equal(normalizeVote('E*'),'E');for(const v of ['S+','CD/CU','CU/E','C, depends on crop','SE','x'])assert.equal(normalizeVote(v),'?');});
test('single-cell majorities are visible but limited-evidence flagged',()=>{const c=classifyVotes(['S','NA']);assert.equal(c.category,'S');assert.equal(c.agreement,1);assert.equal(c.limitedEvidence,true);});
test('every distributed classification exactly matches its original anonymous cell ledger',()=>{
  for(const v of vars){const values=[...v.voteCells.map(c=>c.raw),...Array(90-v.voteCells.length).fill('NA')];assert.deepEqual(classifyVotes(values),v.consensus,v.id);}
});
test('all 641 rows and 90 expert-session columns are retained',()=>{assert.equal(vars.length,641);assert.equal(dataset.expertSessions.length,90);assert.equal(new Set(vars.map(v=>v.id)).size,641);assert.deepEqual(vars.map(v=>v.source.row),Array.from({length:641},(_,i)=>i+2));});
test('dataset regression totals match the supplied V15 worksheet',()=>{
  const s=summarize(vars);assert.deepEqual(s.tiers,{CD:13,CU:13,C:245,E:171,S:83,R:116});assert.equal(s.review,361);assert.equal(vars.filter(v=>v.units.status==='missing').length,339);assert.equal(vars.filter(v=>v.units.status==='tbd').length,9);assert.equal(dataset.stats.nonNaCells,7641);assert.equal(dataset.stats.unresolvedCells,113);
});
test('response denominators are not assumed to be independent people',()=>{
  assert.equal(get('Air temperature').consensus.denominator,37);assert.equal(get('Air temperature').consensus.counts.C,32);assert.equal(get('Ammonium nitrogen (NH₄⁺-N)').consensus.category,'CU');
});
test('display subcategory cleanup retains exact source spelling',()=>{const v=get('Panel configuration');assert.equal(v.subcategory,'System Geometry');assert.equal(v.sourceSubcategory,'Ssytem Geometry');});
test('crop filters narrow crop-domain matches without excluding expert-voted core',()=>{
  const c=context({topics:['crops'],cropGroups:['Vegetables'],foundation:false});const scoped=scopedVariables(vars,c);
  assert.ok(scoped.length<vars.filter(v=>v.category==='Crops').length+26);
  for(const v of vars.filter(v=>['CD','CU'].includes(v.consensus.category)))assert.ok(scoped.some(x=>x.id===v.id));
  assert.equal(scoped.some(v=>v.name==='Apple rust mite infestation'),false);
});
test('multiple crop-group matches use OR, not AND',()=>{
  const a=scopedVariables(vars,context({topics:['crops'],cropGroups:['Vegetables'],foundation:false}));
  const b=scopedVariables(vars,context({topics:['crops'],cropGroups:['Vegetables','Viticulture'],foundation:false}));
  assert.ok(a.every(v=>b.some(x=>x.id===v.id)));assert.ok(b.length>a.length);
});
test('microclimate remains relevant regardless of selected crop-group provenance',()=>{
  const c=context({topics:['microclimate'],cropGroups:['Vegetables'],foundation:false});assert.ok(scopedVariables(vars,c).some(v=>v.name==='Wind speed'));
});
test('configuration filtering is reversible and never changes classifications',()=>{
  const tracker=get('Axis azimuth'),before=JSON.stringify(tracker.consensus);
  assert.equal(conditionMatches(tracker,context({configuration:'fixed'})),false);
  assert.equal(conditionMatches(tracker,context({configuration:'single-axis'})),true);
  assert.equal(scopedVariables(vars,context({configuration:'fixed'}),true).length,641);
  assert.equal(JSON.stringify(tracker.consensus),before);
});
test('cell-geometry exclusion is explicit and does not suppress general module transparency',()=>{
  const c=context({cellGeometry:'exclude'});assert.equal(conditionMatches(get('Cell gap – x direction'),c),false);assert.equal(conditionMatches(get('Module transparency'),c),true);
});
test('crop metadata in starter checklist is conditional on crop context',()=>{
  const cultivar=get('Cultivar / genotype');assert.equal(foundationMatches(cultivar,context({topics:['energy']})),false);assert.equal(foundationMatches(cultivar,context({topics:['crops']})),true);
});
test('starter rationale is separate from actual vote classification',()=>{
  const wind=get('Wind speed');assert.equal(wind.consensus.status,'no-consensus');assert.ok(scopeReasons(wind,context({topics:['crops']})).includes('Starter checklist'));
});
test('search supports multiple tokens and source units',()=>{const found=filterVariables(vars,{query:'soil moisture'});assert.ok(found.length>=3);assert.ok(found.every(v=>/soil/i.test([v.name,v.category,v.notes].join(' '))));assert.ok(filterVariables(vars,{query:'µmol/m²/s'}).length>0);});
test('Core combines source C/CD/CU while Needs review contains unresolved classifications',()=>{assert.equal(filterVariables(vars,{tier:'core'}).length,271);assert.equal(filterVariables(vars,{tier:'review'}).length,116);assert.equal(filterVariables(vars,{tier:'C'}).length,245);assert.equal(filterVariables(vars,{tier:'R'}).length,116);});
test('filter combinations and empty results behave predictably',()=>{assert.equal(filterVariables(vars,{query:'a-nonexistent-variable-xyz'}).length,0);assert.ok(filterVariables(vars,{category:'Soil',tier:'CU'}).every(v=>v.category==='Soil'&&v.consensus.category==='CU'));});
test('sort never mutates source ordering and prioritizes tiers explicitly',()=>{const first=vars[0].id,sorted=sortVariables(vars);assert.equal(priorityKey(sorted[0]),'core');assert.equal(vars[0].id,first);for(let i=1;i<sorted.length;i++)assert.ok(PRIORITIES[priorityKey(sorted[i])].rank>=PRIORITIES[priorityKey(sorted[i-1])].rank);});
test('unit output never fabricates a missing value',()=>{const v=get('Botanical name');assert.equal(v.units.status,'missing');assert.equal(reportingUnit(v,blankEntry()),'');assert.equal(reportingUnit(v,{...blankEntry(),unitOverride:'Taxon + authority'}),'Taxon + authority');assert.equal(v.units.raw,'NA');});
test('source energy/capacity mismatch remains visible',()=>{const v=get('Electricity production');assert.equal(v.units.raw,'kWh, kWp');assert.ok(v.units.needsReview);assert.ok(v.units.notes.some(n=>n.includes('mixes energy')));});
test('CSV escapes commas, quotes, newlines, formulas and unicode safely',()=>{assert.equal(csvCell('a,"b"\nc'),'"a,""b""\nc"');assert.equal(csvCell('=1+1'),'"\'=1+1"');assert.equal(csvCell(' @cmd'),'"\' @cmd"');assert.ok(toCSV([['µmol/m²/s']]).startsWith('\uFEFF'));assert.ok(toCSV([['x']]).endsWith('\r\n'));});
test('plan CSV includes source and researcher units separately',()=>{const v=get('Air temperature'),s=state();s.plan[v.id]={...blankEntry(),unitOverride:'K',position:'Reference, plot 1'};const rows=planRows(vars,s.plan,s.study,dataset),h=rows[0],r=rows[1];assert.equal(rows.length,2);assert.equal(r[h.indexOf('source_unit_or_format')],'°C');assert.equal(r[h.indexOf('reporting_unit_or_format')],'K');assert.equal(r[h.indexOf('unit_origin')],'researcher-entered');assert.equal(r[h.indexOf('classification_status')],'legacy-core');});
test('observation template does not invent observed values',()=>{const v=get('Air temperature'),s=state();s.plan[v.id]=blankEntry();const rows=measurementRows(vars,s.plan,s.study);assert.equal(rows.length,2);assert.equal(rows[1][rows[0].indexOf('value')],'');assert.equal(rows[1][rows[0].indexOf('unit_or_format')],'°C');});
test('audit export has all source rows and unresolved statuses',()=>{const rows=auditRows(vars);assert.equal(rows.length,642);assert.ok(rows[0].includes('unresolved_cells'));assert.ok(rows.some(r=>r.includes('legacy-core')));});
test('JSON plan round-trip preserves researcher details without mutating the dataset',()=>{const s=state(),v=get('Air temperature');s.plan[v.id]={...blankEntry(),notes:'Check sensor shielding'};const restored=validatePlan(JSON.parse(JSON.stringify(exportPlan(s,dataset))),dataset);assert.deepEqual(restored.study,s.study);assert.deepEqual(restored.context,s.context);assert.deepEqual(restored.plan,requiredPlan(vars,s.plan));assert.equal(restored.warning,'');});
test('JSON import rejects unsupported schemas, unknown IDs and oversized text',()=>{
  const p=exportPlan(state(),dataset);assert.throws(()=>validatePlan({},dataset));
  assert.throws(()=>validatePlan({...p,plan:{'not-a-variable':blankEntry()}},dataset),/not in this dataset/);
  assert.throws(()=>validatePlan({...p,study:{name:'x'.repeat(201),notes:''}},dataset),/oversized/);
  assert.throws(()=>validatePlan({...p,context:{...p.context,configuration:'invented'}},dataset),/configuration/);
});
test('a source-version mismatch is warned, never silently accepted as unchanged',()=>{const p=exportPlan(state(),dataset);p.sourceSha256='other';assert.match(validatePlan(p,dataset).warning,/different dataset/);});
test('resource links are restricted to explicit HTTPS',()=>{assert.equal(safeURL('javascript:alert(1)'),null);assert.equal(safeURL('http://example.com'),null);assert.equal(safeURL('https://example.com/paper'),'https://example.com/paper');});
test('collection-stage defaults are explicit and original classifications remain immutable',()=>{assert.equal(blankEntry('report').status,'collected');assert.equal(blankEntry('design').status,'planned');assert.equal(Object.keys(blankEntry()).length,6);});


test('new plans select every CD/CU and required site/PV field without changing source votes',()=>{
  const before=JSON.stringify(vars),plan=defaultPlan(vars);
  assert.equal(vars.filter(v=>['CD','CU'].includes(v.consensus.category)).length,26);
  for(const v of vars.filter(v=>['CD','CU'].includes(v.consensus.category)||isRequiredVariable(v))) assert.ok(plan[v.id],v.name);
  for(const name of ['Latitude','Longitude','Country','System capacity','Fixed / tracked configuration','PV module technology','Sampling period and replication']) assert.ok(isRequiredVariable(get(name)),name);
  assert.equal(isRequiredVariable(get('CAPEX')),false);
  assert.equal(JSON.stringify(vars),before);
});
test('required metadata stays in the shortlist with topics and starter checklist off',()=>{
  const scope=scopedVariables(vars,context({foundation:false,configuration:'fixed',cellGeometry:'exclude'}));
  for(const v of vars.filter(isRequiredVariable)) assert.ok(scope.includes(v),v.name);
});
test('required plan normalization preserves entries and adds missing fields',()=>{
  const v=get('Latitude'),entry={...blankEntry(),notes:'Site coordinates pending'};
  const input={[v.id]:entry},result=requiredPlan(vars,input);
  assert.equal(result[v.id],entry);assert.equal(Object.keys(input).length,1);
  assert.ok(result[get('Longitude').id]);
});
test('legacy plans migrate to core defaults and required metadata without losing notes',()=>{
  const old=exportPlan(state(),dataset);old.schemaVersion='1.0.0';old.type='agrifield-measurement-plan';
  old.plan[get('Latitude').id]={...blankEntry(),notes:'Preserve this'};
  const restored=validatePlan(old,dataset);
  assert.equal(restored.plan[get('Latitude').id].notes,'Preserve this');
  for(const v of vars.filter(v=>['CD','CU'].includes(v.consensus.category))) assert.ok(restored.plan[v.id]);
});
test('current plans preserve deliberate core omissions but restore mandatory metadata',()=>{
  const p=exportPlan(state(),dataset),restored=validatePlan(p,dataset);
  assert.ok(restored.plan[get('Latitude').id]);assert.equal(restored.plan[get('Soil organic carbon').id],undefined);
});
test('import rejects scalar or array containers',()=>{
  const p=exportPlan(state(),dataset);
  for(const field of ['plan','study','context']) for(const bad of ['text',4,[]]) assert.throws(()=>validatePlan({...p,[field]:bad},dataset));
});
test('CSV distinguishes mandatory metadata from expert classifications',()=>{
  const rows=planRows(vars,defaultPlan(vars),state().study,dataset),h=rows[0];
  const latitude=rows.find(r=>r[h.indexOf('variable')]==='Latitude');
  assert.equal(latitude[h.indexOf('required_metadata')],true);
  assert.equal(latitude[h.indexOf('classification')],get('Latitude').consensus.category||'');
});

test('automatic metadata restoration never asserts that new measurements were collected',()=>{
  const p=exportPlan(state(),dataset);p.context.mode='report';
  assert.equal(validatePlan(p,dataset).plan[get('Latitude').id].status,'planned');
  p.schemaVersion='1.0.0';p.type='agrifield-measurement-plan';
  assert.equal(validatePlan(p,dataset).plan[get('Soil organic carbon').id].status,'planned');
});

test('display labels remain attached to the exact source records and preserve source data',async()=>{
  const {VARIABLE_LABELS,variableName,variableAbbreviation}=await import('../assets/variable-labels.mjs');
  const before=JSON.stringify(dataset);
  for(const [id,label] of Object.entries(VARIABLE_LABELS)){
    const v=vars.find(v=>v.id===id);assert.ok(v,`Unknown label ID ${id}`);
    assert.equal(label.sourceName,v.name);assert.ok(label.name.trim());
    assert.equal(typeof label.abbreviation,'string');
  }
  for(const v of vars){assert.ok(variableName(v));variableAbbreviation(v);}
  assert.equal(JSON.stringify(dataset),before);
  assert.equal(variableName(get('CAPEX')),'Capital expenditure');
  assert.equal(variableAbbreviation(get('CAPEX')),'CAPEX');
  assert.equal(variableName(get('Photosynthetically active radiation (PAR)')),'Photosynthetically active radiation');
  assert.equal(variableAbbreviation(get('Air temperature')),'');
});
test('full names and abbreviations find the same stable variable',()=>{
  for(const [source,expanded,abbreviation] of [['CAPEX','capital expenditure','CAPEX'],['Soil EC','soil electrical conductivity','EC'],['Leaf area index','leaf area index','LAI'],['Fv/Fm','maximum quantum yield','Fv/Fm']]){
    for(const query of [source,expanded,abbreviation]) assert.ok(filterVariables(vars,{query}).some(v=>v.id===get(source).id));
  }
});
test('CSV exports retain source labels alongside display names and abbreviations',()=>{
  const v=get('CAPEX'),plan={[v.id]:blankEntry()};
  for(const rows of [planRows(vars,plan,state().study,dataset),measurementRows(vars,plan,state().study)]){
    const [h,r]=rows;assert.equal(r[h.indexOf('variable')],'CAPEX');assert.equal(r[h.indexOf('display_name')],'Capital expenditure');assert.equal(r[h.indexOf('abbreviation')],'CAPEX');assert.equal(h.length,r.length);
  }
  assert.equal(auditRows([v])[1][1],'CAPEX');
});

test('combined priorities preserve every source result and do not pool votes',()=>{
  const before=JSON.stringify(vars);
  assert.deepEqual(summarizePriorities(vars),{core:271,E:171,S:83,R:116});
  for(const v of vars){assert.equal(priorityKey(v),['C','CD','CU'].includes(tierKey(v))?'core':tierKey(v));}
  assert.equal(priorityKey({consensus:classifyVotes(['C','CD','CU','E'])}),'R');
  assert.equal(JSON.stringify(vars),before);
});
test('domain order begins with field-site location, then PV specifications and other domains',()=>{
  const sorted=sortVariables(vars,'domain');
  assert.deepEqual(sorted.slice(0,5).map(v=>v.name),['Country','City','Geographical Location Details','Latitude','Longitude']);
  assert.deepEqual([...new Set(sorted.map(v=>v.category))],CATEGORY_ORDER);
  const pv=sorted.filter(v=>v.category==='System Specifications');
  assert.equal(pv[0].subcategory,'Facility Identification');
  assert.ok(pv.findIndex(v=>v.subcategory==='PV Module & Configuration')<pv.findIndex(v=>v.subcategory==='Electrical & Energy Indicators'));
});
