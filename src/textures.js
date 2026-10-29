import * as THREE from 'three';
// Deterministic procedural game textures: no external assets, networks or downloads.
// Every texture is reused by instanced materials and released on world rebuild.
function canvas(w=512,h=512){const c=document.createElement('canvas');c.width=w;c.height=h;return [c,c.getContext('2d')];}
function noise(ctx,w,h,amount,seed=1){
 let v=seed>>>0;
 for(let i=0;i<amount;i++){
  v=(Math.imul(v,1664525)+1013904223)>>>0;const x=v%w;
  v=(Math.imul(v,1664525)+1013904223)>>>0;const y=v%h;
  v=(Math.imul(v,1664525)+1013904223)>>>0;
  ctx.fillStyle=(v&1)?'rgba(255,255,255,.08)':'rgba(11,31,30,.065)';
  ctx.fillRect(x,y,1+v%3,1+((v>>>3)%3));
 }
}
function texture(c,repeatX=1,repeatY=1){
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
 t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeatX,repeatY);
 t.anisotropy=4;return t;
}
export function polishedTileTexture(){
 const [c,ctx]=canvas();
 ctx.fillStyle='#b7bcb9';ctx.fillRect(0,0,512,512);
 for(let y=0;y<4;y++)for(let x=0;x<4;x++){
  const k=(x*5+y*3)%4;
  ctx.fillStyle=['#d5d8d3','#d9dbd6','#d4d6d3','#dce0d9'][k];
  ctx.fillRect(x*128+3,y*128+3,122,122);
  ctx.fillStyle='rgba(255,255,255,.15)';
  ctx.fillRect(x*128+8,y*128+9,113,2);
 }
 noise(ctx,512,512,4100,14);
 return texture(c,16,16);
}
export function matteWallTexture(){
 const [c,ctx]=canvas();
 ctx.fillStyle='#dce0dd';ctx.fillRect(0,0,512,512);
 for(let j=0;j<8;j++){
  ctx.fillStyle=j%2?'rgba(131,143,139,.11)':'rgba(255,255,255,.11)';
  ctx.fillRect(0,j*64,512,2);
 }
 for(let i=0;i<8;i++){
  const x=i*64;
  ctx.fillStyle='rgba(70,91,84,.055)';ctx.fillRect(x,0,1,512);
 }
 noise(ctx,512,512,14000,71);
 return texture(c,9,1.2);
}
const defs=[
 {name:'PANTRY SOUP',sub:'SLOW SIMMERED',bg:'#bd684e',side:'#8b483b'},
 {name:'SPRING WATER',sub:'PURIFIED / 500ml',bg:'#7598a1',side:'#3b737a'},
 {name:'RESERVE',sub:'GRAPE / 750ml',bg:'#786e80',side:'#4c4b5c'},
 {name:'GRAIN CRUNCH',sub:'BREAKFAST CEREAL',bg:'#c39b60',side:'#9a6c43'},
 {name:'FIZZ',sub:'SPARKLING / 330ml',bg:'#7a9679',side:'#3c6258'}
];
export function productTexture(type){
 const d=defs[type%defs.length];
 const [c,ctx]=canvas(512,512);
 ctx.fillStyle=d.bg;ctx.fillRect(0,0,512,512);
 ctx.fillStyle=d.side;ctx.fillRect(0,0,512,115);ctx.fillRect(0,420,512,92);
 ctx.fillStyle='rgba(250,248,232,.94)';ctx.fillRect(0,134,512,274);
 ctx.fillStyle='#334344';ctx.textAlign='center';
 ctx.font='700 29px system-ui';ctx.fillText('M U S T A C H E   M A R T',256,172);
 ctx.font='900 52px system-ui';ctx.fillText(d.name,256,257,470);
 ctx.font='600 28px system-ui';ctx.fillText(d.sub,256,306);
 ctx.strokeStyle='#aab2a8';ctx.lineWidth=3;
 ctx.beginPath();ctx.moveTo(75,335);ctx.lineTo(437,335);ctx.stroke();
 ctx.font='600 19px system-ui';ctx.fillText('STOCKED WITH CARE  •  MM',256,373);
 for(let j=0;j<31;j++){
  ctx.fillStyle=j%4===0?'#e1ded0':'#293a3c';
  ctx.fillRect(125+j*8,444,3+((j*7)%3),38);
 }
 return texture(c);
}
export function cartonTexture(){
 const [c,ctx]=canvas(512,512);
 ctx.fillStyle='#c3ac88';ctx.fillRect(0,0,512,512);
 noise(ctx,512,512,6000,314);
 ctx.fillStyle='#a58d69';ctx.fillRect(0,25,512,35);ctx.fillRect(0,455,512,33);
 ctx.fillStyle='#47504a';ctx.textAlign='center';
 ctx.font='900 56px system-ui';ctx.fillText('MUSTACHE',256,215);
 ctx.font='800 63px system-ui';ctx.fillText('MART',256,288);
 ctx.font='600 23px system-ui';ctx.fillText('WAREHOUSE  /  HANDLE WITH CARE',256,339);
 return texture(c);
}
