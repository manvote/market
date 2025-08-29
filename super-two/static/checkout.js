// static/checkout.js

const $ = (q, c=document) => c.querySelector(q);
const money = v => `₹${Number(v || 0).toFixed(0)}`;

const CART_KEY = 'zippy_cart_v1';
const INIT_ENDPOINT = '/api/order/init';  // POST → place order & send WhatsApp OTP

document.addEventListener('DOMContentLoaded', () => {
  const tbody = $('#summaryTable tbody');
  const subEl = $('#summarySubtotal');
  const delEl = $('#summaryDelivery');
  const totEl = $('#summaryTotal');

  const form = $('#checkoutForm');
  const nameIn = form?.elements?.name;
  const phoneIn = form?.elements?.phone;
  const addrIn = form?.elements?.address;
  const confirmBtn = form?.querySelector('button[type="submit"]');

  let ORDER_ID = null;

  // ---- Load cart
  const CART = readCart();
  const items = Object.values(CART);
  if (!items.length) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="4">Cart is empty.</td></tr>`;
    updateSummary(0, 0, 0);
    return;
  }

  // ---- Render cart
  renderSummary(items, tbody);
  const { subtotal, delivery, total } = computeTotals(items);
  updateSummary(subtotal, delivery, total);

  // ---- Submit order
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = (nameIn?.value || '').trim();
      const phone = (phoneIn?.value || '').trim();
      const address = (addrIn?.value || '').trim();

      if (!name || !phone || !address) {
        toast('Please fill in all details.', 'error');
        return;
      }

      if (!/^[6-9]\d{9}$/.test(phone)) {
        toast('Enter a valid 10-digit phone number.', 'error');
        return;
      }

      setLoading(true);

      try {
        const payload = {
          customer: { name, phone, address },
          items: items.map(i => ({
            id: i.id,
            name: i.name,
            price: i.price,
            qty: i.qty,
            img: i.img || null,
            meta: i.meta || null
          })),
          pricing: { subtotal, delivery, total },
          payment_mode: 'COD',
          channel: 'whatsapp'
        };

        const res = await fetch(INIT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data?.ok) {
          throw new Error(data?.message || 'Order placement failed');
        }

        ORDER_ID = data.order_id;
        localStorage.removeItem(CART_KEY);

        showSuccessBlock(ORDER_ID, phone);

      } catch (err) {
        console.error(err);
        toast(err.message || 'Something went wrong.', 'error');
      } finally {
        setLoading(false);
      }
    });
  }

  /* ---------- helpers ---------- */
  function readCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || '{}') || {}; }
    catch { return {}; }
  }

  function renderSummary(items, tbody) {
    if (!tbody) return;
    tbody.innerHTML = items.map(i => `
      <tr>
        <td>${i.name}</td>
        <td>${i.qty}</td>
        <td>${money(i.price)}</td>
        <td>${money(i.qty * i.price)}</td>
      </tr>
    `).join('');
  }

  function computeTotals(items) {
    const subtotal = items.reduce((s, i) => s + (i.qty * i.price), 0);
    const delivery = (subtotal === 0 || subtotal >= 499) ? 0 : 29;
    return { subtotal, delivery, total: subtotal + delivery };
  }

  function updateSummary(sub, del, tot) {
    subEl.textContent = money(sub);
    delEl.textContent = money(del);
    totEl.textContent = money(tot);
  }

  function setLoading(state) {
    if (confirmBtn) {
      confirmBtn.disabled = state;
      confirmBtn.textContent = state ? 'Placing Order…' : 'Confirm Order';
    }
    form?.querySelectorAll('input, textarea, button')?.forEach(el => el.disabled = state);
  }

  function showSuccessBlock(orderId, phone) {
  const host = $('#orderSummary');
  if (!host) return;

  const successHTML = `
    <div id="orderSuccess" style="
      margin-top:16px;
      padding:18px;
      border:1px solid #e6e6e6;
      border-radius:16px;
      background: #f9f9ff;
      box-shadow: 0 8px 28px rgba(0,0,0,0.08);
      opacity:0;
      transform: translateY(-20px);
      transition: opacity 0.5s ease, transform 0.5s ease;
      font-family: 'Inter', sans-serif;
    ">
      <h3 style="margin:0 0 8px 0; font-size:18px; color:#4b0082;">Order Placed 🎉</h3>
      <p style="margin:4px 0;">Order ID: <strong>${orderId}</strong></p>
      <p style="margin:4px 0;">
        An OTP has been sent to your WhatsApp <strong>${phone}</strong>. 
        Please share it with the delivery agent at the time of delivery.
      </p>
      <div style="margin-top:12px; display:flex; gap:10px;">
        <a class="btn-success" href="/dashboard?tab=orders">Go to My Orders</a>
        <a class="btn-ghost" href="/">Continue Shopping</a>
      </div>
    </div>
  `;

  host.insertAdjacentHTML('afterend', successHTML);

  const successEl = document.getElementById('orderSuccess');
  requestAnimationFrame(() => {
    successEl.style.opacity = '1';
    successEl.style.transform = 'translateY(0)';
  });

  // Style the buttons
  const btns = successEl.querySelectorAll('a');
  btns.forEach(btn => {
    btn.style.padding = '10px 18px';
    btn.style.borderRadius = '8px';
    btn.style.fontWeight = '600';
    btn.style.fontSize = '14px';
    btn.style.textDecoration = 'none';
    btn.style.transition = 'all 0.3s ease';
    btn.style.display = 'inline-block';
  });

  // Success button
  const successBtn = successEl.querySelector('.btn-success');
  successBtn.style.background = '#028200ff';
  successBtn.style.color = '#fff';
  successBtn.style.border = 'none';
  successBtn.addEventListener('mouseenter', () => successBtn.style.background = '#6a00c0');
  successBtn.addEventListener('mouseleave', () => successBtn.style.background = '#4b0082');

  // Ghost button
  const ghostBtn = successEl.querySelector('.btn-ghost');
  ghostBtn.style.background = '#fff';
  ghostBtn.style.color = '#008211ff';
  ghostBtn.style.border = '1px solid #008204ff';
  ghostBtn.addEventListener('mouseenter', () => {
    ghostBtn.style.background = '#028200ff';
    ghostBtn.style.color = '#fff';
  });
  ghostBtn.addEventListener('mouseleave', () => {
    ghostBtn.style.background = '#fff';
    ghostBtn.style.color = '#4b0082';
  });
}

function toast(msg, type='info') {
  const t = document.createElement('div');
  t.textContent = msg;

  t.style.position = 'fixed';
  t.style.left = '50%';
  t.style.top = '20px';
  t.style.transform = 'translateX(-50%) translateY(-20px)';
  t.style.padding = '12px 22px';
  t.style.borderRadius = '24px';
  t.style.fontWeight = '600';
  t.style.fontFamily = "'Inter', sans-serif";
  t.style.fontSize = '14px';
  t.style.cursor = 'pointer';
  t.style.background = (type === 'error') ? '#ff5252' : (type === 'success' ? '#4caf50' : '#2196f3');
  t.style.color = '#fff';
  t.style.border = 'none';
  t.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
  t.style.zIndex = '9999';
  t.style.opacity = '0';
  t.style.transition = 'opacity 0.4s ease, transform 0.4s ease, box-shadow 0.3s ease';

  document.body.appendChild(t);

  // Animate in
  requestAnimationFrame(() => {
    t.style.opacity = '1';
    t.style.transform = 'translateX(-50%) translateY(0)';
  });

  // Hover effect
  t.addEventListener('mouseenter', () => {
    t.style.boxShadow = '0 12px 36px rgba(0,0,0,0.3)';
    t.style.transform = 'translateX(-50%) translateY(-2px)';
  });
  t.addEventListener('mouseleave', () => {
    t.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
    t.style.transform = 'translateX(-50%) translateY(0)';
  });

  // Click to dismiss
  t.addEventListener('click', () => t.remove());

  // Auto remove
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(-50%) translateY(-20px)';
    setTimeout(() => t.remove(), 400);
  }, 2500);
}
})
