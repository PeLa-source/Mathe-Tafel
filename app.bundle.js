(()=>{
'use strict';

const $=(s)=>document.querySelector(s);
const el=(tag,attrs={},...children)=>{
  const n=document.createElement(tag);
  for(const [k,v] of Object.entries(attrs)){
    if(k==='class') n.className=v;
    else if(k==='text') n.textContent=v;
    else if(k==='html') n.innerHTML=v;
    else if(k==='style'&&typeof v==='object') Object.assign(n.style,v);
    else if(k.startsWith('on')&&typeof v==='function') n.addEventListener(k.slice(2).toLowerCase(),v);
    else if(v!==false&&v!=null) n.setAttribute(k,v===true?'':String(v));
  }
  for(const c of children.flat(Infinity)){
    if(c==null||c===false) continue;
    n.append(c.nodeType?c:document.createTextNode(String(c)));
  }
  return n;
};
const btn=(text,on,cls='action',attrs={})=>el('button',{class:cls,onClick:on,...attrs},text);
const clamp=(n,min,max)=>Math.max(min,Math.min(max,Math.round(Number(n)||0)));
const randomInt=(min,max)=>Math.floor(Math.random()*(max-min+1))+min;
const shuffle=(arr)=>{const a=[...arr];for(let i=a.length-1;i>0;i--){const j=randomInt(0,i);[a[i],a[j]]=[a[j],a[i]];}return a;};
const parts=(n)=>Array.from({length:n+1},(_,a)=>[a,n-a]);
const numberWord=(n)=>{
  n=clamp(n,0,100);
  const base=['null','eins','zwei','drei','vier','fünf','sechs','sieben','acht','neun','zehn','elf','zwölf','dreizehn','vierzehn','fünfzehn','sechzehn','siebzehn','achtzehn','neunzehn'];
  if(n<20)return base[n]; if(n===100)return'einhundert';
  const tens={2:'zwanzig',3:'dreißig',4:'vierzig',5:'fünfzig',6:'sechzig',7:'siebzig',8:'achtzig',9:'neunzig'};
  const z=Math.floor(n/10),e=n%10; if(e===0)return tens[z]; return(e===1?'ein':base[e])+'und'+tens[z];
};
const decomposeZE=(n)=>n>=0&&n<=99?{tens:Math.floor(n/10),ones:n%10}:null;
const crossesDecade=(a,b,op)=>op==='+'?((a%10)+(b%10)>10):((a%10)!==0&&(a%10)<(b%10));

const state={
  route:'home', previousRoute:'home', drawer:false, presentation:false, number:8,
  part:{a:3,hidden:null,labels:true,equation:false,colors:true,wholeColor:'#8fcf98',leftColor:'#f2cf59',rightColor:'#ef7d73'},
  house:{revealed:0,order:'systematic',hide:'none',sequence:[],mask:[]},
  bundling:{bundles:0,singles:8,language:false,short:false,number:false,view:'sticks'},
  place:{hide:null,material:true,materialView:'sticks',language:false,short:false,table:true,number:true},
  connect:{selected:['symbol','material','table'],hidden:[],materialView:'sticks'},
  workspace:{selected:['symbol'],hidden:[],focus:null,rangeStart:0,rangeEnd:100},
  numberline:{start:0,end:100,labels:'tens',marker:8},
  hundredTool:{view:'menu',current:37,showNumber:false,labels:'all',labelOverrides:{},marks:[],coveredRows:[],coveredCols:[],directTool:'toggle'},
  lineTool:{start:0,end:20,tool:'pointer',pointer:null,pointerReveal:false,labelOverrides:{},markers:[],cardInput:'',cards:[],activeCard:null,coverStart:null,covers:[],customRange:false},
  games:{bingoSettings:{range:20,type:'mixed'},riddleSettings:{range:20,type:'mixed',showLine:false},middleSettings:{range:20},discoverSettings:{range:20,op:'addition',pattern:'oneUp'}},
  twentyTool:{cells:Array(20).fill(null),mode:'blue',showNumber:false,showEquation:false,covered:false,removed:[],pendingRemove:0},
  task:{a:8,op:'+',b:7,result:15,hidden:'b',revealed:false,source:'game'},
  game:{range:20,op:'mixed',hidden:'mixed',cross:'mixed'},
  quick:{mode:null},
  manual:{a:8,op:'+',b:7,hidden:'result',revealed:false}
};

function totalBundling(){return state.bundling.bundles*10+state.bundling.singles;}
function syncNumber(v,{renderNow=true}={}){
  v=clamp(v,0,100); state.number=v;
  state.bundling={...state.bundling,bundles:0,singles:v};
  state.part.a=Math.min(state.part.a,v);
  resetHouse();
  if(renderNow)render();
}
function resetHouse(){state.house.revealed=0;state.house.sequence=[];state.house.mask=[];}
function nav(route){
  state.previousRoute=state.route; state.route=route; state.drawer=false;
  if(route==='quick') state.quick.mode=null;
  render();
}
function back(){
  if(state.route==='task'){state.route='quick';state.quick.mode='task';state.drawer=false;render();return;}
  const parent={ttg:'decompose',house:'decompose',material:'placeMenu',placevalue:'placeMenu',twentyTool:'home',hundredTool:'home',lineTool:'home',game:'games',bingo:'games',riddle:'games',middle:'games',match:'games',discover:'games'}[state.route];
  nav(parent||'home');
}

function topbar(){
  if(state.presentation)return null;
  const backNeeded=!['home','decompose','placeMenu','games'].includes(state.route);
  const centralRoutes=['workspace','decompose','placeMenu','ttg','house','material','placevalue','connect'];
  const usesCentral=centralRoutes.includes(state.route)||(state.route==='quick'&&state.quick.mode==='number');
  const configurable=['workspace','twentyTool','lineTool','decompose','placeMenu','ttg','house','material','placevalue','connect','game','bingo','riddle','middle','discover'].includes(state.route);
  return el('header',{class:'topbar'},
    el('button',{class:'top-btn icon',onClick:()=>backNeeded?back():nav('home'),'aria-label':backNeeded?'Zurück':'Startseite'},backNeeded?'←':'⌂'),
    el('div',{class:'brand'},'MATHE-TAFEL'),
    el('div',{class:'top-spacer'}),
    usesCentral?el('button',{class:'number-pill',onClick:()=>{state.drawer=true;render();},'aria-label':`Aktuelle Zahl ${state.number} ändern`},el('span',{class:'number-pill-label'},state.route==='ttg'?'GANZES':'ZAHL'),el('strong',{},state.number)):null,
    configurable?el('button',{class:'top-btn',onClick:()=>{state.drawer=!state.drawer;render();},'aria-expanded':state.drawer},'⚙ ',el('span',{class:'label'},'Einstellen')):null,
    state.route!=='home'?el('button',{class:'top-btn',onClick:()=>{state.presentation=true;state.drawer=false;render();},'aria-label':'Nur Tafelbild anzeigen'},'▣ ',el('span',{class:'label'},'Tafelbild')):null
  );
}
function presentationExit(){return state.presentation?el('button',{class:'presentation-exit',onClick:()=>{state.presentation=false;render();},'aria-label':'Tafelbild verlassen'},'×'):null;}
function choice(icon,title,sub,on,disabled=false){return el('button',{class:`choice${disabled?' disabled':''}`,onClick:disabled?null:on,disabled},el('div',{class:'choice-icon','aria-hidden':'true'},icon),el('div',{class:'choice-copy'},el('strong',{},title),el('span',{},sub)));}
function home(){return el('main',{class:'page'},el('h1',{class:'home-title'},'Was möchtest du zeigen?'),el('p',{class:'home-sub'},'Wähle ein Werkzeug oder einen mathematischen Inhalt.'),el('div',{class:'choice-grid'},
  choice('▣','Tafel-Arbeitsplatz','Darstellungen kombinieren',()=>nav('workspace')),
  choice('●●','Zwanzigerfeld','Legen · wegnehmen',()=>nav('twentyTool')),
  choice('▦','Hunderter','Punktefeld · Zahlentafel',()=>{state.hundredTool.view='menu';nav('hundredTool');}),
  choice('0—100','Zahlenstrahl','Bestimmen · zeigen · einordnen',()=>nav('lineTool')),
  choice('◯','Zerlegen & TTG','Teile und Ganzes',()=>nav('decompose')),
  choice('10','Bündeln & Stellenwert','Zehner und Einer',()=>nav('placeMenu')),
  choice('⇄','Darstellungen verbinden','Darstellungen vernetzen',()=>nav('connect')),
  choice('◇','Spiele & Routinen','Üben und entdecken',()=>nav('games'))
));}
function menuPage(title,sub,items){return el('main',{class:'page'},el('h1',{class:'home-title'},title),el('p',{class:'home-sub'},sub),el('div',{class:'choice-grid'},...items));}
function stage(title,content,actions=[],teacherHint=''){
  const heading=state.presentation?null:el('div',{class:'stage-head'},el('div',{class:'stage-title'},title));
  return el('main',{class:`stage${state.presentation?' presentation-stage':''}`},heading,el('div',{class:'board'},content),actions.length?el('div',{class:`actionbar${state.presentation?' presentation-actions':''}`},...actions):null);
}
function blank(v,hidden){return hidden?el('span',{class:'blank','aria-label':'verdeckt'},String(v)):String(v);}

// ---------- TTG ----------
function ttgColor(key){
  if(!state.part.colors)return '#ffffff';
  return key==='whole'?state.part.wholeColor:key==='a'?state.part.leftColor:state.part.rightColor;
}
function renderTTG(){
  const n=state.number,a=Math.min(state.part.a,n),b=n-a,h=state.part.hidden;
  const fieldBox=(cls,label,val,key)=>el('div',{class:`ttg-field ${cls}`,style:{background:ttgColor(key)}},
    el('div',{class:'ttg-value'},blank(val,h===key||h==='all')),
    state.part.labels?el('div',{class:'ttg-label'},label):null
  );
  const content=el('div',{class:'ttg-wrap'},
    el('div',{class:'ttg-fieldboard'},
      fieldBox('whole','GANZES',n,'whole'),
      fieldBox('left','TEIL',a,'a'),
      fieldBox('right','TEIL',b,'b')
    ),
    state.part.equation?el('div',{class:'equation'},blank(a,h==='a'||h==='all'),' + ',blank(b,h==='b'||h==='all'),' = ',blank(n,h==='whole'||h==='all')):null
  );
  return stage('Teil–Teil–Ganzes',content,[
    btn('NEUE ZERLEGUNG',()=>{state.part.a=randomInt(0,n);state.part.hidden=null;render();},'action soft'),
    btn(h?'ALLES ZEIGEN':'EINE ZAHL VERDECKEN',()=>{state.part.hidden=h?null:['whole','a','b'][randomInt(0,2)];render();},'action primary')
  ],'Ein Ganzes oben – zwei Teile unten. Die Farben können an euer TTG-Material angepasst werden.');
}

// ---------- Zahlenhaus ----------
function ensureHouse(){
  const n=state.number;if(n>20)return;
  if(!state.house.sequence.length){state.house.sequence=state.house.order==='random'?shuffle(parts(n)):parts(n);state.house.mask=state.house.sequence.map(()=>Math.random()<.5?'left':'right');}
}
function houseCell(v,hidden){return el('div',{class:'house-cell'},hidden?el('span',{class:'cell-blank','aria-label':'verdeckt'},String(v)):String(v));}
function renderHouse(){
  if(state.number>20){
    return stage('Zahlenhaus',el('div',{class:'limit-card'},el('div',{class:'limit-symbol'},'≤ 20'),el('h2',{},'Zahlenhaus: Zahlen bis 20'),el('p',{},`Die aktuelle Zahl ${state.number} bleibt erhalten. Wähle für das Zahlenhaus eine Zahl von 0 bis 20.`),el('div',{class:'preset-row'},...[8,10,20].map(n=>btn(String(n),()=>syncNumber(n),'action soft')),el('div',{class:'field inline-field'},el('label',{},'Andere Zahl'),el('input',{type:'number',min:0,max:20,value:20,onChange:e=>syncNumber(e.target.value)})))));
  }
  ensureHouse(); const n=state.number;
  const rows=state.house.sequence.map(([a,b],i)=>{
    const shown=i<state.house.revealed;let hl=!shown,hr=!shown;
    if(shown){hl=state.house.hide==='left'||state.house.hide==='both'||(state.house.hide==='random'&&state.house.mask[i]==='left');hr=state.house.hide==='right'||state.house.hide==='both'||(state.house.hide==='random'&&state.house.mask[i]==='right');}
    return el('div',{class:`house-row${shown?' revealed':' pending'}`},houseCell(a,hl),houseCell(b,hr));
  });
  return stage('Zahlenhaus',el('div',{class:`house${n>12?' compact':''}`},el('div',{class:'roof'},el('div',{class:'roof-number'},n)),el('div',{class:'house-body'},...rows)),[
    btn('LEEREN',()=>{state.house.revealed=0;render();}),
    btn('NÄCHSTE ZERLEGUNG',()=>{state.house.revealed=Math.min(n+1,state.house.revealed+1);render();},'action primary',{disabled:state.house.revealed>=n+1}),
    btn('ALLE AUFDECKEN',()=>{state.house.revealed=n+1;state.house.hide='none';render();})
  ],'Systematische Zerlegungen Schritt für Schritt aufdecken.');
}

// ---------- Material / Bündeln ----------
const stick=(small=false)=>el('div',{class:`stick${small?' small':''}`});
const bundle=(small=false)=>el('div',{class:`bundle${small?' small':''}`},...Array.from({length:10},()=>stick(small)));
function singleGroups(count,small=false){
  const groups=[]; let remaining=count;
  while(remaining>0){const take=Math.min(10,remaining);groups.push(el('div',{class:'single-ten-group'},...Array.from({length:take},()=>stick(small))));remaining-=take;}
  return groups;
}
function materialGraphic(b=state.bundling,small=false){
  const dense=!small&&(b.singles+b.bundles)>40;
  return el('div',{class:`material-graphic${small?' small':''}${dense?' dense':''}`},el('div',{class:'bundle-zone'},...Array.from({length:b.bundles},()=>bundle(small))),el('div',{class:'single-zone'},...singleGroups(b.singles,small)));
}
function dienesGraphic(n=state.number,small=false){
 const d=decomposeZE(n); if(!d)return el('div',{class:`dienes-hundred${small?' small':''}`},el('div',{class:'hundred-square'},'100'));
 const makeGroup=(count,kind)=>el('div',{class:`dienes-group ${kind}-group`},...Array.from({length:count},()=>el('div',{class:kind==='rod'?'dienes-rod':'dienes-one'})));
 const rods=[];for(let i=0;i<d.tens;i+=5)rods.push(makeGroup(Math.min(5,d.tens-i),'rod'));
 const ones=[];for(let i=0;i<d.ones;i+=5)ones.push(makeGroup(Math.min(5,d.ones-i),'one'));
 return el('div',{class:`dienes-graphic${small?' small':''}`},el('div',{class:'dienes-tens'},...rods),el('div',{class:'dienes-ones'},...ones));
}
function currentMaterialGraphic(small=false){
  return state.bundling.view==='dienes'?dienesGraphic(totalBundling(),small):materialGraphic(state.bundling,small);
}
function renderMaterial(){
  const b=state.bundling,total=totalBundling();
  const content=el('div',{class:'material-board'},el('div',{class:'material-switch'},btn('EISSTIELE',()=>{b.view='sticks';render();},`action ${b.view==='sticks'?'primary':'soft'}`),btn('DIENES-MATERIAL',()=>{b.view='dienes';render();},`action ${b.view==='dienes'?'primary':'soft'}`)),currentMaterialGraphic(),(b.language||b.short||b.number)?el('div',{class:'summary'},b.language?el('span',{},el('span',{class:'ten'},`${b.bundles} Zehner`),' und ',el('span',{class:'one'},`${b.singles} Einer`)):null,b.short?el('span',{},`${b.bundles} Z + ${b.singles} E`):null,b.number?el('span',{class:'summary-number'},String(total)):null):null);
  return stage(b.view==='dienes'?'Dienes-Material':'Bündeln mit Eisstielen',content,[
    btn('ENTBÜNDELN',()=>{if(b.bundles>0){b.bundles--;b.singles+=10;render();}},'action',{disabled:b.bundles===0}),
    btn('BÜNDELN',()=>{if(b.singles>=10){b.singles-=10;b.bundles++;render();}},'action primary',{disabled:b.singles<10})
  ],b.view==='dienes'?`${total} bleibt gleich. Zehnerstangen und Einerwürfel zeigen dieselbe Zahl wie die Eisstiele.`:`${total} bleibt immer gleich. 10 einzelne Einer werden zu einem sichtbaren Zehnerbündel.`);
}

// ---------- Stellenwert ----------
function valueBlank(key,v){return blank(v,state.place.hide===key);}
function canonicalMaterial(d){return el('div',{class:'canonical-material'},state.place.materialView==='dienes'?dienesGraphic(state.number,true):materialGraphic({bundles:d.tens,singles:d.ones},true));}
function renderPlace(){
  const d=decomposeZE(state.number),p=state.place;
  if(!d)return stage('Stellenwert',el('div',{class:'hundred-card'},el('div',{class:'math-number'},'100'),el('div',{class:'hundred-note'},'Das ZE-Modell endet bei 99. 100 wird hier nicht als „10 Z + 0 E“ dargestellt.')),[], 'Grenzfall 100 wird fachlich bewusst nicht in die ZE-Tafel gezwungen.');
  const content=el('div',{class:'pv'},p.material?canonicalMaterial(d):null,p.language?el('div',{class:'math-line'},valueBlank('t',d.tens),' Zehner und ',valueBlank('e',d.ones),' Einer'):null,p.short?el('div',{class:'math-line compact'},valueBlank('t',d.tens),' Z + ',valueBlank('e',d.ones),' E'):null,p.table?el('table',{class:'pv-table','aria-label':'Stellenwerttafel Zehner Einer'},el('tr',{},el('th',{},'Z'),el('th',{},'E')),el('tr',{},el('td',{},valueBlank('t',d.tens)),el('td',{},valueBlank('e',d.ones)))):null,p.number?el('div',{class:'math-number center'},valueBlank('number',state.number)):null);
  return stage('Stellenwert',content,[btn(p.hide?'ALLES ZEIGEN':'EINE INFORMATION VERDECKEN',()=>{p.hide=p.hide?null:['t','e','number'][randomInt(0,2)];render();},'action primary')],'Zehner und Einer in mehreren verbundenen Darstellungen.');
}

// ---------- Darstellungen verbinden ----------
const reprNames={symbol:'Zahlsymbol',word:'Zahlwort',material:'Eisstiele',dienes:'Dienes',twenty:'Zwanzigerfeld',language:'Sprache',short:'Kurzschreibweise',table:'Stellenwerttafel',ttg:'Teil–Teil–Ganzes',numberline:'Zahlenstrahl',hundred:'Hundertertafel'};
function connectContent(id){
  const d=decomposeZE(state.number);
  if(id==='symbol')return el('div',{class:'math-number card-number'},state.number);
  if(id==='word')return el('div',{class:'word-card'},numberWord(state.number));
  if(id==='material')return state.connect.materialView==='dienes'?dienesGraphic(state.number,true):(d?materialGraphic({bundles:d.tens,singles:d.ones},true):el('div',{class:'math-number card-number'},'100'));
  if(id==='dienes')return dienesGraphic(state.number,true);
  if(id==='twenty')return twentyFrame(state.number);
  if(id==='numberline')return numberLine(state.number,0,100,true);
  if(id==='hundred')return hundredChart(state.number);
  if(id==='language')return el('div',{},d?`${d.tens} Zehner und ${d.ones} Einer`:'einhundert');
  if(id==='short')return el('div',{class:'short-notation'},d?`${d.tens} Z + ${d.ones} E`:'100');
  if(id==='table')return d?el('table',{class:'pv-table mini-table'},el('tr',{},el('th',{},'Z'),el('th',{},'E')),el('tr',{},el('td',{},d.tens),el('td',{},d.ones))):el('div',{},'ZE bis 99');
  if(id==='ttg'){const a=Math.min(state.part.a,state.number);return el('div',{class:'mini-ttg'},el('div',{class:'mini-ttg-whole'},state.number),el('div',{class:'mini-ttg-parts'},el('span',{},a),el('span',{},state.number-a)));}
}
function reprCard(id){
  const hidden=state.connect.hidden.includes(id);
  return el('button',{class:`repr${hidden?' hidden':''}`,onClick:()=>{state.connect.hidden=hidden?state.connect.hidden.filter(x=>x!==id):[...state.connect.hidden,id];render();},'aria-label':`${reprNames[id]} ${hidden?'aufdecken':'verdecken'}`},el('div',{class:'repr-title'},reprNames[id]),el('div',{class:'repr-content'},hidden?el('span',{class:'card-blank'},''):connectContent(id)));
}
function renderConnect(){
  return stage('Darstellungen verbinden',el('div',{class:'repr-grid'},...state.connect.selected.map(reprCard)),[
    btn(state.connect.hidden.length?'ALLES AUFDECKEN':'EINE KARTE VERDECKEN',()=>{if(state.connect.hidden.length)state.connect.hidden=[];else state.connect.hidden=[state.connect.selected[randomInt(0,state.connect.selected.length-1)]];render();},'action primary')
  ],'Karte antippen = verdecken/aufdecken. Alle Karten zeigen dieselbe Zahl.');
}

// ---------- Aufgabengenerator ----------
function candidateTasks(g){
  const ops=g.op==='mixed'?['+','-']:[g.op==='addition'?'+':'-']; const out=[];
  for(const op of ops){
    for(let a=0;a<=g.range;a++)for(let b=0;b<=g.range;b++){
      const result=op==='+'?a+b:a-b;
      if(result<0||result>g.range)continue;
      const crossing=crossesDecade(a,b,op);
      if(g.cross==='with'&&!crossing)continue;
      if(g.cross==='without'&&crossing)continue;
      out.push({a,op,b,result});
    }
  }
  return out;
}
function ensureGameCompatibility(){if(state.game.range===10&&state.game.cross==='with')state.game.cross='without';}
function generate(){
  ensureGameCompatibility(); const candidates=candidateTasks(state.game);
  const pick=candidates.length?candidates[randomInt(0,candidates.length-1)]:{a:8,op:'+',b:2,result:10};
  const hs=['a','b','result'],hidden=state.game.hidden==='mixed'?hs[randomInt(0,2)]:state.game.hidden;
  state.task={...pick,hidden,revealed:false,source:'game'};
}
function ensureTask(){if(!state.task||state.task.source!=='game')generate();}
function taskExpression(t,interactive=true){const V=(k,v)=>t.revealed||t.hidden!==k?String(v):el('span',{class:'blank'},String(v));return el('div',{class:'task'},V('a',t.a),' ',t.op==='-'?'−':'+',' ',V('b',t.b),' = ',V('result',t.result));}
function renderGame(){
  ensureTask(); const t=state.task;
  return stage("Zeig’s!",el('div',{class:'task-stage'},taskExpression(t),el('div',{class:'thinking-cue'},t.revealed?'Vergleichen • erklären • weiter':'DENKEN  →  AUFSCHREIBEN  →  ZEIGEN')),[
    btn(t.revealed?'WIEDER VERDECKEN':'AUFDECKEN',()=>{t.revealed=!t.revealed;render();},'action primary'),
    btn('NÄCHSTE AUFGABE',()=>{generate();render();},'action')
  ],'Für Mini-Whiteboards: erst gleichzeitig zeigen lassen, dann aufdecken.');
}

// ---------- Schnellstart ----------
function renderQuick(){
  if(!state.quick.mode)return stage('Schnellstart',el('div',{class:'quick-select'},choice('37','ZAHL','Zahl eingeben und Darstellung wählen.',()=>{state.quick.mode='number';render();}),choice('8 + __','RECHNUNG','Eigene Plus- oder Minusaufgabe zeigen.',()=>{state.quick.mode='task';render();})));
  if(state.quick.mode==='number')return stage('Schnellstart: Zahl',el('div',{class:'quick-number'},field(state.route==='ttg'?'Ganzes / Zahl 0–100':'Zahl 0–100',el('input',{class:'big-input',type:'number',min:0,max:100,value:state.number,onChange:e=>syncNumber(e.target.value)})),el('div',{class:'module-buttons'},btn('MATERIAL',()=>nav('material')),btn('STELLENWERT',()=>nav('placevalue')),btn('TTG',()=>nav('ttg')),btn('ZAHLENHAUS',()=>nav('house')),btn('DARSTELLUNGEN VERBINDEN',()=>nav('connect'),'action primary'))));
  return renderManualForm();
}
function renderManualForm(){
  const m=state.manual;
  const result=m.op==='+'?m.a+m.b:m.a-m.b;
  const valid=result>=0&&result<=100;
  const preview={...m,result,revealed:false};
  return stage('Schnellstart: Rechnung',el('div',{class:'manual-form'},el('div',{class:'manual-preview'},taskExpression(preview)),!valid?el('div',{class:'form-error'},'Die Rechnung muss im Zahlenraum 0–100 bleiben.'):null,el('div',{class:'form-grid'},numberField('Erster Wert',m.a,v=>{m.a=v;if(m.op==='-'&&m.b>m.a)m.b=m.a;render();}),selectField('Operation',m.op,[['+','Addition +'],['-','Subtraktion −']],v=>{m.op=v;if(v==='-'&&m.b>m.a)m.b=m.a;render();}),numberField('Zweiter Wert',m.b,v=>{m.b=v;if(m.op==='-'&&m.b>m.a)m.b=m.a;render();}),selectField('Gesuchte Stelle',m.hidden,[['result','Ergebnis'],['a','Erster Wert'],['b','Zweiter Wert']],v=>{m.hidden=v;render();}))),[
    btn('RECHNUNG GROSS ZEIGEN',()=>{if(!valid)return;state.task={a:m.a,op:m.op,b:m.b,result,hidden:m.hidden,revealed:false,source:'manual'};nav('task');},'action primary',{disabled:!valid})
  ]);
}
function renderManualTask(){
  const t=state.task;
  const ttgPossible=t.op==='+'?t.result<=100:t.a<=100;
  return stage('Rechnung',el('div',{class:'task-stage'},taskExpression(t)),[
    btn(t.revealed?'WIEDER VERDECKEN':'AUFDECKEN',()=>{t.revealed=!t.revealed;render();},'action primary'),
    btn('ALS TTG ZEIGEN',()=>{if(t.op==='+'){syncNumber(t.result,{renderNow:false});state.part.a=t.a;}else{syncNumber(t.a,{renderNow:false});state.part.a=t.b;}state.part.hidden=null;nav('ttg');},'action',{disabled:!ttgPossible})
  ],'Eigene Aufgabe aus dem Schnellstart.');
}

// ---------- Form helpers ----------
function field(label,input){return el('div',{class:'field'},el('label',{},label),input);}
function numberField(label,value,on){return field(label,el('input',{type:'number',min:0,max:100,value,onChange:e=>on(clamp(e.target.value,0,100))}));}
function selectField(label,value,opts,on){return field(label,el('select',{onChange:e=>on(e.target.value)},...opts.map(([v,t])=>el('option',{value:v,selected:v===String(value)},t))));}
function selectFrom(value,opts,on){return el('select',{onChange:e=>on(e.target.value)},...opts.map(([v,t])=>el('option',{value:v,selected:v===String(value)},t)));}
function toggle(label,checked,on){return el('label',{class:'toggle'},el('span',{},label),el('input',{type:'checkbox',checked,onChange:e=>on(e.target.checked)}));}
function colorField(label,value,on){return el('label',{class:'color-field'},el('span',{},label),el('input',{type:'color',value,onChange:e=>on(e.target.value)}));}

// ---------- Lehrersteuerung ----------
function numberControls(){return [el('div',{class:'section'},'Aktuelle Zahl'),field(state.route==='ttg'?'Ganzes / Zahl 0–100':'Zahl 0–100',el('input',{class:'drawer-number-input',type:'number',min:0,max:100,value:state.number,onChange:e=>syncNumber(e.target.value)})),el('div',{class:'step-grid'},btn('−10',()=>syncNumber(state.number-10)),btn('−1',()=>syncNumber(state.number-1)),btn('+1',()=>syncNumber(state.number+1)),btn('+10',()=>syncNumber(state.number+10)),btn('ZUFALL',()=>syncNumber(randomInt(0,100)),'action soft'))];}
function drawer(){
  if(!state.drawer||state.presentation)return null;
  const r=state.route;
  const centralRoutes=['workspace','decompose','placeMenu','ttg','house','material','placevalue','connect'];
  const content=[el('div',{class:'drawer-head'},el('h2',{},'Lehrersteuerung'),el('button',{class:'xbtn',onClick:()=>{state.drawer=false;render();},'aria-label':'Schließen'},'×')),...(centralRoutes.includes(r)?numberControls():[])];
  if(r==='ttg')content.push(el('div',{class:'section'},'Teil–Teil–Ganzes'),field('Teil A',el('input',{type:'number',min:0,max:state.number,value:Math.min(state.part.a,state.number),onChange:e=>{state.part.a=clamp(e.target.value,0,state.number);render();}})),field('Verdecken',selectFrom(state.part.hidden||'',[['','Nichts'],['whole','Ganzes'],['a','Teil A'],['b','Teil B'],['all','Alles']],v=>{state.part.hidden=v||null;render();})),toggle('Begriffe Teil / Ganzes zeigen',state.part.labels,v=>{state.part.labels=v;render();}),toggle('Passende Rechnung zeigen',state.part.equation,v=>{state.part.equation=v;render();}),toggle('TTG-Farben verwenden',state.part.colors,v=>{state.part.colors=v;render();}),state.part.colors?el('div',{class:'color-grid'},colorField('Ganzes',state.part.wholeColor,v=>{state.part.wholeColor=v;render();}),colorField('Teil links',state.part.leftColor,v=>{state.part.leftColor=v;render();}),colorField('Teil rechts',state.part.rightColor,v=>{state.part.rightColor=v;render();})):null,el('div',{class:'drawer-actions'},btn('ALLES ZEIGEN',()=>{state.part.hidden=null;render();}),btn('ALLES VERDECKEN',()=>{state.part.hidden='all';render();})));
  if(r==='house')content.push(el('div',{class:'section'},'Zahlenhaus'),field('Reihenfolge',selectFrom(state.house.order,[['systematic','Systematisch'],['random','Zufällig']],v=>{state.house.order=v;resetHouse();render();})),field('Nach dem Aufdecken',selectFrom(state.house.hide,[['none','Beide Teile zeigen'],['left','Linken Teil verdecken'],['right','Rechten Teil verdecken'],['both','Beide verdecken'],['random','Zufällig einen Teil verdecken']],v=>{state.house.hide=v;render();})));
  if(r==='material')content.push(el('div',{class:'section'},'Bündeln & Material'),field('Darstellung',selectFrom(state.bundling.view,[['sticks','Eisstiele'],['dienes','Dienes-Material']],v=>{state.bundling.view=v;render();})),el('div',{class:'status-box'},`${state.bundling.bundles} Bündel + ${state.bundling.singles} Einer = ${totalBundling()}`),toggle('Sprache zeigen',state.bundling.language,v=>{state.bundling.language=v;render();}),toggle('Kurzschreibweise zeigen',state.bundling.short,v=>{state.bundling.short=v;render();}),toggle('Zahl zeigen',state.bundling.number,v=>{state.bundling.number=v;render();}),btn('WIEDER ALLE EINZELN',()=>{state.bundling.bundles=0;state.bundling.singles=state.number;render();},'action soft'));
  if(r==='placevalue')content.push(el('div',{class:'section'},'Stellenwert'),field('Materialart',selectFrom(state.place.materialView,[['sticks','Eisstiele'],['dienes','Dienes-Material']],v=>{state.place.materialView=v;render();})),field('Verdecken',selectFrom(state.place.hide||'',[['','Nichts'],['t','Zehnerzahl'],['e','Einerzahl'],['number','Zahlsymbol']],v=>{state.place.hide=v||null;render();})),toggle('Material',state.place.material,v=>{state.place.material=v;render();}),toggle('Sprache',state.place.language,v=>{state.place.language=v;render();}),toggle('Kurzschreibweise',state.place.short,v=>{state.place.short=v;render();}),toggle('Stellenwerttafel',state.place.table,v=>{state.place.table=v;render();}),toggle('Zahlsymbol',state.place.number,v=>{state.place.number=v;render();}));
  if(r==='connect'){
    const ids=Object.keys(reprNames);content.push(el('div',{class:'section'},'Darstellungen auswählen'),el('p',{class:'drawer-note'},'Wähle 2 oder 3. Antippen im Tafelbild verdeckt eine Karte.'),...ids.map(id=>toggle(reprNames[id],state.connect.selected.includes(id),v=>{if(v&&state.connect.selected.length<3&&!state.connect.selected.includes(id))state.connect.selected.push(id);if(!v&&state.connect.selected.length>2)state.connect.selected=state.connect.selected.filter(x=>x!==id);state.connect.hidden=state.connect.hidden.filter(x=>state.connect.selected.includes(x));render();})));
  }
  if(r==='game'){
    const crossingOpts=state.game.range===10?[['without','ohne']]:[['without','ohne'],['with','mit'],['mixed','gemischt']];
    content.push(el('div',{class:'section'},"Zeig’s!"),field('Zahlenraum',selectFrom(state.game.range,[['10','bis 10'],['20','bis 20'],['100','bis 100']],v=>{state.game.range=+v;ensureGameCompatibility();generate();render();})),field('Operation',selectFrom(state.game.op,[['addition','Addition'],['subtraction','Subtraktion'],['mixed','Gemischt']],v=>{state.game.op=v;generate();render();})),field('Gesuchte Stelle',selectFrom(state.game.hidden,[['result','Ergebnis'],['a','Erster Wert'],['b','Zweiter Wert'],['mixed','Gemischt']],v=>{state.game.hidden=v;generate();render();})),field('Zehnerübergang',selectFrom(state.game.cross,crossingOpts,v=>{state.game.cross=v;generate();render();})),state.game.range===10?el('p',{class:'drawer-note'},'Im Zahlenraum bis 10 gibt es in dieser Routine keine Aufgaben „mit Zehnerübergang“.'):null);
  }
  if(r==='hundredTool')content.push(el('div',{class:'section'},'Hunderter'),el('p',{class:'drawer-note'},'Die wichtigen Handlungen erfolgen direkt am Material.'));
  if(r==='lineTool')content.push(el('div',{class:'section'},'Zahlenstrahl'),el('p',{class:'drawer-note'},'Der Zahlenstrahl ist ein offenes Tafelmaterial. Die wichtigen Handlungen erfolgen direkt am Strahl.'),el('p',{class:'drawer-note'},'Tipp: Zeiger setzen → Kinder begründen lassen → Zahl erst danach aufdecken.'));
  if(r==='twentyTool')content.push(el('div',{class:'section'},'Zwanzigerfeld'),toggle('Anzahl zeigen',state.twentyTool.showNumber,v=>{state.twentyTool.showNumber=v;render();}));
  if(r==='bingo')content.push(el('div',{class:'section'},'Zahlenbingo'),rangeSelect(state.games.bingoSettings.range,v=>{state.games.bingoSettings.range=v;newBingo();render();}),field('Aufgabenart',selectFrom(state.games.bingoSettings.type,[['mixed','gemischt'],['place','Zehner und Einer'],['next','Nachfolger'],['prev','Vorgänger'],['add','Addition'],['sub','Subtraktion']],v=>{state.games.bingoSettings.type=v;newBingo();render();})));
  if(r==='riddle')content.push(el('div',{class:'section'},'Zahlenrätsel'),rangeSelect(state.games.riddleSettings.range,v=>{state.games.riddleSettings.range=v;newRiddle();render();}),field('Aufgabenart',selectFrom(state.games.riddleSettings.type,[['mixed','gemischt'],['next','Nachfolger'],['prev','Vorgänger'],['between','zwischen zwei Zahlen'],['even','gerade Zahl']],v=>{state.games.riddleSettings.type=v;newRiddle();render();})),toggle('Zahlenstrahl einblenden',state.games.riddleSettings.showLine,v=>{state.games.riddleSettings.showLine=v;render();}));
  if(r==='middle')content.push(el('div',{class:'section'},'Finde die Mitte'),rangeSelect(state.games.middleSettings.range,v=>{state.games.middleSettings.range=v;newMiddle();render();}));
  if(r==='discover')content.push(el('div',{class:'section'},'Entdeckerpäckchen'),rangeSelect(state.games.discoverSettings.range,v=>{state.games.discoverSettings.range=v;newDiscover();render();}),field('Rechenart',selectFrom(state.games.discoverSettings.op,[['addition','Addition'],['subtraction','Subtraktion']],v=>{state.games.discoverSettings.op=v;newDiscover();render();})),field('Muster',selectFrom(state.games.discoverSettings.pattern,[['oneUp','ein Wert verändert sich'],['constant','gegensinnig / Ergebnis bleibt gleich']],v=>{state.games.discoverSettings.pattern=v;newDiscover();render();})));
  return el('aside',{class:'drawer open','aria-label':'Lehrersteuerung'},...content);
}


// ---------- V5 Grunddarstellungen ----------
function twentyFrame(n){
  if(n>20)return el('div',{class:'repr-na'},'nur bis 20');
  return el('div',{class:'twenty-frame'},...Array.from({length:20},(_,i)=>el('span',{class:`counter ${i<n?(i<10?'filled-a':'filled-b'):''} ${(i%5===4)?'five':''}`})));
}
function numberLine(n,start=0,end=100,mini=false,unscaled=false){
  start=clamp(start,0,100);end=clamp(end,start+1,100);n=clamp(n,start,end);
  const pct=((n-start)/(end-start))*100;
  return el('div',{class:`numberline ${mini?'mini':''} ${unscaled?'unscaled':''}`},
    el('div',{class:'nl-track'},el('span',{class:'nl-end left'},start),el('span',{class:'nl-end right'},end),el('span',{class:'nl-marker',style:{left:`${pct}%`}},'▼',el('b',{},n))),
    !mini&&!unscaled?el('div',{class:'nl-ticks'},...Array.from({length:end-start+1},(_,i)=>{const v=start+i;return v%10===0?el('span',{style:{left:`${i/(end-start)*100}%`}},v):null;})):null);
}
function hundredChart(mark){return el('div',{class:'hundred-chart'},...Array.from({length:100},(_,i)=>{const v=i+1;return el('span',{class:v===mark?'marked':''},v);}));}
function wsContent(id){
  const old=state.connect.materialView; state.connect.materialView='sticks';
  let x;
  if(id==='symbol'||id==='word'||id==='material'||id==='dienes'||id==='twenty'||id==='language'||id==='short'||id==='table'||id==='ttg'||id==='numberline'||id==='hundred') x=connectContent(id);
  state.connect.materialView=old; return x;
}
function workspaceCard(id){const hidden=state.workspace.hidden.includes(id);return el('div',{class:`ws-card ${state.workspace.focus===id?'focused':''}`},
  el('div',{class:'ws-card-head'},el('strong',{},reprNames[id]),btn(hidden?'AUFDECKEN':'VERDECKEN',()=>{state.workspace.hidden=hidden?state.workspace.hidden.filter(x=>x!==id):[...state.workspace.hidden,id];render();},'tiny'),btn('×',()=>{state.workspace.selected=state.workspace.selected.filter(x=>x!==id);state.workspace.hidden=state.workspace.hidden.filter(x=>x!==id);render();},'tiny')),
  el('div',{class:'ws-card-body'},hidden?el('span',{class:'card-blank'}):wsContent(id)));
}
function renderWorkspace(){
 const available=Object.keys(reprNames).filter(id=>!(id==='twenty'&&state.number>20));
 return stage('Tafel-Arbeitsplatz',el('div',{class:'workspace'},
   el('div',{class:'workspace-number'},el('span',{},'ZAHL'),el('strong',{},state.number)),
   el('div',{class:'repr-picker'},...available.map(id=>btn(`${state.workspace.selected.includes(id)?'✓ ':''}${reprNames[id]}`,()=>{if(state.workspace.selected.includes(id))state.workspace.selected=state.workspace.selected.filter(x=>x!==id);else if(state.workspace.selected.length<3)state.workspace.selected.push(id);render();},`chip ${state.workspace.selected.includes(id)?'active':''}`))),
   el('div',{class:`workspace-grid count-${state.workspace.selected.length}`},...state.workspace.selected.map(workspaceCard))
 ),[btn('20ER-FELD',()=>nav('twentyTool'),'action soft'),btn('100ER-FELD',()=>nav('hundredTool'),'action soft'),btn('ZAHLENSTRAHL',()=>nav('lineTool'),'action soft'),btn('ANDERE ZAHL',()=>{state.drawer=true;render();},'action soft'),btn('ALLES AUFDECKEN',()=>{state.workspace.hidden=[];render();},'action primary')],'Bis zu drei Darstellungen derselben Zahl gleichzeitig.');
}
// ---------- Interaktives Zwanzigerfeld ----------
function twentyCounts(){
  const t=state.twentyTool,cells=t.cells;
  return {blue:cells.filter(x=>x==='blue').length,red:cells.filter(x=>x==='red').length,total:cells.filter(Boolean).length,removed:t.removed.length,requested:t.removed.length+t.pendingRemove};
}
function clearRemovalHistory(){const t=state.twentyTool;t.removed=[];t.pendingRemove=0;}
function addTwenty(color,count=1){
  const t=state.twentyTool; clearRemovalHistory(); let left=count;
  for(let i=0;i<20&&left>0;i++) if(!t.cells[i]){t.cells[i]=color;left--;}
  render();
}
function takeTwenty(count=1){
  const t=state.twentyTool; let left=count;
  for(let i=19;i>=0&&left>0;i--) if(t.cells[i]){t.removed.push({color:t.cells[i],origin:i});t.cells[i]=null;left--;}
  t.pendingRemove+=left; render();
}
function takeTwentyCell(i){
  const t=state.twentyTool;if(!t.cells[i])return;
  t.removed.push({color:t.cells[i],origin:i});t.cells[i]=null;render();
}
function restoreRemoved(index){
  const t=state.twentyTool,item=t.removed[index];if(!item)return;
  let target=!t.cells[item.origin]?item.origin:t.cells.findIndex(x=>!x);if(target<0)return;
  t.cells[target]=item.color;t.removed.splice(index,1);render();
}
function deleteTwentyCell(i){const t=state.twentyTool;if(t.cells[i]){t.cells[i]=null;clearRemovalHistory();render();}}
function removedTwentyTray(){
  const t=state.twentyTool;if(!t.removed.length&&!t.pendingRemove)return null;
  return el('div',{class:'twenty-removed-tray','aria-label':'Weggenommene Plättchen'},
    ...t.removed.map((item,i)=>el('button',{class:'removed-disc-btn',onClick:()=>restoreRemoved(i),'aria-label':'Weggenommenes Plättchen zurücklegen'},el('span',{class:`twenty-disc ${item.color}`}))),
    ...Array.from({length:t.pendingRemove},()=>el('span',{class:'missing-disc','aria-label':'Weiteres Plättchen müsste weggenommen werden'}))
  );
}
function interactiveTwentyGrid(){
  const t=state.twentyTool;
  const cells=Array.from({length:20},(_,i)=>{const val=t.cells[i];return el('button',{class:`twenty-cell ${val?'occupied':''} ${val||''}`,'aria-label':val?`Feld ${i+1}: ${val==='blue'?'blaues':'rotes'} Plättchen`:`Feld ${i+1}: leer`,onClick:()=>{
    if(t.mode==='remove'){takeTwentyCell(i);return;}
    if(t.mode==='delete'){deleteTwentyCell(i);return;}
    clearRemovalHistory();if(val===t.mode)t.cells[i]=null;else t.cells[i]=t.mode;render();
  }},val?el('span',{class:`twenty-disc ${val}`,'aria-hidden':'true'}):null);});
  return el('div',{class:`twenty-tool-wrap ${t.covered?'covered':''}`},el('div',{class:'interactive-twenty','aria-label':'Zwanzigerfeld mit zwei Reihen und Fünferstruktur'},...cells),t.covered?el('div',{class:'twenty-cover','aria-label':'Zwanzigerfeld abgedeckt'}):null);
}
function renderTwentyTool(){
  const t=state.twentyTool,c=twentyCounts();
  let equation=null;if(t.showEquation){if(c.requested){const start=c.total+c.removed;equation=el('div',{class:'twenty-equation'},`${start} − ${c.requested} = ${t.pendingRemove?'?':c.total}`);}else equation=el('div',{class:'twenty-equation'},`${c.blue} + ${c.red} = ${c.total}`);}
  const number=t.showNumber?el('div',{class:'twenty-total'},c.total):null;
  const controls=el('div',{class:'twenty-controls'},
    btn('🔵 BLAU',()=>{t.mode='blue';render();},`action ${t.mode==='blue'?'primary':'soft'}`),
    btn('🔴 ROT',()=>{t.mode='red';render();},`action ${t.mode==='red'?'primary':'soft'}`),
    btn('↟ WEGNEHMEN',()=>{t.mode='remove';render();},`action ${t.mode==='remove'?'primary':'soft'}`),
    btn('⌫ LÖSCHEN',()=>{t.mode='delete';render();},`action ${t.mode==='delete'?'primary':'soft'}`)
  );
  return stage('Zwanzigerfeld',el('div',{class:'twenty-tool'},controls,removedTwentyTray(),interactiveTwentyGrid(),number,equation),[
    btn('+1',()=>addTwenty(t.mode==='red'?'red':'blue',1),'action soft',{disabled:t.mode==='remove'||t.mode==='delete'||c.total>=20}),
    btn('+5',()=>addTwenty(t.mode==='red'?'red':'blue',5),'action soft',{disabled:t.mode==='remove'||t.mode==='delete'||c.total>=20}),
    btn('−1',()=>takeTwenty(1),'action soft'),
    btn('−5',()=>takeTwenty(5),'action soft'),
    btn(t.showEquation?'RECHNUNG AUSBLENDEN':'RECHNUNG ZEIGEN',()=>{t.showEquation=!t.showEquation;render();},'action soft'),
    btn(t.covered?'AUFDECKEN':'VERDECKEN',()=>{t.covered=!t.covered;render();},'action soft'),
    btn('ALLES WEG',()=>{t.cells=Array(20).fill(null);t.removed=[];t.pendingRemove=0;t.covered=false;render();},'action soft',{disabled:c.total===0&&!c.removed&&!t.pendingRemove})
  ],t.pendingRemove?'Der Wegnahmeauftrag ist größer als die vorhandene Menge. Die leeren Kreise oben zeigen, wie viele Plättchen noch fehlen.':'Weggenommene Plättchen wandern nach oben. Antippen legt sie zurück. Löschen entfernt ein Plättchen ohne Minus-Handlung.');
}

// ---------- Hunderter: zwei verschiedene mathematische Materialien ----------
function hundredBaseVisible(v){const h=state.hundredTool;if(h.labels==='all')return true;if(h.labels==='tens')return v%10===0;return false;}
function hundredLabelVisible(v){const h=state.hundredTool,k=String(v);return Object.prototype.hasOwnProperty.call(h.labelOverrides,k)?h.labelOverrides[k]:hundredBaseVisible(v);}
function setHundredBase(labels){const h=state.hundredTool;h.labels=labels;h.labelOverrides={};render();}
function toggleHundredLabel(v){const h=state.hundredTool;h.labelOverrides[String(v)]=!hundredLabelVisible(v);}
function toggleArrayValue(arr,v){return arr.includes(v)?arr.filter(x=>x!==v):[...arr,v];}
function applyHundredTable(v){const h=state.hundredTool;if(h.directTool==='toggle'){toggleHundredLabel(v);return;}if(h.directTool==='mark'){h.marks=toggleArrayValue(h.marks,v);return;}if(h.directTool==='row'){const row=Math.floor((v-1)/10);h.coveredRows=toggleArrayValue(h.coveredRows,row);return;}if(h.directTool==='col'){const col=(v-1)%10;h.coveredCols=toggleArrayValue(h.coveredCols,col);return;}}
function hundredTableInteractive(){const h=state.hundredTool;return el('div',{class:'hundred-tool-grid table-view'},...Array.from({length:100},(_,i)=>{const v=i+1,row=Math.floor(i/10),col=i%10,covered=h.coveredRows.includes(row)||h.coveredCols.includes(col),marked=h.marks.includes(v),visible=hundredLabelVisible(v);return el('button',{class:`hundred-tool-cell ${marked?'marked':''} ${covered?'group-covered':''}`,onClick:()=>{applyHundredTable(v);render();},'aria-label':covered?'abgedecktes Feld':visible?`Zahl ${v}`:`Feld ${v}`},covered?'':visible?v:'');}));}
function hundredTableToolbar(){const h=state.hundredTool;return el('div',{class:'hundred-simple-controls'},
 el('div',{class:'hundred-control-row'},el('span',{},'Zahlen:'),btn('ALLE',()=>setHundredBase('all'),`chip ${h.labels==='all'?'active':''}`),btn('ZEHNER',()=>setHundredBase('tens'),`chip ${h.labels==='tens'?'active':''}`),btn('KEINE',()=>setHundredBase('none'),`chip ${h.labels==='none'?'active':''}`)),
 el('div',{class:'hundred-control-row'},el('span',{},'Werkzeug:'),btn('ZEIGEN / VERBERGEN',()=>{h.directTool='toggle';render();},`chip ${h.directTool==='toggle'?'active':''}`),btn('MARKIEREN',()=>{h.directTool='mark';render();},`chip ${h.directTool==='mark'?'active':''}`),btn('ZEILE ABDECKEN',()=>{h.directTool='row';render();},`chip ${h.directTool==='row'?'active':''}`),btn('SPALTE ABDECKEN',()=>{h.directTool='col';render();},`chip ${h.directTool==='col'?'active':''}`)) );}
function hundredPointAngle(n){if(n>=100)return null;const full=Math.floor(n/10),rest=n%10,covers=[];if(rest===0){covers.push(el('div',{class:'angle-cover angle-bottom',style:{top:`${full*10}%`}}));}else{covers.push(el('div',{class:'angle-cover angle-bottom',style:{top:`${(full+1)*10}%`}}));covers.push(el('div',{class:'angle-cover angle-right',style:{top:`${full*10}%`,left:`${rest*10}%`,width:`${(10-rest)*10}%`}}));}return covers;}
function hundredPointsInteractive(){const h=state.hundredTool;return el('div',{class:'hundred-points-wrap true-angle'},el('div',{class:'hundred-points'},...Array.from({length:100},(_,i)=>el('div',{class:'hundred-point-cell','aria-hidden':'true'},el('span',{class:'hundred-dot point-visible'})))),hundredPointAngle(h.current));}
function setHundredCurrent(v){state.hundredTool.current=clamp(v,0,100);render();}
function hundredPointsControls(){const h=state.hundredTool;const numberControl=h.showNumber?el('label',{class:'point-number-entry'},el('span',{},'Zahl'),el('input',{type:'number',min:0,max:100,value:h.current,onChange:e=>setHundredCurrent(e.target.value)})):el('div',{class:'point-number-entry point-number-hidden','aria-label':'Zahl verborgen'},el('span',{},'Zahl'),el('span',{class:'hidden-number-symbol'},'?'));return el('div',{class:'point-direct-controls'},numberControl,el('div',{class:'point-step-buttons'},btn('−10',()=>setHundredCurrent(h.current-10),'chip'),btn('−1',()=>setHundredCurrent(h.current-1),'chip'),btn('+1',()=>setHundredCurrent(h.current+1),'chip'),btn('+10',()=>setHundredCurrent(h.current+10),'chip')),btn(h.showNumber?'ZAHL VERBERGEN':'ZAHL ZEIGEN',()=>{h.showNumber=!h.showNumber;render();},'chip'));}
function hundredMenu(){return menuPage('Hunderter','Wähle das mathematische Material.',[
 choice('▦','Hundertertafel','Positionen · Nachbarschaften · Muster',()=>{state.hundredTool.view='table';render();}),
 choice('●','Hunderterpunktefeld','Mengen · Strukturen · Abdeckwinkel',()=>{state.hundredTool.view='points';render();})
]);}
function renderHundredTool(){const h=state.hundredTool;if(h.view==='menu')return hundredMenu();
 const switcher=el('div',{class:'hundred-view-switch'},btn('HUNDERTTAFEL',()=>{h.view='table';render();},`chip ${h.view==='table'?'active':''}`),btn('PUNKTEFELD',()=>{h.view='points';render();},`chip ${h.view==='points'?'active':''}`));
 if(h.view==='points')return stage('Hunderterpunktefeld',el('div',{class:'hundred-tool'},switcher,hundredPointsControls(),h.showNumber?el('div',{class:'point-number-display'},h.current):null,hundredPointsInteractive()),[],'Der Abdeckwinkel lässt genau die eingestellte Anzahl sichtbar – von oben nach unten und von links nach rechts.');
 return stage('Hundertertafel',el('div',{class:'hundred-tool'},switcher,hundredTableToolbar(),hundredTableInteractive()),[btn('MARKIERUNGEN LÖSCHEN',()=>{h.marks=[];render();},'action soft'),btn('ABDECKUNGEN LÖSCHEN',()=>{h.coveredRows=[];h.coveredCols=[];render();},'action soft')],'Zahlen direkt zeigen/verbergen, markieren oder ganze Zeilen und Spalten abdecken.');
}

// ---------- Zahlenstrahl als offenes Tafelmaterial ----------
function linePct(v){const l=state.lineTool;return ((v-l.start)/(l.end-l.start))*100;}
function linePickFromEvent(e){const l=state.lineTool,r=e.currentTarget.getBoundingClientRect(),ratio=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));return Math.round(l.start+ratio*(l.end-l.start));}
function lineBaseLabel(v,l){const span=l.end-l.start;if(v===l.start||v===l.end)return true;return span<=20?v%5===0:v%10===0;}
function lineLabelVisible(v,l){const k=String(v);return Object.prototype.hasOwnProperty.call(l.labelOverrides,k)?l.labelOverrides[k]:lineBaseLabel(v,l);}
function lineTickClass(v,l){const span=l.end-l.start;if(span<=20)return v%5===0?'ten':'';if(v%10===0)return'ten';if(v%5===0)return'five';return'';}
function lineMarker(v,kind,label=null){return el('span',{class:`material-line-marker ${kind}`,style:{left:`${linePct(v)}%`}},label!=null?el('b',{},label):null,el('span',{class:'marker-arrow'},kind==='card'?'●':'▼'));}
function resetLineMaterial(keepRange=true){const l=state.lineTool;l.pointer=null;l.pointerReveal=false;l.labelOverrides={};l.markers=[];l.cards=[];l.activeCard=null;l.dragCard=null;l.coverStart=null;l.covers=[];l.cardInput='';if(!keepRange){l.start=0;l.end=20;l.customRange=false;}render();}
function setLineMaterialRange(a,b,custom=false){const l=state.lineTool;l.start=a;l.end=b;l.customRange=custom;resetLineMaterial(true);}
function lineRangeBar(){const l=state.lineTool;return el('div',{class:'material-range'},btn('0–20',()=>setLineMaterialRange(0,20),`chip ${l.start===0&&l.end===20&&!l.customRange?'active':''}`),btn('0–100',()=>setLineMaterialRange(0,100),`chip ${l.start===0&&l.end===100&&!l.customRange?'active':''}`),btn('Ausschnitt',()=>{l.customRange=!l.customRange;render();},`chip ${l.customRange?'active':''}`),l.customRange?el('div',{class:'range-inputs compact'},el('input',{type:'number',min:0,max:99,value:l.start,'aria-label':'von',onChange:e=>{const a=clamp(e.target.value,0,99);l.start=Math.min(a,l.end-1);resetLineMaterial(true);}}),el('span',{},'bis'),el('input',{type:'number',min:1,max:100,value:l.end,'aria-label':'bis',onChange:e=>{const b=clamp(e.target.value,1,100);l.end=Math.max(b,l.start+1);resetLineMaterial(true);}})):null);}
function addNumberCards(){const l=state.lineTool;const vals=l.cardInput.split(/[ ,;]+/).map(Number).filter(v=>Number.isFinite(v)&&v>=l.start&&v<=l.end).slice(0,6);for(const v of vals)l.cards.push({id:Date.now()+Math.random(),value:v,pos:null});l.cardInput='';render();}
function startCardDrag(e,id){state.lineTool.dragCard=id;try{e.dataTransfer.setData('text/plain',String(id));e.dataTransfer.effectAllowed='move';}catch(_){} }
function lineCardTray(){const l=state.lineTool;if(l.tool!=='card')return null;return el('div',{class:'line-card-area'},el('div',{class:'card-entry'},el('input',{type:'text',value:l.cardInput,placeholder:'z. B. 7  12  18','aria-label':'Zahlenkarten',onInput:e=>{l.cardInput=e.target.value;}}),btn('HINZUFÜGEN',addNumberCards,'action soft')),l.cards.some(c=>c.pos==null)?el('div',{class:'number-cards material-cards'},...l.cards.filter(c=>c.pos==null).map(c=>el('button',{class:'number-card',draggable:'true',onDragstart:e=>startCardDrag(e,c.id),onClick:()=>{l.activeCard=c.id;render();}},String(c.value)))):null);}
function cardMarker(c){return el('button',{class:'material-number-card placed',style:{left:`${linePct(c.pos)}%`},draggable:'true',onDragstart:e=>startCardDrag(e,c.id),onClick:e=>{e.stopPropagation();state.lineTool.activeCard=c.id;render();},title:'Zahlenkarte verschieben'},String(c.value));}
function interactiveMaterialLine(){const l=state.lineTool,span=l.end-l.start;const ticks=Array.from({length:span+1},(_,i)=>{const v=l.start+i;return el('span',{class:`tool-tick ${lineTickClass(v,l)}`,style:{left:`${i/span*100}%`}},lineLabelVisible(v,l)?el('b',{},v):null);});let marks=[];if(l.pointer!=null)marks.push(lineMarker(l.pointer,'pointer',l.pointerReveal?l.pointer:null));for(const c of l.cards)if(c.pos!=null)marks.push(cardMarker(c));
 const place=(e)=>{const v=linePickFromEvent(e);if(l.tool==='pointer'){l.pointer=v;l.pointerReveal=false;}else if(l.tool==='labels'){l.labelOverrides[String(v)]=!lineLabelVisible(v,l);}else if(l.tool==='card'&&l.activeCard!=null){const c=l.cards.find(x=>x.id===l.activeCard);if(c){c.pos=v;l.activeCard=null;}}render();};
 return el('div',{class:'material-line-wrap'},el('div',{class:'line-tool-track material-track',onClick:place,onDragover:e=>{if(l.tool==='card'){e.preventDefault();}},onDrop:e=>{if(l.tool!=='card')return;e.preventDefault();let id=l.dragCard;try{const raw=e.dataTransfer.getData('text/plain');if(raw)id=Number(raw)||raw;}catch(_){}const c=l.cards.find(x=>String(x.id)===String(id));if(c)c.pos=linePickFromEvent(e);l.dragCard=null;l.activeCard=null;render();},'aria-label':`Zahlenstrahl von ${l.start} bis ${l.end}`},...ticks,...marks));}
