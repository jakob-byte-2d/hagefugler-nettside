import './hagefugler-box.js?v=8';
const box=document.querySelector('hagefugler-box');
const viewer=document.querySelector('#viewer'),order=document.querySelector('#order');
let cards=[],current=0;
const editionNames={photos:'Ekte bilder',illustrations:'Tegneseriefugler'};
function showDialog(el){if(!el.open){el.showModal();document.body.classList.add('modal-open')}}
function showCard(i){if(!cards.length)return;current=(i+cards.length)%cards.length;const c=cards[current];document.querySelector('#large-card').src=c.image;document.querySelector('#large-card').alt=`${c.name} – ${editionNames[box.edition]}`;document.querySelector('#card-counter').textContent=`${c.name} · ${String(current+1).padStart(2,'0')} / ${cards.length} · ${editionNames[box.edition]}`;showDialog(viewer)}
box.addEventListener('cards-ready',e=>{cards=e.detail.slice(0,5);const rail=document.querySelector('#card-rail');rail.replaceChildren();cards.forEach((c,i)=>{const b=document.createElement('button');b.className='card-tile';b.setAttribute('aria-label',`Se ${c.name}`);b.innerHTML=`<img src="${c.image}" alt="${c.name}" loading="lazy" width="${c.width}" height="${c.height}"><span class="card-label"><span>${c.name}</span><small>${c.number} ↗</small></span>`;b.addEventListener('click',()=>showCard(i));rail.append(b)});
 const label=editionNames[box.edition];
 document.querySelectorAll('[data-edition]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.edition===box.edition)));
 document.querySelector('#edition-note').textContent=`${label} · 5 fugler fra esken`;
 if(viewer.open)showCard(current);
});
document.querySelectorAll('[data-edition]').forEach(b=>b.addEventListener('click',()=>box.setEdition(b.dataset.edition)));
box.addEventListener('inspect-card',e=>showCard(e.detail.index));
/* Mobil: esken vet hvor langt ned på siden den står, så hele esken får plass på første skjermbilde */
function placeBox(){box.style.setProperty('--above',`${Math.round(box.getBoundingClientRect().top+scrollY)}px`)}placeBox();addEventListener('resize',placeBox);
document.querySelector('#explore')?.addEventListener('click',()=>{box.toggle(true);if(innerWidth<760)box.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'center'})});
document.querySelectorAll('[data-order]').forEach(b=>b.addEventListener('click',()=>showDialog(order)));
document.querySelectorAll('dialog').forEach(d=>{d.querySelector('[data-close]').addEventListener('click',()=>d.close());d.addEventListener('close',()=>{document.body.classList.remove('modal-open')});d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()}})});
viewer.querySelector('.prev').addEventListener('click',()=>showCard(current-1));viewer.querySelector('.next').addEventListener('click',()=>showCard(current+1));
viewer.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();showCard(current-1)}if(e.key==='ArrowRight'){e.preventDefault();showCard(current+1)}});
let tx=null;viewer.addEventListener('touchstart',e=>{tx=e.touches[0].clientX},{passive:true});viewer.addEventListener('touchend',e=>{if(tx!==null&&Math.abs(e.changedTouches[0].clientX-tx)>45)showCard(current+(e.changedTouches[0].clientX<tx?1:-1));tx=null},{passive:true});
const rail=document.querySelector('#card-rail');for(const [id,dir] of [['scroll-left',-1],['scroll-right',1]])document.getElementById(id).addEventListener('click',()=>rail.scrollBy({left:dir*rail.clientWidth*.75,behavior:'smooth'}));
document.querySelector('#back-explore').addEventListener('click',()=>{order.close();showCard(current)});

/* Bestillingslisten: påmeldingen lagres i Supabase (tabellen i supabase/forhandsbestillinger.sql).
   Nettsiden kan bare legge inn påmeldinger og hente tellertallene, aldri lese navn, e-post eller mobil. */
