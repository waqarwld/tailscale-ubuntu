const fs = require('fs'); const path = require('path');
const dir = path.join(process.cwd(), 'runtime'); const file = path.join(dir, 'counter.json');
fs.mkdirSync(dir,{recursive:true});
let next = null;
function init(start){ if(next===null){ try { next=JSON.parse(fs.readFileSync(file,'utf8')).next; } catch { next=start; } } }
function allocate(){ const n=next++; fs.writeFileSync(file, JSON.stringify({next})); return n; }
module.exports={init,allocate};