function lineToolBar(){const l=state.lineTool;const choose=(tool)=>{l.tool=tool;l.activeCard=null;render();};return el('div',{class:'material-tools'},btn('ZEIGER',()=>choose('pointer'),`tool-button ${l.tool==='pointer'?'active':''}`),btn('ZAHLEN ZEIGEN / VERBERGEN',()=>choose('labels'),`tool-button ${l.tool==='labels'?'active':''}`),btn('ZAHLKARTEN',()=>choose('card'),`tool-button ${l.tool==='card'?'active':''}`));}
function lineContextActions(){const l=state.lineTool;const out=[];if(l.tool==='pointer'&&l.pointer!=null){out.push(btn(l.pointerReveal?'ZAHL VERBERGEN':'ZAHL AUFDECKEN',()=>{l.pointerReveal=!l.pointerReveal;render();},'action primary'),btn('ZEIGER LÖSCHEN',()=>{l.pointer=null;l.pointerReveal=false;render();},'action soft'));}if(l.tool==='card'&&l.cards.length)out.push(btn('KARTEN LÖSCHEN',()=>{l.cards=[];l.activeCard=null;render();},'action soft'));out.push(btn('ZURÜCKSETZEN',()=>resetLineMaterial(true),'action ghost'));return out;}
function renderLineTool(){const l=state.lineTool;let hint='Tippe auf eine Stelle. Die Zahl bleibt zunächst verborgen.';if(l.tool==='labels')hint='Tippe auf eine Zahlposition: Zahl zeigen oder verbergen.';if(l.tool==='card')hint='Ziehe die Zahlenkarten direkt an ihre Stelle. Antippen und anschließend auf den Strahl tippen funktioniert ebenfalls.';return stage('Zahlenstrahl',el('div',{class:'line-material'},lineRangeBar(),lineToolBar(),lineCardTray(),el('div',{class:'line-hint'},hint),interactiveMaterialLine()),lineContextActions(),'Drei direkte Handlungen: zeigen, Zahlen ein- und ausblenden, Zahlenkarten einordnen.');}

