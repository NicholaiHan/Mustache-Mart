import * as THREE from 'three';

// The store is visually widened to create walkable lanes, but a model's own
// width must remain physical. This is a render-only pass; do not modify saved
// item positions, floor coordinates, shop rules or collision state.
// Call after building each floor and before its first animation frame.
export function restoreObjectProportions(world,widthMultiplier){
 if(!world||!Number.isFinite(widthMultiplier)||widthMultiplier<=1)return;
 // The per-instance offsets stay untouched. Scale shared geometry once,
 // rather than decomposing thousands of instance matrices every floor load.
 const exemptParentNames=new Set(['integratedDaylightWall','daylightWindows','recessedBlueWindow',
  'solidStructuralWall']);
 let normalized=0,instances=0;
 function visit(object,exempt=false){
  if(object.userData?.proportionFixed)return;
  if(object.name==='megaRobotCrab'){object.userData.proportionFixed=true;return;}
  if(object.userData?.keepProportion){
   object.scale.x/=widthMultiplier;object.userData.proportionFixed=true;normalized++;return;
  }
  const preserve=exempt||exemptParentNames.has(object.name);
  if(object.isInstancedMesh&&!preserve){
   // Only geometry dimensions shrink; 3D instance positions still spread to
   // wider aisle coordinates. A single geometry update replaces thousands
   // of expensive matrix decompose/recompose operations.
   object.geometry.scale(1/widthMultiplier,1,1);
   object.geometry.computeBoundingSphere();
   instances+=object.count;
   object.userData.proportionFixed=true;return;
  }
  if(object.isMesh&&!preserve){
   const geometry=object.geometry;
   if(!geometry.boundingBox)geometry.computeBoundingBox();
   const width=geometry.boundingBox?.max.x-geometry.boundingBox?.min.x||0;
   // Architectural slabs/spans intentionally stretch to cover the expanded
   // building; small standalone parts retain their natural X dimensions.
   if(width>0&&width<13){
    object.scale.x/=widthMultiplier;normalized++;
   }
  }
  for(const child of object.children||[])visit(child,preserve);
  object.userData.proportionFixed=true;
 }
 for(const child of world.children)visit(child);
 return {normalized,instances};
}
