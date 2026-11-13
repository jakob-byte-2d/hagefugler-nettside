const ROOT = new URL('.', import.meta.url);
const asset = name => new URL(`assets/${name}`, ROOT).href;
// Lid/tuck geometry: the tongue slides through the inner front gap until
// its tip clears the rim, then unfolds above the box. Angles in degrees.
export function lidPose(progress) {
  const theta=108*Math.max(0,Math.min(1,progress)),rad=Math.PI/180;
  const guided=angle=>Math.asin(79*(1-Math.cos(angle*rad))/43)/rad-90-angle;
  const tuck=theta<=36?guided(theta):guided(36)*(108-theta)/72;
  return {theta,tuck};
}
class HagefuglerBox extends HTMLElement {
  constructor() {
    super(); this.attachShadow({mode:'open'}); this.opened=false; this.rx=-12; this.ry=-27; this.index=0; this.cards=[]; this.catalog=[]; this.edition='photos'; this.busy=false; this.phaseTimers=[]; this.lidProgress=0; this.lidFrame=null; this.shown={rx:-12,ry:-27}; this.lightFrame=null;
  }
  async connectedCallback() {
    this.shadowRoot.innerHTML=`
    <style>
    :host{display:block;color:#162f35;--navy:#12333f;--cream:#f5efdc;font-family:Arial,sans-serif}*{box-sizing:border-box}button{font:inherit;color:inherit;cursor:pointer}button:focus-visible,.stage:focus-visible{outline:3px solid #d66d3e;outline-offset:5px}
    .edition-picker{display:flex;justify-content:center;gap:5px;margin:0 0 13px}:host([no-picker]) .edition-picker{display:none}.edition-picker button{border:1px solid #c9ccbc;border-radius:24px;background:transparent;padding:11px 14px;font-size:11px;color:#16343b;cursor:pointer}.edition-picker button[aria-pressed="true"]{background:#16343b;color:#fff;border-color:#16343b}.edition-picker button:hover{box-shadow:0 0 0 1px #738472}.wrap{position:relative}.stage{height:570px;position:relative;perspective:1300px;overflow:hidden;cursor:grab;touch-action:pan-y;user-select:none;outline-offset:-5px}.stage:active{cursor:grabbing}.halo{position:absolute;width:470px;height:470px;border-radius:50%;background:radial-gradient(circle,#e9e1c8 0%,#eee8d5 60%,transparent 71%);left:50%;top:50%;transform:translate(-50%,-46%)}.halo:after{content:'';position:absolute;inset:-24px;border:1px solid #ded7c5;border-radius:50%;transform:rotateX(32deg)}.shadow{position:absolute;width:285px;height:42px;border-radius:50%;background:#23322930;filter:blur(19px);top:calc(50% + 182px);left:50%;transform:translateX(-50%);transition:.8s}
    .rig{position:absolute;left:50%;top:50%;width:260px;height:360px;margin-left:-130px;margin-top:-164px;transform-style:preserve-3d;transform:rotateX(-12deg) rotateY(-27deg);transition:transform .7s cubic-bezier(.2,.8,.2,1)}.dragging .rig{transition:none}.box,.face,.hinge,.deck,.card,.lid,.tuck{position:absolute;transform-style:preserve-3d}.box{width:260px;height:360px;inset:0}.face{backface-visibility:hidden;background:#f0e7cc;background-size:100% 100%;box-shadow:inset 0 0 0 .6px #75673c33}.front{inset:0;transform:translateZ(41px);background-image:url('${asset('box-front.webp')}')}.back{inset:0;transform:rotateY(180deg) translateZ(41px);background-image:url('${asset('box-back.webp?v=2')}')}.side{width:82px;height:360px;left:89px;top:0}.left{transform:rotateY(-90deg) translateZ(130px);background-image:linear-gradient(#00000018,#00000018),url('${asset('box-left.webp')}')}.right{transform:rotateY(90deg) translateZ(130px);background-image:linear-gradient(#00000009,#00000009),url('${asset('box-right.webp')}')}.bottom{width:260px;height:82px;left:0;top:319px;transform:rotateX(-90deg);background-image:url('${asset('box-bottom.webp')}')}.inside{position:absolute;inset:1px;background:#d9c9a4;transform:translateZ(-40px)}
    /* Back hinge, exterior normal points upward when shut. The inner paper
       and printed outside are separate planes, never mirrored textures. */
    .hinge{top:0;left:0;width:260px;height:0;transform:translateZ(-41px) rotateX(var(--lid-angle,0deg))}
    .lid{width:260px;height:82px;left:0;top:0;transform-origin:top;transform:rotateX(90deg)}
    .lid-surface,.tuck-surface{position:absolute;inset:0;backface-visibility:hidden;background:#e4d6b6}
    .lid-outside{background:#efe5cb url('${asset('box-top.webp')}') center/100% 100%;transform:translateZ(.3px)}
    .lid-inside{transform:rotateY(180deg) translateZ(.3px);box-shadow:inset 0 0 0 1px #bcae8b}
    .tuck{left:3px;top:79px;width:254px;height:43px;transform-origin:top;transform:rotateX(var(--tuck-angle,-90deg))}
    .tuck-surface{border-radius:0 0 24px 24px}.tuck-outside{transform:translateZ(.3px);background:#eee4c9 url('${asset('box-tuck.webp')}') center/100% 100%}.tuck-inside{transform:rotateY(180deg) translateZ(.3px)}
    .deck{inset:0}.stack{position:absolute;left:8px;top:8px;width:244px;height:344px;transform-style:preserve-3d;transform:translateY(0);transition:transform .7s cubic-bezier(.4,0,.2,1)}
    .stack-face{position:absolute;backface-visibility:hidden;background:#f7f3e6;box-shadow:inset 0 0 0 .5px #b7af9a}.stack-front,.stack-back{inset:0;border-radius:9px;background:#eee6cf url('${asset('box-front.webp')}') center/100% 100%}.stack-front{transform:translateZ(27px)}.stack-back{transform:rotateY(180deg) translateZ(35px)}
    .stack-top,.stack-bottom{left:0;width:244px;height:62px;top:-31px;background:repeating-linear-gradient(0deg,#fffdf6 0px,#fffdf6 .85px,#c8c1b0 1px,#e8e2d4 1.2px);transform:translateZ(-4px) rotateX(90deg)}.stack-bottom{top:313px;transform:translateZ(-4px) rotateX(-90deg)}
    .stack-left,.stack-right{left:91px;top:0;width:62px;height:344px;background:repeating-linear-gradient(90deg,#fffdf6 0px,#fffdf6 .85px,#c8c1b0 1px,#e8e2d4 1.2px)}.stack-left{transform:translateZ(-4px) rotateY(-90deg) translateZ(122px)}.stack-right{transform:translateZ(-4px) rotateY(90deg) translateZ(122px)}
    .card{width:238px;height:333px;left:11px;top:11px;padding:0;border:0;transform:translate3d(0,0,30px);transition:transform .7s cubic-bezier(.4,0,.2,1)}
    .card-face{position:absolute;inset:0;border-radius:11px;backface-visibility:hidden;box-shadow:0 0 0 .6px #beb5a0;background:#fff}.card-front{transform:translateZ(.4px)}.card-back{transform:rotateY(180deg) translateZ(.4px);background:#eee6cf url('${asset('box-front.webp')}') center/100% 100%}.card img{width:100%;height:100%;display:block;border-radius:11px;pointer-events:none}
    .card[data-slot="1"]{transform:translate3d(0,0,33px)}.card[data-slot="2"]{transform:translate3d(0,0,36px)}
    .opened .rig{margin-top:-115px;scale:.84}.cards-raised .stack{transform:translateY(-58px)}
    /* Keep cards inside the opening's x/z bounds for their entire travel. */
    .cards-raised .card[data-slot="0"]{transform:translate3d(0,-111px,30px)}.cards-raised .card[data-slot="1"]{transform:translate3d(0,-143px,33px)}.cards-raised .card[data-slot="2"]{transform:translate3d(0,-175px,36px)}.cards-raised .card{cursor:zoom-in}.cards-raised .card:hover{filter:brightness(1.03)}
    .hint{position:absolute;left:0;right:0;bottom:9px;text-align:center;font-size:11px;letter-spacing:1.1px;color:#6e7569;pointer-events:none}.tools{display:flex;gap:9px;align-items:center;justify-content:center;margin:12px 0 0;flex-wrap:wrap}.tools button{border:1px solid #c9ccbc;background:#ffffff60;border-radius:30px;padding:12px 17px;font-size:12px;display:flex;align-items:center;gap:8px;transition:background .2s}.tools button:hover{background:#fff}.tools .primary{background:var(--navy);border-color:var(--navy);color:#fff}.tools .primary:hover{background:#235466}.badge{position:absolute;top:32px;right:10px;font-size:10px;letter-spacing:1.7px;color:#546b65;display:flex;align-items:center;gap:6px}.badge:before{content:'';width:5px;height:5px;background:#c37246;border-radius:50%}.rotate{font-size:17px;line-height:10px}
    @media(max-width:600px){.stage{height:480px;height:clamp(240px,calc(100vh - var(--above,0px) - 112px),480px);height:clamp(240px,calc(100svh - var(--above,0px) - 112px),480px);perspective:1100px}.rig{scale:calc(.79*var(--fit,1));margin-top:calc(20px*var(--fit,1) - 180px)}.halo{width:calc(340px*var(--fit,1));height:calc(340px*var(--fit,1))}.shadow{width:calc(220px*var(--fit,1));top:calc(50% + 133px*var(--fit,1))}.opened .rig{scale:calc(.69*var(--fit,1));margin-top:calc(65px*var(--fit,1) - 180px)}:host([no-picker]) .stage{height:clamp(240px,calc(100vh - var(--above,0px) - 64px),480px);height:clamp(240px,calc(100svh - var(--above,0px) - 64px),480px)}:host([no-picker]) .rig{scale:calc(.86*var(--fit,1));margin-top:calc(-36px*var(--fit,1) - 180px)}:host([no-picker]) .opened .rig{scale:calc(.74*var(--fit,1));margin-top:calc(30px*var(--fit,1) - 180px)}:host([no-picker]) .halo{margin-top:calc(-56px*var(--fit,1))}:host([no-picker]) .shadow{top:calc(50% + 88px*var(--fit,1))}.badge{right:20px;top:10px}.tools{gap:6px}.tools button{font-size:11px;padding:11px 13px}.hint{bottom:3px}}
    @media(prefers-reduced-motion:reduce){.rig,.hinge,.tuck,.card,.shadow,.stack,.contact{transition:none}}
    /* Realisme (slås på med <hagefugler-box realisme>; fjern attributtet for å gå tilbake til den enkle esken):
       lys per flate som følger vinkelen, matt glans, brettekanter, skygge som følger esken,
       og en åpen eske med mørk innside, papptykkelse i kanten og støvklaffer. */
    .wall-in,.rim,.flap,.contact{display:none}
    :host([realisme]) .wall-in,:host([realisme]) .rim,:host([realisme]) .flap,:host([realisme]) .contact{display:block}
    .wall-in,.rim,.flap{position:absolute;transform-style:preserve-3d}
    .wall-in{backface-visibility:hidden;background:linear-gradient(#dccdaa,#b2a07a)}
    .wall-in-front{left:1px;top:1px;width:258px;height:358px;transform:rotateY(180deg) translateZ(-40px)}
    .wall-in-left,.wall-in-right{left:90px;top:1px;width:80px;height:358px}
    .wall-in-left{transform:rotateY(90deg) translateZ(-129px)}.wall-in-right{transform:rotateY(-90deg) translateZ(-129px)}
    :host([realisme]) .inside{background:linear-gradient(#d4c49e,#a6946d)}
    .rim{backface-visibility:hidden;background:#f8f2e1;box-shadow:inset 0 0 0 .4px #c6b892;opacity:0;transition:opacity .25s}
    :host([realisme]) .opened .rim{opacity:1}
    .rim-front,.rim-back{left:0;top:-1px;width:260px;height:2px}
    .rim-front{transform:translate3d(0,.8px,40px) rotateX(90deg)}.rim-back{transform:translate3d(0,.8px,-40px) rotateX(90deg)}
    .rim-left,.rim-right{top:-41px;width:2px;height:82px}
    .rim-left{left:0;transform:translateY(.8px) rotateX(90deg)}.rim-right{left:258px;transform:translateY(.8px) rotateX(90deg)}
    .flap{left:93px;top:-44px;width:74px;height:44px;transform-origin:50% 100%;border-radius:14px 14px 0 0;background:linear-gradient(#efe6cb,#e1d5b3);box-shadow:inset 0 0 0 .5px #b9ab86}
    .flap-left{transform:rotateY(-90deg) translateZ(129px) rotateX(var(--flap-angle,92deg))}
    .flap-right{transform:rotateY(90deg) translateZ(129px) rotateX(var(--flap-angle,92deg))}
    :host([realisme]) .face{box-shadow:inset 0 0 0 .7px rgba(255,250,236,.55),inset 0 0 16px rgba(92,72,30,.10)}
    :host([realisme]) .front{background-image:linear-gradient(100deg,transparent calc(var(--gx-front,60%) - 24%),rgba(255,253,246,var(--sp-front,0)) var(--gx-front,60%),transparent calc(var(--gx-front,60%) + 24%)),linear-gradient(rgba(46,34,16,var(--sa-front,0)),rgba(46,34,16,var(--sb-front,0))),url('${asset('box-front.webp')}')}
    :host([realisme]) .back{background-image:linear-gradient(100deg,transparent calc(var(--gx-back,60%) - 24%),rgba(255,253,246,var(--sp-back,0)) var(--gx-back,60%),transparent calc(var(--gx-back,60%) + 24%)),linear-gradient(rgba(46,34,16,var(--sa-back,0)),rgba(46,34,16,var(--sb-back,0))),url('${asset('box-back.webp?v=2')}')}
    :host([realisme]) .left{background-image:linear-gradient(100deg,transparent calc(var(--gx-left,60%) - 30%),rgba(255,253,246,var(--sp-left,0)) var(--gx-left,60%),transparent calc(var(--gx-left,60%) + 30%)),linear-gradient(rgba(46,34,16,var(--sa-left,0)),rgba(46,34,16,var(--sb-left,0))),url('${asset('box-left.webp')}')}
    :host([realisme]) .right{background-image:linear-gradient(100deg,transparent calc(var(--gx-right,60%) - 30%),rgba(255,253,246,var(--sp-right,0)) var(--gx-right,60%),transparent calc(var(--gx-right,60%) + 30%)),linear-gradient(rgba(46,34,16,var(--sa-right,0)),rgba(46,34,16,var(--sb-right,0))),url('${asset('box-right.webp')}')}
    :host([realisme]) .bottom{background-image:linear-gradient(rgba(46,34,16,var(--sa-bottom,.2)),rgba(46,34,16,var(--sb-bottom,.2))),url('${asset('box-bottom.webp')}')}
    :host([realisme]) .lid-outside{background-image:linear-gradient(100deg,transparent calc(var(--gx-top,60%) - 24%),rgba(255,253,246,var(--sp-top,0)) var(--gx-top,60%),transparent calc(var(--gx-top,60%) + 24%)),linear-gradient(rgba(46,34,16,var(--sa-top,0)),rgba(46,34,16,var(--sb-top,0))),url('${asset('box-top.webp')}');box-shadow:inset 0 0 0 .7px rgba(255,250,236,.5),inset 0 0 12px rgba(92,72,30,.08)}
    :host([realisme]) .lid-inside,:host([realisme]) .tuck-inside{background:linear-gradient(#e2d4b1,#d2c29c)}
    :host([realisme]) .shadow{transform:translateX(-50%) scaleX(var(--shadow-sx,1))}
    .contact{position:absolute;left:50%;top:calc(50% + 190px);width:230px;height:30px;transform:translateX(-50%) scaleX(var(--shadow-sx,1));background:radial-gradient(closest-side,rgba(30,36,28,.40),rgba(30,36,28,.15) 55%,rgba(30,36,28,0));pointer-events:none;transition:top .7s}
    :host([realisme]) .opened .contact{top:calc(50% + 208px)}
    @media(max-width:600px){.contact{width:calc(176px*var(--fit,1));height:calc(24px*var(--fit,1));top:calc(50% + 140px*var(--fit,1))}:host([realisme]) .opened .contact{top:calc(50% + 152px*var(--fit,1))}:host([no-picker]) .contact{top:calc(50% + 96px*var(--fit,1))}:host([realisme][no-picker]) .opened .contact{top:calc(50% + 112px*var(--fit,1))}}

    </style>
    <div class="edition-picker" role="group" aria-label="Velg versjon"><button data-edition="photos" aria-pressed="true">Ekte bilder</button><button data-edition="illustrations" aria-pressed="false">Tegneseriefugler</button></div><div class="wrap"><div class="stage" tabindex="0" role="group" aria-label="Interaktiv eske. Dra eller bruk piltastene for å rotere. Enter åpner esken."><div class="halo"></div><div class="shadow"></div><div class="contact"></div><div class="rig"><div class="box"><div class="inside"></div><div class="wall-in wall-in-front"></div><div class="wall-in wall-in-left"></div><div class="wall-in wall-in-right"></div><div class="rim rim-front"></div><div class="rim rim-back"></div><div class="rim rim-left"></div><div class="rim rim-right"></div><div class="flap flap-left"></div><div class="flap flap-right"></div><div class="deck"><div class="stack" aria-hidden="true"><div class="stack-face stack-front"></div><div class="stack-face stack-back"></div><div class="stack-face stack-top"></div><div class="stack-face stack-bottom"></div><div class="stack-face stack-left"></div><div class="stack-face stack-right"></div></div></div><div class="face back"></div><div class="face left side"></div><div class="face right side"></div><div class="face bottom"></div><div class="face front"></div><div class="hinge"><div class="lid"><div class="lid-surface lid-outside"></div><div class="lid-surface lid-inside"></div><div class="tuck"><div class="tuck-surface tuck-outside"></div><div class="tuck-surface tuck-inside"></div></div></div></div></div></div><p class="hint">DRA FOR Å ROTERE · TRYKK FOR Å SE INNHOLDET</p></div><div class="tools"><button class="primary toggle" aria-expanded="false"><span>↗</span><span class="label">Åpne esken</span></button><button class="inspect">Se smakebiten <span>→</span></button><button class="reset" aria-label="Tilbakestill vinkel"><span class="rotate">↻</span> Nullstill</button></div></div>`;
    const $=s=>this.shadowRoot.querySelector(s);this.$=$;
    this.shadowRoot.querySelectorAll('[data-edition]').forEach(b=>b.addEventListener('click',()=>this.setEdition(b.dataset.edition)));
    $('.toggle').addEventListener('click',()=>this.toggle());$('.reset').addEventListener('click',()=>{this.rx=-12;this.ry=-27;this.paint()});$('.inspect').addEventListener('click',()=>this.inspect(this.index));
    let drag=null;
    /* Mobil: scenen følger skjermhøyden (CSS); --fit skalerer 3D-esken med, så hele esken får plass på skjermen */
    {const stage=$('.stage'),fit=()=>{const h=stage.clientHeight;if(h)this.style.setProperty('--fit',String(Math.min(1,h/480)))};fit();if('ResizeObserver' in window)new ResizeObserver(fit).observe(stage)}
    if(this.hasAttribute('realisme'))this.applyLight(this.rx,this.ry);
    $('.stage').addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={x:e.clientX,y:e.clientY,rx:this.rx,ry:this.ry,moved:false};$('.stage').setPointerCapture(e.pointerId);$('.wrap').classList.add('dragging')});
    $('.stage').addEventListener('pointermove',e=>{if(!drag)return;let dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>5)drag.moved=true;if(drag.moved){this.ry=drag.ry+dx*.5;this.rx=Math.max(-55,Math.min(40,drag.rx-dy*.24));this.paint()}});
    const end=e=>{if(!drag)return;const moved=drag.moved;drag=null;$('.wrap').classList.remove('dragging');if(!moved&&e.type==='pointerup'){const el=this.shadowRoot.elementFromPoint(e.clientX,e.clientY)?.closest('.card');if(el&&this.opened)this.inspect(Number(el.dataset.index));else this.toggle()}};
    $('.stage').addEventListener('pointerup',end);$('.stage').addEventListener('pointercancel',end);
    $('.stage').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();this.toggle()}else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')this.ry-=15;if(e.key==='ArrowRight')this.ry+=15;if(e.key==='ArrowUp')this.rx=Math.max(-55,this.rx-10);if(e.key==='ArrowDown')this.rx=Math.min(40,this.rx+10);this.paint()}});
    try{
      this.catalog=(await fetch(asset('cards.json')).then(r=>{if(!r.ok)throw Error('cards');return r.json()})).slice(0,5).map(c=>({...c,variants:Object.fromEntries(Object.entries(c.variants).map(([key,path])=>[key,new URL(path,ROOT).href]))}));
      this.setEdition(this.edition);
    }catch(e){$('.hint').textContent='Fuglene kunne ikke lastes. Last siden på nytt.'}

  }
  setEdition(edition){
    if(!['photos','illustrations'].includes(edition))return;
    this.edition=edition;
    this.shadowRoot.querySelectorAll('[data-edition]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.edition===edition)));
    if(!this.catalog.length)return;
    this.cards=this.catalog.map(c=>({...c,image:c.variants[edition]}));
    this.setCards(Math.min(this.index,this.cards.length-1));
    this.dispatchEvent(new CustomEvent('cards-ready',{detail:this.cards,bubbles:true,composed:true}));
    this.dispatchEvent(new CustomEvent('edition-change',{detail:{edition},bubbles:true,composed:true}));
  }
  paint(){this.$('.rig').style.transform=`rotateX(${this.rx}deg) rotateY(${this.ry}deg)`;this.relight()}
  /* Realisme: lyset på hver flate regnes ut fra hvor flaten vender, med lyskilden oppe til venstre foran esken. */
  applyLight(rx,ry){
    const wrap=this.$&&this.$('.wrap');if(!wrap)return;
    const D=Math.PI/180,ca=Math.cos(rx*D),sa=Math.sin(rx*D),cb=Math.cos(ry*D),sb=Math.sin(ry*D);
    const rot=([x,y,z])=>{const x1=x*cb+z*sb,z1=-x*sb+z*cb;return [x1,y*ca-z1*sa,y*sa+z1*ca]};
    const unit=v=>{const l=Math.hypot(...v);return v.map(c=>c/l)},dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
    const L=unit([-.5,-.7,.75]),H=unit([L[0],L[1],L[2]+1]),th=lidPose(this.lidProgress).theta*D;
    const faces={front:[0,0,1],back:[0,0,-1],left:[-1,0,0],right:[1,0,0],bottom:[0,1,0],top:[0,-Math.cos(th),-Math.sin(th)]};
    for(const [name,v] of Object.entries(faces)){
      const n=rot(v),d=Math.max(0,Math.min(1,dot(n,L))),base=.36*Math.pow(Math.max(0,(.75-d)/.75),1.3),h=Math.max(0,dot(n,H));
      wrap.style.setProperty(`--sa-${name}`,base.toFixed(3));
      wrap.style.setProperty(`--sb-${name}`,Math.min(.5,base+.03).toFixed(3));
      wrap.style.setProperty(`--sp-${name}`,(.26*Math.pow(h,6)).toFixed(3));
      wrap.style.setProperty(`--gx-${name}`,Math.max(-40,Math.min(140,50-160*(n[0]-H[0]))).toFixed(1)+'%');
    }
    wrap.style.setProperty('--shadow-sx',Math.max(.45,(Math.abs(260*cb)+Math.abs(82*sb))/268.9).toFixed(3));
  }
  relight(){
    if(!this.hasAttribute('realisme'))return;
    const to={rx:this.rx,ry:this.ry};
    if(this.lightFrame){cancelAnimationFrame(this.lightFrame);this.lightFrame=null}
    if(this.$('.wrap').classList.contains('dragging')||matchMedia('(prefers-reduced-motion:reduce)').matches){this.shown=to;this.applyLight(to.rx,to.ry);return}
    const from={...this.shown};let t0;
    const step=now=>{if(t0===undefined)t0=now;const t=Math.min(1,(now-t0)/700),e=1-Math.pow(1-t,3);
      this.shown={rx:from.rx+(to.rx-from.rx)*e,ry:from.ry+(to.ry-from.ry)*e};this.applyLight(this.shown.rx,this.shown.ry);
      this.lightFrame=t<1?requestAnimationFrame(step):null};
    this.lightFrame=requestAnimationFrame(step);
  }

  setLidProgress(progress){
    this.lidProgress=progress;
    const {theta,tuck}=lidPose(progress),style=this.$('.wrap').style;
    style.setProperty('--lid-angle',theta+'deg');style.setProperty('--tuck-angle',tuck+'deg');
    const fp=Math.max(0,Math.min(1,(progress-.3)/.7));style.setProperty('--flap-angle',(92-fp*102).toFixed(1)+'deg');
    if(this.hasAttribute('realisme'))this.applyLight(this.shown.rx,this.shown.ry);
  }
  animateLid(target){
    if(matchMedia('(prefers-reduced-motion:reduce)').matches){this.setLidProgress(target);return Promise.resolve()}
    const start=this.lidProgress;
    return new Promise(resolve=>{
      let started;
      const frame=now=>{
        if(started===undefined)started=now;
        const t=Math.min(1,(now-started)/1100),ease=t*t*(3-2*t);
        this.setLidProgress(start+(target-start)*ease);
        if(t<1)this.lidFrame=requestAnimationFrame(frame);else {this.lidFrame=null;resolve()}
      };
      this.lidFrame=requestAnimationFrame(frame);
    });
  }
  pauseForCards(){return new Promise(resolve=>this.phaseTimers.push(setTimeout(resolve,matchMedia('(prefers-reduced-motion:reduce)').matches?0:750)))}
  async toggle(force){
    if(this.busy)return;
    const next=typeof force==='boolean'?force:!this.opened;
    if(next===this.opened)return;
    this.opened=next;this.busy=true;
    const wrap=this.$('.wrap'),button=this.$('.toggle');
    button.disabled=true;button.setAttribute('aria-expanded',next);
    this.$('.label').textContent=next?'Lukk esken':'Åpne esken';
    this.$('.hint').textContent=next?'ÅPNER ESKEN …':'LEGGER FUGLENE TILBAKE …';
    if(next){
      this.rx=-19;this.ry=-25;this.paint();wrap.classList.add('opened');
      await this.animateLid(1);
      wrap.classList.add('cards-raised');
      await this.pauseForCards();
    }else{
      wrap.classList.remove('cards-raised');
      await this.pauseForCards();
      await this.animateLid(0);
      wrap.classList.remove('opened');
    }
    this.busy=false;button.disabled=false;
    this.$('.hint').textContent=next?'TRYKK PÅ EN FUGL FOR Å SE SMAKEBITEN':'DRA FOR Å ROTERE · TRYKK FOR Å SE INNHOLDET';
  }
  disconnectedCallback(){this.phaseTimers.forEach(clearTimeout);if(this.lidFrame!==null)cancelAnimationFrame(this.lidFrame);if(this.lightFrame)cancelAnimationFrame(this.lightFrame)}
  setCards(index){if(!this.cards.length)return;this.index=index;this.shadowRoot.querySelectorAll('.card').forEach(c=>c.remove());[1,2,0].forEach((offset,slot)=>{let i=(index+offset)%this.cards.length,c=this.cards[i];let b=document.createElement('div');b.className='card';b.dataset.index=i;b.dataset.slot=slot;b.innerHTML=`<div class="card-face card-front"><img src="${c.image}" alt="${c.name}" draggable="false"></div><div class="card-face card-back" aria-hidden="true"></div>`;this.$('.deck').append(b)})}
  inspect(index){this.dispatchEvent(new CustomEvent('inspect-card',{detail:{index,cards:this.cards},bubbles:true,composed:true}))}
}
customElements.define('hagefugler-box',HagefuglerBox);
