import fs from 'node:fs/promises';
import {loadContentCatalog} from '../src/v2/content/catalog.js';
import {replayRecording} from '../src/v2/application/replay.js';
const filename=process.argv[2];
if(!filename){console.error('Usage: npm run replay:v2 -- recording.json');process.exitCode=2;}
else{
 try{
  const file=await fs.open(filename,'r');let recording;
  try{if((await file.stat()).size>64*1024*1024)throw Error('Recording exceeds 64 MiB');recording=JSON.parse(await file.readFile('utf8'));}finally{await file.close();}
  const result=replayRecording(recording,loadContentCatalog());
  console.log(JSON.stringify(result.ok?{ok:true,verifiedSteps:result.value.length,final:result.value.at(-1)??null}:result,null,2));if(!result.ok)process.exitCode=1;
 }catch(error){console.error(JSON.stringify({ok:false,code:'REPLAY_FILE',message:error.message}));process.exitCode=1;}
}
