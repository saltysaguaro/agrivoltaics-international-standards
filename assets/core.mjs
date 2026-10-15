/* Pure planning logic. No DOM, network, or storage access. */
export const TIERS = {
  CD: { label: 'Core / Descriptive', short: 'Descriptive', rank: 0, tone: 'cd', description: 'Describe the site, system, experimental design, and management context.' },
  CU: { label: 'Core / Universal', short: 'Universal', rank: 1, tone: 'cu', description: 'Basic measurements for comparison across installations and reference treatments.' },
  C: { label: 'Legacy core · subtype pending', short: 'Core · review', rank: 2, tone: 'legacy', description: 'Experts selected C. The source does not distinguish descriptive from universal core.' },
  E: { label: 'Enhanced', short: 'Enhanced', rank: 3, tone: 'e', description: 'High-value measurements to add when capacity and study design allow.' },
  S: { label: 'Supplemental', short: 'Supplemental', rank: 4, tone: 's', description: 'Specialized, emerging, or resource-intensive measurements.' },
  R: { label: 'Needs review', short: 'Needs review', rank: 5, tone: 'review', description: 'No unique classification meets the 50% threshold, or no ratings are recorded.' }
};
export const TOPICS = [
  { id: 'crops', name: 'Crop performance', detail: 'Yield, quality, phenology & management', icon: 'sprout', categories: ['Crops'] },
  { id: 'physiology', name: 'Plant physiology', detail: 'Growth, function & resource use', icon: 'leaf', categories: ['Crops'] },
  { id: 'microclimate', name: 'Microclimate', detail: 'Light, temperature, wind & water', icon: 'sun', categories: ['Microclimate'] },
  { id: 'soil', name: 'Soil & water', detail: 'Physical, chemical & biological properties', icon: 'layers', categories: ['Soil'] },
  { id: 'biodiversity', name: 'Biodiversity', detail: 'Species, communities & interactions', icon: 'flower', categories: ['Biodiversity'] },
  { id: 'livestock', name: 'Livestock & grazing', detail: 'Production, behaviour & wellbeing', icon: 'fence', categories: ['Livestock'] },
  { id: 'energy', name: 'PV systems & energy', detail: 'Geometry, performance & economics', icon: 'panel', categories: ['System Specifications'] },
  { id: 'context', name: 'Site & study design', detail: 'Location, treatments & experimental setup', icon: 'map', categories: ['Metadata'] }
];
export const CROP_GROUPS = ['Berries & Tree Crops', 'Field Crops', 'Forages & Livestock', 'Vegetables', 'Viticulture'];
export const CATEGORY_ORDER = ['Metadata', 'System Specifications', 'Microclimate', 'Soil', 'Crops', 'Livestock', 'Biodiversity'];
export const STATUS_NAMES = {'classified': 'Classified', 'legacy-core': 'Legacy C: subtype pending', 'tie': '50/50 tie', 'no-consensus': 'Below 50% threshold', 'no-votes': 'No ratings recorded'};
export const COLLECTION_STATUSES = ['planned', 'collected', 'not-collected', 'not-applicable'];
export const DEFAULT_CONTEXT = { topics: [], cropGroups: [], configuration: 'unspecified', cellGeometry: 'unspecified', mode: 'design', foundation: true };
const ALIASES = {'C = CORE':'C', 'E*':'E'};
export function normalizeVote(value) {
  const text = String(value ?? '').trim().toUpperCase();
  if (['', 'NA', 'N/A'].includes(text)) return null;
  return ['CD','CU','C','E','S'].includes(text) ? text : (ALIASES[text] || '?');
}
export function classifyVotes(values) {
  const counts = {CD:0, CU:0, C:0, E:0, S:0};
  let denominator=0, unresolved=0, na=0;
  for (const value of values) {
    const code=normalizeVote(value);
    if (code===null) {na++; continue;}
    denominator++;
    if(code==='?') unresolved++; else counts[code]++;
  }
  const qualifiers=Object.keys(counts).filter(k=>denominator>0 && counts[k]*2>=denominator);
  const majorityCode=qualifiers.length===1 ? qualifiers[0] : null;
  const category=['CD','CU','E','S'].includes(majorityCode) ? majorityCode : null;
  const status=denominator===0 ? 'no-votes' : qualifiers.length>1 ? 'tie' : majorityCode==='C' ? 'legacy-core' : category ? 'classified' : 'no-consensus';
  return {category, majorityCode, status, counts, denominator, recognized:denominator-unresolved,
    unresolved, na, agreement:majorityCode ? counts[majorityCode]/denominator : null,
    topShare:denominator ? Math.max(...Object.values(counts))/denominator : null,
    qualifiers, limitedEvidence:denominator>0&&denominator<3};
}
export function tierKey(v) { return v.consensus.category || (v.consensus.status==='legacy-core' ? 'C' : 'R'); }
// Planner requirements are independent of the source expert-vote classifications.
const REQUIRED_SITE_FIELDS = new Set([
  'Country', 'City', 'Geographical Location Details', 'Latitude', 'Longitude',
  'Climate Classification', 'Soil Type', 'Site slope', 'Prior land use/land use history',
  'Year of System installation', 'Institution'
]);
const REQUIRED_PV_SECTIONS = new Set([
  'Facility Identification', 'Facility / Land Indicators', 'PV Module & Configuration',
  'PV Module Geometry', 'System Geometry', 'Module Spacing', 'Optical Properties',
  'Semi-transparent Module Geometry', 'Site Geometry', 'Tracking Geometry'
]);
export function isRequiredVariable(v) {
  return (v.category==='Metadata' && (REQUIRED_SITE_FIELDS.has(v.name) || ['site','design'].includes(v.foundation))) ||
    (v.category==='System Specifications' && (v.foundation==='system' || REQUIRED_PV_SECTIONS.has(v.subcategory)));
}
export function requiredPlan(variables, plan={}) {
  const result={...plan};
  for(const v of variables) if(isRequiredVariable(v) && !result[v.id]) result[v.id]=blankEntry();
  return result;
}
export function defaultPlan(variables) {
  const plan=requiredPlan(variables);
  for(const v of variables) if(['CD','CU'].includes(v.consensus.category)) plan[v.id] ??= blankEntry();
  return plan;
}
export function hasCropResearch(context) {return context.topics.some(t=>['crops','physiology','livestock'].includes(t)) || context.cropGroups.length>0;}
export function conditionMatches(v, context) {
  if (v.condition==='tracking' && ['fixed','vertical'].includes(context.configuration)) return false;
  if (v.condition==='cell-geometry' && context.cellGeometry==='exclude') return false;
  return true;
}
export function foundationMatches(v, context) {
  return Boolean(v.foundation) && (v.foundation!=='crop' || hasCropResearch(context)) && conditionMatches(v, context);
}
export function scopeReasons(v, context) {
  if(isRequiredVariable(v)) return ['Required site / PV metadata'];
  if(!conditionMatches(v,context)) return [];
  const reasons=[];
  // Exact CD/CU votes remain visible across topics; crop/session filtering does not erase core evidence.
  if (['CD','CU'].includes(v.consensus.category)) reasons.push('Expert-voted core');
  if(context.foundation && foundationMatches(v,context)) reasons.push('Starter checklist');
  const selected = new Set(context.topics);
  const cropMatches = !context.cropGroups.length || context.cropGroups.some(g=>v.sessions.includes(g));
  if(selected.has('crops') && v.category==='Crops' && cropMatches) reasons.push('Crop performance');
  if(selected.has('physiology') && v.category==='Crops' && cropMatches &&
    (v.sessions.includes('Plant Growth & Physiology') || ['Morphology','Physiology','Phenology','Metabolism','Resource Use Efficiency','Water','Indices'].includes(v.subcategory))) reasons.push('Plant physiology');
  for(const t of TOPICS.filter(t=>!['crops','physiology'].includes(t.id))) {
    if(selected.has(t.id) && t.categories.includes(v.category)) reasons.push(t.name);
  }
  return [...new Set(reasons)];
}
export function scopedVariables(variables,context,all=false) { return all ? variables : variables.filter(v=>scopeReasons(v,context).length); }
export function searchText(v) {
  return [v.name,v.category,v.subcategory,v.units.raw,...v.sessions,v.id,v.notes].join(' ').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
}
export function filterVariables(variables, filters={}) {
  const tokens=String(filters.query || '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return variables.filter(v=>{
    const key=tierKey(v);
    return (!filters.category || v.category===filters.category) &&
      (!filters.subcategory || v.subcategory===filters.subcategory) &&
      (!filters.tier || (filters.tier==='review' ? !v.consensus.category : key===filters.tier)) &&
      (!filters.units || (filters.units==='provided' ? v.units.status==='provided' && !v.units.needsReview : filters.units==='missing' ? v.units.status!=='provided' : v.units.needsReview)) &&
      (!filters.evidence || (filters.evidence==='3plus' ? v.consensus.denominator>=3 : filters.evidence==='limited' ? v.consensus.limitedEvidence : v.consensus.unresolved>0)) &&
      tokens.every(token=>searchText(v).includes(token));
  });
}
export function sortVariables(variables,sort='priority') {
  return [...variables].sort((a,b)=>{
    if(sort==='name') return a.name.localeCompare(b.name);
    if(sort==='votes') return b.consensus.denominator-a.consensus.denominator || a.name.localeCompare(b.name);
    if(sort==='agreement') return (b.consensus.agreement ?? -1)-(a.consensus.agreement ?? -1) || b.consensus.denominator-a.consensus.denominator || a.name.localeCompare(b.name);
    return TIERS[tierKey(a)].rank-TIERS[tierKey(b)].rank ||
      (b.consensus.agreement ?? -1)-(a.consensus.agreement ?? -1) ||
      b.consensus.denominator-a.consensus.denominator || a.name.localeCompare(b.name);
  });
}
export function summarize(variables) {
  const tiers={CD:0,CU:0,C:0,E:0,S:0,R:0};
  for(const v of variables) tiers[tierKey(v)]++;
  return {count:variables.length, tiers, review:tiers.C+tiers.R, units:variables.filter(v=>v.units.needsReview).length};
}
export function csvCell(value) {
  let text=String(value ?? '');
  // Prevent spreadsheet formula injection. Original literals remain available in JSON.
  if(/^[\s]*[=+@-]/.test(text) || /^[\t\r]/.test(text)) text="'"+text;
  return '"'+text.replace(/"/g,'""')+'"';
}
export function toCSV(rows) {return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';}
export function blankEntry(mode='design') { return {unitOverride:'',schedule:'',position:'',method:'',notes:'',status:mode==='report'?'collected':'planned'}; }
export function reportingUnit(v,entry) {return entry?.unitOverride?.trim() || (v.units.status==='provided' ? v.units.raw : '');}
export function planRows(variables,plan,study,dataset) {
  const rows=[['study_name','variable_id','variable','category','subcategory','classification','classification_status','majority_code','agreement','non_na_expert_session_cells','CD_votes','CU_votes','C_votes','E_votes','S_votes','unresolved_cells','source_unit_or_format','source_unit_status','source_unit_review_notes','reporting_unit_or_format','unit_origin','collection_status','sampling_schedule','sampling_position','method','researcher_notes','source_sheet','source_row','dataset_version','policy_version','required_metadata']];
  for(const v of sortVariables(variables.filter(v=>plan[v.id]))) {
    const e=plan[v.id],c=v.consensus;
    rows.push([study.name,v.id,v.name,v.category,v.subcategory,c.category||'',c.status,c.majorityCode||'',c.agreement===null?'':c.agreement,c.denominator,c.counts.CD,c.counts.CU,c.counts.C,c.counts.E,c.counts.S,c.unresolved,v.units.raw,v.units.status,v.units.notes.join(' | '),reportingUnit(v,e),e.unitOverride?'researcher-entered':v.units.status==='provided'?'workbook':'unresolved',e.status,e.schedule,e.position,e.method,e.notes,v.source.sheet,v.source.row,dataset.datasetVersion,dataset.policyVersion,isRequiredVariable(v)]);
  }
  return rows;
}
export function measurementRows(variables,plan,study) {
  const rows=[['study_name','observation_id','timestamp','time_zone','treatment','replicate','sampling_position','sensor_height_m','soil_depth_cm','variable_id','variable','value','unit_or_format','method','quality_flag','notes']];
  for(const v of sortVariables(variables.filter(v=>plan[v.id]))) {
    const e=plan[v.id];
    rows.push([study.name,'','','','','',e.position,'','',v.id,v.name,'',reportingUnit(v,e),e.method,'','']);
  }
  return rows;
}
export function auditRows(variables) {
  const rows=[['id','variable','category','subcategory','original_subcategory','classification','majority_code','status','agreement','non_na_cells','recognized_cells','unresolved_cells','NA_cells','CD','CU','C','E','S','source_units','unit_status','unit_review_notes','sessions','sheet','row']];
  for(const v of variables){const c=v.consensus;rows.push([v.id,v.name,v.category,v.subcategory,v.sourceSubcategory,c.category,c.majorityCode,c.status,c.agreement,c.denominator,c.recognized,c.unresolved,c.na,c.counts.CD,c.counts.CU,c.counts.C,c.counts.E,c.counts.S,v.units.raw,v.units.status,v.units.notes.join(' | '),v.sessions.join('; '),v.source.sheet,v.source.row]);}
  return rows;
}
export function exportPlan(state,dataset) {
  return {schemaVersion:'1.1.0',type:'agrivoltaics-standards-plan',datasetVersion:dataset.datasetVersion,
    sourceSha256:dataset.source.sha256,policyVersion:dataset.policyVersion,exportedAt:new Date().toISOString(),
    study:{...state.study},context:{...state.context},plan:structuredClone(state.plan)};
}
function boundedText(value,max=4000) {if(typeof value!=='string'||value.length>max) throw new Error('Invalid or oversized text field.');return value;}
export function validatePlan(value,dataset) {
  if(!value || typeof value!=='object' || Array.isArray(value) || !['1.0.0','1.1.0'].includes(value.schemaVersion)||!['agrifield-measurement-plan','agrivoltaics-standards-plan'].includes(value.type)) throw new Error('This is not a supported Agrivoltaics International Standards plan file.');
  if(!value.context || typeof value.context!=='object' || Array.isArray(value.context) || !value.study || typeof value.study!=='object' || Array.isArray(value.study) || !value.plan || typeof value.plan!=='object' || Array.isArray(value.plan)) throw new Error('The plan is missing study, context, or variable data.');
  const context=value.context;
  if(!Array.isArray(context.topics)||context.topics.some(t=>!TOPICS.some(x=>x.id===t)) || !Array.isArray(context.cropGroups)||context.cropGroups.some(g=>!CROP_GROUPS.includes(g))) throw new Error('Unsupported research focus or crop group.');
  if(!['unspecified','fixed','single-axis','dual-axis','vertical'].includes(context.configuration) || !['unspecified','include','exclude'].includes(context.cellGeometry) || !['design','report'].includes(context.mode) || typeof context.foundation!=='boolean') throw new Error('Invalid study configuration.');
  const validIDs=new Set(dataset.variables.map(v=>v.id)),plan={};
  const unknown=Object.keys(value.plan).filter(id=>!validIDs.has(id));
  if(unknown.length) throw new Error(`${unknown.length} variable ID(s) are not in this dataset. Import was stopped; no existing plan was changed.`);
  for(const [id,e] of Object.entries(value.plan)) {
    if(!e||typeof e!=='object'||!COLLECTION_STATUSES.includes(e.status)) throw new Error(`Invalid measurement entry: ${id}`);
    plan[id]={};
    for(const field of ['unitOverride','schedule','position','method','notes']) plan[id][field]=boundedText(e[field]??'',field==='unitOverride'?300:4000);
    plan[id].status=e.status;
  }
  return {study:{name:boundedText(value.study.name??'',200),notes:boundedText(value.study.notes??'',8000)},
    context:{topics:[...new Set(context.topics)],cropGroups:[...new Set(context.cropGroups)],configuration:context.configuration,cellGeometry:context.cellGeometry,mode:context.mode,foundation:context.foundation},plan:requiredPlan(dataset.variables, value.schemaVersion==='1.0.0'?{...defaultPlan(dataset.variables),...plan}:plan),
    warning:value.sourceSha256!==dataset.source.sha256 || value.policyVersion!==dataset.policyVersion ? 'This plan was created with a different dataset or classification policy. Current classifications are shown; review them before reporting.' : ''};
}
export function safeURL(value) {try {const u=new URL(value);return u.protocol==='https:'?u.href:null;}catch{return null;}}
