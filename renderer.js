const $=id=>document.getElementById(id);
const S={versions:[],tab:"release",query:"",selected:null,active:0,account:null};
const status=t=>$("status").textContent=t;
function log(t){const e=$("log");e.textContent+=t+"\n";if(e.textContent.length>50000)e.textContent=e.textContent.slice(-35000);e.scrollTop=e.scrollHeight}
document.querySelectorAll(".nav[data-view]").forEach(b=>b.onclick=()=>{document.querySelectorAll(".nav[data-view]").forEach(x=>x.classList.toggle("active",x===b));document.querySelectorAll(".stage .view").forEach(v=>v.classList.toggle("hidden",v.id!=="view-"+b.dataset.view));});
$("folderBtn").onclick=()=>window.gurke.openFolder();
function setAccount(a){S.account=a;$("accName").textContent=a?a.name:"Nicht angemeldet";$("accSub").textContent=a?"Microsoft-Konto verbunden":"Microsoft-Konto nötig";$("avatar").textContent=a?a.name[0].toUpperCase():"?";$("loginBtn").classList.toggle("hidden",!!a);$("logoutBtn").classList.toggle("hidden",!a)}
$("loginBtn").onclick=async()=>{status("Microsoft-Login geöffnet …");const r=await window.gurke.login();if(r.ok){setAccount(r.account);status(`Angemeldet als ${r.account.name} ✔`)}else status(r.cancelled?"Anmeldung abgebrochen.":"Login-Fehler: "+(r.error||"unbekannt"))};
$("logoutBtn").onclick=async()=>{await window.gurke.logout();setAccount(null);status("Abgemeldet.")};

function visible(){const q=S.query.trim().toLowerCase();return S.versions.filter(v=>v.type===S.tab&&v.id.toLowerCase().includes(q))}
function select(id){S.selected=id;$("pickValue").textContent=id;$("playSub").textContent="Minecraft "+id;window.gurke.setCfg({version:id});closePicker()}
function renderList(){const list=$("list"),items=visible();list.replaceChildren();if(!items.length){const e=document.createElement("div");e.className="empty";e.textContent="Keine Version gefunden 🥒";list.append(e);return}S.active=Math.min(S.active,items.length-1);const latest=S.versions.find(v=>v.type==="release")?.id;items.forEach((v,i)=>{const b=document.createElement("button");b.className="item"+(i===S.active?" active":"")+(v.id===S.selected?" sel":"");const n=document.createElement("span");n.className="ver";n.textContent=v.id;b.append(n);if(v.id===latest){const t=document.createElement("span");t.className="tag new";t.textContent="NEUESTE";b.append(t)}if(v.type==="snapshot"){const t=document.createElement("span");t.className="tag snap";t.textContent="SNAPSHOT";b.append(t)}if(v.id===S.selected){const c=document.createElement("span");c.className="check";c.textContent="✔";b.append(c)}b.onclick=()=>select(v.id);b.onmouseenter=()=>{S.active=i;list.querySelectorAll(".item").forEach((x,j)=>x.classList.toggle("active",j===i))};list.append(b)})}
function openPicker(){$("picker").classList.add("open");S.query="";$("search").value="";renderList();setTimeout(()=>$("search").focus(),50)}
function closePicker(){$("picker").classList.remove("open")}
$("pickBtn").onclick=()=>($("picker").classList.contains("open")?closePicker():openPicker());
document.addEventListener("mousedown",e=>{if(!$("picker").contains(e.target))closePicker()});
$("search").oninput=e=>{S.query=e.target.value;S.active=0;renderList()};
document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>{S.tab=t.dataset.tab;S.active=0;document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===t));renderList();$("search").focus()});
$("search").onkeydown=e=>{const items=visible();if(e.key==="ArrowDown"){S.active=Math.min(S.active+1,items.length-1);e.preventDefault()}else if(e.key==="ArrowUp"){S.active=Math.max(S.active-1,0);e.preventDefault()}else if(e.key==="Enter"&&items[S.active])return select(items[S.active].id);else if(e.key==="Escape")return closePicker();else return;renderList()};

