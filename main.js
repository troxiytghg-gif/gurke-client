const { app, BrowserWindow, ipcMain, safeStorage, shell, screen } = require("electron");
const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const { Auth } = require("msmc");
const { Client } = require("minecraft-launcher-core");

const MANIFEST = "https://launchermeta.mojang.com/mc/game/version_manifest_v2.json";
let win, xbox = null, playing = false;

const DEFAULT_CFG = {
  version: "", ram: 4096,
  minecraft: { minRam: 512, maxRam: 4096, fullscreen: false, width: 1280, height: 720, gameDir: "", jvmArgs: "", gameArgs: "" },
  java: { autoDetect: true, customPath: "", java8: "", java17: "", java21: "" },
  launcher: { closeOnGameStart: false, showConsole: true, checkUpdates: true },
  appearance: { animations: true }
};

const cfgFile = () => path.join(app.getPath("userData"), "config.json");
function merge(a,b) {
  const out = {...a};
  for (const [k,v] of Object.entries(b || {}))
    out[k] = (v && typeof v === "object" && !Array.isArray(v) && a?.[k] && typeof a[k] === "object") ? merge(a[k],v) : v;
  return out;
}
function loadCfg() { try { return merge(DEFAULT_CFG, JSON.parse(fs.readFileSync(cfgFile(),"utf8"))); } catch { return structuredClone(DEFAULT_CFG); } }
function saveCfg(patch) {
  const cfg = merge(loadCfg(), patch);
  fs.mkdirSync(path.dirname(cfgFile()), {recursive:true});
  fs.writeFileSync(cfgFile(), JSON.stringify(cfg,null,2));
  return cfg;
}
function storeToken(token) {
  if (!token) return saveCfg({rt:null,rtEnc:false});
  if (safeStorage.isEncryptionAvailable()) return saveCfg({rt:safeStorage.encryptString(token).toString("base64"),rtEnc:true});
  return saveCfg({rt:token,rtEnc:false});
}
function readToken() {
  const {rt,rtEnc}=loadCfg(); if(!rt)return null;
  try{return rtEnc?safeStorage.decryptString(Buffer.from(rt,"base64")):rt}catch{return null}
}

function createWindow() {
  const wa=screen.getPrimaryDisplay().workAreaSize;
  win=new BrowserWindow({
    width:Math.min(1500,wa.width),height:Math.min(950,wa.height),minWidth:1000,minHeight:650,
    backgroundColor:"#07110b",title:"Gurke Client",autoHideMenuBar:true,center:true,
    webPreferences:{preload:path.join(__dirname,"preload.js"),contextIsolation:true,nodeIntegration:false}
  });
  win.loadFile("index.html");
}
app.whenReady().then(createWindow);
app.on("window-all-closed",()=>app.quit());
const send=(ch,data)=>win&&!win.isDestroyed()&&win.webContents.send(ch,data);

async function accountInfo(){
  if(!xbox)return null;
  const mc=await xbox.getMinecraft(),u=mc.mclc();
  return {name:u.name,uuid:u.uuid};
}
ipcMain.handle("auth:status",async()=>{
  const rt=readToken();if(!rt)return {ok:false};
  try{xbox=await new Auth("select_account").refresh(rt);storeToken(xbox.save());return {ok:true,account:await accountInfo()};}
  catch{return {ok:false}}
});
ipcMain.handle("auth:login",async()=>{
  try{xbox=await new Auth("select_account").launch("electron",{width:520,height:680});storeToken(xbox.save());return {ok:true,account:await accountInfo()};}
  catch(e){const msg=String(e?.message||e);return {ok:false,cancelled:/cancel|closed|user/i.test(msg),error:explain(msg)}}
});
ipcMain.handle("auth:logout",()=>{xbox=null;storeToken(null);return {ok:true}});
function explain(msg){
  if(/game|own|entitle/i.test(msg))return "Dieses Microsoft-Konto besitzt Minecraft Java Edition nicht.";
  if(/child|family|age/i.test(msg))return "Kinderkonto: Online-Spielen muss in der Xbox-Familie erlaubt sein.";
  return msg;
}

ipcMain.handle("versions:list",async(_e,snapshots)=>{
  const res=await fetch(MANIFEST);if(!res.ok)throw new Error("Mojang-Versionen konnten nicht geladen werden.");
  const data=await res.json();
  return data.versions.filter(v=>v.type==="release"||(snapshots&&v.type==="snapshot")).map(v=>({id:v.id,type:v.type}));
});
ipcMain.handle("cfg:get",()=>{const {rt,rtEnc,...rest}=loadCfg();return rest});
ipcMain.handle("cfg:set",(_e,patch)=>{saveCfg(patch);return true});
ipcMain.handle("open:folder",()=>shell.openPath(loadCfg().minecraft.gameDir||path.join(app.getPath("userData"),"minecraft")));