const SUPA={url:'https://qfustbltxgbpwsntcrpd.supabase.co',key:'sb_publishable_tQmgTjIyvYtMLJRL3o2Vaw_o2sYYpYt'};
const PRICE=199,SHIPPING=69,GOAL=100,MAX=20,SHOW_FROM=25,CONTACT='post.fuglekort@gmail.com';   // SHOW_FROM: tellerne (forsiden, dialogen og takkeskjermen) vises fra dette antallet
const form=document.querySelector('#order-form'),formError=document.querySelector('#form-error'),submit=document.querySelector('#order-submit');
const kr=n=>`${n.toLocaleString('nb-NO')} kr`;
const decks=n=>`${n} kortstokk${n===1?'':'er'}`;
const delivery=()=>form.elements.levering.value;
/* Antall av hver versjon. Hver versjon har sitt eget mål på 100 kortstokker. */
const counts={photos:0,illustrations:0};let touched=false;
const total=()=>counts.photos+counts.illustrations;
const rows=[...document.querySelectorAll('.version-row')];
function chosen(c){const p=[];if(c.photos)p.push(`${c.photos} med ekte bilder`);if(c.illustrations)p.push(`${c.illustrations} med tegneseriefugler`);return p.join(' og ')}
function showCounts(){rows.forEach(r=>{const n=counts[r.dataset.version];r.querySelector('output').textContent=n;r.querySelector('[data-step="-1"]').disabled=n===0;r.querySelector('[data-step="1"]').disabled=n===MAX});updateTotal()}
function startCounts(){counts.photos=box.edition==='illustrations'?0:1;counts.illustrations=box.edition==='illustrations'?1:0;touched=false;showCounts()}
rows.forEach(r=>r.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',()=>{const k=r.dataset.version;counts[k]=Math.max(0,Math.min(MAX,counts[k]+Number(b.dataset.step)));touched=true;showCounts();if(total())formError.hidden=true})));
document.querySelectorAll('[data-order]').forEach(b=>b.addEventListener('click',()=>{if(!touched)startCounts()}));
function updateTotal(){const post=delivery()==='post',n=total();
 document.querySelector('#total-detail').textContent=n?`${chosen(counts)} · ${kr(n*PRICE)}${post?` + frakt ${kr(SHIPPING)}`:', hentes'}`:'Velg minst én kortstokk.';
 document.querySelector('#total-sum').textContent=kr(n?n*PRICE+(post?SHIPPING:0):0)}
form.addEventListener('change',e=>{if(e.target.name==='levering')updateTotal()});
startCounts();

function supa(path,body,headers={}){return fetch(SUPA.url+path,{method:'POST',headers:{apikey:SUPA.key,'Content-Type':'application/json',...headers},body:JSON.stringify(body)})}
async function fetchStatus(){try{const r=await supa('/rest/v1/rpc/forhandsbestilling_status',{});return r.ok?await r.json():null}catch(e){return null}}
/* Fra halvveis teller vi ned i stedet for opp: «64 bestilt · 36 igjen» (jo nærmere målet, jo mer drar det) */
const counted=(n,goal)=>n>=goal?`${n} bestilt. Målet er nådd!`:n>=goal/2?`${n} bestilt · ${goal-n} igjen`:`${n} av ${goal} bestilt`;
function fillBar(bar,n,goal){bar.querySelector('span').style.width=`${Math.min(100,n/goal*100)}%`;bar.setAttribute('aria-valuemax',String(goal));bar.setAttribute('aria-valuenow',String(Math.min(goal,n)))}
function countRow(name,n,goal){const row=document.createElement('div');row.className='hero-count';
 const label=document.createElement('strong');label.textContent=name;
 const bar=document.createElement('div');bar.className='progress-bar';bar.setAttribute('role','progressbar');bar.setAttribute('aria-label',`Bestilt med ${name.toLowerCase()}`);bar.setAttribute('aria-valuemin','0');bar.append(document.createElement('span'));fillBar(bar,n,goal);
 const small=document.createElement('small');small.textContent=counted(n,goal);row.append(label,bar,small);return row}
const versionCounts=s=>[['Ekte bilder',Number(s.foto)||0,'antall_foto'],['Tegneseriefugler',Number(s.illustrasjoner)||0,'antall_illustrasjoner']];
/* Forsiden: en versjon vises først når den har minst SHOW_FROM bestilte kortstokker */
function renderHero(s){const box=document.querySelector('#hero-progress'),goal=Number(s.mal)||GOAL;
 const items=versionCounts(s).filter(([,n])=>n>=SHOW_FROM);
 box.replaceChildren(...items.map(([name,n])=>countRow(name,n,goal)));
 box.hidden=!items.length}
/* Takkeskjermen: viser hvor langt versjonene du nettopp bestilte har kommet, nå med deg på listen */
let lastOrder=null;
function renderDone(s){const el=document.querySelector('#done-progress');if(!el||!lastOrder)return;const goal=Number(s.mal)||GOAL;
 const mine=versionCounts(s).filter(([,,k])=>lastOrder[k]>0),shown=mine.filter(([,n])=>n>=SHOW_FROM);
 const note=document.createElement('p');note.className='done-progress-note';
 note.textContent=shown.length?'Med deg på listen:':'Du er blant de første på listen.';
 el.replaceChildren(note,...shown.map(([name,n])=>countRow(name,n,goal)));el.hidden=false}
fetchStatus().then(s=>{if(s)renderHero(s)});
/* Dialogen: samme terskel som forsiden, så ingen ser «3 av 100» og tror at ingen vil ha esken */
async function loadProgress(){const s=await fetchStatus();if(!s)return;const goal=Number(s.mal)||GOAL;renderHero(s);renderDone(s);
 rows.forEach(row=>{const n=Number(s[row.dataset.version==='photos'?'foto':'illustrasjoner'])||0,prog=row.querySelector('.version-progress');
  prog.hidden=n<SHOW_FROM;if(prog.hidden)return;
  fillBar(prog.querySelector('.progress-bar'),n,goal);prog.querySelector('small').textContent=counted(n,goal)})}
document.querySelectorAll('[data-order]').forEach(b=>b.addEventListener('click',loadProgress));

const phone=v=>v.replace(/[\s.()-]/g,'').replace(/^(\+47|0047)/,'');
function validate(f){const v=k=>f.elements[k].value.trim();
 if(!total())return[null,'Velg minst én kortstokk.'];
 if(v('navn').length<2)return['navn','Skriv inn navnet ditt.'];
 if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v('epost')))return['epost','Skriv inn en gyldig e-postadresse.'];
 if(!/^[49]\d{7}$/.test(phone(v('mobil'))))return['mobil','Skriv inn et norsk mobilnummer med 8 siffer.'];
 if(!f.elements.samtykke.checked)return['samtykke','Du må godta vilkårene og Vipps-forespørselen for å sette deg på listen.'];
 return null}