// ---------- V5 Spiele & Routinen ----------
function gamesMenu(){return menuPage('Spiele & Routinen','Wähle zuerst die Routine. Nichts startet ungefragt.',[
 choice('□',"Zeig’s!",'Rechnen – aufschreiben – gleichzeitig zeigen.',()=>{ensureTask();nav('game');}),
 choice('B','Zahlenbingo','Hinweise lösen und passende Zahl finden.',()=>nav('bingo')),
 choice('→','Zahlenrätsel','Vorgänger, Nachfolger, zwischen, gerade Zahl.',()=>nav('riddle')),
 choice('↔','Finde die Mitte','Mitte auf einem unskalierten Rechenstrich.',()=>nav('middle')),
 choice('⇄','Darstellungen zuordnen','Welche Karten zeigen dieselbe Zahl?',()=>nav('match')),
 choice('🔎','Entdeckerpäckchen','Muster entdecken und begründen.',()=>nav('discover'))
]);}
function settingBar(...items){return el('div',{class:'game-settings'},...items);}
function rangeSelect(current,onChange){return field('Zahlenraum',selectFrom(String(current),[['10','bis 10'],['20','bis 20'],['50','bis 50'],['100','bis 100']],v=>onChange(Number(v))));}
function feedbackBox(g){if(g.selected==null)return null;return el('div',{class:`feedback ${g.selected===g.ans?'correct':'incorrect'}`},g.selected===g.ans?`✓ Richtig: ${g.ans}`:`Noch nicht. Du hast ${g.selected} gewählt.`);}
function clickableNumberLine(start,end,onPick,selected=null,solution=null){
 const line=el('div',{class:'numberline interactive'},el('div',{class:'nl-track clickable','aria-label':`Zahlenstrahl von ${start} bis ${end}`},el('span',{class:'nl-end left'},start),el('span',{class:'nl-end right'},end)));
 const track=line.querySelector('.nl-track');track.addEventListener('click',e=>{const r=track.getBoundingClientRect(),ratio=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),v=Math.round(start+ratio*(end-start));onPick(v);});
 if(selected!=null){const pct=(selected-start)/(end-start)*100;track.append(el('span',{class:'nl-marker choice-marker',style:{left:`${pct}%`}},'▼',el('b',{},selected)));}
 if(solution!=null){const pct=(solution-start)/(end-start)*100;track.append(el('span',{class:'nl-marker solution-marker',style:{left:`${pct}%`}},'▲',el('b',{},solution)));}return line;
}
function newRiddle(){const set=state.games.riddleSettings, max=set.range;let types=set.type==='mixed'?['next','prev','between','even']:[set.type];const t=types[randomInt(0,types.length-1)];let text,ans;
 if(t==='next'){const n=randomInt(0,max-1);text=`Wie heißt der Nachfolger von ${n}?`;ans=n+1}
 else if(t==='prev'){const n=randomInt(1,max);text=`Wie heißt der Vorgänger von ${n}?`;ans=n-1}
 else if(t==='between'){const a=randomInt(0,Math.max(0,max-2));text=`Welche Zahl liegt zwischen ${a} und ${a+2}?`;ans=a+1}
 else {const evens=[];for(let x=2;x<max;x+=2)evens.push(x);ans=evens[randomInt(0,evens.length-1)]||0;text=`Welche gerade Zahl liegt zwischen ${Math.max(0,ans-1)} und ${Math.min(max,ans+1)}?`}
 state.games.riddle={text,ans,selected:null,reveal:false};
}
function renderRiddle(){if(!state.games.riddle)newRiddle();const g=state.games.riddle,set=state.games.riddleSettings;const line=set.showLine?clickableNumberLine(0,set.range,v=>{g.selected=v;g.checked=false;render();},g.selected):null;return stage('Zahlenrätsel',el('div',{class:'routine'},el('div',{class:'prompt'},g.text),line,g.checked?feedbackBox(g):null,g.reveal?el('div',{class:'answer'},g.ans):null),[set.showLine?btn('PRÜFEN',()=>{if(g.selected!=null){g.checked=true;render();}},'action soft',{disabled:g.selected==null}):null,btn('LÖSUNG AUFDECKEN',()=>{g.reveal=true;render();},'action soft'),btn('NEUES RÄTSEL',()=>{newRiddle();render();},'action primary')]);}
function newMiddle(){const max=state.games.middleSettings.range,spans=[];for(let x=2;x<=Math.min(20,max);x+=2)spans.push(x);const span=spans[randomInt(0,spans.length-1)]||2,a=randomInt(0,max-span),b=a+span;state.games.middle={a,b,m:(a+b)/2,ans:(a+b)/2,selected:null,checked:false,reveal:false};}
function renderMiddle(){if(!state.games.middle)newMiddle();const g=state.games.middle;const line=clickableNumberLine(g.a,g.b,v=>{g.selected=v;g.checked=false;render();},g.selected,g.reveal?g.m:null);line.classList.add('unscaled');return stage('Finde die Mitte',el('div',{class:'routine'},el('div',{class:'prompt'},'Welche Zahl liegt genau in der Mitte?'),line,g.checked?feedbackBox(g):null),[btn('PRÜFEN',()=>{if(g.selected!=null){g.checked=true;g.reveal=true;render();}},'action soft',{disabled:g.selected==null}),btn('LÖSUNG ZEIGEN',()=>{g.reveal=true;render();},'action soft'),btn('NEUE AUFGABE',()=>{newMiddle();render();},'action primary')]);}
function newMatch(error=false){
 const target=randomInt(1,20),ids=shuffle(['symbol','word','twenty','dienes','language','ttg']);
 if(error){state.games.match={target,ids:ids.slice(0,4),error:true,bad:randomInt(0,3),selected:[],checked:false,reveal:false};}
 else {const correct=new Set(shuffle([0,1,2,3,4,5]).slice(0,3));state.games.match={target,ids,error:false,correct:[...correct],selected:[],checked:false,reveal:false};}
}
function renderMatch(){if(!state.games.match)newMatch(false);const g=state.games.match,old=state.number;const cards=g.ids.map((id,i)=>{const isCorrect=g.error?i!==g.bad:g.correct.includes(i),shownNumber=isCorrect?g.target:(g.target===20?19:g.target+1);state.number=shownNumber;const content=wsContent(id);state.number=g.target;const picked=g.selected.includes(i);let cls=picked?'selected-card':'';if(g.reveal&&g.error&&i===g.bad)cls+=' wrong';if(g.checked&&!g.error&&picked)cls+=isCorrect?' correct':' incorrect';return el('button',{class:`match-card clickable-card ${cls}`,onClick:()=>{if(g.error){g.selected=[i];g.checked=false;}else{g.selected=picked?g.selected.filter(x=>x!==i):[...g.selected,i];g.checked=false;}render();}},content);});state.number=old;let fb=null;if(g.checked){if(g.error){const ok=g.selected[0]===g.bad;fb=el('div',{class:`feedback ${ok?'correct':'incorrect'}`},ok?'✓ Genau. Woran hast du es erkannt?':'Diese Karte passt. Suche noch einmal.');}else{const ok=g.selected.length===g.correct.length&&g.selected.every(i=>g.correct.includes(i));fb=el('div',{class:`feedback ${ok?'correct':'incorrect'}`},ok?'✓ Genau. Woran erkennst du die Zahl?':'Noch nicht. Prüfe deine Auswahl.');}}return stage(g.error?'Finde den Fehler':'Darstellungen zuordnen',el('div',{class:'routine'},el('div',{class:'prompt'},g.error?`Eine Karte passt nicht zu ${g.target}. Welche?`:`Welche Karten stellen ${g.target} dar?`),el('div',{class:'match-grid'},...cards),fb),[btn('ZUORDNEN',()=>{newMatch(false);render();},'action soft'),btn('FINDE DEN FEHLER',()=>{newMatch(true);render();},'action soft'),g.error?btn('PRÜFEN',()=>{if(g.selected.length){g.checked=true;render();}},'action primary',{disabled:!g.selected.length}):btn('AUSWAHL PRÜFEN',()=>{g.checked=true;render();},'action primary'),g.error?btn('LÖSUNG ZEIGEN',()=>{g.reveal=true;render();},'action soft'):null]);}
function bingoPrompt(ans,type){if(type==='place')return `${Math.floor(ans/10)} Zehner und ${ans%10} Einer`;if(type==='next')return `Nachfolger von ${ans-1}`;if(type==='prev')return `Vorgänger von ${ans+1}`;if(type==='add'){const b=randomInt(0,ans),a=ans-b;return `${a} + ${b}`;}if(type==='sub'){const b=randomInt(0,Math.max(0,state.games.bingoSettings.range-ans)),a=ans+b;return `${a} − ${b}`;}return String(ans);}
function newBingo(){const set=state.games.bingoSettings,ans=randomInt(1,set.range);let types=set.type==='mixed'?['place','next','prev','add','sub']:[set.type];let type=types[randomInt(0,types.length-1)];if(type==='prev'&&ans>=set.range)type='place';state.games.bingo={text:bingoPrompt(ans,type),ans,reveal:false};}
function renderBingo(){if(!state.games.bingo)newBingo();const g=state.games.bingo;return stage('Zahlenbingo',el('div',{class:'routine'},el('div',{class:'prompt'},g.text),g.reveal?el('div',{class:'answer'},g.ans):null),[btn(g.reveal?'VERDECKEN':'AUFDECKEN',()=>{g.reveal=!g.reveal;render();},'action soft'),btn('NÄCHSTER HINWEIS',()=>{newBingo();render();},'action primary')]);}
function newDiscover(){const set=state.games.discoverSettings,max=set.range;let rows=[];if(set.op==='subtraction'){if(set.pattern==='constant'){const result=randomInt(2,Math.max(2,max-6)),b=randomInt(1,Math.max(1,Math.min(6,max-result-4)));rows=Array.from({length:5},(_,i)=>[result+b+i,'−',b+i,result]);}else{const b=randomInt(1,Math.max(1,Math.min(8,max-5))),base=randomInt(b+1,Math.max(b+1,max-4));rows=Array.from({length:5},(_,i)=>[base+i,'−',b,base+i-b]);}}else{if(set.pattern==='constant'){const sum=randomInt(8,max),a0=randomInt(2,Math.max(2,sum-6));rows=Array.from({length:5},(_,i)=>[a0+i,'+',sum-a0-i,sum]);}else{const b=randomInt(1,Math.max(1,Math.min(8,max-5))),base=randomInt(1,Math.max(1,max-b-4));rows=Array.from({length:5},(_,i)=>[base+i,'+',b,base+i+b]);}}state.games.discover={rows,reveal:false};}
function renderDiscover(){if(!state.games.discover)newDiscover();const g=state.games.discover;return stage('Entdeckerpäckchen',el('div',{class:'routine'},el('div',{class:'discover-pack'},...g.rows.map((r,i)=>el('div',{class:'discover-row'},i<3||g.reveal?`${r[0]} ${r[1]} ${r[2]} = ${r[3]}`:`${r[0]} ${r[1]} ${r[2]} = ___`))),el('div',{class:'discover-question'},'Was verändert sich? Was bleibt gleich? Wie geht es weiter?')),[btn('LÖSUNG ZEIGEN',()=>{g.reveal=true;render();},'action soft'),btn('NEUES PÄCKCHEN',()=>{newDiscover();render();},'action primary')]);}