function execVersion(javaPath){
  return new Promise(resolve=>execFile(javaPath,["-version"],{timeout:5000},(err,stdout,stderr)=>{
    const text=String(stdout||"")+String(stderr||"");
    const m=text.match(/version "(\d+)(?:\.(\d+))?/i);
    resolve({ok:!err,version:m?`${m[1]}.${m[2]||"0"}`:""});
  }));
}
async function detectJava(){
  const candidates=[];
  const cfg=loadCfg().java;
  if(cfg.customPath)candidates.push(cfg.customPath);
  if(process.platform==="win32"){
    candidates.push("java");
    for(const root of [process.env.JAVA_HOME,process.env.ProgramFiles&&path.join(process.env.ProgramFiles,"Java")].filter(Boolean)){
      if(fs.existsSync(root)){
        try{for(const d of fs.readdirSync(root))candidates.push(path.join(root,d,"bin","java.exe"))}catch{}
      }
    }
  } else {
    candidates.push("java");
    for(const root of ["/usr/bin/java","/usr/lib/jvm/java-21-openjdk/bin/java","/usr/lib/jvm/java-17-openjdk/bin/java","/usr/lib/jvm/java-8-openjdk/bin/java","/home/deck/.local/share/mise/installs/java"].filter(Boolean))candidates.push(root);
  }
  const seen=new Set(),found=[];
  for(const c of candidates){
    if(seen.has(c))continue;seen.add(c);
    const r=await execVersion(c);if(r.ok)found.push({path:c,version:r.version});
  }
  return found;
}
ipcMain.handle("java:detect",()=>detectJava());

function javaForVersion(version, cfg, found){
  const parts=String(version).split(".").map(Number);
  const minor=parts[1]||0, patch=parts[2]||0;
  if(!cfg.autoDetect && cfg.customPath)return cfg.customPath;
  const required=(minor>20 || (minor===20 && patch>=5)) ? 21 : (minor>=17 ? 17 : 8);
  const preferred=required===21?cfg.java21:required===17?cfg.java17:cfg.java8;
  if(preferred)return preferred;
  const match=found.find(x=>Number(x.version.split(".")[0])===required);
  return match?.path || found[0]?.path || "java";
}
function parseArgs(s){return String(s||"").trim()?String(s).match(/(?:[^\s"]+|"[^"]*")+/g).map(x=>x.replace(/^"|"$/g,"")):[]}

ipcMain.handle("game:play",async(_e,opts)=>{
  if(playing)return {ok:false,error:"Minecraft läuft bereits."};
  if(!xbox)return {ok:false,error:"Bitte zuerst anmelden."};
  const cfg=loadCfg(), found=await detectJava(), javaPath=javaForVersion(opts.version,cfg.java,found);
  const jr=await execVersion(javaPath);
  if(!jr.ok)return {ok:false,error:"Java wurde nicht gefunden. Installiere Java 21 für aktuelle Minecraft-Versionen."};
  try{
    playing=true; await xbox.refresh(); const mc=await xbox.getMinecraft(); const launcher=new Client();
    launcher.on("progress",p=>send("game:progress",{type:p.type,task:p.task,total:p.total}));
    launcher.on("download-status",d=>send("game:log",`⬇ ${d.name||d.type}`));
    launcher.on("debug",m=>send("game:log",String(m)));
    launcher.on("data",m=>send("game:log",String(m)));
    launcher.on("close",code=>{playing=false;send("game:closed",code)});
    const root=cfg.minecraft.gameDir||path.join(app.getPath("userData"),"minecraft");
    const args=parseArgs(cfg.minecraft.jvmArgs), gameArgs=parseArgs(cfg.minecraft.gameArgs);
    const proc=await launcher.launch({
      authorization:mc.mclc(),root,javaPath,
      version:{number:opts.version,type:opts.version.match(/^\d+\.\d+(\.\d+)?$/)?"release":"snapshot"},
      memory:{max:`${opts.ram}M`,min:`${cfg.minecraft.minRam||512}M`},
      customArgs:args,
      customLaunchArgs:gameArgs,
      window:{fullscreen:!!cfg.minecraft.fullscreen,width:cfg.minecraft.width,height:cfg.minecraft.height}
    });
    if(!proc){playing=false;return {ok:false,error:"Start fehlgeschlagen (siehe Log)."}}
    if(cfg.launcher.closeOnGameStart) setTimeout(()=>win?.hide(),1500);
    return {ok:true,java:jr.version,path:javaPath};
  }catch(e){playing=false;return {ok:false,error:String(e?.message||e)}}
});
