#!/usr/bin/env python3
import hashlib,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]; B=Path(__file__).resolve().parent
idx=json.loads((ROOT/'catalog/index.json').read_text()); rows=[a for a in idx['assets'] if a['kit']=='water-treatment']
log=(B/'catalog-test-output.txt').read_text()
files_m=re.search(r'Test Files\s+(\d+) passed',log)
tests_m=re.search(r'Tests\s+(\d+) passed',log)
duration_m=re.search(r'Duration\s+([\d.]+)s',log)
if not (files_m and tests_m and duration_m): raise SystemExit('integration summary missing')
per=[]
for a in rows:
    p=ROOT/a['source']; sha=hashlib.sha256(p.read_bytes()).hexdigest()
    good=sha==a['sourceSha256'] and [x['name'] for x in a['params']]==['scale','color'] and a['stats']['materials']==1 and a['stats']['minUpM']==0 and a['stats']['triangles']<=a['triangleBudget']
    per.append({'id':a['id'],'triangles':a['stats']['triangles'],'budget':a['triangleBudget'],'materials':a['stats']['materials'],'minUpM':a['stats']['minUpM'],'knobs':[x['name'] for x in a['params']],'sourceSha256Matches':sha==a['sourceSha256'],'passed':good})
nums=[x['triangles'] for x in per]
res={'kit':'water-treatment','added':len(rows),'catalogTotal':len(idx['assets']),'passed':sum(x['passed'] for x in per),'total':len(rows),'triangleRange':[min(nums),max(nums)] if nums else [],'allOneMaterial':all(x['materials']==1 for x in per),'allWithinBudget':all(x['triangles']<=x['budget'] for x in per),'allBaseOrigin':all(x['minUpM']==0 for x in per),'allKnobsExact':all(x['knobs']==['scale','color'] for x in per),'allSourceHashesMatch':all(x['sourceSha256Matches'] for x in per),'integration':{'passed':True,'filesPassed':int(files_m.group(1)),'testsPassed':int(tests_m.group(1)),'durationSeconds':float(duration_m.group(1))},'assets':per}
(B/'asset-check-results.json').write_text(json.dumps(res,indent=2)+'\n')
(B/'catalog-tests.json').write_text(json.dumps({'command':'npx vitest run tests/integration/catalog/','status':'passed','filesPassed':res['integration']['filesPassed'],'testsPassed':res['integration']['testsPassed'],'durationSeconds':res['integration']['durationSeconds']},indent=2)+'\n')
print(json.dumps({k:v for k,v in res.items() if k!='assets'},indent=2))
if not (len(rows)==50 and res['passed']==50 and all((B/'catalog-tests.json').is_file() for _ in [0])): raise SystemExit(1)
