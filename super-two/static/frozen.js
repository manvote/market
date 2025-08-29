/* ---------- Helpers ---------- */
const $ = (q, c=document)=> c.querySelector(q);
const $$ = (q, c=document)=> Array.from(c.querySelectorAll(q));
const money = v => `₹${v.toFixed(0)}`;
const clamp = (v,min,max)=> Math.max(min, Math.min(max, v));

/* ---------- Frozen Products Script ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("frozen-container"); 
  // make sure frozen.html has <div id="frozen-container"></div>

  async function loadFrozen() {
    try {
      let url = "/api/products/frozen";
      if (currentSubcat !== "all") {
        url += `?subcategory=${encodeURIComponent(currentSubcat)}`;
      }
      const res = await fetch(url);

      const frozenItems = await res.json();

      container.innerHTML = ""; // clear old content

      frozenItems.forEach(item => {
        const card = document.createElement("div");
        card.className = "product-card";

        card.innerHTML = `
          <img src="${item.image_url || 'default.jpg'}" alt="${item.name}">
          <h3>${item.name}</h3>
          <p class="price">₹${item.price} / ${item.unit}</p>
          <button class="add-to-cart" data-id="${item.id}">Add to Cart</button>
        `;

        container.appendChild(card);
      });
    } catch (err) {
      console.error("Error loading frozen products:", err);
      container.innerHTML = "<p>Failed to load frozen products. Please try again later.</p>";
    }
  }

  let currentSubcat = "all"; 
  const subcatBtns = $$("#subcatFilters .chip");

  subcatBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      // update highlight
      subcatBtns.forEach(b => b.classList.remove("chip--select"));
      btn.classList.add("chip--select");

      // update subcat + reload frozen items
      currentSubcat = btn.dataset.subcat || "all";
      loadFrozen();
    });
  });

  loadFrozen();
});



/* search highlight (home rails) */
$('#searchInput') && $('#searchInput').addEventListener('input', e=>{
  const q = e.target.value.trim().toLowerCase();
  $$('.card').forEach(card=>{
    const name = $('.card__title', card).textContent.toLowerCase();
    card.style.outline = name.includes(q) && q ? '2px solid var(--accent-2)' : '';
    card.style.opacity = (!q || name.includes(q)) ? '1' : '.35';
  });
});


/* ---------- Cart State (shared) ---------- */
const CART_KEY = 'zippy_cart_v1';
let CART = JSON.parse(localStorage.getItem(CART_KEY) || '{}'); // {id:{...p, qty}}
const saveCart = ()=> localStorage.setItem(CART_KEY, JSON.stringify(CART));
const cartCountEl = $('#cartCount');
function updateCartBadge(){
  if(!cartCountEl) return;
  const count = Object.values(CART).reduce((a,b)=>a+b.qty,0);
  cartCountEl.textContent = count;
}

/* ---------- Card template & handlers ---------- */
function cardTemplate(p){
  return `
    <article class="card" data-id="${p.id}">
      <img class="card__img" src="${p.img}" alt="${p.name}">
      <div class="card__meta">★ ${p.rating.toFixed(1)} • ${p.meta}</div>
      <div class="card__title">${p.name}</div>
      <div class="card__row">
        <div class="price">${money(p.price)}</div>
        <button class="add" data-add>Add</button>
        <div class="qty" hidden>
          <button data-dec>-</button><strong data-q>1</strong><button data-inc>+</button>
        </div>
      </div>
    </article>`;
}
function attachCardHandlers(scope){
  scope.addEventListener('click', e=>{
    const card = e.target.closest('.card'); if(!card) return;
    const id = card.dataset.id;
    const product = ALL_PRODUCTS.find(p=>p.id===id);
    if(e.target.matches('[data-add]')){
      addToCart(product, 1);
      flipToQty(card);
      flyToCart(card.querySelector('.card__img'));
    }
    if(e.target.matches('[data-inc]')) addToCart(product, 1, card);
    if(e.target.matches('[data-dec]')) addToCart(product, -1, card);
  });
}
function flipToQty(card, qty=1){
  card.querySelector('[data-add]').hidden = true;
  card.querySelector('.qty').hidden = false;
  card.querySelector('[data-q]').textContent = qty;
}

/* ---------- Left Panel Cart ops ---------- */
const panel = $('#cartPanel'), panelItems = $('#panelItems');
const panelBackdrop = $('#panelBackdrop');
const cartBtn = $('#cartBtn');
function openPanel(){ if(!panel) return; panel.classList.add('open'); panel.setAttribute('aria-hidden','false'); panelBackdrop.hidden=false; }
function closePanel(){ if(!panel) return; panel.classList.remove('open'); panel.setAttribute('aria-hidden','true'); panelBackdrop.hidden=true; }