function showError(msg,field){formError.textContent=msg;formError.hidden=false;if(field){const el=form.elements[field];el.setAttribute('aria-invalid','true');el.focus()}else if(!total())document.querySelector('.version-row [data-step="1"]').focus()}
function clearError(){formError.hidden=true;form.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'))}
form.addEventListener('input',e=>{if(e.target.getAttribute('aria-invalid')){e.target.removeAttribute('aria-invalid');formError.hidden=true}});
function showDone(d){const post=d.levering==='post',c={photos:d.antall_foto,illustrations:d.antall_illustrasjoner},n=c.photos+c.illustrations,both=c.photos&&c.illustrations;
 document.querySelector('#done-summary').textContent=`${decks(n)}: ${chosen(c)}, ${post?'sendes i posten':'hentes i Oslo'}. Blir ${both?'begge versjonene trykket':'det trykk'}, er prisen ${kr(n*PRICE+(post?SHIPPING:0))}${post?' med frakt':''}.`;
 lastOrder=d;const dp=document.querySelector('#done-progress');dp.hidden=true;dp.replaceChildren();
 document.querySelector('#order-start').hidden=true;const done=document.querySelector('#order-done');done.hidden=false;done.focus();order.scrollTop=0}
document.querySelector('#order-again').addEventListener('click',()=>{form.reset();startCounts();clearError();document.querySelector('#order-done').hidden=true;document.querySelector('#order-start').hidden=false;form.elements.navn.focus()});

form.addEventListener('submit',async e=>{e.preventDefault();clearError();
 const post=delivery()==='post',v=k=>form.elements[k].value.trim();
 const d={navn:v('navn'),epost:v('epost').toLowerCase(),mobil:phone(v('mobil')),antall_foto:counts.photos,antall_illustrasjoner:counts.illustrations,levering:post?'post':'hent',samtykke:form.elements.samtykke.checked};
 if(v('nettside')){showDone(d);return}                     // fylt ut av en robot
 const bad=validate(form);if(bad){showError(bad[1],bad[0]);return}
 submit.disabled=true;submit.firstChild.textContent='Sender … ';
 try{const r=await supa('/rest/v1/forhandsbestillinger?columns=navn,epost,mobil,antall_foto,antall_illustrasjoner,levering,samtykke',d,{Prefer:'return=minimal'});
  if(r.ok){showDone(d);loadProgress();return}
  let j={};try{j=await r.json()}catch(x){}
  if(r.status===409||j.code==='23505')showError(`Denne e-postadressen står allerede på listen. Vil du endre noe, skriv til ${CONTACT}.`,'epost');
  else if(j.code==='P0001'&&j.message)showError(j.message);
  else showError(`Påmeldingen ble ikke lagret. Prøv igjen, eller skriv til ${CONTACT}.`)}
 catch(x){showError('Fikk ikke kontakt. Sjekk nettet og prøv igjen.')}
 finally{submit.disabled=false;submit.firstChild.textContent='Sett meg på listen '}});

/* «Mer om Hagefugler»: lenker til et lukket felt (for eksempel #kilder i bunnteksten) åpner feltet */
function openDetails(id){const d=id&&document.getElementById(id);if(d&&d.tagName==='DETAILS'){d.open=true;return d}return null}
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',()=>openDetails(a.getAttribute('href').slice(1))));
addEventListener('hashchange',()=>openDetails(location.hash.slice(1)));
{const d=openDetails(location.hash.slice(1));if(d)requestAnimationFrame(()=>d.scrollIntoView())}

/* «For iPhone» og Google Play-merket vises for alle, så alle ser at appen finnes for begge. «For iPhone» viser på
   telefoner hvordan man legger appen på Hjem-skjermen på iPhone; PC og nettbrett går rett til appen. */
{const guide=document.querySelector('#app-guide'),ua=navigator.userAgent;
 const telefon=/iPhone|iPod/.test(ua)||(/Android/.test(ua)&&/Mobile/.test(ua));
 document.querySelector('#app-link')?.addEventListener('click',e=>{if(!telefon||!guide)return;e.preventDefault();showDialog(guide)})}
