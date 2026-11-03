"use strict";
/* Odu Yoruba · app web
   - Con Supabase configurado (config.js): cuentas, datos en la nube, cada usuario ve solo lo suyo.
   - Sin configurar: MODO DEMO, datos solo en este dispositivo. */
const D = window.DILOGGUN, M = window.IFA_MEJI;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const dl = n => D[n-1], mj = n => M[n-1];
const uniq = a => [...new Set(a)];
const hoyISO = () => new Date().toISOString().slice(0,10);
const fmtFecha = d => d ? new Date(d.length===10 ? d+"T12:00:00" : d).toLocaleDateString("es",{day:"numeric",month:"short",year:"numeric"}) : "";
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2));
let tt; function toast(m){const t=$("#toast");t.textContent=m;t.style.display="block";clearTimeout(tt);tt=setTimeout(()=>t.style.display="none",2200);}

/* ===================== DATOS (nube o demo) ===================== */
const CFG = window.ODU_CONFIG || {};
const CLOUD = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase);
const sb = CLOUD ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY) : null;

const Demo = {
  k: n => "odu_demo_"+n,
  get(n, def){ try{ const v=localStorage.getItem(this.k(n)); return v?JSON.parse(v):def; }catch(e){ return def; } },
  set(n, v){ try{ localStorage.setItem(this.k(n), JSON.stringify(v)); }catch(e){} },
  seed(){
    if (this.get("seeded", false)) return;
    const c1={id:uid(),nombre:"María Pérez",nombre_santo:"Omi Laí",relacion:"ahijado",orisha_cabecera:"Yemayá",signo_ita:"Oshé tonti Obara (5-6)",telefono:"",notas:"Ejemplo de ahijada.",fecha_nacimiento:null,creado:new Date().toISOString()};
    const c2={id:uid(),nombre:"José Rodríguez",nombre_santo:"",relacion:"aleyo",orisha_cabecera:"",signo_ita:"",telefono:"",notas:"",fecha_nacimiento:null,creado:new Date().toISOString()};
    const d=new Date(); const en21=new Date(d.getTime()+21*864e5).toISOString().slice(0,10);
    this.set("consultados",[c1,c2]);
    this.set("consultas",[
      {id:uid(),consultado_id:c1.id,sistema:"dilo",pie1:5,pie2:6,signo:"Oshé tonti Obara",orientacion:"ire",tipo:"Iré Owó (bienestar económico)",pregunta:"Trabajo",notas:"Habló Oshún.",ebbo:"Ponerle a Elegguá ekú, eyá y epó.",ebbo_hecho:false,volver_el:en21,fecha:new Date(d.getTime()-2*864e5).toISOString()},
      {id:uid(),consultado_id:c2.id,sistema:"ifa",pie1:8,pie2:1,signo:"Okana Sode",orientacion:"osogbo",tipo:"Arayé (chismes, pleitos, envidia)",pregunta:"",notas:"",ebbo:"",ebbo_hecho:false,volver_el:null,fecha:new Date(d.getTime()-6*864e5).toISOString()}
    ]);
    this.set("perfil",{nombre:"Demo",nombre_santo:"",tipo:"olorisha",orisha_cabecera:"",casa:"",padrino:"",telefono:"",pais:"",plan:"gratis"});
    this.set("seeded", true);
  }
};

const Store = {
  user: null,
  async init(){
    if (!CLOUD){ Demo.seed(); this.user={id:"demo",email:"modo demo"}; return true; }
    const { data } = await sb.auth.getSession();
    this.user = data.session ? data.session.user : null;
    return !!this.user;
  },
  async signIn(email, pass){ const {data,error}=await sb.auth.signInWithPassword({email,password:pass}); if(error) throw error; this.user=data.user; },
  async signUp(email, pass, nombre){
    const {data,error}=await sb.auth.signUp({email,password:pass,options:{data:{nombre},emailRedirectTo:location.origin+location.pathname}});
    if(error) throw error; this.user=data.session?data.user:null; return !!data.session;
  },
  async reset(email){ const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname}); if(error) throw error; },
  async signOut(){ if(CLOUD) await sb.auth.signOut(); this.user=null; },

  async perfil(){
    if(!CLOUD) return Demo.get("perfil",{});
    const {data,error}=await sb.from("perfiles").select("*").eq("id",this.user.id).maybeSingle(); if(error) throw error; return data||{};
  },
  async guardarPerfil(p){
    if(!CLOUD){ Demo.set("perfil",{...Demo.get("perfil",{}),...p}); return; }
    const {plan, id, creado, ...rest}=p;
    const {error}=await sb.from("perfiles").update(rest).eq("id",this.user.id); if(error) throw error;
  },
  async consultados(){
    if(!CLOUD) return Demo.get("consultados",[]).sort((a,b)=>a.nombre.localeCompare(b.nombre));
    const {data,error}=await sb.from("consultados").select("*").order("nombre"); if(error) throw error; return data;
  },
  async guardarConsultado(c){
    if(!CLOUD){ const l=Demo.get("consultados",[]); if(c.id){ const i=l.findIndex(x=>x.id===c.id); l[i]={...l[i],...c}; } else { c={...c,id:uid(),creado:new Date().toISOString()}; l.push(c);} Demo.set("consultados",l); return c; }
    if(c.id){ const {id,owner,creado,...rest}=c; const {data,error}=await sb.from("consultados").update(rest).eq("id",id).select().single(); if(error) throw error; return data; }
    const {data,error}=await sb.from("consultados").insert(c).select().single(); if(error) throw error; return data;
  },
  async borrarConsultado(id){
    if(!CLOUD){ Demo.set("consultados",Demo.get("consultados",[]).filter(x=>x.id!==id)); Demo.set("consultas",Demo.get("consultas",[]).map(q=>q.consultado_id===id?{...q,consultado_id:null}:q)); return; }
    const {error}=await sb.from("consultados").delete().eq("id",id); if(error) throw error;
  },
  async consultas(){
    if(!CLOUD) return Demo.get("consultas",[]).sort((a,b)=>b.fecha.localeCompare(a.fecha));
    const {data,error}=await sb.from("consultas").select("*").order("fecha",{ascending:false}).limit(500); if(error) throw error; return data;
  },
  async guardarConsulta(q){
    if(!CLOUD){ const l=Demo.get("consultas",[]); if(q.id){ const i=l.findIndex(x=>x.id===q.id); l[i]={...l[i],...q}; q=l[i]; } else { q={...q,id:uid(),fecha:new Date().toISOString()}; l.push(q);} Demo.set("consultas",l); return q; }
    if(q.id){ const {id,owner,fecha,...rest}=q; const {data,error}=await sb.from("consultas").update(rest).eq("id",id).select().single(); if(error) throw error; return data; }
    const {data,error}=await sb.from("consultas").insert(q).select().single(); if(error) throw error; return data;
  },
  async borrarConsulta(id){
    if(!CLOUD){ Demo.set("consultas",Demo.get("consultas",[]).filter(x=>x.id!==id)); return; }
    const {error}=await sb.from("consultas").delete().eq("id",id); if(error) throw error;
  }
};
const S = { sys:"dilo", t1:5, t2:6, pol:"ire", tipo:null, R:[1,1,1,1], L:[1,1,1,1], lib:"dilo", ori:null,
            perfil:{}, gente:[], consultas:[], view:"inicio" };