cartBtn && cartBtn.addEventListener('click', openPanel);
$$('[data-close-panel]').forEach(b=> b.addEventListener('click', closePanel));
panelBackdrop && panelBackdrop.addEventListener('click', closePanel);

function addToCart(product, delta=1, card=null){
  const item = CART[product.id] || {...product, qty:0};
  item.qty = clamp((item.qty||0) + delta, 0, 99);
  if(item.qty<=0) delete CART[product.id]; else CART[product.id]=item;
  saveCart(); updateCartBadge(); renderPanel();

  // reflect UI on card(s)
  if(card){
    if(item.qty<=0){
      card.querySelector('[data-add]').hidden=false;
      card.querySelector('.qty').hidden=true;
    } else {
      card.querySelector('[data-q]').textContent=item.qty;
    }
  } else {
    const any = document.querySelector(`.card[data-id="${product.id}"]`);
    if(any){
      if(item.qty>0) flipToQty(any, item.qty);
      else { any.querySelector('[data-add]').hidden=false; any.querySelector('.qty').hidden=true; }
    }
  }
}

function renderPanel(){
  if(!panelItems) return;
  const items = Object.values(CART);
  panelItems.innerHTML = items.length ? items.map(i=>`
    <div class="panel__item" data-id="${i.id}">
      <img src="${i.img}" alt="${i.name}">
      <div>
        <strong>${i.name}</strong>
        <div class="muted">${i.meta}</div>
        <div class="muted">${money(i.price)} each</div>
      </div>
      <div class="qty">
        <button data-dec>-</button>
        <strong data-q>${i.qty}</strong>
        <button data-inc>+</button>
      </div>
    </div>`).join('') : `<p class="muted">Your cart is empty. Start adding tasty stuff!</p>`;

  const sub = items.reduce((s,i)=> s + i.qty*i.price, 0);
  const delivery = (sub===0 || sub>=499) ? 0 : 29;
  $('#panelSubtotal') && ($('#panelSubtotal').textContent = money(sub));
  $('#panelDelivery') && ($('#panelDelivery').textContent = money(delivery));
  $('#panelTotal') && ($('#panelTotal').textContent = money(sub+delivery));
}
panelItems && panelItems.addEventListener('click', e => {
  const row = e.target.closest('.panel__item'); 
  if(!row) return;

  const id = row.dataset.id;
  const qtyEl = row.querySelector('[data-q]');
  let qty = parseInt(qtyEl.textContent);

  const name = row.querySelector('strong').textContent;
  const price = parseFloat(row.querySelector('.muted:nth-child(2)').textContent.replace(/[^\d]/g, ""));
  const img = row.querySelector('img').src;

  const product = { id, name, price, img, meta: 'Toys', rating: 4.5 };

  if(e.target.matches('[data-inc]')) {
    qty++;
    qtyEl.textContent = qty;
    addToCart(product, 1);
  } else if(e.target.matches('[data-dec]')) {
    qty--;
    if(qty <= 0) {
      delete CART[id]; 
      saveCart();
      renderPanel();
      updateCartBadge();
      return;
    } else {
      qtyEl.textContent = qty;
      addToCart(product, -1);
    }
  }
});



/* fly-to-cart animation */
function flyToCart(imgEl){
  const cart = $('#cartBtn'); if(!cart || !imgEl) return;
  const img = imgEl.cloneNode(true);
  const rect = imgEl.getBoundingClientRect(); const cRect = cart.getBoundingClientRect();
  img.style.position='fixed'; img.style.zIndex='2000';
  img.style.left = rect.left+'px'; img.style.top = rect.top+'px';
  img.style.width = rect.width+'px'; img.style.height = rect.height+'px';
  img.style.transition = 'transform .7s cubic-bezier(.2,.8,.2,1), opacity .7s ease';
  document.body.appendChild(img);
  const dx = cRect.left - rect.left, dy = cRect.top - rect.top;
  requestAnimationFrame(()=>{ img.style.transform=`translate(${dx}px,${dy}px) scale(.2) rotate(10deg)`; img.style.opacity='.2'; });
  setTimeout(()=> img.remove(), 700);
}

