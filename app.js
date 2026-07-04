/* 나선형 성취기준 지도 · 엔진
   window.CURRICULUM(data.js)을 읽어 화면을 렌더링합니다.
   내용을 바꾸려면 data.js만 수정하세요. */
(function(){
  const C = window.CURRICULUM;
  if(!C){ document.getElementById("stage").innerHTML = "<p style='padding:24px'>data.js를 불러오지 못했습니다. 파일이 index.html과 같은 폴더에 있는지 확인하세요.</p>"; return; }

  const STANDARDS = C.standards, CHAINS = C.chains, SUBJECTS = C.subjects;
  const BANDS = ["1-2","3-4","5-6"];
  const BAND_LABEL = {"1-2":"1~2학년군","3-4":"3~4학년군","5-6":"5~6학년군"};

  const bandIndex = b => BANDS.indexOf(b);
  function areasOf(subject){const set=[];for(const c in STANDARDS){if(STANDARDS[c].subject===subject&&!set.includes(STANDARDS[c].area))set.push(STANDARDS[c].area);}return set;}
  function standardsIn(subject,area){return Object.keys(STANDARDS).filter(c=>STANDARDS[c].subject===subject&&STANDARDS[c].area===area);}
  function chainOf(code){for(const ch of CHAINS){if(ch.spine.includes(code))return ch;}return null;}
  function inAnyChain(code){return !!chainOf(code);}
  const STRANDS = C.strands || {};
  function strandOf(code){return STRANDS[code]||null;}
  function relatedRefs(code){
    const st=strandOf(code); if(!st) return [];
    const self=STANDARDS[code];
    const all=Object.keys(STANDARDS).filter(c=>c!==code&&strandOf(c)===st&&STANDARDS[c].subject===self.subject&&STANDARDS[c].area===self.area);
    const byBand=(a,b)=>(bandIndex(STANDARDS[a].band)-bandIndex(STANDARDS[b].band))||(a<b?-1:1);
    const diff=all.filter(c=>STANDARDS[c].band!==self.band).sort(byBand);
    const same=all.filter(c=>STANDARDS[c].band===self.band).sort(byBand);
    return diff.concat(same).slice(0,5).sort(byBand);
  }
  function explicitRefsOf(code){
    const out=new Set((C.refs&&C.refs[code])||[]);
    if(C.refs){for(const k in C.refs){ if((C.refs[k]||[]).includes(code)) out.add(k); }}
    out.delete(code);
    return [...out];
  }
  function escapeHtml(x){return x.replace(/[&<>]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[m]));}
  function strip(html){return html.replace(/<[^>]+>/g,"");}
  function highlight(code){const s=STANDARDS[code];let html=escapeHtml(s.text);(s.kw||[]).forEach(([term,type])=>{html=html.replace(term,`<span class="kw ${type}">${term}</span>`);});return html;}

  const firstReady = SUBJECTS.find(s=>s.ready) || SUBJECTS[0];
  const state = { subject: firstReady.name, area: null, selected: null };
  state.area = areasOf(state.subject)[0] || null;
  state.selected = state.area ? (standardsIn(state.subject,state.area)[0] || null) : null;

  function renderBadge(){
    const b=document.getElementById("badge");
    const m=C.meta||{}; const txt=[m.curriculum,m.status].filter(Boolean).join(" · ");
    b.innerHTML = `<span class="dot"></span>${txt||""}`;
    if(!txt) b.style.display="none";
  }
  function renderTabs(){
    const el=document.getElementById("tabs");el.innerHTML="";
    SUBJECTS.forEach(sub=>{
      const cnt=Object.keys(STANDARDS).filter(c=>STANDARDS[c].subject===sub.name).length;
      const b=document.createElement("button");b.className="tab";b.setAttribute("role","tab");
      b.setAttribute("aria-selected",String(sub.name===state.subject));
      b.innerHTML=`${sub.name}<span class="cnt">${cnt||"–"}</span>`;
      b.onclick=()=>{state.subject=sub.name;state.area=areasOf(sub.name)[0]||null;
        state.selected=state.area?(standardsIn(sub.name,state.area)[0]||null):null;renderAll();};
      el.appendChild(b);
    });
  }
  function renderAreas(){
    const el=document.getElementById("areachips");el.innerHTML="";
    const areas=areasOf(state.subject);
    if(!areas.length){el.style.display="none";return;}el.style.display="flex";
    areas.forEach(a=>{
      const b=document.createElement("button");b.className="areachip";b.setAttribute("aria-selected",String(a===state.area));b.textContent=a;
      b.onclick=()=>{state.area=a;state.selected=standardsIn(state.subject,a)[0]||null;renderControls();renderStage();renderAreas();};
      el.appendChild(b);
    });
  }
  function renderControls(){
    const sel=document.getElementById("stdSelect");sel.innerHTML="";
    const sub=SUBJECTS.find(s=>s.name===state.subject);
    if(!sub||!sub.ready||!state.area){sel.disabled=true;const o=document.createElement("option");o.textContent="데이터 준비 전";sel.appendChild(o);return;}
    sel.disabled=false;let any=false;
    const areaCodes=standardsIn(state.subject,state.area);
    BANDS.forEach(band=>{
      const codes=areaCodes.filter(c=>STANDARDS[c].band===band);
      if(!codes.length)return;any=true;
      const og=document.createElement("optgroup");og.label=BAND_LABEL[band];
      codes.forEach(c=>{const o=document.createElement("option");o.value=c;o.textContent=`${c}   ${STANDARDS[c].text}`;if(c===state.selected)o.selected=true;og.appendChild(o);});
      sel.appendChild(og);
    });
    if(any&&!areaCodes.includes(state.selected)){const first=sel.querySelector("option");if(first){state.selected=first.value;first.selected=true;}}
  }
  function syncSelect(){const sel=document.getElementById("stdSelect");if(sel&&!sel.disabled)sel.value=state.selected;}

  function nodeHTML(code,kind){return `<div class="node ${kind}" data-code="${code}"><div class="code">${code}</div><div class="body">${highlight(code)}</div></div>`;}
  function connHTML(link){
    return `<div class="conn reveal"><div class="stem"></div>
      <div class="funnel"><svg width="150" height="34" viewBox="0 0 150 34" fill="none"><path d="M2 3 L75 30 L148 3" stroke="var(--line)" stroke-width="2.5" fill="none" stroke-linejoin="round"/></svg></div>
      <div class="note">${link.note}</div></div>`;
  }
  function renderStage(){
    const el=document.getElementById("stage");
    const sub=SUBJECTS.find(s=>s.name===state.subject);
    if(sub&&!sub.ready){
      el.innerHTML=`<div class="subject-empty">
        <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="#26324f" stroke-width="1.4"><path d="M4 4h11l5 5v11H4z"/><path d="M15 4v5h5"/><path d="M8 13h8M8 16h5" stroke-dasharray="2 2"/></svg>
        <h3>${state.subject} 성취기준은 아직 비어 있어요</h3>
        <p>data.js에 성취기준과 계열을 추가하고, 이 과목을 ready:true 로 바꾸면 여기에 표시됩니다.</p></div>`;
      return;
    }
    const code=state.selected;
    if(!code){
      el.innerHTML=`<div class="subject-empty">
        <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#26324f" stroke-width="1.4"><path d="M12 3v6M12 15v6M5 8l4 4-4 4M19 8l-4 4 4 4"/></svg>
        <h3>성취기준을 골라보세요</h3>
        <p>위 드롭다운에서 성취기준을 선택하면 학년군 위계가 펼쳐집니다.</p></div>`;
      return;
    }
    const legendHTML=`<div class="legend">
      <span class="li"><span class="kw red">키워드</span> 핵심 개념</span>
      <span class="li"><span class="kw blue">키워드</span> 글의 종류·행동</span>
    </div>`;
    const ch=chainOf(code);
    if(!ch){
      let refs=relatedRefs(code);
      const _exSolo=explicitRefsOf(code).filter(c=>STANDARDS[c]&&c!==code&&!refs.includes(c));
      refs=refs.concat(_exSolo);
      if(refs.length){
        // 직접 위계는 없지만 같은 계통(strand)의 참고 연계를 표시
        const st=strandOf(code);
        let html=`<div class="ref-banner">이 성취기준은 <b>직접적인 학년군 위계(계열)는 없습니다.</b><br>같은 <b>‘${st}’</b> 계통의 <b>참고 연계</b> 성취기준을 함께 보여줍니다. (교육적 참고용이며 직접 위계가 아닙니다.)</div>`;
        html+=`<div class="chain"><div class="reveal">
          <p class="bandtag">선택 · ${BAND_LABEL[STANDARDS[code].band]}</p>${nodeHTML(code,"self")}</div></div>`;
        html+=`<div class="ref-divider">참고 연계 · ${st}</div>`;
        html+=`<div class="chain">`;
        refs.forEach(rc=>{
          html+=`<div class="reveal"><span class="ref-chip">참고 · ${BAND_LABEL[STANDARDS[rc].band]}</span>${nodeHTML(rc,"ctx refnode")}</div>`;
        });
        html+=`</div>`+legendHTML;
        el.innerHTML=html;
        el.querySelectorAll(".node[data-code]").forEach(n=>{n.onclick=()=>{const c=n.dataset.code;if(c===state.selected)return;state.selected=c;syncSelect();renderStage();};});
        return;
      }
      // 참고 연계도 없는 완전 단독 성취기준
      let solo=`<div class="chain"><div class="reveal">
        <p class="bandtag">선택 · ${BAND_LABEL[STANDARDS[code].band]}</p>
        ${nodeHTML(code,"self")}</div></div>`;
      solo+=`<div class="solo-note">이 성취기준은 <b>같은 영역 안에서 이어지는 위계(계열)가 없습니다.</b><br>연결되는 이전·이후 성취기준 없이 단독으로 표시됩니다.</div>`;
      solo+=legendHTML;
      el.innerHTML=solo;
      return;
    }
    const selBi=bandIndex(STANDARDS[code].band);
    let html=`<div class="chain">`;
    ch.spine.forEach((sc,i)=>{
      const role=sc===code?"선택":(bandIndex(STANDARDS[sc].band)<selBi?"이전":"이후");
      html+=`<div class="reveal"><p class="bandtag">${role} · ${BAND_LABEL[STANDARDS[sc].band]}</p>${nodeHTML(sc,sc===code?"self":"ctx")}</div>`;
      if(i<ch.spine.length-1){const key=sc+">"+ch.spine[i+1];const link=ch.links&&ch.links[key]?ch.links[key]:{note:""};html+=connHTML(link);}
    });
    html+=`</div>`;
    const _exChain=explicitRefsOf(code).filter(c=>STANDARDS[c]&&!ch.spine.includes(c));
    if(_exChain.length){
      const _B={"1-2":0,"3-4":1,"5-6":2};
      _exChain.sort((a,b)=>(_B[STANDARDS[a].band]-_B[STANDARDS[b].band])||(a<b?-1:1));
      html+=`<div class="ref-divider">참고 연계</div><div class="chain">`;
      _exChain.forEach(rc=>{ html+=`<div class="reveal"><span class="ref-chip">참고 · ${BAND_LABEL[STANDARDS[rc].band]}</span>${nodeHTML(rc,"ctx refnode")}</div>`; });
      html+=`</div>`;
    }
    html+=`<div class="legend">
      <span class="li"><span class="kw red">키워드</span> 핵심 개념</span>
      <span class="li"><span class="kw blue">키워드</span> 글의 종류·행동</span>
    </div>`;
    el.innerHTML=html;
    el.querySelectorAll(".node[data-code]").forEach(n=>{n.onclick=()=>{const c=n.dataset.code;if(c===state.selected)return;state.selected=c;syncSelect();renderStage();};});
  }

  function renderAll(){renderBadge();renderTabs();renderAreas();renderControls();renderStage();}
  document.getElementById("stdSelect").addEventListener("change",e=>{state.selected=e.target.value;renderStage();});
  renderAll();
})();
