const { newClient, advance, getPath, DB } = require('./harness.js');
async function tick(ms){advance(ms||0);for(let i=0;i<15;i++)await Promise.resolve();}
(async()=>{
  const c=newClient('c1');
  c.$eval("currentPlayer.name='سعد'");
  try { c.$eval("attemptJoinRoom('r1')"); } catch(e){ console.log('THROW:', e.message); }
  await tick(50);
  console.log('myPlayerId =', c.$eval('myPlayerId'));
  console.log('CURRENT_ROOM_ID =', c.$eval('CURRENT_ROOM_ID'));
  console.log('rolesScreen =', JSON.stringify(c.document.getElementById('rolesScreen').style.display));
  console.log('gameScreen  =', JSON.stringify(c.document.getElementById('gameScreen').style.display));
  console.log('DB rooms:', JSON.stringify(DB.data).slice(0,400));
})();