/* ---------- Products page grid + filters ---------- */
let GRID_PAGE = 1, GRID_PAGE_SIZE = 12, ACTIVE_CAT = 'all', PRICE_MAX = 600, ACTIVE_SORT='popular';
function filtered(){
  let list = ALL_PRODUCTS.filter(p=> ACTIVE_CAT==='all' ? true : p.cat===ACTIVE_CAT)
                         .filter(p=> p.price <= PRICE_MAX);
  switch(ACTIVE_SORT){
    case 'price-asc': list.sort((a,b)=> a.price-b.price); break;
    case 'price-desc': list.sort((a,b)=> b.price-a.price); break;
    case 'rating': list.sort((a,b)=> b.rating-a.rating); break;
    default: /* popular - stable order */ break;
  }
  return list;
}
function renderGrid(reset=false){
  const grid = $('#grid'); if(!grid) return;
  if(reset){ GRID_PAGE = 1; grid.innerHTML=''; }
  const items = filtered();
  $('#gridTitle') && ($('#gridTitle').textContent = (ACTIVE_CAT==='all' ? 'All products' : ACTIVE_CAT[0].toUpperCase()+ACTIVE_CAT.slice(1)));
  $('#gridCount') && ($('#gridCount').textContent = `${items.length} items`);
  const slice = items.slice(0, GRID_PAGE*GRID_PAGE_SIZE);
  const html = slice.map(cardTemplate).join('');
  grid.innerHTML = html;
  attachCardHandlers(grid);
  $('#loadMore') && ($('#loadMore').style.display = slice.length < items.length ? 'inline-flex' : 'none');
}
function initFilters(){
  const range = $('#priceRange'); const label = $('#priceLabel');
  range && range.addEventListener('input', e=>{
    PRICE_MAX = +e.target.value; label.textContent = `₹${PRICE_MAX}`; renderGrid(true);
  });
  $('#catFilters') && $('#catFilters').addEventListener('click', e=>{
    const btn = e.target.closest('.chip'); if(!btn) return;
    $$('#catFilters .chip').forEach(c=> c.classList.remove('chip--select'));
    btn.classList.add('chip--select');
    ACTIVE_CAT = btn.dataset.cat; renderGrid(true);
  });
  $('#sortSelect') && $('#sortSelect').addEventListener('change', e=>{
    ACTIVE_SORT = e.target.value; renderGrid(true);
  });
  $('#loadMore') && $('#loadMore').addEventListener('click', ()=> { GRID_PAGE++; renderGrid(); });
  $('#searchProducts') && $('#searchProducts').addEventListener('input', e=>{
    const q = e.target.value.trim().toLowerCase();
    $$('#grid .card').forEach(card=>{
      const name = $('.card__title', card).textContent.toLowerCase();
      card.style.display = (!q || name.includes(q)) ? '' : 'none';
    });
  });
}

/* ---------- Bridge: Toys product-card -> Cart ---------- */
document.addEventListener("click", e => {
  if (e.target.classList.contains("add-to-cart")) {
    const btn = e.target;
    const card = btn.closest(".product-card");
    if (!card) return;

    const id = btn.dataset.id;
    const name = card.querySelector("h3").textContent;
    const price = parseFloat(
      card.querySelector(".price").textContent.replace(/[^\d]/g, "")
    );
    const img = card.querySelector("img").src;

    const product = {
      id,
      name,
      price,
      img,
      meta: "Toys",
      rating: 4.5
    };

    // use your existing global addToCart()
    addToCart(product, 1);

    // feedback
    flyToCart(card.querySelector("img"));
    btn.textContent = "Added ✔";
    btn.style.background = "#4caf50";
    btn.style.color = "#fff";
    setTimeout(() => {
      btn.textContent = "Add to Cart";
      btn.style.background = "";
      btn.style.color = "";
    }, 1500);
  }
});

/* ---------- Convert toys button into qty control ---------- */
function updateToysButton(id, qty) {
  const btn = document.querySelector(`.add-to-cart[data-id="${id}"]`);
  if (!btn) return;

  if (qty > 0) {
    btn.outerHTML = `
      <div class="qty-control" data-id="${id}">
        <button class="decrease">-</button>
        <span class="qty">${qty}</span>
        <button class="increase">+</button>
      </div>
    `;
  }
}

/* Listen for + / - clicks inside toys-container */
document.addEventListener("click", e => {
  const control = e.target.closest(".qty-control");
  if (!control) return;

  const id = control.dataset.id;
  const qtySpan = control.querySelector(".qty");
  let qty = parseInt(qtySpan.textContent);
  const card = control.closest(".product-card");
  const name = card.querySelector("h3").textContent;
  const price = parseFloat(card.querySelector(".price").textContent.replace(/[^\d]/g, ""));
  const img = card.querySelector("img").src;
  const product = { id, name, price, img, meta: "Toys", rating: 4.5 };

  const currentQty = CART[id]?.qty || 0;

  if (e.target.classList.contains("increase")) {
    qty++;
    qtySpan.textContent = qty;
    addToCart(product, 1); // delta = +1
  } else if (e.target.classList.contains("decrease")) {
    qty--;
    if (qty <= 0) {
      control.outerHTML = `<button class="add-to-cart" data-id="${id}">Add to Cart</button>`;
      addToCart(product, -currentQty); // remove completely
      return;
    } else {
      qtySpan.textContent = qty;
      addToCart(product, -1); // delta = -1
    }
  }
});

