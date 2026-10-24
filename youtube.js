// Official visible YouTube playback. No audio extraction, proxies or downloads.
export const PRINCE_TRACKS=[
 {title:"Let’s Go Crazy",id:'eCM2dEWGf-o',bpm:98,length:279,description:'Official album audio'},
 {title:'Take Me With U',id:'c80mYF6dR7s',bpm:120,length:300,description:'Official live video · 1985'},
 {title:'The Beautiful Ones',id:'oK1Jl8tLzls',bpm:108,length:315,description:'Official album audio'},
 {title:'Computer Blue',id:'wyKeCYYzIRk',bpm:124,length:239,description:'Official album audio'},
 {title:'Darling Nikki',id:'Kawlt8Ncll0',bpm:120,length:255,description:'Official album audio'},
 {title:'When Doves Cry',id:'UG3VcCAlUgE',bpm:126,length:225,description:'Official music video'},
 {title:'I Would Die 4 U',id:'iGCIdHrRXW0',bpm:136,length:171,description:'Official album audio'},
 {title:"Baby I’m a Star",id:'NEvxLjxkEz8',bpm:136,length:260,description:'Official album audio'},
 {title:'Purple Rain',id:'uW1UIDYmYyI',bpm:113,length:525,description:'Official Prince video'}
];
export const CHAPTER_TRACKS=[0,1,5,2,8];
let readyPromise;
function loadAPI(){if(window.YT?.Player)return Promise.resolve();if(readyPromise)return readyPromise;readyPromise=new Promise((resolve,reject)=>{const previous=window.onYouTubeIframeAPIReady;window.onYouTubeIframeAPIReady=()=>{previous?.();resolve()};const s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';s.onerror=()=>reject(Error('YouTube player could not load.'));document.head.append(s);setTimeout(()=>{if(!window.YT?.Player)reject(Error('YouTube connection timed out.'))},15000)});return readyPromise;}
export class YouTubeMusic{
 constructor(){this.player=null;this.generation=0;this.ready=false;}
 async load(track,handlers={}){this.destroy();let generation=this.generation;this.ready=false;await loadAPI();if(generation!==this.generation)return;this.player=new window.YT.Player('youtubePlayer',{host:'https://www.youtube-nocookie.com',width:'100%',height:'100%',videoId:track.id,playerVars:{playsinline:1,controls:1,rel:0,origin:location.origin},events:{onReady:()=>{if(generation!==this.generation)return;this.ready=true;handlers.ready?.();this.player.playVideo()},onStateChange:e=>{if(generation===this.generation)handlers.state?.(e.data)},onError:e=>{if(generation===this.generation)handlers.error?.(e.data)}}});}
 time(){try{return this.player?.getCurrentTime()||0}catch{return 0}}
 duration(){try{return this.player?.getDuration()||0}catch{return 0}}
 play(){try{this.player?.playVideo()}catch{}}
 pause(){try{this.player?.pauseVideo()}catch{}}
 volume(value){try{this.player?.setVolume(Math.round(value*100))}catch{}}
 seek(value){try{this.player?.seekTo(value,true)}catch{}}
 destroy(){this.generation++;this.ready=false;try{this.player?.destroy()}catch{}this.player=null;const mount=document.querySelector('#youtubeMount');if(mount)mount.innerHTML='<div id="youtubePlayer"></div>'}
}
