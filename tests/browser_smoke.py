#!/usr/bin/env python3
"""End-to-end browser checks. Requires Playwright and a Chromium executable.

Examples:
  python tests/browser_smoke.py --url http://127.0.0.1:8000
  python tests/browser_smoke.py --inline --chromium /usr/bin/chromium

The inline mode exercises the standalone bundle with a test-only in-memory storage
adapter. It is useful on managed runners that prohibit browser URL navigation.
No adapter is included in the application or release artifacts.
"""
import argparse
import csv
import io
import json
from pathlib import Path
import re
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--url',default='http://127.0.0.1:8000');p.add_argument('--inline',action='store_true');p.add_argument('--chromium');p.add_argument('--screenshots',type=Path);args=p.parse_args()
STORE='''<script>
window.__testStore=window.__testStore||{};
Object.defineProperty(window,'localStorage',{configurable:true,value:{
 getItem:k=>Object.prototype.hasOwnProperty.call(window.__testStore,k)?window.__testStore[k]:null,
 setItem:(k,v)=>window.__testStore[k]=String(v), removeItem:k=>delete window.__testStore[k],
 clear:()=>window.__testStore={}, key:i=>Object.keys(window.__testStore)[i]||null,
 get length(){return Object.keys(window.__testStore).length;}
}});
</script>'''
results=[]
def passed(text):results.append(text);print('PASS',text)
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,**({'executable_path':args.chromium} if args.chromium else {}))
    page=browser.new_page(viewport={'width':1440,'height':1080},device_scale_factor=1)
    page.set_default_timeout(7000)
    errors=[];requests=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('request',lambda r:requests.append(r.url))
    def load():
        if args.inline:
            html=(ROOT/'dist/agrivoltaics-standards-demo.html').read_text()
            page.set_content(html.replace('<head>','<head>'+STORE,1),wait_until='networkidle')
        else:page.goto(args.url,wait_until='networkidle')
        page.wait_for_selector('.topic-grid, .variable-table, .plan-stats, .guide-grid')
    def snap(name,full=False):
        if args.screenshots:
            args.screenshots.mkdir(parents=True,exist_ok=True)
            page.evaluate("document.getElementById('toast').classList.remove('show')")
            page.wait_for_timeout(350)
            page.screenshot(path=str(args.screenshots/name),full_page=full)
    def check_width():assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Horizontal overflow'
    def find_variable(name):
        page.locator('#variable-search').fill(name)
        page.get_by_role('button',name=name,exact=True).click()
        assert page.locator('#detail-title').inner_text()==name
    def plan_count():return int(page.locator('.main-nav [data-view="plan"] .nav-count').inner_text())
    def captured_download(action):
        page.evaluate('''() => {window.__lastBlob=null; if(!window.__originalCreateObjectURL){window.__originalCreateObjectURL=URL.createObjectURL.bind(URL); URL.createObjectURL=b=>{window.__lastBlob=b;return window.__originalCreateObjectURL(b)};}}''')
        page.locator(f'[data-action="{action}"]').first.click()
        page.wait_for_function('window.__lastBlob !== null')
        return page.evaluate('window.__lastBlob.text()')
    page.emulate_media(color_scheme='dark')
    load();assert page.locator('[data-action="continue"]').is_enabled();
    baseline=92;required=67
    assert plan_count()==baseline
    assert page.locator('.brand-name').inner_text()=='Agrivoltaics International Standards'
    assert page.locator('.brand-caption, .hero-stats').count()==0
    assert page.locator('.brand-logo').evaluate('(img) => img.complete && img.naturalWidth > 0')
    assert page.locator('.setup-main .panel').first.evaluate('(el) => getComputedStyle(el).backgroundColor')=='rgb(255, 255, 255)'
    check_width();snap('setup-desktop.png',full=True)
    passed('Light setup, PNG branding and 92 defaults load; no extra focus required')
    page.locator('[data-action="topic"][data-id="crops"]').click()
    assert page.evaluate("document.activeElement.dataset.id")=='crops'
    page.locator('[data-action="topic"][data-id="microclimate"]').click()
    page.locator('[data-action="crop"][data-group="Field Crops"]').click()
    page.locator('#study-name').fill('Canopy light study')
    page.locator('[data-action="continue"]').click()
    assert page.locator('.result-bar').inner_text().startswith('285 variables')
    passed('Topic/crop workflow produces the reproducible 285-variable shortlist')
    find_variable('Air temperature')
    page.locator('[data-action="detail-tab"][data-tab="votes"]').click()
    assert '32 of 37' in page.locator('.evidence-head').inner_text()
    assert 'C. A descriptive or universal subtype cannot be inferred' in page.locator('.detail-content').inner_text()
    page.locator('[data-action="detail-tab"][data-tab="resources"]').click()
    assert 'No reviewed method linked yet' in page.locator('.detail-content').inner_text()
    page.locator('[data-action="detail-tab"][data-tab="overview"]').click()
    page.locator('.detail-actions [data-action="toggle-variable"]').click()
    page.locator('#entry-unit').fill('°C')
    page.locator('#entry-schedule').fill('10-minute mean')
    page.locator('#entry-position').fill('Under modules and reference plot; 2 m')
    page.locator('#entry-method').fill('Shielded, calibrated sensor')
    page.locator('#entry-notes').fill('Review "shade" treatment, preserve replication.')
    snap('variable-detail.png')
    page.locator('[data-action="close-detail"]').click();assert plan_count()==baseline+1
    passed('Details show source units, C ambiguity, original votes, and editable sampling fields')
    page.locator('#variable-search').fill('Soil moisture')
    page.get_by_role('button',name='Soil moisture',exact=True).click()
    assert 'volumetric or gravimetric' in page.locator('.detail-content').inner_text()
    page.locator('.detail-actions [data-action="toggle-variable"]').click();page.locator('#entry-unit').fill('m³ m⁻³');page.locator('#entry-position').fill('10 cm depth')
    page.locator('[data-action="close-detail"]').click()
    find_variable('Electricity production')
    assert 'kWh, kWp' in page.locator('.unit-box').inner_text()
    assert 'mixes energy' in page.locator('.unit-warning').inner_text()
    page.locator('.detail-actions [data-action="toggle-variable"]').click();page.locator('#entry-unit').fill('kWh');page.locator('#entry-schedule').fill('Daily total; AC meter')
    page.locator('[data-action="close-detail"]').click();assert plan_count()==baseline+3
    passed('Unit ambiguity warnings remain visible; custom units never replace source units')
    page.locator('#variable-search').fill('zzzz-unmatched-variable');assert page.locator('.empty-state').is_visible();assert plan_count()==baseline+3
    page.locator('[data-action="reset-filters"]').first.click()
    page.locator('[data-action="scope"][data-scope="all"]').click()
    assert '641 variables' in page.locator('.result-bar').inner_text()
    page.locator('[data-action="tier"][data-tier="CD"]').click();assert page.locator('tbody tr').count()==13
    page.locator('[data-action="tier"][data-tier="review"]').click();assert page.locator('.result-bar').inner_text().startswith('361 variables')
    page.locator('[data-action="reset-filters"]').first.click()
    page.locator('[data-action="category"][data-category="Microclimate"]').click()
    page.locator('#sort-select').select_option('name');snap('library-desktop.png')
    passed('Full-library, priority, review, domain, sort, search and empty-state controls work')
    page.locator('[data-action="reset-filters"]').first.click()
    find_variable('Latitude')
    assert page.locator('.detail-actions [data-action="toggle-variable"]').is_disabled()
    page.locator('#entry-notes').fill('Required site coordinates')
    page.locator('[data-action="close-detail"]').click()
    assert page.locator('tbody input[type="checkbox"]').is_disabled()
    page.locator('#page-select').click()
    assert plan_count()==baseline+3
    passed('Required metadata cannot be removed individually or with page selection')
    page.locator('.main-nav [data-view="plan"]').click();assert page.locator('.plan-stats strong').first.inner_text()==str(baseline+3);check_width()
    csv_text=captured_download('export-csv');rows=list(csv.DictReader(io.StringIO(csv_text.lstrip('\ufeff'))));assert len(rows)==baseline+3
    air=next(row for row in rows if row['variable']=='Air temperature');assert air['source_unit_or_format']=='°C';assert air['method']=='Shielded, calibrated sensor'
    energy=next(row for row in rows if row['variable']=='Electricity production');assert energy['source_unit_or_format']=='kWh, kWp';assert energy['reporting_unit_or_format']=='kWh'
    exported=captured_download('export-json');payload=json.loads(exported);assert len(payload['plan'])==baseline+3;assert payload['study']['name']=='Canopy light study'
    observations=list(csv.DictReader(io.StringIO(captured_download('export-template').lstrip('\ufeff'))));assert len(observations)==baseline+3;assert all(row['value']=='' for row in observations)
    snap('plan-desktop.png',full=True)
    passed('CSV, JSON and observation-template buttons produce correct, parseable exports')
    page.locator('#plan-file').set_input_files({'name':'restored.json','mimeType':'application/json','buffer':exported.encode()})
    assert page.locator('#utility-title').inner_text()==f'Import {baseline+3} variables?';page.locator('[data-action="confirm"]').click();assert plan_count()==baseline+3
    invalid=json.loads(exported);invalid['plan']['bad-id']=next(iter(invalid['plan'].values()))
    page.locator('#plan-file').set_input_files({'name':'bad.json','mimeType':'application/json','buffer':json.dumps(invalid).encode()})
    page.wait_for_function("document.getElementById('toast').textContent.includes('Import stopped')");assert plan_count()==baseline+3
    passed('JSON import is confirmed before replacement; invalid IDs leave the plan unchanged')
    page.locator('[data-action="clear-plan"]').click();page.get_by_role('button',name='Cancel',exact=True).click();assert plan_count()==baseline+3
    page.locator('[data-action="clear-plan"]').click();page.locator('[data-action="confirm"]').click();assert plan_count()==required
    page.get_by_role('button',name='Latitude',exact=True).click()
    assert page.locator('#entry-notes').input_value()=='Required site coordinates'
    page.locator('[data-action="close-detail"]').click()
    page.locator('#plan-file').set_input_files({'name':'restore.json','mimeType':'application/json','buffer':exported.encode()});page.locator('[data-action="confirm"]').click();assert plan_count()==baseline+3
    load();assert plan_count()==baseline+3
    passed('Clear-plan confirmation and saved-study restoration work (test storage adapter in inline mode)')
    page.locator('.main-nav [data-view="guide"]').click();assert '245' in page.locator('.guide-notice').inner_text();assert page.locator('.guide-card').count()==4
    full_audit=captured_download('export-audit');assert len(list(csv.reader(io.StringIO(full_audit.lstrip('\ufeff')))))==642
    passed('Classification guide and complete 641-row audit export are functional')
    page.locator('[data-action="feedback"]').click();page.locator('#feedback-text').fill('Browser smoke test only; no feedback is submitted.')
    page.evaluate('''() => {window.__lastBlob=null; if(!window.__originalCreateObjectURL){window.__originalCreateObjectURL=URL.createObjectURL.bind(URL); URL.createObjectURL=b=>{window.__lastBlob=b;return window.__originalCreateObjectURL(b)};}}''')
    page.locator('#feedback-form button[type="submit"]').click();page.wait_for_function('window.__lastBlob !== null');assert 'Browser smoke test only' in page.evaluate('window.__lastBlob.text()')
    passed('Unconfigured feedback downloads locally rather than pretending to submit')
    page.set_viewport_size({'width':390,'height':844});page.locator('.main-nav [data-view="setup"]').click();check_width();snap('setup-mobile.png',full=True)
    page.locator('[data-action="continue"]').click();check_width();page.locator('[data-action="mobile-filters"]').click();assert page.locator('.filter-body').is_visible()
    page.locator('[data-action="mobile-filters"]').click();page.locator('#variable-search').fill('Air temperature');page.get_by_role('button',name='Air temperature',exact=True).click();check_width()
    page.locator('#tab-overview').focus();page.keyboard.press('ArrowRight');assert page.locator('#tab-votes').get_attribute('aria-selected')=='true'
    page.keyboard.press('Escape');assert not page.locator('#detail-dialog').is_visible()
    page.locator('#variable-search').fill('');snap('library-mobile.png',full=True)
    page.locator('.main-nav [data-view="plan"]').click();check_width();snap('plan-mobile.png',full=True)
    passed('390px mobile layout, collapsible filters, detail tabs, focus retention and Escape pass')
    page.set_viewport_size({'width':768,'height':1024});check_width();page.locator('.main-nav [data-view="setup"]').click();check_width()
    page.set_viewport_size({'width':320,'height':740});check_width()
    page.locator('.main-nav [data-view="plan"]').click();check_width()
    passed('320px phone, 768px tablet and 1440px desktop layouts have no horizontal overflow')
    page.locator('.main-nav [data-view="plan"]').click();page.emulate_media(media='print');assert not page.locator('.export-panel').is_visible();assert page.locator('.print-only').is_visible();page.emulate_media(media='screen')
    passed('Print stylesheet includes sampling details and hides controls')
    page.evaluate("""() => {const key=Array.from({length:localStorage.length},(_,i)=>localStorage.key(i)).find(k=>k.startsWith('agrifield:plan:v1:')&&!k.endsWith(':recovery')); if(key)localStorage.setItem(key+':recovery','test recovery copy');}""")
    page.locator('[data-action="privacy"]').click();page.locator('[data-action="erase-storage"]').click();page.locator('[data-action="confirm"]').click();assert plan_count()==baseline
    assert page.evaluate("!Array.from({length:localStorage.length},(_,i)=>localStorage.key(i)).some(k=>k.startsWith('agrifield:plan:v1:'))")
    passed('Privacy erasure removes the study and any stored recovery copy')
    assert not errors,errors
    if args.inline:assert not [u for u in requests if u.startswith(('http:','https:'))],requests
    else:assert all(u.startswith(args.url) or u.startswith(('blob:','data:')) for u in requests),requests
    passed('No JavaScript errors or external runtime requests')
    browser.close()
print(f'\n{len(results)} browser checks passed.')
if args.screenshots:(args.screenshots/'browser-results.json').write_text(json.dumps({'checks':results,'errors':errors,'mode':'inline with test storage adapter' if args.inline else 'HTTP','viewportTests':[320,390,768,1440]},indent=2))
