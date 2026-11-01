// Self-contained elevator control-panel rendering. This module never reads or
// writes save storage, game motion, or the 3D world; callbacks are supplied by
// the main game. Each button is keyboard accessible and has a real action.
export function renderElevatorDirectory({panel,state,floorCount,itemsPerFloor,totalItems,floorStocked,onChoose}){
 const el=id=>panel.querySelector('#'+id);
 const complete=Array.from({length:floorCount},(_,f)=>floorStocked(state,f)===itemsPerFloor).filter(Boolean).length;
 const pad=f=>String(f+1).padStart(2,'0');
 el('elevatorCurrent').innerHTML='CURRENT FLOOR <strong>'+pad(state.floor)+'</strong>';
 el('elevatorProgress').textContent=(state.stocked/totalItems*100).toFixed(1)+'% complete';
 el('elevatorComplete').textContent=complete+' / '+floorCount;
 const list=el('elevatorlist');list.replaceChildren();
 const destination=el('elevatorDestination');
 if(destination)destination.textContent='F'+pad(state.floor)+' · CURRENT LANDING';
 for(let f=0;f<floorCount;f++){
  const percent=Math.min(100,Math.round(floorStocked(state,f)/itemsPerFloor*100));
  const btn=document.createElement('button');btn.className='elevatorFloor';
  btn.type='button';btn.disabled=f===state.floor;
  btn.dataset.floor=String(f+1);
  if(percent===100)btn.classList.add('isComplete');
  if(f===state.floor)btn.classList.add('isCurrent');
  btn.setAttribute('aria-label','Travel to floor '+(f+1)+'. '+percent+' percent stocked.'+(f===state.floor?' Current landing.':''));
  const number=document.createElement('strong');number.className='floorNumber';number.textContent=pad(f);
  const status=document.createElement('span');status.className='floorState';
  status.textContent=f===state.floor?'YOU ARE HERE':percent===100?'READY':'STOCKING';
  const summary=document.createElement('small');summary.className='floorPercent';summary.textContent=percent+'% STOCKED';
  const bar=document.createElement('span');bar.className='floorBar';
  const fill=document.createElement('i');fill.style.width=percent+'%';bar.append(fill);
  btn.append(number,status,summary,bar);
  btn.addEventListener('click',()=>onChoose(f));
  list.append(btn);
 }
}