async function recargar(){
  try{
    const [p,g,c]=await Promise.all([Store.perfil(),Store.consultados(),Store.consultas()]);
    S.perfil=p; S.gente=g; S.consultas=c;
  }catch(e){ toast("No se pudieron cargar tus datos: "+(e.message||e)); }
  pintarTodo();
}
const nombreDe = id => (S.gente.find(g=>g.id===id)||{}).nombre || "Sin nombre";

/* ===================== IFÁ / DILOGGÚN: utilidades ===================== */
const findMeji = m => M.find(x=>x.marcas.join()===m.join());
function ifaOrden(a,b){ if(a===b) return a; return 16+(a-1)*15+(b<a?b:b-1); }
function ifaNombre(a,b){
  if(a===b) return mj(a).nombre;
  if(a===16&&b===8) return "Ofun Kana";
  return (window.IFA_APODOS[a+"-"+b]) || (mj(a).corto+" "+window.IFA_SEGUNDO[b]);
}
function marksSVG(r,l,size){
  const w=size||18, rows=[0,1,2,3];
  const col=(m,x)=>rows.map(i=>m[i]===1?`<rect x="${x+3}" y="${i*6}" width="2" height="4" rx="1"/>`:`<rect x="${x}" y="${i*6}" width="2" height="4" rx="1"/><rect x="${x+6}" y="${i*6}" width="2" height="4" rx="1"/>`).join("");
  return `<svg width="${w}" height="${w*1.25}" viewBox="0 0 20 23" fill="currentColor" aria-hidden="true">${col(l,0)}${col(r,12)}</svg>`;
}
const diloNombre = (a,b) => a===b ? dl(a).nombre+" Meyi" : dl(a).nombre+" tonti "+dl(b).nombre;
const signoDe = (sis,a,b) => sis==="dilo" ? diloNombre(a,b) : ifaNombre(a,b);
const tipoTxt = () => { const l=S.pol==="ire"?IRE_TIPOS:OSOGBO_TIPOS; const t=l.find(x=>x.id===S.tipo); return t?t.nombre+" ("+t.desc.toLowerCase()+")":""; };

