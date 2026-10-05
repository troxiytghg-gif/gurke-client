const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("gurke", {
  status:()=>ipcRenderer.invoke("auth:status"),
  login:()=>ipcRenderer.invoke("auth:login"), logout:()=>ipcRenderer.invoke("auth:logout"),
  versions:(snap)=>ipcRenderer.invoke("versions:list",snap),
  getCfg:()=>ipcRenderer.invoke("cfg:get"), setCfg:p=>ipcRenderer.invoke("cfg:set",p),
  detectJava:()=>ipcRenderer.invoke("java:detect"), play:opts=>ipcRenderer.invoke("game:play",opts),
  openFolder:()=>ipcRenderer.invoke("open:folder"),
  on:(ch,fn)=>ipcRenderer.on(ch,(_e,d)=>fn(d))
});
