const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const mode = process.argv[2] || (process.platform === "win32" ? "win" : "linux");
const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
fs.mkdirSync(dist,{recursive:true});

let n=1;
while(fs.existsSync(path.join(dist,`v${n}`))) n++;
for(let attempt=n; attempt<n+5; attempt++){
  const target = path.join(dist,`v${attempt}`);
  fs.mkdirSync(target,{recursive:true});
  const args = ["electron-builder", "--config", "package.json"];
  if(mode==="win") args.push("--win","nsis");
  else if(mode==="linux"||mode==="steamdeck") args.push("--linux","deb");
  else args.push("--win","nsis","--linux","deb");

  console.log(`\n🥒 Gurke Client build v${attempt} — ${mode}`);
  const r=spawnSync(process.platform==="win32"?"npx":"npx",args,{cwd:root,stdio:"inherit",shell:true,env:{...process.env,GURKE_BUILD_VERSION:`v${attempt}`}});
  const files=fs.readdirSync(dist).filter(x=>x!=="v"+attempt && !x.startsWith("."));
  const artifacts=files.filter(x=>/\.(exe|deb|blockmap|yml)$/i.test(x));
  if(r.status===0){
    for(const file of artifacts) fs.renameSync(path.join(dist,file),path.join(target,file));
    fs.writeFileSync(path.join(target,"BUILD_OK.txt"),`Gurke Client ${target.split(path.sep).pop()}\nMode: ${mode}\n`);
    console.log(`\n✅ Build successful: ${target}`);
    process.exit(0);
  }
  for(const file of artifacts){try{fs.renameSync(path.join(dist,file),path.join(target,file))}catch{}}
  fs.writeFileSync(path.join(target,"BUILD_FAILED.txt"),`Build attempt failed.\nExit code: ${r.status}\n`);
  console.log(`\n⚠️ Build failed. Retrying as v${attempt+1}...`);
}
console.error("❌ All versioned build attempts failed.");
process.exit(1);
