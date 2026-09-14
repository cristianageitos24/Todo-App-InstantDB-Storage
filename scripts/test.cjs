const {mkdtempSync,rmSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join}=require('node:path');
const {execFileSync}=require('node:child_process');
const dir=mkdtempSync(join(tmpdir(),'workroom-tests-'));
try{
  execFileSync(process.execPath,['node_modules/typescript/bin/tsc','lib/workroom.ts','lib/organizer.ts','--outDir',dir,'--module','commonjs','--target','ES2020','--skipLibCheck','--strict'],{stdio:'inherit'});
  execFileSync(process.execPath,['--test','tests/workroom.test.cjs'],{stdio:'inherit',env:{...process.env,WORKROOM_TEST_BUILD:dir}});
}finally{rmSync(dir,{recursive:true,force:true});}