function renderRoute(){
  switch(state.route){
    case'home':return home();
    case'workspace':return renderWorkspace(); case'twentyTool':return renderTwentyTool(); case'hundredTool':return renderHundredTool(); case'lineTool':return renderLineTool(); case'games':return gamesMenu(); case'bingo':return renderBingo(); case'riddle':return renderRiddle(); case'middle':return renderMiddle(); case'match':return renderMatch(); case'discover':return renderDiscover();
    case'decompose':return menuPage('Zerlegen','Wie hängt ein Ganzes mit seinen Teilen zusammen?',[choice('○','Teil–Teil–Ganzes','Eine Zerlegung untersuchen.',()=>nav('ttg')),choice('⌂','Zahlenhaus','Zerlegungen systematisch ordnen.',()=>nav('house'))]);
    case'placeMenu':return menuPage('Bündeln & Stellenwert','Wie werden aus Einern Zehner – und wie schreiben wir das?',[choice('10','Bündeln & Material','Mit Eisstielen bündeln und später zum Dienes-Material wechseln.',()=>nav('material')),choice('ZE','Stellenwert','Zehner und Einer verbunden darstellen.',()=>nav('placevalue'))]);
    case'ttg':return renderTTG(); case'house':return renderHouse(); case'material':return renderMaterial(); case'placevalue':return renderPlace(); case'connect':return renderConnect(); case'game':return renderGame(); case'quick':return renderQuick(); case'task':return renderManualTask(); default:return home();
  }
}
function render(){const root=$('#app');root.className='app';root.replaceChildren(topbar(),renderRoute(),drawer(),presentationExit());}
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.presentation){state.presentation=false;render();}});
window.__MATHE_TAFEL__={state,syncNumber,nav,generate,parts,numberWord,decomposeZE,crossesDecade,candidateTasks,totalBundling};
render();
})();
