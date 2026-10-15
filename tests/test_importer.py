"""Importer and curation tests. No source workbook or external Python packages required."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from zipfile import ZipFile
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('importer',ROOT/'scripts'/'import_matrix.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

class ImporterTests(unittest.TestCase):
    def test_columns(self):
        for ref,n in [('A1',0),('H1',7),('I1',8),('CT1',97)]: self.assertEqual(module.col_index(ref),n)
    def test_majority_and_na(self):
        c=module.consensus(['E','E','S','NA',None]);self.assertEqual(c['category'],'E');self.assertEqual(c['denominator'],3)
    def test_tie(self):
        self.assertEqual(module.consensus(['CD','CU'])['status'],'tie')
    def test_unresolved_denominator(self):
        c=module.consensus(['E','E | S','?']);self.assertEqual(c['denominator'],3);self.assertEqual(c['unresolved'],2);self.assertIsNone(c['category'])
    def test_no_forced_c_mapping(self):
        self.assertEqual(module.consensus(['C'])['status'],'legacy-core')
    def test_units_preserved(self):
        for raw,status in [('NA','missing'),('TBD','tbd'),('°C','provided'),('kWh, kWp','provided')]:
            v=module.unit_info(raw,'Electricity production');self.assertEqual(v['raw'],raw);self.assertEqual(v['status'],status)
    def test_json_source_invariants(self):
        data=json.loads((ROOT/'data'/'variables.json').read_text())
        self.assertEqual(len(data['variables']),641)
        for v in data['variables']:
            values=[c['raw'] for c in v['voteCells']]+['NA']*(90-len(v['voteCells']))
            self.assertEqual(module.consensus(values),v['consensus'],v['id'])
            self.assertEqual(v['sourceSessionCount'],len(v['sessions']))
    def test_first_worksheet_reader_uses_relationships(self):
        with tempfile.TemporaryDirectory() as temp:
            f=Path(temp)/'fixture.xlsx'
            with ZipFile(f,'w') as z:
                z.writestr('xl/workbook.xml','<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="First tab" sheetId="1" r:id="rId3"/></sheets></workbook>')
                z.writestr('xl/_rels/workbook.xml.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId3" Target="worksheets/sheet7.xml"/></Relationships>')
                z.writestr('xl/sharedStrings.xml','<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>Category</t></si></sst>')
                z.writestr('xl/worksheets/sheet7.xml','<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="inlineStr"><is><t>Air temperature</t></is></c></row><row r="2"><c r="I2" t="inlineStr"><is><t>CU</t></is></c></row></sheetData></worksheet>')
            name,rows=module.read_first_sheet(f)
            self.assertEqual(name,'First tab');self.assertEqual(rows[0][1],['Category',None,'Air temperature']);self.assertEqual(rows[1][1][8],'CU')
    def test_curation_rejects_unknown_ids(self):
        with tempfile.TemporaryDirectory() as temp:
            f=Path(temp)/'curation.json';f.write_text(json.dumps({'schemaVersion':'1.0.0','entries':{'bad':{}}}))
            with self.assertRaisesRegex(ValueError,'missing from source'): module.apply_curation({'variables':[]},f)
    def test_curation_cannot_change_votes(self):
        with tempfile.TemporaryDirectory() as temp:
            f=Path(temp)/'curation.json';f.write_text(json.dumps({'schemaVersion':'1.0.0','entries':{'av-test':{'consensus':{'category':'CD'}}}}))
            with self.assertRaisesRegex(ValueError,'Only method/publication'): module.apply_curation({'variables':[{'id':'av-test'}]},f)
    def test_curation_requires_review_metadata(self):
        with tempfile.TemporaryDirectory() as temp:
            f=Path(temp)/'curation.json';f.write_text(json.dumps({'schemaVersion':'1.0.0','entries':{'av-test':{'methods':[{'title':'Unreviewed'}]}}}))
            with self.assertRaisesRegex(ValueError,'Incomplete'): module.apply_curation({'variables':[{'id':'av-test'}]},f)
    def test_curation_applies_complete_https_resource(self):
        with tempfile.TemporaryDirectory() as temp:
            f=Path(temp)/'curation.json'
            resource={'title':'Test fixture only','summary':'Unit test','url':'https://example.org/fixture','reviewer':'test','reviewedOn':'2026-10-14'}
            f.write_text(json.dumps({'schemaVersion':'1.0.0','entries':{'av-test':{'methods':[resource]}}}))
            d=module.apply_curation({'variables':[{'id':'av-test'}]},f)
            self.assertEqual(d['variables'][0]['methods'],[resource]);self.assertIn('curationSha256',d)

if __name__=='__main__':unittest.main()
