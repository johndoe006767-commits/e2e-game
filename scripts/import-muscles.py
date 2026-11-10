"""Extract native BodyParts3D surfaces; source offsets/coordinates are preserved.
Inputs are the pinned atlas JSON and its gzip chunks in /private/tmp.
"""
import json,gzip,re,struct
from pathlib import Path
atlas=json.load(open('/private/tmp/human-atlas.json'))
# Game labels retain the user-requested screen-side naming in the front view.
selectors={
 'deltoid':r'part of right deltoid$',
 'forearm':r'(Left brachioradialis|Left flexor carpi radialis|head of left flexor carpi ulnaris)$',
 'tibialis':r'^Right tibialis anterior$',
 'adductors':r'^Right (adductor (brevis|longus|magnus)|gracilis)$',
 'glutes':r'^(Right|Left) gluteus (maximus|medius)$',
 'triceps':r'head of right triceps brachii$',
 'biceps':r'head of left biceps brachii$',
 'quadriceps':r'^Left (rectus femoris|vastus (intermedius|lateralis|medialis))$',
 'hamstrings':r'(head of right biceps femoris|Right semimembranosus|Right semitendinosus)$',
 'calves':r'(head of left gastrocnemius|Left soleus)$',
}
out=bytearray();parts=[];anchors={};cache={}
H=1.7066899556666613*1.035;W=.6478489935398102*1.035;C=.8609762778505683
for group,pattern in selectors.items():
 selected=[p for p in atlas['parts'] if re.search(pattern,p['name'],re.I)]
 assert selected,group
 lo=[min(p['bounds'][0][i] for p in selected) for i in range(3)]
 hi=[max(p['bounds'][1][i] for p in selected) for i in range(3)]
 center=[(a+b)/2 for a,b in zip(lo,hi)]
 back=group in ['glutes','triceps','hamstrings','calves']
 # Keep the checkpoint on the visible muscle belly; long tendon tails do not define it.
 y=center[1]+(.055 if group in ['forearm','tibialis','calves'] else 0)
 anchor=[center[0]-.0000105053,y-C,lo[2]-.004 if back else hi[2]+.004]
 anchors[group]={'position':anchor,'x':round((anchor[0]/W+.5)*100,3),'y':round((.5-anchor[1]/H)*100,3),'w':round((hi[0]-lo[0])/W*100,3),'h':round((hi[1]-lo[1])/H*100,3),'bounds':[lo,hi]}
 for p in selected:
  chunk=p['chunk']
  if chunk not in cache:cache[chunk]=gzip.decompress(Path(f'/private/tmp/muscles-body-{chunk}.bin.gz').read_bytes())
  raw=cache[chunk];entry={k:p[k] for k in ['id','name','vertexCount','indexCount','bounds']};entry['group']=group
  for field,length in [('positions',p['vertexCount']*12),('normals',p['vertexCount']*6),('indices',p['indexCount']*4)]:
   while len(out)%4:out.append(0)
   entry[field]=len(out);out.extend(raw[p[field]:p[field]+length])
  parts.append(entry)
Path('public/anatomy/muscles.bin.gz').write_bytes(gzip.compress(out,mtime=0))
Path('public/anatomy/muscles.json').write_text(json.dumps({'parts':parts,'bytes':len(out),'source':'BodyParts3D 4.0 via ashemag/human-atlas','commit':'1c38bf35c254a891200d3cedecfd57abebe83d8d'},separators=(',',':')))
Path('src/muscle-anchors.json').write_text(json.dumps(anchors,indent=2)+'\n')
print(f'{len(parts)} native meshes, {len(out)} bytes, {Path("public/anatomy/muscles.bin.gz").stat().st_size} compressed')
