const assert=require('assert');
global.localStorage={_d:{},getItem(k){return this._d[k]||null},setItem(k,v){this._d[k]=v}};
const V=require('../js/voice.js');
const v=(name,lang,extra)=>Object.assign({name,lang,voiceURI:name,localService:true},extra);
const all=[v('Samantha','en-US'),v('Eddy (Spanish (Mexico))','es-MX'),v('Monica','es-ES'),v('Google español de Estados Unidos','es-US',{localService:false}),v('Paulina','es_MX'),v('Juan (Premium)','es-MX')];
assert.strictEqual(V.pickVoice(all).name,'Juan (Premium)');
assert.strictEqual(V.pickVoice(all.filter(x=>x.name!=='Juan (Premium)')).name,'Paulina');
assert.strictEqual(V.pickVoice([v('Eddy (Spanish (Mexico))','es-MX'),v('Monica','es-ES'),v('Google español de Estados Unidos','es-US')]).name,'Google español de Estados Unidos'.replace('Google español de Estados Unidos','Google español de Estados Unidos'));
assert.strictEqual(V.pickVoice([v('Samantha','en-US'),v('Monica','es-ES')]).name,'Monica');
assert.strictEqual(V.pickVoice([v('Samantha','en-US')]),null);
assert.strictEqual(V.pickVoice(all,'Paulina').name,'Paulina'); // user choice wins
assert.ok(V.sorted(all).every(x=>/^es/i.test(x.lang))&&V.sorted(all).length===5);
assert.strictEqual(V.clean('¡Hola! 😀 (שלום) [x] — qué tal'),'¡Hola!, qué tal');
assert.strictEqual(V.clean('Buenas noches 🌙'),'Buenas noches');
assert.strictEqual(V.clean('שלום'),'');
// empty first call, then voiceschanged
(async()=>{
  let list=[],ls=[];
  const synth={getVoices:()=>list,addEventListener:(e,f)=>ls.push(f),removeEventListener:()=>{ls=[]}};
  setTimeout(()=>{list=all;ls.forEach(f=>f())},50);
  const r=await V.ready(1000,synth); assert.strictEqual(r.length,6);
  // never fires -> times out with []
  const s2={getVoices:()=>[],addEventListener(){},removeEventListener(){}};
  const t=Date.now(); const r2=await V.ready(100,s2); assert.ok(Date.now()-t>=90);
  // speak: cancel first, word then example, lang/voice/rate
  const q=[]; let cancelled=0;
  global.SpeechSynthesisUtterance=function(t){this.text=t};
  global.speechSynthesis={getVoices:()=>all,cancel(){cancelled++;q.length=0},speak:u=>q.push(u),speaking:false,addEventListener(){}};
  V.speak(['Hola 😀','Buenos días (בוקר טוב)']);
  assert.strictEqual(cancelled,1); assert.deepStrictEqual(q.map(u=>u.text),['Hola','Buenos días']);
  assert.ok(q.every(u=>u.voice.name==='Juan (Premium)'&&u.rate===0.8&&/^es/.test(u.lang)));
  V.set({slow:true,uri:'Paulina'}); V.speak('Hola'); assert.strictEqual(q[0].rate,0.6); assert.strictEqual(q[0].voice.name,'Paulina');
  assert.strictEqual(V.get().slow,true); assert.ok(JSON.parse(localStorage.getItem('cozumel.voice')).uri==='Paulina');
  console.log('voice tests OK'); process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
