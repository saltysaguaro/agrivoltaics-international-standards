#!/usr/bin/env python3
"""Import the first XLSX worksheet without third-party dependencies.

Reads cell values only, never executes workbook formulas, and never modifies the input.
Expert identities are replaced by stable, column-position session IDs in public data.
"""
from __future__ import annotations
import argparse
from collections import Counter
from datetime import date
import hashlib
import json
from pathlib import Path
import re
import sys
from xml.etree import ElementTree as ET
from zipfile import ZipFile
import posixpath

NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
CODES = ('CD', 'CU', 'C', 'E', 'S')
EXPECTED = ['Category', 'Subcategory', 'Standardized variable', 'Units / Classification',
            'Sessions (n)', 'Sessions', 'Existing explanations / methodology', 'Source rows']
ALIASES = {'C = CORE': 'C', 'E*': 'E'}
# Editorial starter checklist, mapped to EXISTING names. This never changes votes.
FOUNDATION = {
 'Latitude': 'site', 'Longitude': 'site', 'Climate Classification': 'site',
 'Prior land use/land use history': 'site',
 'Fixed / tracked configuration': 'system', 'PV module technology': 'system',
 'Clearance / minimum panel height': 'system', 'Row-to-row pitch': 'system',
 'Panel face azimuth': 'system', 'Module tilt / maximum tracking tilt': 'system',
 'System capacity': 'system', 'Treatment': 'design', 'Repetitions': 'design',
 'Sampling / observation method': 'design', 'Sampling period and replication': 'design',
 'Sampling position within PV system': 'design', 'Sensor height': 'design',
 'Time step data collection': 'design',
 'Botanical name': 'crop', 'Cultivar / genotype': 'crop', 'Planting density': 'crop',
 'Irrigation': 'crop', 'Irrigation system': 'crop',
 'Air temperature': 'measurement', 'Relative Humidity': 'measurement',
 'Precipitation Amount': 'measurement', 'Wind speed': 'measurement',
 'Global radiation': 'measurement', 'Photosynthetic photon flux density (PPFD)': 'measurement',
 'Soil temperature': 'measurement', 'Soil moisture': 'measurement',
 'Electricity production': 'measurement'
}
DISPLAY_SUBCATEGORIES = {
 'farming management': 'Farming management',
 'yield qualtity': 'Yield Quality',
 'ssytem geometry': 'System Geometry',
 'invertabre functional traits': 'Invertebrate functional traits',
 'soil biodiversity activties': 'Soil biodiversity activities'
}

def normalize_vote(value: object) -> str | None:
    text = str(value or '').strip().upper()
    if text in ('', 'NA', 'N/A'): return None
    if text in CODES: return text
    return ALIASES.get(text, '?')

def consensus(values: list[object]) -> dict:
    normalized = [normalize_vote(v) for v in values]
    counts = {code: normalized.count(code) for code in CODES}
    denominator = sum(v is not None for v in normalized)
    unresolved = normalized.count('?')
    qualifiers = [code for code in CODES if denominator and 2 * counts[code] >= denominator]
    if not denominator: status = 'no-votes'
    elif len(qualifiers) > 1: status = 'tie'
    elif not qualifiers: status = 'no-consensus'
    elif qualifiers[0] == 'C': status = 'legacy-core'
    else: status = 'classified'
    winner = qualifiers[0] if len(qualifiers) == 1 else None
    return {'category': winner if winner in ('CD','CU','E','S') else None,
            'majorityCode': winner, 'status': status, 'counts': counts,
            'denominator': denominator, 'recognized': denominator-unresolved,
            'unresolved': unresolved, 'na': len(values)-denominator,
            'agreement': (counts[winner]/denominator if winner else None),
            'topShare': (max(counts.values())/denominator if denominator else None),
            'qualifiers': qualifiers,
            'limitedEvidence': 0 < denominator < 3}

def col_index(ref: str) -> int:
    letters = re.match(r'[A-Z]+', ref)
    if not letters: raise ValueError(f'Invalid cell address: {ref}')
    n = 0
    for ch in letters[0]: n = n*26 + ord(ch)-64
    return n-1

