/* 麦门省钱助手 —— 前台比价逻辑（读取后台数据，应用 优惠价/打折活动/券/红包） */
(function () {
  const S = window.McdStore;
  const sel = new Set(), usedCoupons = new Set();
  const $ = id => document.getElementById(id);

  /* ---------- 会员日 / 优惠日历 ---------- */
  const WEEK_PROMOS = {
    1: { ev: 'OMM会员日', stars: '⭐⭐⭐' },
    2: { ev: '无固定活动', stars: '⭐' },
    3: { ev: '无固定活动', stars: '⭐' },
    4: { ev: '嗨翻周四', stars: '⭐⭐' },
    5: { ev: '无固定活动', stars: '⭐' },
    6: { ev: '周末档', stars: '⭐⭐' },
    0: { ev: '周末档', stars: '⭐⭐' },
  };
  const DAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const today = new Date().getDay();
  (function buildCal() {
    const cal = $('cal');
    for (let i = 0; i < 7; i++) {
      const d = (today + i) % 7, p = WEEK_PROMOS[d];
      const el = document.createElement('div');
      el.className = 'day' + (i === 0 ? ' today' : '');
      el.innerHTML = `${i === 0 ? '今' : DAY_NAMES[d]}<span class="stars">${p.stars}</span><span class="ev">${p.ev}</span>`;
      cal.appendChild(el);
    }
    const nextBig = [1, 2, 3, 4, 5, 6].find(i => WEEK_PROMOS[(today + i) % 7].stars === '⭐⭐⭐');
    let timing;
    if (nextBig === undefined) timing = '🎉 今天就是力度最大的会员日，直接买！';
    else timing = `⏳ ${nextBig} 天后（${DAY_NAMES[(today + nextBig) % 7]}）是 OMM 会员日，力度 ⭐⭐⭐，可与券叠加对比`;
    $('timing').innerHTML = `<div class="row"><span>${timing}</span></div>
      <div class="row" style="color:#aaa"><span>* 常规规则仅作演示参考，实际活动以麦当劳 App 当日为准</span></div>`;
  })();

  /* ---------- 渲染商品（仅上架） ---------- */
  function renderMenu() {
    const s = S.load();
    const menu = $('menu');
    const onSale = s.products.filter(p => p.onSale);
    menu.innerHTML = onSale.length ? '' : '<span style="color:#999;font-size:13px">所有商品已下架，请前往后台管理上架商品</span>';
    onSale.forEach(p => {
      const d = document.createElement('div');
      d.className = 'item';
      const imgHtml = p.img
        ? `<img class="pimg real" src="${p.img}" alt="${p.name}">`
        : `<span class="pimg" style="background:linear-gradient(135deg,${p.grad[0]},${p.grad[1]})">${p.emoji}</span>`;
      const promoTag = p.promoPrice != null && p.promoPrice !== ''
        ? `<small>¥${Number(p.promoPrice).toFixed(1)} <s style="color:#bbb">¥${Number(p.price).toFixed(1)}</s></small>`
        : `<small>¥${Number(p.price).toFixed(1)}</small>`;
      d.innerHTML = `${imgHtml}<b>${p.name}</b>${promoTag}`;
      d.onclick = () => { sel.has(p.id) ? sel.delete(p.id) : sel.add(p.id); d.classList.toggle('sel'); calc(); };
      d.dataset.pid = p.id;
      menu.appendChild(d);
    });
  }

  /* ---------- 渲染券（仅发放中） ---------- */
  function desc(c) {
    if (c.type === 'cut') return `满¥${c.min}减¥${Number(c.value).toFixed(0)}`;
    if (c.type === 'red') return `立抵¥${Number(c.value).toFixed(2)}红包` + (c.min ? `（满¥${c.min}）` : '');
    if (c.type === 'pct') return `满¥${c.min}打${Number(c.value) * 10}折`;
    if (c.type === 'bogo') return '指定商品第二份免费';
    return '指定商品第二份半价';
  }
  function renderCoupons() {
    const s = S.load();
    const cp = $('coupons');
    cp.innerHTML = '';
    s.coupons.filter(c => c.onSale).forEach(c => {
      const d = document.createElement('div');
      d.className = 'coupon';
      d.innerHTML = `<span class="cname">${c.name}</span><span class="cright"><span class="exp">${desc(c)}</span><span class="ck">✓</span></span>`;
      d.onclick = () => { usedCoupons.has(c.id) ? usedCoupons.delete(c.id) : usedCoupons.add(c.id); d.classList.toggle('sel'); calc(); };
      d.dataset.cid = c.id;
      cp.appendChild(d);
    });
  }

  /* ---------- 比价计算 ---------- */
  function calc() {
    const store = S.load();
    const items = store.products.filter(p => sel.has(p.id)).map(p => ({ prod: p, qty: 1 }));
    /* 基价：优惠价优先，再叠加打折活动折扣 */
    let base = 0;
    items.forEach(i => { base += S.unitPrice(store, i.prod) * S.activePromoRate(store, i.prod.id); });

    const plans = [{ name: '原价购买', total: base, coupon: null }];
    if (base > 0) {
      for (const cid of usedCoupons) {
        const c = store.coupons.find(x => x.id === cid);
        if (!c || !c.onSale) continue;
        const r = S.evalPlan(store, c, items, base);
        if (r.ok) plans.push({ name: `用券：${c.name}`, total: r.total, coupon: c.name });
      }
    }
    plans.sort((a, b) => a.total - b.total);
    const best = plans[0];
    $('best').textContent = best.total.toFixed(2);
    const save = Math.max(0, base - best.total);
    $('saveTag').textContent = save > 0 ? `💰 相比原价省 ¥${save.toFixed(2)}` : '🤔 原价即可，无需用券';
    $('rows').innerHTML = plans.map(p =>
      `<div class="row ${p === best ? 'best' : ''}"><span>${p.name}${p === best ? ' ⭐最省' : ''}</span><span>¥${p.total.toFixed(2)}</span></div>`).join('');

    /* 优惠力度排行 */
    const powerEl = $('power');
    if (base <= 0 || plans.length <= 1) {
      powerEl.innerHTML = '<div class="prow" style="color:#aaa"><span>先选餐和券，这里会量化每个方案的优惠力度</span></div>';
    } else {
      const max = Math.max(...plans.map(p => (base - p.total) / base), 0.0001);
      powerEl.innerHTML = plans.map(p => {
        const pct = (base - p.total) / base * 100;
        return `<div class="prow ${p === best ? 'best' : ''}">
          <span style="min-width:150px">${p.name}</span>
          <span>力度 ${pct.toFixed(1)}%</span>
          <span class="bar"><i style="width:${(pct / max * 100).toFixed(0)}%"></i></span>
          <span>¥${p.total.toFixed(2)}</span>
        </div>`;
      }).join('') + '<div class="prow" style="color:#aaa"><span>💡 力度 = (原价−券后)÷原价；商品图/价格/券/活动均可在 <a href="admin.html">后台管理</a> 中配置</span></div>';
    }
  }

  renderMenu(); renderCoupons(); calc();
})();
