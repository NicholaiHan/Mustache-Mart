import * as THREE from 'three';

// Single packing-carton model shared by pickup inventory and backroom props.
// Presentation-only; there is no item creation or transfer logic in this file.
export function cartonMaterials(){
 return {
  cardboard:new THREE.MeshStandardMaterial({color:'#b9976b',roughness:.91}),
  light:new THREE.MeshStandardMaterial({color:'#d7b98e',roughness:.9}),
  tape:new THREE.MeshStandardMaterial({color:'#e9dfc9',roughness:.77}),
  label:new THREE.MeshStandardMaterial({color:'#f5f0dc',roughness:.95}),
  ink:new THREE.MeshStandardMaterial({color:'#46504c',roughness:.77}),
  wood:new THREE.MeshStandardMaterial({color:'#98734b',roughness:.91}),
  slat:new THREE.MeshStandardMaterial({color:'#694c36',roughness:.91})
 };
}
export function addPackedCarton({round,parent,x,y,z,materials,variant=0,scale=1}){
 const g=new THREE.Group();g.name='boxedInventoryCarton';g.position.set(x,y,z);g.scale.setScalar(scale);parent.add(g);
 const R=(w,h,d,material,px,py,pz)=>{
  const mesh=round(w,h,d,material,g);mesh.position.set(px,py,pz);return mesh;
 };
 R(1.02,.67,.94,variant%3===0?materials.light:materials.cardboard,0,0,0);
 R(.11,.682,.95,materials.tape,0,.005,0);
 R(.90,.027,.16,materials.tape,0,.346,.0);
 R(.30,.21,.018,materials.label,-.20,-.06,-.479);
 for(let i=0;i<6;i++){
  R(.009+(i%2)*.012,.13,.021,materials.ink,-.31+i*.040,-.075,-.493);
 }
 for(let i=0;i<2;i++)R(.13,.03,.018,materials.ink,.15+i*.10,-.15,-.49);
 return g;
}
export function addInventoryPallet({round,parent,materials,x=0,z=0,width=2.1,depth=1.82}){
 const g=new THREE.Group();g.name='boxedInventoryPallet';g.position.set(x,0,z);parent.add(g);
 const deck=round(width,.16,depth,materials.wood,g);deck.position.y=.20;
 for(const xx of [-width*.38,0,width*.38]){
  const foot=round(.20,.21,depth*.86,materials.slat,g);
  foot.position.set(xx,.10,0);
 }
 return g;
}