def read_first_sheet(path: Path) -> tuple[str, list[tuple[int,list]]]:
    with ZipFile(path) as z:
        strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            root = ET.fromstring(z.read('xl/sharedStrings.xml'))
            strings = [''.join(t.text or '' for t in node.findall('.//m:t',NS))
                       for node in root.findall('m:si',NS)]
        workbook = ET.fromstring(z.read('xl/workbook.xml'))
        first = workbook.find('m:sheets/m:sheet',NS)
        if first is None: raise ValueError('No worksheets found.')
        rel_id = first.attrib[f'{{{NS["r"]}}}id']
        rels = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
        target = next(x.attrib['Target'] for x in rels if x.attrib['Id']==rel_id)
        sheet_path = target.lstrip('/') if target.startswith('/') else posixpath.normpath('xl/'+target)
        root = ET.fromstring(z.read(sheet_path))
        rows=[]
        for row in root.findall('m:sheetData/m:row',NS):
            values={}
            for cell in row.findall('m:c',NS):
                # A cached value for a formula is not an original expert indication.
                if cell.find('m:f',NS) is not None:
                    raise ValueError(f'Formula in first worksheet at {cell.attrib["r"]}; supply a values-only matrix.')
                kind=cell.get('t')
                node=cell.find('m:v',NS)
                text=node.text if node is not None else None
                if kind=='s': value=strings[int(text)] if text is not None else None
                elif kind=='inlineStr': value=''.join(t.text or '' for t in cell.findall('.//m:t',NS))
                elif kind=='b': value=text=='1'
                elif kind=='e': raise ValueError(f'Excel error in {cell.attrib["r"]}: {text}')
                elif text is not None and kind not in ('str',):
                    try: value=float(text); value=int(value) if value.is_integer() else value
                    except ValueError: value=text
                else: value=text
                values[col_index(cell.attrib['r'])]=value
            if values: rows.append((int(row.attrib['r']),[values.get(i) for i in range(max(values)+1)]))
        return first.attrib['name'],rows

def unit_info(raw: object, name: str) -> dict:
    text=str(raw or '').strip()
    status = 'missing' if text.upper() in ('','NA','N/A') else ('tbd' if text.upper()=='TBD' else 'provided')
    notes=[]
    if name=='Electricity production':
        notes.append('The source mixes energy (kWh) and rated capacity (kWp). Confirm the intended quantity; report the energy aggregation period and AC/DC basis. No conversion is performed.')
    if name=='System capacity':
        notes.append('Specify whether the reported rating is AC or DC and the rating conditions. Preserve the distinction between kW and kWp.')
    if text.lower() in ('jd','julian day'):
        notes.append('Clarify the calendar convention: Julian date and day-of-year are not interchangeable. Record the year and convention.')
    if text=='%' and 'moisture' in name.lower():
        notes.append('State whether moisture is volumetric or gravimetric and record sampling depth. The source does not specify the percentage basis.')
    if text in ('-', 'C'):
        notes.append('The source notation needs clarification; it has not been silently interpreted or converted.')
    if name=='Total irrigation water applied':
        notes.append('The name suggests a cumulative amount, but the source gives a rate (mm/d). Confirm quantity and reporting period.')
    if name=='GCR or row to row pitch':
        notes.append('This source variable combines distinct quantities. Ground coverage ratio and row-to-row pitch require separate definitions; do not use one unit for both.')
    return {'raw':text, 'display':text if status=='provided' else ('To be defined' if status=='tbd' else 'Not specified'),
            'status':status, 'notes':notes, 'needsReview':status!='provided' or bool(notes)}

