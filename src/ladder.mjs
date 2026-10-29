// Shared deterministic ladder mechanics, used by live movement and QA simulations.
export function ladderHeight(current,verticalInput,elapsed,extended=false){
 const floor=Number.isFinite(current)?current:0;
 const seconds=Math.min(.3,Math.max(0,Number(elapsed)||0));
 const top=extended?9.45:4.75;
 return Math.max(0,Math.min(top,floor+Math.max(-1,Math.min(1,verticalInput))*seconds*3.1));
}
export function canStockFromHeight(tier,height,cartNearby=false){
 if(tier===0)return true;
 if(tier===1)return height>.35||cartNearby;
 if(tier===2)return height>4.0||cartNearby;
 if(tier===3)return height>8.2||cartNearby;
 return false;
}
