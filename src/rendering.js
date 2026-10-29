import * as THREE from 'three';
// Shared scene-graph geometry helpers. Model detail can change independently of gameplay.
export function createRendering({getWorld,scene,toon}){
function add(mesh,parent=getWorld()){parent.add(mesh);return mesh;}
function cube(w,h,d,c,parent=getWorld()){return add(new THREE.Mesh(new THREE.BoxGeometry(w,h,d),typeof c==='string'||typeof c==='number'?toon(c):c),parent);}
function roundedGeo(w,h,d,r=.09){
 const shape=new THREE.Shape(),rad=Math.min(r,w/2,h/2);
 shape.moveTo(-w/2+rad,-h/2);
 shape.lineTo(w/2-rad,-h/2);shape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+rad);
 shape.lineTo(w/2,h/2-rad);shape.quadraticCurveTo(w/2,h/2,w/2-rad,h/2);
 shape.lineTo(-w/2+rad,h/2);shape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-rad);
 shape.lineTo(-w/2,-h/2+rad);shape.quadraticCurveTo(-w/2,-h/2,-w/2+rad,-h/2);
 const g=new THREE.ExtrudeGeometry(shape,{depth:d,bevelEnabled:true,bevelThickness:.025,bevelSize:.025,bevelSegments:2,curveSegments:4});
 g.translate(0,0,-d/2);return g;
}
function round(w,h,d,mat,parent=getWorld()){return add(new THREE.Mesh(roundedGeo(w,h,d),typeof mat==='string'||typeof mat==='number'?toon(mat):mat),parent);}
function textLabel(text,w=3,h=.75,bg='#f7f6ef',fg='#303a3b',font=44,face='entrance'){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=Math.round(512*h/w);
 const ctx=canvas.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.strokeStyle='#49524e';ctx.lineWidth=12;ctx.strokeRect(0,0,canvas.width,canvas.height);
 ctx.fillStyle=fg;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 '+font+'px system-ui';ctx.fillText(text,256,canvas.height/2,480);
 const sign=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),transparent:false,side:THREE.FrontSide}));
 // Every lettered sign faces the entrance (-Z); its reverse is never mirrored.
 sign.rotation.y=face==='entrance'?Math.PI:0;
 return sign;
}
function clearWorld(world){
 if(!world)return;
 scene.remove(world);
 const gg=new Set(),mm=new Set(),tt=new Set();
 world.traverse(o=>{if(o.geometry)gg.add(o.geometry);if(o.material)for(const m of(Array.isArray(o.material)?o.material:[o.material])){mm.add(m);if(m.map)tt.add(m.map);}});
 for(const g of gg)g.dispose();for(const m of mm)m.dispose();for(const t of tt)t.dispose();
}

return {add,cube,roundedGeo,round,textLabel,clearWorld};
}