def transform(path: Path, import_date: str) -> dict:
    sheet_name, rows=read_first_sheet(path)
    if not rows: raise ValueError('First worksheet is empty.')
    headers=rows[0][1]
    # Ignore trailing formatted, empty columns.
    while headers and headers[-1] is None: headers.pop()
    if headers[:8] != EXPECTED: raise ValueError(f'Unexpected first-sheet headers: {headers[:8]}')
    if any(not isinstance(h,str) or ' | ' not in h for h in headers[8:]):
        raise ValueError('All columns after H must be expert-by-session columns.')
    experts=[{'id':f'es-{i+1:02d}', 'session':h.split(' | ',1)[0]} for i,h in enumerate(headers[8:])]
    records=[]; seen=set()
    for row_number,row in rows[1:]:
        row=(row+[None]*len(headers))[:len(headers)]
        if not row[2]:
            if any(v is not None for v in row): raise ValueError(f'Row {row_number} has no variable name.')
            continue
        name=str(row[2]).strip(); category=str(row[0]).strip(); sub=str(row[1]).strip()
        stable='\0'.join([category,sub,name]).casefold()
        vid='av-'+hashlib.sha256(stable.encode()).hexdigest()[:12]
        if vid in seen: raise ValueError(f'Duplicate stable identifier at row {row_number}: {name}')
        seen.add(vid)
        values=row[8:]
        ledger=[{'expertSessionId':experts[i]['id'],'raw':str(v)} for i,v in enumerate(values) if normalize_vote(v) is not None]
        group_sessions=list(dict.fromkeys(s.strip() for s in str(row[5] or '').split(';') if s.strip()))
        if int(row[4]) != len(group_sessions): raise ValueError(f'Session count mismatch at row {row_number}')
        condition='tracking' if (sub=='Tracking Geometry' or name=='Tracking tilt resolution') else None
        if sub=='Semi-transparent Module Geometry' and name!='Module transparency': condition='cell-geometry'
        records.append({'id':vid,'name':name,'category':category,'subcategory':DISPLAY_SUBCATEGORIES.get(sub.casefold(),sub),
                        'sourceSubcategory':sub,'units':unit_info(row[3],name),'sessions':group_sessions,
                        'sessionCount':len(group_sessions),'sourceSessionCount':row[4],
                        'notes':str(row[6] or ''),'source':{'sheet':sheet_name,'row':row_number,'rows':str(row[7] or '')},
                        'consensus':consensus(values),'voteCells':ledger,
                        'foundation':FOUNDATION.get(name),'condition':condition,
                        'methods':[],'publications':[]})
    if len(set(FOUNDATION)-{r['name'] for r in records}):
        raise ValueError('Starter checklist names missing in source; review FOUNDATION explicitly.')
    stats={'variables':len(records),'expertSessionColumns':len(experts),'sessions':len({e['session'] for e in experts}),
           'categories':dict(Counter(r['category'] for r in records)),
           'classifications':dict(Counter(r['consensus']['category'] or r['consensus']['status'] for r in records)),
           'units':dict(Counter(r['units']['status'] for r in records)),
           'unitReview':sum(r['units']['needsReview'] for r in records),
           'unresolvedCells':sum(r['consensus']['unresolved'] for r in records),
           'nonNaCells':sum(r['consensus']['denominator'] for r in records),
           'limitedEvidenceVariables':sum(r['consensus']['limitedEvidence'] for r in records)}
    return {'schemaVersion':'1.0.0','datasetVersion':'matrix-v15','importDate':import_date,
            'source':{'file':path.name,'sheet':sheet_name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()},
            'policyVersion':'conservative-50pct-v1',
            'policy':{'threshold':0.5,'denominator':'All non-NA expert-session cells, including unresolved indications.',
                      'legacyCore':'C is not automatically mapped to CD or CU.',
                      'aliases':ALIASES,'tie':'Two categories at exactly 50% remain unresolved.',
                      'unitPolicy':'Source units are preserved. Missing or questionable units are not invented.'},
            'stats':stats,'expertSessions':experts,'variables':records}

def apply_curation(dataset: dict, curation_path: Path) -> dict:
    """Apply reviewed resource additions only. Source votes, names and units stay immutable."""
    if not curation_path.exists(): return dataset
    curated=json.loads(curation_path.read_text(encoding='utf-8'))
    if curated.get('schemaVersion')!='1.0.0' or not isinstance(curated.get('entries'),dict):
        raise ValueError('Invalid curation file schema.')
    by_id={v['id']:v for v in dataset['variables']}
    for vid,entry in curated['entries'].items():
        if vid not in by_id: raise ValueError(f'Curation ID missing from source: {vid}')
        if not isinstance(entry,dict) or set(entry)-{'methods','publications'}:
            raise ValueError(f'Only method/publication additions are allowed in curation: {vid}')
        for kind in ('methods','publications'):
            resources=entry.get(kind,[])
            if not isinstance(resources,list): raise ValueError(f'{kind} must be a list: {vid}')
            for resource in resources:
                required=('title','url','reviewer','reviewedOn','summary' if kind=='methods' else 'citation')
                if not isinstance(resource,dict) or any(not isinstance(resource.get(k),str) or not resource[k].strip() for k in required):
                    raise ValueError(f'Incomplete reviewed resource for {vid}: {required}')
                if not re.match(r'^https://[^/\s]+',resource['url']):
                    raise ValueError(f'Resource URL must use HTTPS: {vid}')
                try: date.fromisoformat(resource['reviewedOn'])
                except ValueError: raise ValueError(f'Invalid review date: {vid}')
            by_id[vid][kind]=resources
    dataset['curationSha256']=hashlib.sha256(curation_path.read_bytes()).hexdigest()
    return dataset

def main() -> int:
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('workbook',type=Path)
    p.add_argument('--output',type=Path,default=Path(__file__).resolve().parents[1]/'data'/'variables.json')
    p.add_argument('--date',default=date.today().isoformat())
    p.add_argument('--curation',type=Path,default=Path(__file__).resolve().parents[1]/'data'/'curation.json')
    args=p.parse_args()
    try:
        dataset=apply_curation(transform(args.workbook,args.date),args.curation)
        args.output.parent.mkdir(parents=True,exist_ok=True)
        args.output.write_text(json.dumps(dataset,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print(json.dumps(dataset['stats'],indent=2))
        return 0
    except (ValueError, OSError, KeyError, StopIteration) as exc:
        print(f'Import failed: {exc}',file=sys.stderr); return 1
if __name__=='__main__': raise SystemExit(main())
