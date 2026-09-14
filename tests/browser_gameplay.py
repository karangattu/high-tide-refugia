from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 page=browser.new_page(viewport={'width':800,'height':360},has_touch=True)
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:3000')
 page.wait_for_function("window.__game?.scene.isActive('MenuScene')",timeout=60000)
 page.evaluate("""() => {const g=window.__game; g.scene.stop('MenuScene'); g.scene.start('GameScene'); g.scene.start('UIScene');} """)
 page.wait_for_timeout(200)
 page.evaluate("window.__game.scene.getScene('GameScene').skipTutorial()")
 page.wait_for_function("window.__game.scene.getScene('GameScene').levelManager.waveNumber === 1")
 scene="window.__game.scene.getScene('GameScene')"
 ui="window.__game.scene.getScene('UIScene')"
 cdp=page.context.new_cdp_session(page)
 def touch(kind,x=0,y=0):
  cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[] if kind in ['touchEnd','touchCancel'] else [{'x':x,'y':y,'id':1}]})
 touch('touchStart',240,220)
 assert page.evaluate(f'{scene}.plants.getLength()')==0
 assert page.evaluate(f'{scene}.plantPreview.y')==168
 touch('touchMove',260,230)
 touch('touchEnd')
 assert page.evaluate(f'{scene}.plants.getLength()')==1
 pos=page.evaluate(f'(()=>{{const p={scene}.plants.getChildren()[0]; return [p.x,p.y];}})()')
 assert pos==[260,178],pos
 print('PASS: touch preview, drag and release placement')
 touch('touchStart',350,220)
 touch('touchCancel')
 assert page.evaluate(f'{scene}.plants.getLength()')==1
 print('PASS: touch cancel does not plant')
 # Begin another aim, release over a HUD control, then ensure the next aim works.
 touch('touchStart',350,220)
 touch('touchMove',665,338)
 touch('touchEnd')
 assert page.evaluate(f'{scene}.touchPlantPointer === null')
 assert page.evaluate(f'{scene}.plants.getLength()')==1
 print('PASS: HUD release cancels pending planting')
 page.touchscreen.tap(763,338)
 assert page.evaluate(f'{scene}.isPaused')
 before=page.evaluate(f'(()=>{{const s={scene};return [s.waterSystem.elapsed,s.plants.getChildren()[0].growthStage,s.seedBank.currentSeeds,s.levelManager.railsSpawned]}})()')
 page.wait_for_timeout(1800)
 after=page.evaluate(f'(()=>{{const s={scene};return [s.waterSystem.elapsed,s.plants.getChildren()[0].growthStage,s.seedBank.currentSeeds,s.levelManager.railsSpawned]}})()')
 assert before==after,(before,after)
 page.touchscreen.tap(763,338)
 assert not page.evaluate(f'{scene}.isPaused')
 print('PASS: pause freezes water, growth, seeds and spawning; touch resume works')
 page.evaluate(f'{scene}.seedBank.currentSeeds=0')
 page.touchscreen.tap(370,225)
 assert page.evaluate(f'{ui}.feedbackText.text')=='Need seeds'
 assert page.evaluate(f'{scene}.plants.getLength()')==1
 print('PASS: placement failure gives a reason without spending seeds')
 # Build a radius-connected corridor, then move one patch to a separate vertical lane.
 result=page.evaluate(f'''() => {{
 const s={scene}; s.rails.clear(true,true);s.groundPredators.clear(true,true);s.plants.clear(true,true);
 s.seedBank.currentSeeds=50;s.seedBank.maxSeeds=50;s.waterSystem.currentX=50;
 for(let x=90;x<=650;x+=56)s.tryPlantAt(x,175);
 s.tryPlantAt(650,175);
 for(const p of s.plants.getChildren()) {{ p.growthStage=8;p.coverOK=true; }}
 s.updateCorridorStatus();const connected=s.corridorStatus.connected;
 const rail=s.spawnRail();rail.setPosition(210,175);s.updateRailPlantOverlaps();
 const used=rail.hasUsedCorridor;
 s.plants.getChildren()[4].y=280;s.updateCorridorStatus();
 return {{connected,used,broken:!s.corridorStatus.connected,plants:s.plants.getLength()}};
 }}''')
 assert result['connected'] and result['used'] and result['broken'],result
 print('PASS: live corridor geometry, rail eligibility and vertical gap',result)
 waves=page.evaluate(f'''() => {{const s={scene};const result=[];
 s.rails.clear(true,true);s.levelManager.startLevel();
 for(let i=0;i<8;i++) {{s.beginNextWave();result.push({{wave:s.levelManager.waveNumber,ground:s.groundPredators.getLength(),air:s.harriers.getLength(),regen:s.seedBank.regenRate}})}}
 return result;}}''')
 assert waves[0]['ground']==1 and waves[0]['air']==0
 assert waves[4]['regen']==.3 and waves[5]['regen']==.6
 assert waves[-1]['air']==1 and page.evaluate(f'{scene}.kingTideTriggered')
 print('PASS: wave changes apply predator counts, seed shortage/recovery and king tide')
 assert not errors,errors
 page.screenshot(path='/tmp/refugia-interactions.png')
 print('PASS: no browser runtime errors')
 browser.close()
