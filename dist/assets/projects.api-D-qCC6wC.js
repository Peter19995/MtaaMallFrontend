import{a as s}from"./axios.config-CFDwLbZr.js";const r=async t=>{const{data:a}=await s.get("/projects/public",{params:t});return a},n=async t=>{const{data:a}=await s.get("/projects/",{params:t});return a},i=async(t,a)=>{const e=new FormData;a.forEach(o=>{e.append("files",o)}),await s.post(`/projects/${t}/images`,e)};export{n as a,r as l,i as u};
//# sourceMappingURL=projects.api-D-qCC6wC.js.map