function collectSettings(){
 return {ram:+$("ram").value,minecraft:{gameDir:$("gameDir").value.trim(),fullscreen:$("fullscreen").checked,width:+$("width").value||1280,height:+$("height").value||720,jvmArgs:$("jvmArgs").value,gameArgs:$("gameArgs").value},java:{autoDetect:$("javaMode").value==="auto",customPath:$("javaPath").value.trim()},launcher:{closeOnGameStart:$("closeOnStart").checked,showConsole:$("showConsole").checked},appearance:{animations:$("animations").checked}}
}
function applyCfg(c){c=c||{};$("ram").value=c.ram||4096;$("ramVal").textContent=c.ram||4096;const m=c.minecraft||{},j=c.java||{},l=c.launcher||{},a=c.appearance||{};$("gameDir").value=m.gameDir||"";$("width").value=m.width||1280;$("height").value=m.height||720;$("fullscreen").checked=!!m.fullscreen;$("jvmArgs").value=m.jvmArgs||"";$("gameArgs").value=m.gameArgs||"";$("javaMode").value=j.autoDetect===false?"custom":"auto";$("javaPath").value=j.customPath||"";$("closeOnStart").checked=!!l.closeOnGameStart;$("showConsole").checked=l.showConsole!==false;$("animations").checked=a.animations!==false}
let saveTimer;
document.querySelectorAll("#view-settings input,#view-settings select,#view-settings textarea").forEach(el=>el.addEventListener("change",()=>{clearTimeout(saveTimer);saveTimer=setTimeout(()=>window.gurke.setCfg(collectSettings()),150)}));
$("ram").oninput=()=>$("ramVal").textContent=$("ram").value;
$("detectJava").onclick=async()=>{status("Suche nach Java …");const r=await window.gurke.detectJava();$("javaResult").textContent=r.length?r.map(x=>`✓ Java ${x.version} — ${x.path}`).join("\n"):"Kein Java gefunden.";status(r.length?`${r.length} Java-Installation(en) gefunden.`:"Java nicht gefunden.")};
$("reset").onclick=async()=>{if(!confirm("Alle Einstellungen zurücksetzen?"))return;await window.gurke.setCfg({ram:4096,minecraft:{gameDir:"",fullscreen:false,width:1280,height:720,jvmArgs:"",gameArgs:""},java:{autoDetect:true,customPath:""},launcher:{closeOnGameStart:false,showConsole:true},appearance:{animations:true}});applyCfg(await window.gurke.getCfg());status("Einstellungen zurückgesetzt.")};

(async function init(){
 const cfg=await window.gurke.getCfg();applyCfg(cfg);
 try{S.versions=await window.gurke.versions(true);const first=S.versions.find(v=>v.type==="release"),saved=S.versions.find(v=>v.id===cfg.version);if(saved)S.tab=saved.type;S.selected=(saved||first)?.id;$("pickValue").textContent=S.selected||"Offline";$("playSub").textContent=S.selected?"Minecraft "+S.selected:"Version wählen";document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x.dataset.tab===S.tab))}catch{status("Versionsliste konnte nicht geladen werden (Internet?).")}
 const s=await window.gurke.status();setAccount(s.ok?s.account:null);status(s.ok?`Willkommen zurück, ${s.account.name}!`:"Bereit.");
})();
$("playBtn").onclick=async()=>{if(!S.account)return status("Bitte zuerst mit Microsoft anmelden.");if(!S.selected)return;await window.gurke.setCfg(collectSettings());$("playBtn").disabled=true;$("log").textContent="";$("bar").style.width="0";status("Starte … (beim ersten Mal werden Dateien geladen)");const r=await window.gurke.play({version:S.selected,ram:+$("ram").value});if(!r.ok){status(r.error);$("playBtn").disabled=false}else status(`Minecraft startet mit Java ${r.java}.`)};
window.gurke.on("game:progress",p=>{if(p.total)$("bar").style.width=Math.min(100,p.task/p.total*100)+"%";status(`Lade ${p.type} (${p.task}/${p.total})`)});
window.gurke.on("game:log",t=>{log(t);if(/Launching with arguments/i.test(t))status("Minecraft startet … 🥒")});
window.gurke.on("game:closed",code=>{$("playBtn").disabled=false;$("bar").style.width="0";status(code===0?"Minecraft beendet.":`Minecraft beendet (Code ${code}). Siehe Konsole.`)});
