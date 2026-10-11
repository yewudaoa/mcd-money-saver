/* 麦门省钱助手 —— 共享数据层（前台 demo 与后台 admin 共用，localStorage 持久化） */
(function (global) {
  const KEY = 'mcd_saver_store_v1';

  const DEFAULTS = {
    products: [
      { id: 'p1', name: '巨无霸套餐',    emoji: '🍔', grad: ['#ffd86b', '#ff9d3c'], price: 46.5, promoPrice: null, onSale: true, allowStack: true },
      { id: 'p2', name: '麦辣鸡腿堡套餐', emoji: '🌶️', grad: ['#ff9a9e', '#f6416c'], price: 41.0, promoPrice: null, onSale: true, allowStack: true },
      { id: 'p3', name: '板烧鸡腿堡套餐', emoji: '🍗', grad: ['#ffe0b2', '#e8a04c'], price: 43.5, promoPrice: null, onSale: true, allowStack: true },
      { id: 'p4', name: '麦乐鸡(10块)',  emoji: '🍗', grad: ['#fddb92', '#d1a054'], price: 19.5, promoPrice: null, onSale: true, allowStack: true },
      { id: 'p5', name: '中可乐',        emoji: '🥤', grad: ['#9be7ff', '#4a90d9'], price: 9.5,  promoPrice: null, onSale: true, allowStack: true },
      { id: 'p6', name: '圆筒冰淇淋',    emoji: '🍦', grad: ['#fbc2eb', '#a18cd1'], price: 5.0,  promoPrice: null, onSale: true, allowStack: true },
    ],
    coupons: [
      { id: 'c1', name: '巨无霸买一送一', type: 'bogo',  value: null, min: 0,  applyIds: ['p1'], onSale: true, stack: true },
      { id: 'c2', name: '套餐立减8元',    type: 'cut',   value: 8,    min: 35, applyIds: [],    onSale: true, stack: true },
      { id: 'c3', name: '会员日8折券',    type: 'pct',   value: 0.8,  min: 30, applyIds: [],    onSale: true, stack: true },
      { id: 'c4', name: '小食第二份半价', type: 'half2', value: null, min: 0,  applyIds: ['p4'], onSale: true, stack: true },
      { id: 'c5', name: '新人红包',      type: 'red',   value: 5,    min: 0,  applyIds: [],    onSale: true, stack: true },
    ],
    promos: [
      { id: 'a1', name: '程序员节限时 88 折', pct: 0.88, productIds: ['p1', 'p2'], onSale: true, stack: true },
    ],
  };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    const store = JSON.parse(JSON.stringify(DEFAULTS));
    save(store);
    return store;
  }
  function save(store) {
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* ignore */ }
  }

  /* 商品 */
  function addProduct(p) { const s = load(); p.id = 'p' + Date.now(); s.products.push(p); save(s); return p.id; }
  function updateProduct(id, patch) { const s = load(); const p = s.products.find(x => x.id === id); if (p) Object.assign(p, patch); save(s); }
  function removeProduct(id) { const s = load(); s.products = s.products.filter(x => x.id !== id); save(s); }
  function toggleProduct(id) { const s = load(); const p = s.products.find(x => x.id === id); if (p) { p.onSale = !p.onSale; save(s); } return p && p.onSale; }

  /* 优惠券/红包 */
  function addCoupon(c) { const s = load(); c.id = 'c' + Date.now(); s.coupons.push(c); save(s); return c.id; }
  function updateCoupon(id, patch) { const s = load(); const c = s.coupons.find(x => x.id === id); if (c) Object.assign(c, patch); save(s); }
  function removeCoupon(id) { const s = load(); s.coupons = s.coupons.filter(x => x.id !== id); save(s); }
  function toggleCoupon(id) { const s = load(); const c = s.coupons.find(x => x.id === id); if (c) { c.onSale = !c.onSale; save(s); } return c && c.onSale; }

  /* 打折活动 */
  function addPromo(a) { const s = load(); a.id = 'a' + Date.now(); s.promos.push(a); save(s); return a.id; }
  function updatePromo(id, patch) { const s = load(); const a = s.promos.find(x => x.id === id); if (a) Object.assign(a, patch); save(s); }
  function removePromo(id) { const s = load(); s.promos = s.promos.filter(x => x.id !== id); save(s); }
  function togglePromo(id) { const s = load(); const a = s.promos.find(x => x.id === id); if (a) { a.onSale = !a.onSale; save(s); } return a && a.onSale; }

  /* 价格计算
   * 叠加规则：
   *  - 商品 allowStack=false：该商品不参与任何打折活动折扣（优惠价仍生效）
   *  - 活动 stack=false（不可叠加）：不与券同享 → 券方案中排除该活动
   *  - 券 stack=false（不可叠加）：不与任何活动同享 → 该券方案完全不吃活动折扣
   * mode: 'full' 全部活动（用于不用券的原价方案）
   *       'plain' 仅可叠加活动（用券时默认）
   *       'none'  无活动（不可叠加券）
   */
  function unitPrice(store, prod) {
    return prod.promoPrice != null && prod.promoPrice !== '' ? Number(prod.promoPrice) : Number(prod.price);
  }
  function prodAllowStack(store, prodId) {
    const p = store.products.find(x => x.id === prodId);
    return p ? p.allowStack !== false : true;
  }
  function basePrice(store, items, mode) {
    let total = 0;
    for (const i of items) {
      const unit = unitPrice(store, i.prod);
      if (mode === 'none' || !prodAllowStack(store, i.prod.id)) { total += unit; continue; }
      let rate = 1;
      for (const a of store.promos || []) {
        if (!a.onSale) continue;
        if (mode === 'plain' && a.stack === false) continue;
        if ((a.productIds || []).includes(i.prod.id)) rate = Math.min(rate, Number(a.pct));
      }
      total += unit * rate;
    }
    return total;
  }
  function evalPlan(store, coupon, items /* [{prod, qty}] */, base) {
    let total = base, ok = false;
    const c = coupon;
    if (c.type === 'cut' && base >= c.min) { total = base - Number(c.value); ok = true; }
    else if (c.type === 'red' && base >= c.min) { total = base - Number(c.value); ok = true; }
    else if (c.type === 'pct' && base >= c.min) { total = base * Number(c.value); ok = true; }
    else if (c.type === 'bogo') {
      const hit = items.filter(i => c.applyIds.includes(i.prod.id));
      if (hit.length) { total = base - unitPrice(store, hit[0].prod); ok = true; }
    } else if (c.type === 'half2') {
      const hit = items.filter(i => c.applyIds.includes(i.prod.id));
      if (hit.length) { total = base - unitPrice(store, hit[0].prod) / 2; ok = true; }
    }
    return { ok, total: Math.max(0, total), coupon: c.name };
  }

  global.McdStore = {
    load, save, addProduct, updateProduct, removeProduct, toggleProduct,
    addCoupon, updateCoupon, removeCoupon, toggleCoupon,
    addPromo, updatePromo, removePromo, togglePromo,
    unitPrice, basePrice, evalPlan,
  };
})(window);