/* ===================== LECTURAS ===================== */
const sec=(t,h)=>`<div class="card"><h3>${t}</h3>${h}</div>`;
const ul=a=>a&&a.length?`<ul class="l">${a.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:`<div class="note">Sin datos registrados.</div>`;
const chipsOri=a=>`<div class="chips">${a.map(o=>`<span class="chip ori">${esc(o)}</span>`).join("")}</div>`;
const patakiHTML=p=>`<div class="pataki"><div class="t">${esc(p.titulo)}</div><div>${esc(p.texto)}</div>${p.ensenanza?`<div class="e">Enseñanza: ${esc(p.ensenanza)}</div>`:""}</div>`;
const refranesHTML=r=>r.length?r.map(x=>`<p class="refran">${esc(x)}</p>`).join(""):`<div class="note">Refrán por documentar: no encontré una fuente confiable.</div>`;

function lecturaDilo(a,b,pol,tipo){
  const A=dl(a),B=dl(b),comp=window.DILOGGUN_COMPUESTOS[a+"-"+b],meyi=a===b;
  const refr=(comp?[comp.refran]:[]).concat(A.refranes.slice(0,2)).concat(meyi?[]:B.refranes.slice(0,1));
  const big=a>=13||b>=13;
  return `<div class="result">
   <div class="hero"><div class="badge">${a}-${b}</div><div><div class="nm">${esc(diloNombre(a,b))}</div>
   <div class="meta">Equivale en Ifá a ${esc(ifaNombre(A.ifa,B.ifa))} (Odu ${ifaOrden(A.ifa,B.ifa)})</div>
   <span class="pill ${pol==="ire"?"ire":"oso"}">${pol==="ire"?"Iré":"Osogbo"}${tipo?" · "+esc(tipo):""}</span></div></div>
   ${big?`<div class="warn">Este signo lleva ${a>=13&&b>=13?"dos letras":"una letra"} del 13 al 16. En muchas casas el santero remite al consultado al babalawo.</div>`:""}
   ${sec("Refranes",refranesHTML(refr))}
   ${sec("Qué dice",`<p style="margin:0 0 8px">${esc(A.resumen)}</p>${!meyi?`<p style="margin:0 0 8px"><b>${esc(B.nombre)}</b> acompaña: ${esc(B.resumen)}</p>`:""}${comp?`<p style="margin:0">${esc(comp.nota)}</p>`:""}`)}
   ${sec(pol==="ire"?"En iré":"En osogbo",`<p style="margin:0">${esc(pol==="ire"?A.ire:A.osogbo)}</p>${!meyi?`<p class="note" style="margin:8px 0 0">${esc(B.nombre)} en ${pol==="ire"?"iré":"osogbo"}: ${esc(pol==="ire"?B.ire:B.osogbo)}</p>`:""}`)}
   ${sec("Orishas que hablan",chipsOri(uniq(A.orishas.concat(B.orishas))))}
   ${sec("Consejos y recomendaciones",ul(A.consejos.concat(meyi?[]:B.consejos.slice(0,2))))}
   ${sec("Prohibiciones",ul(uniq(A.prohibiciones.concat(meyi?[]:B.prohibiciones.slice(0,2)))))}
   ${sec("Ebbó que señala la tradición",ul(A.ebbo.concat(meyi?[]:B.ebbo.slice(0,1)))+`<div class="note" style="margin-top:8px">El ebbó exacto lo marca el oráculo en la consulta.</div>`)}
   ${sec("Patakí",patakiHTML(A.pataki)+(meyi?"":`<details style="margin-top:12px"><summary>Patakí de ${esc(B.nombre)}</summary><div style="margin-top:8px">${patakiHTML(B.pataki)}</div></details>`))}
   ${A.gesto?sec("Al salir la letra",`<p style="margin:0">${esc(A.gesto)}</p>`):""}
   ${sec("Nace en esta letra",ul(A.nace))}
  </div>`;
}
function lecturaIfa(r,l,pol,tipo){
  const A=mj(r),B=mj(l),meji=r===l,nota=window.IFA_NOTAS[r+"-"+l];
  const refr=A.refranes.slice(0,meji?4:2).concat(meji?[]:B.refranes.slice(0,1));
  return `<div class="result">
   <div class="hero"><div class="badge" style="color:var(--cowrie)">${marksSVG(A.marcas,B.marcas,30)}</div><div><div class="nm">${esc(ifaNombre(r,l))}</div>
   <div class="meta">Odu ${ifaOrden(r,l)} de 256 · ${meji?"Meji (Ojú Odu)":"Omoluo"} · Diloggún ${A.dilo}-${B.dilo}</div>
   <span class="pill ${pol==="ire"?"ire":"oso"}">${pol==="ire"?"Iré":"Osogbo"}${tipo?" · "+esc(tipo):""}</span></div></div>
   ${sec("Refranes",refranesHTML(refr))}
   ${nota?sec("Lo propio de este Odu",`<p style="margin:0">${esc(nota)}</p>`):""}
   ${meji?sec("Qué dice",`<p style="margin:0">${esc(A.resumen)}</p>`):sec("Las dos piernas",`<div class="two"><div class="leg"><b>${esc(A.corto)}</b>Pierna derecha, la que manda. ${esc(A.resumen)}</div><div class="leg"><b>${esc(B.corto)}</b>Pierna izquierda, la que acompaña. ${esc(B.resumen)}</div></div>`)}
   ${sec("Orishas que se manifiestan",chipsOri(uniq(A.orishas.concat(meji?[]:B.orishas.slice(0,4)))))}
   ${sec("Recomendaciones",ul(A.consejos.concat(meji?[]:B.consejos.slice(0,2))))}
   ${sec("Prohibiciones",ul(A.prohibiciones.concat(meji?[]:B.prohibiciones.slice(0,2))))}
   ${sec("Ebbó que señala la tradición",ul(A.ebbo)+`<div class="note" style="margin-top:8px">El ebbó exacto lo marca el babalawo en el tablero.</div>`)}
   ${sec("Patakí",patakiHTML(A.pataki)+(meji?"":`<details style="margin-top:12px"><summary>Patakí de ${esc(B.nombre)}</summary><div style="margin-top:8px">${patakiHTML(B.pataki)}</div></details>`))}
   ${sec("Nace en este Odu",ul(A.nace))}
  </div>`;
}
const lectura = q => q.sistema==="dilo" ? lecturaDilo(q.pie1,q.pie2,q.orientacion,q.tipo) : lecturaIfa(q.pie1,q.pie2,q.orientacion,q.tipo);

/* ===================== FORMULARIO DE CONSULTA ===================== */
function grid(el,key){
  el.innerHTML=D.map(x=>`<button type="button" class="num" data-n="${x.n}" aria-pressed="${S[key]===x.n}"><span class="d">${x.n}</span><span class="t">${esc(x.nombre)}</span></button>`).join("");
  el.onclick=e=>{const b=e.target.closest(".num"); if(!b) return; S[key]=+b.dataset.n; [...el.children].forEach(c=>c.setAttribute("aria-pressed",c===b)); upLbl();};
}
function upLbl(){ $("#lbl1").textContent=dl(S.t1).nombre; $("#lbl2").textContent=dl(S.t2).nombre; }
function tipos(){
  const list=S.pol==="ire"?IRE_TIPOS:OSOGBO_TIPOS, cls=S.pol==="ire"?"ire":"oso";
  $("#tipos").innerHTML=list.map(t=>`<button type="button" class="chip ${cls}" data-id="${t.id}" aria-pressed="${S.tipo===t.id}" title="${esc(t.desc)}">${esc(t.nombre)}</button>`).join("");
}
$("#tipos").onclick=e=>{const b=e.target.closest(".chip"); if(!b) return; S.tipo=S.tipo===b.dataset.id?null:b.dataset.id; tipos();};
function setPol(p){S.pol=p;S.tipo=null;$("#pol-ire").setAttribute("aria-pressed",p==="ire");$("#pol-oso").setAttribute("aria-pressed",p==="osogbo");tipos();}
$("#pol-ire").onclick=()=>setPol("ire"); $("#pol-oso").onclick=()=>setPol("osogbo");
function setSys(s){S.sys=s;$("#sys-dilo").setAttribute("aria-pressed",s==="dilo");$("#sys-ifa").setAttribute("aria-pressed",s==="ifa");
  $("#form-dilo").hidden=s!=="dilo";$("#form-ifa").hidden=s!=="ifa";$("#out").innerHTML="";}
$("#sys-dilo").onclick=()=>setSys("dilo"); $("#sys-ifa").onclick=()=>setSys("ifa");
function legs(){
  const draw=(id,arr,side)=>{ $(id).innerHTML=arr.map((m,i)=>`<button type="button" class="mark" data-side="${side}" data-i="${i}" aria-label="Marca ${i+1} ${m===1?'simple':'doble'}">${m===1?'<i></i>':'<i></i><i></i>'}</button>`).join(""); };
  draw("#legR",S.R,"R"); draw("#legL",S.L,"L");
  const r=findMeji(S.R).n,l=findMeji(S.L).n;
  $("#ifaLive").textContent=ifaNombre(r,l)+" · Odu "+ifaOrden(r,l);
  $("#selR").value=r; $("#selL").value=l;
}
document.addEventListener("click",e=>{const b=e.target.closest(".mark"); if(!b) return; const a=S[b.dataset.side]; a[+b.dataset.i]=a[+b.dataset.i]===1?2:1; legs();});
const opts=M.map(x=>`<option value="${x.n}">${x.n}. ${esc(x.nombre)}</option>`).join("");
$("#selR").innerHTML=opts; $("#selL").innerHTML=opts;
$("#selR").onchange=e=>{S.R=[...mj(+e.target.value).marcas];legs();};
$("#selL").onchange=e=>{S.L=[...mj(+e.target.value).marcas];legs();};

function pintarQuien(sel){
  $("#c-quien").innerHTML=`<option value="">— Sin asignar —</option>`+S.gente.map(g=>`<option value="${g.id}">${esc(g.nombre)}${g.nombre_santo?" · "+esc(g.nombre_santo):""}</option>`).join("")+`<option value="__nuevo">+ Agregar persona nueva…</option>`;
  if(sel!==undefined) $("#c-quien").value=sel;
}
$("#c-quien").onchange=e=>{ if(e.target.value==="__nuevo"){ e.target.value=""; formConsultado(null, c=>{ pintarQuien(c.id); }); } };

function formGuardar(){
  return `<form class="card stack" id="guardarForm">
    <h3 style="margin:0">Registrar la consulta</h3>
    <label class="f">Ebbó marcado<textarea id="g-ebbo" placeholder="Lo que marcó el oráculo"></textarea></label>
    <label class="f">Notas<textarea id="g-notas" placeholder="Orisha que habló, detalles, recomendaciones"></textarea></label>
    <label class="f">Volver a consultar el<input type="date" id="g-volver"></label>
    <button class="btn" type="submit">Guardar consulta</button>
  </form>`;
}
$("#ver").onclick=()=>{
  let a,b; if(S.sys==="dilo"){a=S.t1;b=S.t2;} else {a=findMeji(S.R).n;b=findMeji(S.L).n;}
  const q={sistema:S.sys,pie1:a,pie2:b,signo:signoDe(S.sys,a,b),orientacion:S.pol,tipo:tipoTxt()};
  $("#out").innerHTML=lectura(q)+formGuardar();
  $("#guardarForm").onsubmit=async ev=>{
    ev.preventDefault(); const btn=ev.target.querySelector("button"); btn.disabled=true;
    const cid=$("#c-quien").value||null;
    const nuevo={...q,consultado_id:cid,pregunta:$("#c-pregunta").value.trim()||null,ebbo:$("#g-ebbo").value.trim()||null,notas:$("#g-notas").value.trim()||null,volver_el:$("#g-volver").value||null,ebbo_hecho:false};
    try{ await Store.guardarConsulta(nuevo); toast("Consulta guardada"); $("#out").innerHTML=""; $("#c-pregunta").value=""; await recargar(); go("inicio"); }
    catch(e){ toast("No se pudo guardar: "+(e.message||e)); btn.disabled=false; }
  };
  $("#out").scrollIntoView({behavior:"smooth",block:"start"});
};

/* ===================== INICIO ===================== */
function itemConsulta(q){
  const sw=q.orientacion==="ire"?"var(--ire)":"var(--osogbo)";
  const n=q.sistema==="dilo"?q.pie1+"-"+q.pie2:marksSVG(mj(q.pie1).marcas,mj(q.pie2).marcas,15);
  return `<button class="item" data-q="${q.id}"><span class="sw" style="background:${sw}"></span><span class="n">${n}</span><span class="x"><b>${esc(q.signo)}</b><span>${esc(q.consultado_id?nombreDe(q.consultado_id):"Sin asignar")}${q.pregunta?" · "+esc(q.pregunta):""}</span></span><span class="r">${fmtFecha(q.fecha)}</span></button>`;
}
function pintarInicio(){
  const p=S.perfil||{}, hoy=hoyISO();
  const n=p.nombre_santo||p.nombre||"";
  $("#saludo").textContent=n?`Aché, ${n}`:"Aché";
  const ini=new Date(); ini.setDate(1); ini.setHours(0,0,0,0);
  const pend=S.consultas.filter(q=>q.ebbo&&!q.ebbo_hecho);
  const citas=S.consultas.filter(q=>q.volver_el&&q.volver_el>=hoy).sort((a,b)=>a.volver_el.localeCompare(b.volver_el));
  $("#t-mes").textContent=S.consultas.filter(q=>new Date(q.fecha)>=ini).length;
  $("#t-cons").textContent=S.gente.length;
  $("#t-ebbo").textContent=pend.length; $("#t-ebbo-w").classList.toggle("alert",pend.length>0);
  $("#l-ebbo").innerHTML=pend.length?pend.slice(0,8).map(q=>`<div class="item"><label class="check" style="flex:1;min-width:0"><input type="checkbox" data-hecho="${q.id}"><span style="min-width:0"><b style="display:block">${esc(q.consultado_id?nombreDe(q.consultado_id):"Sin asignar")}</b><span class="note" style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(q.ebbo)}</span></span></label><button class="link" data-q="${q.id}">Ver</button></div>`).join(""):`<div class="empty">No hay ebbó pendientes.</div>`;
  $("#l-citas").innerHTML=citas.length?citas.slice(0,6).map(q=>`<button class="item" data-q="${q.id}"><span class="n" style="font-size:13px;line-height:1.05;text-align:center">${new Date(q.volver_el+"T12:00:00").toLocaleDateString("es",{day:"numeric"})}<br>${new Date(q.volver_el+"T12:00:00").toLocaleDateString("es",{month:"short"})}</span><span class="x"><b>${esc(q.consultado_id?nombreDe(q.consultado_id):"Sin asignar")}</b><span>Volver a consultar · ${esc(q.signo)}</span></span></button>`).join(""):`<div class="empty">No hay citas próximas.</div>`;
  $("#l-recientes").innerHTML=S.consultas.length?S.consultas.slice(0,6).map(itemConsulta).join(""):`<div class="empty">Aún no hay consultas. Toca «Nueva consulta» para empezar.</div>`;
}
document.addEventListener("change",async e=>{
  const c=e.target.closest("[data-hecho]"); if(!c) return;
  try{ await Store.guardarConsulta({id:c.dataset.hecho,ebbo_hecho:true}); toast("Ebbó marcado como hecho"); await recargar(); }
  catch(err){ toast("No se pudo actualizar: "+(err.message||err)); c.checked=false; }
});

/* ===================== FICHA DE CONSULTA ===================== */
function abrirConsulta(id){
  const q=S.consultas.find(x=>x.id===id); if(!q) return;
  openSheet(`${lectura(q)}
   <form class="card stack" id="editQ" style="margin-top:12px">
    <h3 style="margin:0">Registro</h3>
    <div class="note">${fmtFecha(q.fecha)} · ${esc(q.consultado_id?nombreDe(q.consultado_id):"Sin asignar")}${q.pregunta?" · "+esc(q.pregunta):""}</div>
    <label class="f">Ebbó marcado<textarea id="e-ebbo">${esc(q.ebbo||"")}</textarea></label>
    <label class="check"><input type="checkbox" id="e-hecho" ${q.ebbo_hecho?"checked":""}> Ebbó hecho</label>
    <label class="f">Notas<textarea id="e-notas">${esc(q.notas||"")}</textarea></label>
    <label class="f">Volver a consultar el<input type="date" id="e-volver" value="${q.volver_el||""}"></label>
    <div class="row"><button class="btn" type="submit">Guardar cambios</button></div>
    <div class="row"><button class="btn ghost" type="button" id="copiarQ">Copiar resumen</button><button class="btn ghost" type="button" id="borrarQ">Borrar</button></div>
   </form>`);
  $("#editQ").onsubmit=async ev=>{ev.preventDefault();
    try{ await Store.guardarConsulta({id:q.id,ebbo:$("#e-ebbo").value.trim()||null,ebbo_hecho:$("#e-hecho").checked,notas:$("#e-notas").value.trim()||null,volver_el:$("#e-volver").value||null}); toast("Cambios guardados"); closeSheet(); await recargar(); }
    catch(e){ toast("No se pudo guardar: "+(e.message||e)); } };
  $("#copiarQ").onclick=async()=>{ const base=q.sistema==="dilo"?dl(q.pie1):mj(q.pie1);
    const t=`${q.signo} (${q.sistema==="dilo"?"Diloggún "+q.pie1+"-"+q.pie2:"Ifá, Odu "+ifaOrden(q.pie1,q.pie2)})\n${q.orientacion==="ire"?"Iré":"Osogbo"}${q.tipo?" · "+q.tipo:""}\nConsultado: ${q.consultado_id?nombreDe(q.consultado_id):"—"}\nRefrán: ${base.refranes[0]||"por documentar"}\nConsejo: ${base.consejos[0]}${q.ebbo?"\nEbbó: "+q.ebbo:""}${q.volver_el?"\nVolver el: "+fmtFecha(q.volver_el):""}`;
    try{ await navigator.clipboard.writeText(t); toast("Resumen copiado"); }catch(e){ toast("No se pudo copiar en este navegador"); } };
  confirmar("#borrarQ","¿Borrar esta consulta? Toca otra vez para confirmar.",async()=>{ await Store.borrarConsulta(q.id); toast("Consulta borrada"); closeSheet(); await recargar(); });
}
function confirmar(sel,msg,fn){ const b=$(sel); let armed=false; b.onclick=async()=>{ if(!armed){ armed=true; b.textContent="Confirmar borrado"; b.style.borderColor="var(--osogbo)"; b.style.color="var(--osogbo)"; toast(msg); return; } try{ await fn(); }catch(e){ toast("No se pudo borrar: "+(e.message||e)); } }; }

/* ===================== CONSULTADOS ===================== */
const norm=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
function pintarGente(){
  const q=norm($("#qg").value.trim());
  const l=S.gente.filter(g=>!q||norm(g.nombre+" "+(g.nombre_santo||"")).includes(q));
  $("#l-gente").innerHTML=l.length?l.map(g=>{
    const n=S.consultas.filter(c=>c.consultado_id===g.id); const ult=n[0];
    return `<button class="item" data-g="${g.id}"><span class="n">${esc((g.nombre||"?").trim()[0].toUpperCase())}</span><span class="x"><b>${esc(g.nombre)}</b><span>${esc([g.nombre_santo,g.orisha_cabecera,g.relacion].filter(Boolean).join(" · "))}</span></span><span class="r">${n.length} consulta${n.length===1?"":"s"}${ult?"<br>"+fmtFecha(ult.fecha):""}</span></button>`;
  }).join(""):`<div class="empty">${S.gente.length?"Nadie coincide con la búsqueda.":"Todavía no tienes consultados. Toca «+ Agregar»."}</div>`;
}
$("#qg").oninput=pintarGente;
$("#nuevoCons").onclick=()=>formConsultado(null);
function formConsultado(g, despues){
  g=g||{};
  openSheet(`<h2 style="margin-top:0">${g.id?"Editar persona":"Nueva persona"}</h2>
   <form class="stack" id="consForm" style="margin-top:12px">
    <label class="f">Nombre *<input type="text" id="k-nombre" required value="${esc(g.nombre||"")}"></label>
    <label class="f">Nombre de santo<input type="text" id="k-santo" value="${esc(g.nombre_santo||"")}"></label>
    <div class="row">
      <label class="f">Relación<select id="k-rel">${["ahijado","aleyo","familia","otro"].map(r=>`<option value="${r}" ${g.relacion===r?"selected":""}>${r[0].toUpperCase()+r.slice(1)}</option>`).join("")}</select></label>
      <label class="f">Nacimiento<input type="date" id="k-nac" value="${g.fecha_nacimiento||""}"></label>
    </div>
    <div class="row">
      <label class="f">Orisha de cabecera<input type="text" id="k-orisha" value="${esc(g.orisha_cabecera||"")}"></label>
      <label class="f">Teléfono<input type="tel" id="k-tel" value="${esc(g.telefono||"")}"></label>
    </div>
    <label class="f">Signo de Itá o mano de Orula<input type="text" id="k-ita" value="${esc(g.signo_ita||"")}" placeholder="Ej. Oshé tonti Obara (5-6)"></label>
    <label class="f">Notas<textarea id="k-notas">${esc(g.notas||"")}</textarea></label>
    <div id="k-msg"></div>
    <button class="btn" type="submit">${g.id?"Guardar cambios":"Agregar"}</button>
   </form>`);
  $("#consForm").onsubmit=async ev=>{ev.preventDefault();
    const nombre=$("#k-nombre").value.trim(); if(!nombre){ $("#k-msg").innerHTML=`<div class="err">Escribe el nombre de la persona.</div>`; return; }
    const c={nombre,nombre_santo:$("#k-santo").value.trim()||null,relacion:$("#k-rel").value,fecha_nacimiento:$("#k-nac").value||null,orisha_cabecera:$("#k-orisha").value.trim()||null,telefono:$("#k-tel").value.trim()||null,signo_ita:$("#k-ita").value.trim()||null,notas:$("#k-notas").value.trim()||null};
    if(g.id) c.id=g.id;
    try{ const saved=await Store.guardarConsultado(c); toast(g.id?"Cambios guardados":"Persona agregada"); closeSheet(); await recargar(); if(despues) despues(saved); }
    catch(e){ $("#k-msg").innerHTML=`<div class="err">No se pudo guardar: ${esc(e.message||e)}</div>`; } };
}
function abrirPersona(id){
  const g=S.gente.find(x=>x.id===id); if(!g) return;
  const qs=S.consultas.filter(c=>c.consultado_id===id);
  const pend=qs.filter(q=>q.ebbo&&!q.ebbo_hecho).length;
  openSheet(`<div class="hero"><div class="badge">${esc(g.nombre.trim()[0].toUpperCase())}</div><div><div class="nm">${esc(g.nombre)}</div><div class="meta">${esc([g.nombre_santo,g.orisha_cabecera,g.relacion].filter(Boolean).join(" · "))}</div>${pend?`<span class="pill gold" style="margin-top:6px">${pend} ebbó pendiente${pend>1?"s":""}</span>`:""}</div></div>
   <div class="card" style="margin-top:12px"><h3>Datos</h3><ul class="l" style="list-style:none;padding:0">
     ${g.signo_ita?`<li><b>Itá / mano de Orula:</b> ${esc(g.signo_ita)}</li>`:""}
     ${g.fecha_nacimiento?`<li><b>Nacimiento:</b> ${fmtFecha(g.fecha_nacimiento)}</li>`:""}
     ${g.telefono?`<li><b>Teléfono:</b> ${esc(g.telefono)}</li>`:""}
     ${g.notas?`<li><b>Notas:</b> ${esc(g.notas)}</li>`:""}
     ${!(g.signo_ita||g.fecha_nacimiento||g.telefono||g.notas)?`<li class="note">Sin datos adicionales.</li>`:""}
   </ul></div>
   <div class="row" style="margin-top:12px"><button class="btn" id="consultarP">Nueva consulta</button></div>
   <div class="card" style="margin-top:12px"><h3>Historial · ${qs.length}</h3><div class="list">${qs.length?qs.map(itemConsulta).join(""):`<div class="empty">Sin consultas todavía.</div>`}</div></div>
   <div class="row" style="margin-top:12px"><button class="btn ghost" id="editP">Editar datos</button><button class="btn ghost" id="borrarP">Borrar persona</button></div>`);
  $("#consultarP").onclick=()=>{ closeSheet(); go("consulta"); pintarQuien(id); };
  $("#editP").onclick=()=>formConsultado(g);
  confirmar("#borrarP","Se borra la persona; sus consultas quedan sin asignar. Toca otra vez para confirmar.",async()=>{ await Store.borrarConsultado(id); toast("Persona borrada"); closeSheet(); await recargar(); });
}

/* ===================== BIBLIOTECA ===================== */
const TOP_ORI=["Elegguá","Oggún","Oshosi","Obbatalá","Yemayá","Oshún","Shangó","Oyá","Orunmila","Babalú Ayé","Olokun","Eggun"];
function renderOri(){ $("#orifilter").innerHTML=TOP_ORI.map(o=>`<button class="chip" data-o="${esc(o)}" aria-pressed="${S.ori===o}">${esc(o)}</button>`).join(""); }
$("#orifilter").onclick=e=>{const b=e.target.closest(".chip"); if(!b) return; S.ori=S.ori===b.dataset.o?null:b.dataset.o; renderOri(); renderLib();};
function match(x,q){ if(S.ori&&!x.orishas.some(o=>norm(o).includes(norm(S.ori)))) return false; if(!q) return true;
  return norm([x.nombre,(x.alias||[]).join(" "),x.refranes.join(" "),x.orishas.join(" "),x.resumen].join(" ")).includes(norm(q)); }
function renderLib(){
  const q=$("#q").value.trim();
  if(S.lib==="dilo"){
    const r=D.filter(x=>match(x,q));
    $("#lib").innerHTML=r.length?r.map(x=>`<button class="item" data-d="${x.n}"><span class="sw" style="background:${x.color}"></span><span class="n">${x.n}</span><span class="x"><b>${esc(x.nombre)}</b><span>${esc(x.refranes[0]||"Refrán por documentar")}</span><span>${esc(x.orishas.slice(0,4).join(", "))}</span></span></button>`).join(""):`<div class="empty">Ningún signo coincide. Pruebe con otra palabra.</div>`;
    $("#omoluos").innerHTML="";
  } else {
    const r=M.filter(x=>match(x,q));
    $("#lib").innerHTML=r.length?r.map(x=>`<button class="item" data-m="${x.n}"><span class="n">${marksSVG(x.marcas,x.marcas,18)}</span><span class="x"><b>${x.n}. ${esc(x.nombre)}</b><span>${esc(x.refranes[0])}</span><span>Diloggún ${x.dilo}-${x.dilo} · ${esc(x.orishas.slice(0,3).join(", "))}</span></span></button>`).join(""):`<div class="empty">Ningún Odu coincide. Pruebe con otra palabra.</div>`;
    $("#omoluos").innerHTML=`<div class="card"><h3>Los 240 Omoluos</h3><div class="note" style="margin-bottom:10px">Elija la familia (pierna derecha) para ver sus 15 Omoluos.</div><div class="matrix">${M.map(x=>`<button data-fam="${x.n}"><b>${esc(x.corto)}</b>${x.n}</button>`).join("")}</div><div id="fam" style="margin-top:12px"></div></div>`;
  }
}
$("#q").oninput=renderLib;
function setLib(l){S.lib=l;$("#lib-dilo").setAttribute("aria-pressed",l==="dilo");$("#lib-ifa").setAttribute("aria-pressed",l==="ifa");renderLib();}
$("#lib-dilo").onclick=()=>setLib("dilo"); $("#lib-ifa").onclick=()=>setLib("ifa");
function fichaDilo(x){
  return `<div class="result"><div class="hero"><div class="badge">${x.n}</div><div><div class="nm">${esc(x.nombre)}</div><div class="meta">${esc((x.alias||[]).join(" · "))} · Padrino en Ifá: ${esc(mj(x.ifa).nombre)}</div></div></div>
  ${sec("Refranes",refranesHTML(x.refranes))}
  ${sec("Qué dice",`<p style="margin:0">${esc(x.resumen)}</p>`)}
  ${sec("Iré y osogbo",`<p style="margin:0 0 8px"><span class="pill ire">Iré</span><br>${esc(x.ire)}</p><p style="margin:0"><span class="pill oso">Osogbo</span><br>${esc(x.osogbo)}</p>`)}
  ${sec("Orishas que hablan",chipsOri(x.orishas))}
  ${sec("Nace",ul(x.nace))}
  ${sec("Consejos",ul(x.consejos))}
  ${sec("Prohibiciones",ul(x.prohibiciones))}
  ${sec("Ebbó",ul(x.ebbo))}
  ${sec("Patakí",patakiHTML(x.pataki))}
  ${x.gesto?sec("Al salir la letra",`<p style="margin:0">${esc(x.gesto)}</p>`):""}
  ${sec("Sus 16 compuestos",`<div class="matrix">${D.map(y=>`<button data-dc="${x.n}-${y.n}"><b>${x.n}-${y.n}</b>${esc(y.nombre)}</button>`).join("")}</div>`)}
  </div>`;
}

/* ===================== PERFIL ===================== */
function pintarPerfil(){
  const p=S.perfil||{};
  $("#p-nombre").value=p.nombre||""; $("#p-santo").value=p.nombre_santo||""; $("#p-tipo").value=p.tipo||"olorisha";
  $("#p-orisha").value=p.orisha_cabecera||""; $("#p-casa").value=p.casa||""; $("#p-padrino").value=p.padrino||"";
  $("#p-tel").value=p.telefono||""; $("#p-pais").value=p.pais||"";
  $("#p-titulo").textContent=p.nombre_santo||p.nombre||"Mi perfil";
  $("#p-avatar").textContent=((p.nombre_santo||p.nombre||"O").trim()[0]||"O").toUpperCase();
  $("#p-email").textContent=CLOUD?(Store.user&&Store.user.email||""):"Modo demo · datos solo en este dispositivo";
  $("#p-plan").textContent=(p.plan==="pro")?"Pro":"Gratis";
  $("#salir").textContent=CLOUD?"Cerrar sesión":"Borrar datos demo";
}
$("#perfilForm").onsubmit=async ev=>{ev.preventDefault();
  const p={nombre:$("#p-nombre").value.trim()||null,nombre_santo:$("#p-santo").value.trim()||null,tipo:$("#p-tipo").value,orisha_cabecera:$("#p-orisha").value.trim()||null,casa:$("#p-casa").value.trim()||null,padrino:$("#p-padrino").value.trim()||null,telefono:$("#p-tel").value.trim()||null,pais:$("#p-pais").value.trim()||null};
  try{ await Store.guardarPerfil(p); toast("Perfil guardado"); await recargar(); }catch(e){ toast("No se pudo guardar: "+(e.message||e)); } };
$("#exportar").onclick=async()=>{ const t=JSON.stringify({perfil:S.perfil,consultados:S.gente,consultas:S.consultas},null,2);
  try{ await navigator.clipboard.writeText(t); toast("Tus datos se copiaron. Pégalos en un documento para guardarlos."); }catch(e){ toast("No se pudo copiar en este navegador"); } };
$("#salir").onclick=async()=>{
  if(!CLOUD){ try{["seeded","perfil","consultados","consultas"].forEach(k=>localStorage.removeItem(Demo.k(k)));}catch(e){} Demo.seed(); toast("Datos demo reiniciados"); await recargar(); return; }
  await Store.signOut(); mostrarAuth();
};
$("#equiv").innerHTML=D.map(x=>`<div class="between" style="font-size:14px;border-bottom:1px solid var(--line);padding:6px 0"><span><b>${x.n}</b> ${esc(x.nombre)}</span><span class="note">${esc(mj(x.ifa).nombre)}</span></div>`).join("");

/* ===================== NAVEGACIÓN Y HOJAS ===================== */
function openSheet(h){$("#sheetBody").innerHTML=h;$("#sheet").classList.add("on");$("#sheet .body").scrollTop=0;}
function closeSheet(){$("#sheet").classList.remove("on");}
$("#closeSheet").onclick=closeSheet; $("#sheet").onclick=e=>{if(e.target.id==="sheet")closeSheet();};
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeSheet();});
const VIEWS=["inicio","consulta","gente","signos","perfil"];
function go(v){ if(!VIEWS.includes(v)) v="inicio"; S.view=v;
  VIEWS.forEach(x=>$("#v-"+x).classList.toggle("on",x===v));
  document.querySelectorAll("nav.tabs button").forEach(t=>{ if(t.dataset.v===v) t.setAttribute("aria-current","page"); else t.removeAttribute("aria-current"); });
  if(location.hash.slice(1)!==v) history.replaceState(null,"","#"+v);
  window.scrollTo(0,0); }
document.querySelector("nav.tabs").onclick=e=>{const t=e.target.closest("button"); if(t) go(t.dataset.v);};
window.addEventListener("hashchange",()=>go(location.hash.slice(1)));
document.addEventListener("click",e=>{
  const goB=e.target.closest("[data-go]"); if(goB){ go(goB.dataset.go); return; }
  const q=e.target.closest("[data-q]"); if(q){ abrirConsulta(q.dataset.q); return; }
  const g=e.target.closest("[data-g]"); if(g){ abrirPersona(g.dataset.g); return; }
  const d=e.target.closest("[data-d]"); if(d){ openSheet(fichaDilo(dl(+d.dataset.d))); return; }
  const m=e.target.closest("[data-m]"); if(m){ openSheet(lecturaIfa(+m.dataset.m,+m.dataset.m,"ire","")); return; }
  const f=e.target.closest("[data-fam]"); if(f){ const a=+f.dataset.fam; $("#fam").innerHTML=`<div class="list">${M.filter(x=>x.n!==a).map(x=>`<button class="item" data-om="${a}-${x.n}"><span class="n">${marksSVG(mj(a).marcas,x.marcas,16)}</span><span class="x"><b>${esc(ifaNombre(a,x.n))}</b><span>Odu ${ifaOrden(a,x.n)} · Diloggún ${mj(a).dilo}-${x.dilo}</span></span></button>`).join("")}</div>`; return; }
  const o=e.target.closest("[data-om]"); if(o){ const [a,b]=o.dataset.om.split("-").map(Number); openSheet(lecturaIfa(a,b,"ire","")); return; }
  const c=e.target.closest("[data-dc]"); if(c){ const [a,b]=c.dataset.dc.split("-").map(Number); openSheet(lecturaDilo(a,b,"ire","")); return; }
});
function pintarTodo(){ pintarInicio(); pintarGente(); pintarPerfil(); const sel=$("#c-quien").value; pintarQuien(sel&&sel!=="__nuevo"?sel:""); }

/* ===================== ACCESO ===================== */
let modoReg=false;
function setAuthMode(reg){ modoReg=reg; $("#a-login").setAttribute("aria-pressed",!reg); $("#a-reg").setAttribute("aria-pressed",reg);
  $("#a-nombre-w").hidden=!reg; $("#a-go").textContent=reg?"Crear cuenta":"Entrar"; $("#a-forgot").hidden=reg; $("#a-pass").autocomplete=reg?"new-password":"current-password"; $("#a-msg").innerHTML=""; }
$("#a-login").onclick=()=>setAuthMode(false); $("#a-reg").onclick=()=>setAuthMode(true);
const authErr=e=>{ const m=(e&&e.message)||String(e);
  if(/Invalid login/i.test(m)) return "Correo o contraseña incorrectos.";
  if(/Email not confirmed/i.test(m)) return "Todavía no confirmas tu correo. Revisa tu bandeja de entrada (y spam).";
  if(/already registered|already exists/i.test(m)) return "Ese correo ya tiene cuenta. Toca «Entrar».";
  if(/Password should be/i.test(m)) return "La contraseña debe tener al menos 6 caracteres.";
  return m; };
$("#authForm").onsubmit=async ev=>{ev.preventDefault();
  const email=$("#a-email").value.trim(), pass=$("#a-pass").value, btn=$("#a-go");
  if(!email||pass.length<6){ $("#a-msg").innerHTML=`<div class="err">Escribe tu correo y una contraseña de al menos 6 caracteres.</div>`; return; }
  btn.disabled=true;
  try{
    if(modoReg){ const dentro=await Store.signUp(email,pass,$("#a-nombre").value.trim());
      if(!dentro){ $("#a-msg").innerHTML=`<div class="warn">Te enviamos un correo a <b>${esc(email)}</b>. Ábrelo y toca el enlace para activar tu cuenta; luego vuelve aquí y toca «Entrar».</div>`; setAuthMode(false); $("#a-email").value=email; btn.disabled=false; return; } }
    else await Store.signIn(email,pass);
    await entrar();
  }catch(e){ $("#a-msg").innerHTML=`<div class="err">${esc(authErr(e))}</div>`; }
  btn.disabled=false;
};
$("#a-forgot").onclick=async()=>{ const email=$("#a-email").value.trim(); if(!email){ $("#a-msg").innerHTML=`<div class="err">Escribe tu correo arriba y vuelve a tocar «Olvidé mi contraseña».</div>`; return; }
  try{ await Store.reset(email); $("#a-msg").innerHTML=`<div class="warn">Te enviamos un enlace a <b>${esc(email)}</b> para crear una contraseña nueva.</div>`; }catch(e){ $("#a-msg").innerHTML=`<div class="err">${esc(authErr(e))}</div>`; } };
function mostrarAuth(){ $("#auth").hidden=false; $("#app").hidden=true; $("#tabs").hidden=true; closeSheet(); }
async function entrar(){ $("#auth").hidden=true; $("#app").hidden=false; $("#tabs").hidden=false; $("#demoBadge").hidden=CLOUD;
  await recargar(); go(location.hash.slice(1)||"inicio"); }

/* Recuperación de contraseña: Supabase devuelve al usuario con una sesión de tipo "recovery" */
if(CLOUD){ sb.auth.onAuthStateChange(async(ev,session)=>{
  if(ev==="PASSWORD_RECOVERY"){ openSheet(`<h2 style="margin-top:0">Nueva contraseña</h2><form class="stack" id="newPass" style="margin-top:12px"><label class="f">Contraseña nueva<input type="password" id="np" minlength="6" autocomplete="new-password"></label><div id="np-msg"></div><button class="btn" type="submit">Guardar contraseña</button></form>`);
    $("#newPass").onsubmit=async e=>{e.preventDefault(); const {error}=await sb.auth.updateUser({password:$("#np").value}); if(error){ $("#np-msg").innerHTML=`<div class="err">${esc(authErr(error))}</div>`; return; } toast("Contraseña actualizada"); closeSheet(); }; }
  if(ev==="SIGNED_OUT"){ mostrarAuth(); }
}); }

/* ===================== ARRANQUE ===================== */
grid($("#g1"),"t1"); grid($("#g2"),"t2"); upLbl(); tipos(); legs(); renderOri(); renderLib();
(async()=>{ const ok=await Store.init(); if(ok) await entrar(); else mostrarAuth(); })();
