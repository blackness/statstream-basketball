// ══════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════

loadCfg();
renderProfiles();

if(CFG.sim && CFG.label && SIM_PROFILES[CFG.label]){
  SIM_DATA = SIM_PROFILES[CFG.label];
}

updateSidebar();
showPanel('conferences');

if(SIM_DATA){
  loadSimConfs();
  if(autoOn) startAuto();
}else if(CFG.confHost && CFG.mgmtHost){
  fetchConf();
  if(autoOn) startAuto();
}else{
  showPanel('settings');
}