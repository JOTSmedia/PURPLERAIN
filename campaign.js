import {Adventure} from './adventure.js';

export const MISSIONS = [
  {title:'Race to the venue',short:'Night ride',kind:'ride',engine:0,goal:'Ride through the checkpoints and reach the venue before the clock runs out.',controls:'A / D or ← / → steer. W / ↑ accelerates. S / ↓ or Space brakes.',tip:'Keep moving, watch the traffic, and line up with each glowing checkpoint.',reward:'The backstage entrance is open.'},
  {title:'Get the band ready',short:'Backstage',kind:'collect',engine:1,goal:'Recover all three pieces of equipment, then take them to the stage door.',controls:'W A S D or arrow keys move. Walk up to a glowing item and press E to collect it.',tip:'Look for the numbered markers. Avoid the moving road cases and find a route around the walls.',reward:'Your equipment is ready. Time for the first set.'},
  {title:'Win the first set',short:'First set',kind:'music',track:0,yt:0,seconds:65,goal:'Keep the rhythm and hit enough notes to win the room.',controls:'Press D F J K when notes reach the bright line. On touch screens, tap the four lanes.',tip:'Start the visible YouTube player when it appears. The music and note clock pause together.',reward:'You earned the encore. Get back through the storm.'},
  {title:'Ride through the storm',short:'Storm run',kind:'ride',engine:2,goal:'Survive the harder night run and reach the final show.',controls:'A / D or ← / → steer. W / ↑ accelerates. S / ↓ or Space brakes.',tip:'Brake before tight traffic, then accelerate into a clear lane. Your bike must survive the trip.',reward:'The stage is yours. One last performance.'},
  {title:'Earn your Purple Rain encore',short:'The encore',kind:'music',track:4,yt:8,seconds:90,goal:'Finish the final performance and hit the note target to complete the game.',controls:'D F J K or tap the lanes. Build a combo for a higher score.',tip:'Follow the beat and the hit line. Missing the target lets you retry this performance.',reward:'The night belongs to you.'}
];
const $=s=>document.querySelector(s);
const safeText=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const formatTime=s=>{const n=Math.ceil(Math.max(0,s));return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;};

