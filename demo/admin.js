/* 麦门省钱助手 —— 后台管理：商品上架/下架、定价、优惠价、优惠券/红包、打折活动 */
(function () {
  const S = window.McdStore;
  let editingProd = null, editingCoupon = null, editingPromo = null;

  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));

  /* ---------- 商品 ---------- */
  let pendingImg = null; // 待保存的 base64 图片

  // 选择图片 → 压缩到 240px JPEG base64（控制 localStorage 体积）
  $('pImg').onchange = function () {
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (ev) {
      const img = new Image();
      img.onload = function () {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 240 / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        pendingImg = canvas.toDataURL('image/jpeg', 0.82);
        $('pImgPreview').src = pendingImg;
        $('pImgPreviewBox').style.display = '';
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };
  $('pImgClear').onclick = function () {
    pendingImg = null; $('pImg').value = '';
    $('pImgPreviewBox').style.display = 'none';
  };

  function renderProducts() {
    const s = S.load();
    $('prodBody').innerHTML = s.products.map(p => `
      <tr style="${p.onSale ? '' : 'opacity:.5'}">
        <td>${p.img
        ? `<img src="${p.img}" style="width:40px;height:40px;object-fit:cover;border-radius:10px">`
        : `<span class="thumb" style="background:linear-gradient(135deg,${p.grad[0]},${p.grad[1]})">${p.emoji}</span>`}</td>
        <td>${esc(p.name)}</td>
        <td>¥${Number(p.price).toFixed(2)}${p.promoPrice ? `<br><small style="color:var(--mred)">优惠价 ¥${Number(p.promoPrice).toFixed(2)}</small>` : ''}</td>
        <td><span class="tag ${p.allowStack === false ? 'off' : 'type'}">${p.allowStack === false ? '不可叠加' : '可叠加'}</span></td>
        <td><span class="tag ${p.onSale ? 'on' : 'off'}">${p.onSale ? '上架中' : '已下架'}</span></td>
        <td>
          <button onclick="editProd('${p.id}')">编辑</button>
          <button onclick="S.toggleProduct('${p.id}');renderProducts()">${p.onSale ? '下架' : '上架'}</button>
          <button class="danger" onclick="if(confirm('确认删除「${esc(p.name)}」？')){S.removeProduct('${p.id}');renderProducts()}">删除</button>
        </td>
      </tr>`).join('');
  }

  window.editProd = function (id) {
    const p = S.load().products.find(x => x.id === id);
    editingProd = id;
    pendingImg = p.img || null;
    $('pName').value = p.name; $('pEmoji').value = p.emoji;
    $('pPrice').value = p.price; $('pPromo').value = p.promoPrice || '';
    $('pGrad1').value = p.grad[0]; $('pGrad2').value = p.grad[1];
    $('pStack').value = p.allowStack === false ? '0' : '1';
    $('pImg').value = '';
    if (pendingImg) { $('pImgPreview').src = pendingImg; $('pImgPreviewBox').style.display = ''; }
    else $('pImgPreviewBox').style.display = 'none';
    $('prodFormTitle').textContent = '编辑商品：' + p.name;
  };

  $('prodForm').onsubmit = function (e) {
    e.preventDefault();
    const data = {
      name: $('pName').value.trim() || '未命名商品',
      emoji: $('pEmoji').value.trim() || '🍔',
      price: Number($('pPrice').value) || 0,
      promoPrice: $('pPromo').value === '' ? null : Number($('pPromo').value),
      grad: [$('pGrad1').value || '#ffd86b', $('pGrad2').value || '#ff9d3c'],
      img: pendingImg,
      allowStack: $('pStack').value === '1',
    };
    if (editingProd) { S.updateProduct(editingProd, data); editingProd = null; $('prodFormTitle').textContent = '新增商品'; }
    else S.addProduct(Object.assign({ onSale: true }, data));
    pendingImg = null; $('pImg').value = ''; $('pImgPreviewBox').style.display = 'none';
    e.target.reset(); renderProducts();
  };

  /* ---------- 优惠券 / 红包 ---------- */
  const TYPE_LABEL = { cut: '满减券', pct: '折扣券', red: '红包', bogo: '买一送一', half2: '第二份半价' };
  function couponDesc(c) {
    if (c.type === 'cut') return `满 ¥${c.min} 减 ¥${Number(c.value).toFixed(0)}`;
    if (c.type === 'red') return `立抵 ¥${Number(c.value).toFixed(2)} 红包` + (c.min ? `（满 ¥${c.min}）` : '');
    if (c.type === 'pct') return `满 ¥${c.min} 打 ${Number(c.value) * 10} 折`;
    if (c.type === 'bogo') return '指定商品第二份免费';
    return '指定商品第二份半价';
  }
  function applyTargets(c) {
    if (!c.applyIds || !c.applyIds.length) return '全部商品';
    const names = S.load().products.filter(p => c.applyIds.includes(p.id)).map(p => p.name);
    return names.length ? names.join('、') : '（商品已删除）';
  }
  function renderCoupons() {
    const s = S.load();
    $('cpBody').innerHTML = s.coupons.map(c => `
      <tr style="${c.onSale ? '' : 'opacity:.5'}">
        <td>${esc(c.name)}</td>
        <td><span class="tag type">${TYPE_LABEL[c.type]}</span></td>
        <td>${couponDesc(c)}</td>
        <td>${esc(applyTargets(c))}</td>
        <td><span class="tag ${c.stack === false ? 'off' : 'type'}">${c.stack === false ? '不可叠加' : '可叠加'}</span></td>
        <td><span class="tag ${c.onSale ? 'on' : 'off'}">${c.onSale ? '发放中' : '已停发'}</span></td>
        <td>
          <button onclick="editCp('${c.id}')">编辑</button>
          <button onclick="S.toggleCoupon('${c.id}');renderCoupons()">${c.onSale ? '停发' : '发放'}</button>
          <button class="danger" onclick="if(confirm('确认删除「${esc(c.name)}」？')){S.removeCoupon('${c.id}');renderCoupons()}">删除</button>
        </td>
      </tr>`).join('');
    renderCpProductChecks();
  }
  function renderCpProductChecks(selIds) {
    const s = S.load();
    $('cpApply').innerHTML = s.products.map(p =>
      `<label class="chk"><input type="checkbox" value="${p.id}" ${selIds && selIds.includes(p.id) ? 'checked' : ''}>${p.emoji} ${esc(p.name)}</label>`).join('');
  }
  window.editCp = function (id) {
    const c = S.load().coupons.find(x => x.id === id);
    editingCoupon = id;
    $('cName').value = c.name; $('cType').value = c.type;
    $('cValue').value = c.value != null ? c.value : '';
    $('cMin').value = c.min;
    $('cStack').value = c.stack === false ? '0' : '1';
    renderCpProductChecks(c.applyIds);
    $('cpFormTitle').textContent = '编辑券：' + c.name;
    syncValueLabel();
  };
  function syncValueLabel() {
    const t = $('cType').value;
    $('cValue').placeholder = t === 'cut' ? '减免金额（元），如 8' : t === 'red' ? '红包金额（元），如 5' : t === 'pct' ? '折扣（0.88 = 88折）' : '无需填写';
    $('cValue').parentElement.style.display = (t === 'bogo' || t === 'half2') ? 'none' : '';
    $('cpApplyBox').style.display = (t === 'bogo' || t === 'half2') ? '' : 'none';
  }
  $('cType').onchange = syncValueLabel;
  $('cpForm').onsubmit = function (e) {
    e.preventDefault();
    const t = $('cType').value;
    const data = {
      name: $('cName').value.trim() || '未命名券',
      type: t,
      value: (t === 'bogo' || t === 'half2') ? null : ($('cValue').value === '' ? null : Number($('cValue').value)),
      min: Number($('cMin').value) || 0,
      applyIds: (t === 'bogo' || t === 'half2') ? [...$('cpApply').querySelectorAll('input:checked')].map(i => i.value) : [],
      stack: $('cStack').value === '1',
    };
    if (editingCoupon) { S.updateCoupon(editingCoupon, data); editingCoupon = null; $('cpFormTitle').textContent = '新增券 / 红包'; }
    else S.addCoupon(Object.assign({ onSale: true }, data));
    e.target.reset(); renderCoupons();
  };

  /* ---------- 打折活动 ---------- */
  function renderPromos() {
    const s = S.load();
    $('pmBody').innerHTML = s.promos.map(a => {
      const names = s.products.filter(p => a.productIds.includes(p.id)).map(p => p.emoji + p.name).join('、');
      return `<tr style="${a.onSale ? '' : 'opacity:.5'}">
        <td>${esc(a.name)}</td>
        <td><b style="color:var(--mred)">${(Number(a.pct) * 10).toFixed(1)} 折</b></td>
        <td>${esc(names || '（未选商品）')}</td>
        <td><span class="tag ${a.stack === false ? 'off' : 'type'}">${a.stack === false ? '不可叠加' : '可与券叠加'}</span></td>
        <td><span class="tag ${a.onSale ? 'on' : 'off'}">${a.onSale ? '进行中' : '已暂停'}</span></td>
        <td>
          <button onclick="editPm('${a.id}')">编辑</button>
          <button onclick="S.togglePromo('${a.id}');renderPromos()">${a.onSale ? '暂停' : '启动'}</button>
          <button class="danger" onclick="if(confirm('确认删除活动「${esc(a.name)}」？')){S.removePromo('${a.id}');renderPromos()}">删除</button>
        </td>
      </tr>`;
    }).join('');
    renderPmProductChecks();
  }
  function renderPmProductChecks(selIds) {
    const s = S.load();
    $('pmApply').innerHTML = s.products.map(p =>
      `<label class="chk"><input type="checkbox" value="${p.id}" ${selIds && selIds.includes(p.id) ? 'checked' : ''}>${p.emoji} ${esc(p.name)}</label>`).join('');
  }
  window.editPm = function (id) {
    const a = S.load().promos.find(x => x.id === id);
    editingPromo = id;
    $('aName').value = a.name; $('aPct').value = a.pct;
    $('aStack').value = a.stack === false ? '0' : '1';
    renderPmProductChecks(a.productIds);
    $('pmFormTitle').textContent = '编辑活动：' + a.name;
  };
  $('pmForm').onsubmit = function (e) {
    e.preventDefault();
    const data = {
      name: $('aName').value.trim() || '未命名活动',
      pct: Number($('aPct').value) || 1,
      productIds: [...$('pmApply').querySelectorAll('input:checked')].map(i => i.value),
      stack: $('aStack').value === '1',
    };
    if (editingPromo) { S.updatePromo(editingPromo, data); editingPromo = null; $('pmFormTitle').textContent = '新增打折活动'; }
    else S.addPromo(Object.assign({ onSale: true }, data));
    e.target.reset(); renderPromos();
  };

  /* ---------- tabs & reset ---------- */
  document.querySelectorAll('.tab').forEach(t => t.onclick = () => {
    document.querySelectorAll('.tab,.pane').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    $(t.dataset.pane).classList.add('active');
  });
  $('resetBtn').onclick = function () {
    if (!confirm('确认恢复全部默认数据？当前所有改动将丢失。')) return;
    localStorage.removeItem('mcd_saver_store_v1');
    renderProducts(); renderCoupons(); renderPromos();
  };

  window.S = S; window.renderProducts = renderProducts; window.renderCoupons = renderCoupons; window.renderPromos = renderPromos;
  syncValueLabel();
  renderProducts(); renderCoupons(); renderPromos();
})();
