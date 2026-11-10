// Original procedural score and cues. One context, unlocked by a player gesture.
// Timed against the audio clock so rendering load cannot disturb the rhythm.
export type AudioMode='ready'|'playing'|'paused'|'won';
export class GameAudio {
  private context:AudioContext|null=null;
  private master:GainNode|null=null;
  private sources=new Set<AudioScheduledSourceNode>();
  private timer:number|undefined;
  private nextBeat=0;
  private step=0;
  private mode:AudioMode='ready';
  private cheer:AudioBuffer|null=null;
  private cheerBytes:ArrayBuffer|null=null;
  private disposed=false;
  private abort=new AbortController();
  private celebrationAt=0;
  private cheerPlayed=false;
  private pulse=0;
  constructor(){
    void fetch('./assets/audio/crowd-cheer.mp3',{signal:this.abort.signal}).then(r=>{if(!r.ok)throw new Error('Audio unavailable');return r.arrayBuffer()}).then(bytes=>{this.cheerBytes=bytes;return this.decodeCheer()}).catch(()=>{});
    document.addEventListener('visibilitychange',this.visibility);
  }
  private async decodeCheer(){
    if(!this.context||!this.cheerBytes)return;
    const bytes=this.cheerBytes;this.cheerBytes=null;
    try{const buffer=await this.context.decodeAudioData(bytes);if(!this.disposed)this.cheer=buffer}catch{}
  }
  unlock(){
    if(this.disposed)return;
    try{
      if(!this.context){
        this.context=new AudioContext();this.master=this.context.createGain();
        this.master.gain.value=.65;
        const limiter=this.context.createDynamicsCompressor();limiter.threshold.value=-12;limiter.ratio.value=8;
        this.master.connect(limiter);limiter.connect(this.context.destination);
        void this.decodeCheer();
      }
      if(!document.hidden)void this.context.resume().catch(()=>{});
    }catch{/* Audio support never blocks play. */}
  }
  private visibility=()=>{
    if(!this.context)return;
    if(document.hidden)void this.context.suspend().catch(()=>{});
    else if(this.mode==='playing'||this.mode==='won')void this.context.resume().catch(()=>{});
  };
  private track(source:AudioScheduledSourceNode,nodes:AudioNode[]){
    this.sources.add(source);
    source.onended=()=>{this.sources.delete(source);source.disconnect();nodes.forEach(n=>n.disconnect())};
  }
  private note(midi:number,time:number,duration:number,volume:number,type:OscillatorType='sine',pan=0,endMidi?:number){
    const c=this.context;if(!c||!this.master)return;
    const osc=c.createOscillator(),gain=c.createGain(),stereo=c.createStereoPanner();
    osc.type=type;osc.frequency.setValueAtTime(440*2**((midi-69)/12),time);
    if(endMidi!==undefined)osc.frequency.exponentialRampToValueAtTime(440*2**((endMidi-69)/12),time+duration);
    gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(volume,time+.009);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
    stereo.pan.value=pan;osc.connect(gain);gain.connect(stereo);stereo.connect(this.master);
    this.track(osc,[gain,stereo]);osc.start(time);osc.stop(time+duration+.03);
  }
  private noise(time:number,duration:number,volume:number,frequency:number,pan=0){
    const c=this.context;if(!c||!this.master)return;
    const buffer=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
    const source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain(),stereo=c.createStereoPanner();
    source.buffer=buffer;filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=.7;stereo.pan.value=pan;
    gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(volume,time+.005);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
    source.connect(filter);filter.connect(gain);gain.connect(stereo);stereo.connect(this.master);
    this.track(source,[filter,gain,stereo]);source.start(time);source.stop(time+duration);
  }
  private musicStep(step:number,t:number){
    const bar=Math.floor(step/8)%8,slot=step%8;
    const chords=[[60,64,67,71],[60,64,67,71],[57,60,64,67],[57,60,64,67],[53,57,60,64],[53,57,60,64],[55,59,62,67],[55,59,62,67]];
    const chord=chords[bar];
    // Warm bass, soft shaker and syncopated marimba-like plucks at 112 BPM.
    if(slot===0||slot===4)this.note(chord[0]-12,t,.34,.095,'sine');
    if(slot%2===0)this.note(43,t,.14,.07,'sine',0,26);
    this.noise(t,.045,slot%2?.028:.018,6800,slot%2?.3:-.3);
    if(slot===2||slot===6)this.noise(t,.09,.045,1500);
    const phrases=[[0,2,-1,1,3,-1,2,1],[2,-1,1,0,-1,2,3,-1]];
    const index=phrases[Math.floor(step/64)%2][slot];
    if(index>=0){const pitch=chord[index]+12;this.note(pitch,t,.27,.055,'sine',-.18);this.note(pitch+12,t,.09,.009,'sine',.18)}
    if(slot===0)chord.forEach((m,i)=>this.note(m,t+i*.025,1.4,.012,'triangle',(i-1.5)*.25));
  }
  cue(correct:boolean){
    if(this.mode!=='playing')return;
    this.unlock();
    if(!this.context)return;
    const t=this.context.currentTime+.015;
    if(correct){[76,79,84].forEach((n,i)=>this.note(n,t+i*.075,.28,.12,'sine',i*.15-.15));}
    else {
      // A distinct, descending double buzz stays audible over the backing music.
      // Midrange pitches also read clearly on small phone and laptop speakers.
      this.note(70,t,.16,.13,'square',0,67);
      this.note(65,t+.19,.23,.11,'square',0,60);
    }
  }
  private crowd(time:number){
    const c=this.context;if(!c||!this.master||!this.cheer)return;
    const source=c.createBufferSource(),gain=c.createGain();source.buffer=this.cheer;
    const duration=Math.min(8,this.cheer.duration);
    gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(.58,time+.2);gain.gain.setValueAtTime(.58,time+duration-2);gain.gain.linearRampToValueAtTime(0,time+duration);
    source.connect(gain);gain.connect(this.master);this.track(source,[gain]);source.start(time,0,duration);
  }
  private schedule=()=>{
    const c=this.context;if(!c||c.state!=='running'||this.disposed)return;
    const now=c.currentTime;
    if(this.mode==='playing'){
      if(this.nextBeat<now-.25)this.nextBeat=now+.025;
      while(this.nextBeat<now+.18){this.musicStep(this.step++,this.nextBeat);this.nextBeat+=60/112/2}
    }else if(this.mode==='won'){
      const elapsed=now-this.celebrationAt;
      // Play the decoded crowd only near the completion moment, never late in play.
      if(!this.cheerPlayed&&this.cheer&&elapsed<2){this.crowd(now+.01);this.cheerPlayed=true}
      if(elapsed>=25){window.clearInterval(this.timer);this.timer=undefined;return}
      while(this.nextBeat<now+.18){
        const age=this.nextBeat-this.celebrationAt,fade=Math.max(0,1-age/25);
        // A soft paper pop and bright chime accompany each confetti shower.
        this.noise(this.nextBeat,.17,.10*fade,2100,this.pulse%2?.55:-.55);
        this.note([84,88,91,95][this.pulse%4],this.nextBeat+.045,.7,.045*fade,'sine',this.pulse%2?-.4:.4);
        this.pulse++;this.nextBeat+=this.pulse<3?2.1:3.4;
      }
    }
  };
  setMode(mode:AudioMode){
    if(mode===this.mode)return;
    this.stop();this.mode=mode;
    if(mode==='playing'||mode==='won')this.unlock();
    const c=this.context;if(!c)return;
    if(mode==='playing'){this.step=0;this.nextBeat=c.currentTime+.04}
    if(mode==='won'){
      this.celebrationAt=c.currentTime;this.nextBeat=c.currentTime+.02;this.pulse=0;this.cheerPlayed=false;
      [72,76,79,84].forEach((n,i)=>this.note(n,c.currentTime+.05+i*.13,.7,.10,'triangle'));
    }
    if(mode==='playing'||mode==='won'){this.schedule();this.timer=window.setInterval(this.schedule,80)}
  }
  private stop(){
    window.clearInterval(this.timer);this.timer=undefined;
    for(const s of this.sources){try{s.stop()}catch{}}
    this.sources.clear();
  }
  dispose(){this.disposed=true;this.stop();this.abort.abort();document.removeEventListener('visibilitychange',this.visibility);void this.context?.close().catch(()=>{})}
}
