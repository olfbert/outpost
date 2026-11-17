import asyncio, json, sys
from playwright.async_api import async_playwright
MONTHS = int(sys.argv[1]) if len(sys.argv) > 1 else 48
SEED = sys.argv[2] if len(sys.argv) > 2 else 'TEST'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs=[]
        page = await b.new_page(viewport={'width':1280,'height':800})
        page.on('pageerror', lambda e: errs.append(str(e)))
        await page.goto(f'http://127.0.0.1:8765/index.html?seed={SEED}')
        await page.wait_for_function("window.__outpost && true", timeout=30000)
        await page.evaluate("(async()=>{window.__defs=(await import('/src/config/buildings.js')).BUILDINGS;})()")
        await page.wait_for_timeout(300)
        await page.add_script_tag(path='/home/claude/tests/bot.js')
        await page.evaluate("""(()=>{const o=window.__outpost,s=o.world.start; o.placement.place('landing_module',s.x,s.y);
          o.setTool('r:1'); const pl=o.roads.plan(1,{x:s.x-1,y:s.y+3},{x:s.x+6,y:s.y+3}); o.roads.build(pl); o.setTool(null);})()""")
        step = """(()=>{const o=window.__outpost, st=o.state, bot=window.__bot, sk=st.stock;
          const pop = st.buildings.filter(b=>window.__defs[b.type].residents).reduce((a,b)=>a+Math.floor(b.pop||0),0);
          const jobs = st.buildings.filter(b=>!b.site&&window.__defs[b.type].workers).reduce((a,b)=>a+window.__defs[b.type].workers,0);
          const n=(t)=>bot.B(t).length, has=(t)=>bot.done(t), m=st.money;
          const food = ['fish','potatoes','bread','meat','vegetables','rations'].reduce((a,g)=>a+(sk[g]||0),0);
          const sites = st.buildings.filter(b=>b.site).length;
          const want=(t,c)=>{ if(sites<3) return bot.tryBuild(t); };
          if(!n('lumber_camp')) bot.tryBuild('lumber_camp');
          if(n('wood_house')<2) want('wood_house');
          if(!n('fisher_hut')) want('fisher_hut');
          if(!n('farm') && st.gameMonths>1) want('farm');
          if(has('lumber_camp') && !n('sawmill')) want('sawmill');
          if(!n('quarry') && st.gameMonths>1) want('quarry');
          if(pop < jobs + 3 && food > pop*4 && m > 3000) want(n('wood_house')<5?'wood_house':(has('glassworks')&&n('apartment')<3?'apartment':'brick_house'));
          if(has('farm') && !n('mill')) want('mill');
          if(has('mill') && !n('bakery')) want('bakery');
          if(has('mill') && !bot.B('farm').some(f=>f.crop==='grain')) { const f=bot.B('farm').find(f=>!f.site); if(f) f.crop='grain'; if(n('farm')<2) want('farm'); }
          if(st.gameMonths>6 && !n('ranch')) want('ranch');
          if(has('ranch') && !n('butcher')) want('butcher');
          if(st.gameMonths>4 && !n('warehouse')) want('warehouse');
          if(st.gameMonths>5 && !n('food_store')) want('food_store');
          const lg = o.production.logistics.stats||{};
          if(lg.util>0.85 && n('haulage')<2 && m>12000) want('haulage');
          if(st.gameMonths>10 && m>20000){ for(const t of ['clay_pit','lime_quarry','sand_pit','cement_works','concrete_plant','coal_mine','iron_mine','smelter','glassworks']) if(!n(t)){ want(t); break; } }
          if(st.gameMonths>8 && n('lumber_camp')<2 && m>6000) want('lumber_camp');
          if(has('sawmill') && n('sawmill')<2 && n('lumber_camp')>=2 && m>12000) want('sawmill');
          // Überschuss verkaufen
          const keep={planks:400, stone:400, logs: has('sawmill')?300:150, steel:120, concrete:300, cement:150, glass:80, iron_ore:200, coal:200, limestone:200, clay:150, sand:250, grain:300, flour:200, cattle:150};
          for(const [g,k] of Object.entries(keep)) { const v=Math.floor((sk[g]||0)-k); if(v>20) o.economy.api.sell(g, v); }
          o.simulate(1);
          const stat = {}; for (const b of st.buildings) if(!b.site && b.status && b.status!=='running' && window.__defs[b.type].production) stat[b.type+':'+b.status]=(stat[b.type+':'+b.status]||0)+1;
          const led = st.ledger && st.ledger.length ? st.ledger[st.ledger.length-1] : null;
          return {gm:Math.round(st.gameMonths), money:Math.round(st.money), pop, jobs, food:Math.round(food), bld:st.buildings.length, sites, pl:Math.round(sk.planks||0), stn:Math.round(sk.stone||0), logs:Math.round(sk.logs||0), util:Math.round((lg.util||0)*100), stat, led: led ? {inc:Math.round(led.income||led.in||0), out:Math.round(led.expense||led.out||0)} : null};})()"""
        rows=[]
        for i in range(MONTHS):
            r = await page.evaluate(step)
            rows.append(r)
            print(json.dumps(r, ensure_ascii=False))
        print('LOG', json.dumps(await page.evaluate("window.__bot.log"), ensure_ascii=False))
        print('LEDGER', json.dumps(await page.evaluate("window.__outpost.state.ledger.slice(-3)"), ensure_ascii=False)[:1500])
        await b.close(); print(errs[:8] or 'keine Fehler')
asyncio.run(main())