export class Campaign {
  constructor(options) {
    this.options=options;this.engine=null;this.state='idle';this.stage=0;this.lastFrame=0;this.lastHealth=100;this.lastCollected=0;
    this.progress={unlocked:0,best:{}};
    try {const p=JSON.parse(localStorage.getItem('purpleRainCampaign-v2'));if(p&&Number.isInteger(p.unlocked)&&p.unlocked>=0&&p.unlocked<=MISSIONS.length)this.progress={unlocked:p.unlocked,best:p.best&&typeof p.best==='object'?p.best:{}};}catch{}
    $('#missionPause').onclick=()=>this.pause();
    $('#missionAction').onclick=()=>this.engine?.action();
    $('#missionFullscreen').onclick=()=>this.fullscreen();
    document.querySelectorAll('[data-drive]').forEach(button=>{
      const release=()=>this.engine?.keyUp(button.dataset.drive);
      button.onpointerdown=e=>{e.preventDefault();button.setPointerCapture(e.pointerId);if(this.state==='playing')this.engine?.keyDown(button.dataset.drive);};
      button.onpointerup=button.onpointercancel=release;button.onlostpointercapture=release;
    });
    addEventListener('resize',()=>this.engine?.resize());
    addEventListener('keydown',e=>{
      if(this.state!=='playing'||!$('#modal').hidden)return;
      const k=e.key.length===1?e.key.toLowerCase():e.key;
      if(['w','a','s','d','e',' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(k)){
        e.preventDefault();if(k==='e'){if(!e.repeat)this.engine.action();}else this.engine.keyDown(k);
      }
    });
    addEventListener('keyup',e=>this.engine?.keyUp(e.key.length===1?e.key.toLowerCase():e.key));
    addEventListener('blur',()=>{if(this.state==='playing')this.pause();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&this.state==='playing')this.pause();});
  }
  get performanceActive(){return this.state==='performance';}
  get active(){return ['playing','paused'].includes(this.state);}
  get target(){return this.options.settings().difficulty==='easy'?25:this.options.settings().difficulty==='expert'?60:40;}
  save(){try{localStorage.setItem('purpleRainCampaign-v2',JSON.stringify(this.progress));}catch{}this.options.onChange?.();}
  reset(){this.progress={unlocked:0,best:{}};this.save();}
  stop(){this.stopEngineSound();this.engine?.pause(true);this.state='idle';$('#adventureHud').hidden=true;$('#adventureCanvas').hidden=true;$('#performanceTarget').hidden=true;document.body.classList.remove('adventureMode');}
  setQuality(q){this.engine?.setQuality(q);}
  fullscreen(){if(document.fullscreenElement)document.exitFullscreen?.();else document.documentElement.requestFullscreen?.().catch(()=>{});}
  showMissions(){
    this.options.modal(this.options.baseModal('THE ROAD TO THE ENCORE','Five missions. One night.',`<p>Ride, recover your equipment, and perform. Clear each mission to unlock the next; your best scores and unlocked missions save automatically.</p><div class="missionList">${MISSIONS.map((m,i)=>`<button class="choice" data-mission-select="${i}" ${i>this.progress.unlocked?'disabled':''}><b>${String(i+1).padStart(2,'0')}</b><span>${m.title}<small>${this.progress.best[i]?'Best score '+Number(this.progress.best[i].score||0).toLocaleString():i>this.progress.unlocked?'Complete the previous mission to unlock':m.goal}</small></span></button>`).join('')}</div>`));
    document.querySelectorAll('[data-mission-select]').forEach(b=>b.onclick=()=>this.briefing(+b.dataset.missionSelect));
  }
  briefing(index=Math.min(this.progress.unlocked,4)){
    if(index>this.progress.unlocked||!MISSIONS[index])return;
    this.stop();this.stage=index;const m=MISSIONS[index];
    this.options.modal(this.options.baseModal(`MISSION ${String(index+1).padStart(2,'0')} / 05`,m.title,`<p class="missionGoal">${m.goal}</p><div class="missionBrief"><span>CONTROLS</span><p>${m.controls}</p><span>${m.kind==='music'?'PASS TARGET':'FIELD NOTES'}</span><p>${m.kind==='music'?`Hit at least ${this.target}% of the notes. Campaign sets last up to ${m.seconds} seconds; full songs are available in Practice.`:m.tip}</p></div><div class="modalActions"><button id="launchMission" class="primary">${m.kind==='music'?'Take the stage':'Start mission'} <span>↗</span></button><button id="briefHome" class="textBtn">Main menu</button></div>`),()=>this.options.home());
    $('#launchMission').onclick=()=>this.start(index);$('#briefHome').onclick=()=>this.options.home();
  }
  start(index){
    if(index>this.progress.unlocked||!MISSIONS[index])return;
    this.stop();this.stage=index;this.options.beforeStart();this.options.closeModal(false);
    const m=MISSIONS[index];document.body.classList.add('playing');
    if(m.kind==='music'){
      this.state='performance';$('#performanceTarget').hidden=false;$('#performanceTarget').textContent=`MISSION ${index+1}/5 · HIT ${this.target}% TO WIN`;
      this.options.perform(m);return;
    }
    this.state='playing';this.lastHealth=100;this.lastCollected=0;
    document.body.classList.add('adventureMode');$('#adventureCanvas').hidden=false;$('#adventureHud').hidden=false;$('#missionAction').hidden=m.kind!=='collect';
    $('#missionControls').textContent=m.controls;$('#driveForward').textContent=m.kind==='ride'?'↑ GAS':'↑';$('#driveBrake').textContent=m.kind==='ride'?'↓ BRAKE':'↓';
    $('#missionType').textContent=`MISSION ${index+1}/5 · ${m.kind==='ride'?'NIGHT RIDE':'BACKSTAGE'}`;
    if(!this.engine)this.engine=new Adventure($('#adventureCanvas'),{onHud:s=>this.hud(s),onComplete:r=>this.complete(r),onFail:r=>this.fail(r.reason)});
    this.engine.setQuality(this.options.settings().quality||'auto');
    this.engine.avatar=this.options.settings().avatar||'prince';
    this.engine.start(m.engine);this.lastFrame=performance.now();this.options.onState('adventure');
    this.options.audio.init();this.options.audio.muted=false;this.options.audio.setVolume(this.options.audio.volume);if(m.kind==='ride')this.startEngineSound();
  }
  update(now){if(this.state!=='playing')return;const dt=Math.min(.05,Math.max(0,(now-this.lastFrame)/1000));this.lastFrame=now;this.engine.update(dt);}
  hud(s){
    $('#missionTitle').textContent=MISSIONS[this.stage].title;
    $('#missionObjective').textContent=s.objective||MISSIONS[this.stage].goal;
    $('#missionHint').textContent=s.message||s.hint||'';
    const health=Math.max(0,Math.min(100,s.health??100));$('#missionHealthValue').textContent=Math.ceil(health)+'%';$('#missionHealth').style.width=health+'%';$('#missionHealth').classList.toggle('danger',health<35);
    $('#missionProgress').style.width=(Math.max(0,Math.min(1,s.progress||0))*100)+'%';
    $('#missionClock').textContent=formatTime(s.timeRemaining??s.time??0);
    $('#missionScore').textContent=Math.round(s.score||0).toLocaleString();
    $('#missionMetric').textContent=s.speed!==undefined?Math.round(s.speed):`${s.collected||0}/${s.total||3}`;
    $('#missionMetricLabel').textContent=s.speed!==undefined?'SPEED':'GEAR RECOVERED';
    if(health<this.lastHealth)this.sound(37,'sawtooth',.15);else if((s.collected||0)>this.lastCollected)this.sound(81,'sine',.1);
    this.lastHealth=health;this.lastCollected=s.collected||0;if(this.motor&&s.speed!==undefined)this.motor.frequency.setTargetAtTime(35+s.speed*.7,this.options.audio.ctx.currentTime,.1);
  }
  startEngineSound(){this.stopEngineSound();const a=this.options.audio;this.motor=a.ctx.createOscillator();this.motor.type='sawtooth';this.motor.frequency.value=55;this.motorGain=a.ctx.createGain();this.motorGain.gain.value=.025;const filter=a.ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=260;this.motorFilter=filter;this.motor.connect(filter);filter.connect(this.motorGain);this.motorGain.connect(a.master);this.motor.start();}
  stopEngineSound(){if(this.motor){try{this.motor.stop();}catch{}this.motor.disconnect();this.motorFilter.disconnect();this.motorGain.disconnect();this.motor=null;}}
  sound(note,type,volume){const a=this.options.audio;if(a.ctx&&!a.muted)a.tone(note,a.ctx.currentTime,.2,type,volume);}
  pause(){
    if(this.state!=='playing')return;
    this.stopEngineSound();this.engine.pause(true);this.state='paused';this.options.onState('adventurePaused');
    const resume=()=>{this.state='playing';this.lastFrame=performance.now();this.engine.pause(false);if(MISSIONS[this.stage].kind==='ride')this.startEngineSound();this.options.onState('adventure');};
    this.options.modal(this.options.baseModal('MISSION PAUSED','The night can wait.',`<div class="choices"><button class="choice" id="missionResume">Resume mission</button><button class="choice" id="missionRetry">Restart this mission</button><button class="choice" id="missionQuit">Main menu<small>Completed missions stay saved.</small></button></div>`),resume);
    $('#missionResume').onclick=()=>this.options.closeModal();$('#missionRetry').onclick=()=>this.start(this.stage);$('#missionQuit').onclick=()=>this.options.home();
  }
  fail(reason='The mission is not complete yet.'){
    this.stopEngineSound();this.engine?.pause(true);this.state='result';this.options.onState('missionResult');this.sound(40,'triangle',.1);
    $('#performanceTarget').hidden=true;
    this.options.modal(this.options.baseModal('TRY AGAIN','One more run.',`<p>${safeText(reason)}</p><p>${MISSIONS[this.stage].kind==='music'?`Hit at least ${this.target}% of the notes to clear the stage. Try Easy in Settings for fewer notes and a lower target.`:'Watch your health, use the brakes, and follow the glowing markers.'}</p><div class="modalActions"><button id="retryMission" class="primary">Retry mission ↗</button><button id="failedHome" class="textBtn">Main menu</button></div>`),()=>this.options.home());
    $('#retryMission').onclick=()=>this.start(this.stage);$('#failedHome').onclick=()=>this.options.home();
  }
  finishPerformance(result){
    $('#performanceTarget').hidden=true;
    if(result.accuracy<this.target){this.fail(`You hit ${result.accuracy}% of the notes. The target was ${this.target}%.`);return;}
    this.complete(result);
  }
  complete(result){
    this.stopEngineSound();this.engine?.pause(true);this.state='result';this.options.onState('missionResult');
    const score=Math.round(result.score||0),old=this.progress.best[this.stage];
    if(!old||score>old.score)this.progress.best[this.stage]={score,accuracy:result.accuracy??null,time:Math.round(result.time||0)};
    this.progress.unlocked=Math.max(this.progress.unlocked,this.stage+1);this.save();this.sound(88,'sine',.12);
    const final=this.stage===MISSIONS.length-1,total=Object.values(this.progress.best).reduce((n,r)=>n+(Number(r.score)||0),0);
    this.options.modal(this.options.baseModal(final?'CAMPAIGN COMPLETE':`MISSION ${this.stage+1} COMPLETE`,final?'You earned the encore.':MISSIONS[this.stage].reward,`<div class="resultsStats"><div><strong>${score.toLocaleString()}</strong><small>MISSION SCORE</small></div><div><strong>${final?total.toLocaleString():this.progress.unlocked+'/5'}</strong><small>${final?'TOTAL BEST SCORE':'MISSIONS CLEARED'}</small></div>${result.accuracy!==undefined?`<div><strong>${result.accuracy}%</strong><small>NOTES HIT</small></div>`:''}</div><p>${final?'The ride, the backstage scramble, the first set and the storm are behind you. Replay a mission to improve your score, or play any full soundtrack song in Practice.':`Next: ${MISSIONS[this.stage+1].title}. Your progress has been saved.`}</p><div class="modalActions"><button id="missionNext" class="primary">${final?'Back to the city':'Next mission'} ↗</button><button id="missionReplay" class="textBtn">Replay mission</button></div>`),()=>this.options.home());
    $('#missionNext').onclick=()=>final?this.options.home():this.briefing(this.stage+1);$('#missionReplay').onclick=()=>this.start(this.stage);
  }
}
