/* ---------- Helpers ---------- */
const $ = (q, c=document)=> c.querySelector(q);
const $$ = (q, c=document)=> Array.from(c.querySelectorAll(q));
const money = v => `₹${v.toFixed(0)}`;
const clamp = (v,min,max)=> Math.max(min, Math.min(max, v));

/* ---------- Cart State (shared) ---------- */
const CART_KEY = 'zippy_cart_v1';
let CART = JSON.parse(localStorage.getItem(CART_KEY) || '{}'); 
const saveCart = ()=> localStorage.setItem(CART_KEY, JSON.stringify(CART));
function updateCartBadge(){
  const cartCountEl = $('#cartCount');
  if(!cartCountEl) return;
  const count = Object.values(CART).reduce((a,b)=>a+b.qty,0);
  cartCountEl.textContent = count;
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


/* ---------- Cart Ops ---------- */
function addToCart(product, delta=1, card=null){
  const item = CART[product.id] || {...product, qty:0};
  item.qty = clamp((item.qty||0) + delta, 0, 99);
  if(item.qty<=0) delete CART[product.id]; 
  else CART[product.id]=item;
  saveCart(); updateCartBadge(); renderPanel();

  // only used in index.js (card qty flip)
  if(card){
    if(item.qty<=0){
      card.querySelector('[data-add]').hidden=false;
      card.querySelector('.qty').hidden=true;
    } else {
      card.querySelector('[data-q]').textContent=item.qty;
    }
  }
}

let ALL_PRODUCTS = [];

async function renderRails() {
  const scrollers = $$('.scroller');
  ALL_PRODUCTS = []; // reset so search works fresh

  for (const scroller of scrollers) {
    const key = scroller.dataset.source; // e.g. "toys", "fruits"
    try {
      const res = await fetch(`/api/products/${key}`);
      const products = await res.json();

      // store for search
      ALL_PRODUCTS = ALL_PRODUCTS.concat(products);

      // render
      scroller.innerHTML = products.map(cardTemplate).join('');
      attachCardHandlers(scroller);

    } catch (err) {
      console.error(`Failed to load ${key}:`, err);
      scroller.innerHTML = `<p class="muted">Couldn’t load ${key}</p>`;
    }
  }

  initRailButtons();
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


/* ---------- Home page rails ---------- */
function renderRails(){
  $$('.scroller').forEach(scroller=>{
    const key = scroller.dataset.source;
    scroller.innerHTML = PRODUCTS[key].map(cardTemplate).join('');
    attachCardHandlers(scroller);
  });
  initRailButtons();
}

/* rail arrow buttons */
function initRailButtons(){
  $$('.product-section').forEach(section=>{
    const scroller = $('.scroller', section);
    const left = $('.sc-left', section); const right = $('.sc-right', section);
    if(!scroller || !left || !right) return;
    const w = ()=> scroller.clientWidth * .9;
    left.addEventListener('click', ()=> scroller.scrollBy({left:-w(),behavior:'smooth'}));
    right.addEventListener('click', ()=> scroller.scrollBy({left:w(),behavior:'smooth'}));
  });
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

/* ---------- Hero carousel ---------- */
const heroSlides = $('#heroSlides');
if(heroSlides){
  const slides = $$('.hero__slide', heroSlides);
  const dots = $('#heroDots');
  let idx = 0, timer;
  const buildDots = ()=>{ dots.innerHTML = slides.map((_,i)=>`<button aria-label="Slide ${i+1}"></button>`).join(''); updateDots(); dots.addEventListener('click', e=>{ const i=[...dots.children].indexOf(e.target); if(i>=0) go(i);}); };
  const updateDots = ()=> [...dots.children].forEach((d,i)=> d.classList.toggle('active', i===idx));
  const go = i => { slides[idx].classList.remove('is-active'); idx = (i+slides.length)%slides.length; slides[idx].classList.add('is-active'); updateDots(); };
  const auto = ()=> { clearInterval(timer); timer = setInterval(()=> go(idx+1), 4500); };
  buildDots(); auto();
  // swipe
  let sx=0; heroSlides.addEventListener('pointerdown', e=> sx = e.clientX);
  heroSlides.addEventListener('pointerup', e=>{ const dx = e.clientX - sx; if(Math.abs(dx) > 40) go(idx + (dx<0 ? 1 : -1)); });
}

/* ---------- Offer carousel (banners) ---------- */
(function initOfferCarousel(){
  const track = $('#offerTrack'); const dots = $('#offerDots');
  if(!track) return;
  const slides = Array.from(track.children);
  dots.innerHTML = slides.map((_,i)=>`<button aria-label="Offer ${i+1}"></button>`).join('');
  let i = 0; const go = (n)=>{ i = (n+slides.length)%slides.length; track.style.transform = `translateX(${-i*100}%)`; update(); };
  const update = ()=> [...dots.children].forEach((d,di)=> d.classList.toggle('active', di===i));
  dots.addEventListener('click', e=>{ const k=[...dots.children].indexOf(e.target); if(k>=0) go(k); });
  let t = setInterval(()=> go(i+1), 4000);
  track.addEventListener('pointerdown', ()=> clearInterval(t));
  update();
})();

/* reveal-on-scroll */
const revealObs = new IntersectionObserver((entries)=>{
  for(const e of entries){ if(e.isIntersecting){ e.target.classList.add('in'); revealObs.unobserve(e.target); } }
},{threshold:.15});
$$('.reveal').forEach(el=> revealObs.observe(el));



/* search highlight (home rails) */
const homeContent = $('#homeContent');
const searchResults = $('#searchResults');

$('#searchInput') && $('#searchInput').addEventListener('input', e=>{
  const q = e.target.value.trim().toLowerCase();

  if(q){
    // hide homepage content
    if(homeContent) homeContent.style.display = 'none';
    if(searchResults) searchResults.style.display = 'grid';

    // filter products
    const matched = ALL_PRODUCTS.filter(p => p.name.toLowerCase().includes(q));
    if(matched.length){
      searchResults.innerHTML = matched.map(cardTemplate).join('');
      attachCardHandlers(searchResults);
    } else {
      searchResults.innerHTML = `<p class="no-results">No results found</p>`;
    }
  } else {
    // show homepage again
    if(homeContent) homeContent.style.display = '';
    if(searchResults) searchResults.style.display = 'none';
    if(searchResults) searchResults.innerHTML = '';
    renderRails(); // restore rails
  }
});



/* countdown (3h) */
function startCountdown(hours=3){
  const H = $('#timerH'), M = $('#timerM'), S = $('#timerS');
  if(!H||!M||!S) return;
  const end = Date.now() + hours*3600*1000;
  const tick = ()=>{
    const d = Math.max(0, end - Date.now());
    H.textContent = String(Math.floor(d/3600000)).padStart(2,'0');
    M.textContent = String(Math.floor((d%3600000)/60000)).padStart(2,'0');
    S.textContent = String(Math.floor((d%60000)/1000)).padStart(2,'0');
    if(d>0) requestAnimationFrame(tick);
  }; tick();
}

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

/* Footer year */
$('#year') && ($('#year').textContent = new Date().getFullYear());

/* ---------- Boot ---------- */
(function boot(){
  updateCartBadge();
  renderPanel();
  startCountdown(3);

  if($('#grid')){ // products page
    renderGrid(true); initFilters();
  } else {        // home page
    renderRails();
  }
})();


// =======================
// AUTH MODAL SCRIPT
// =======================

const authModal = document.getElementById("authModal");
const openAuth = document.getElementById("openAuth");
const closeAuth = document.getElementById("closeAuth");

const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const showSignup = document.getElementById("showSignup");
const showLogin = document.getElementById("showLogin");

// Open modal
openAuth.addEventListener("click", () => {
  authModal.classList.add("show");
  loginForm.classList.add("active");
  signupForm.classList.remove("active");
});

// Close modal
closeAuth.addEventListener("click", () => {
  authModal.classList.remove("show");
});

// Close modal on backdrop click
authModal.addEventListener("click", (e) => {
  if (e.target === authModal) {
    authModal.classList.remove("show");
  }
});

// Switch to Signup
showSignup.addEventListener("click", (e) => {
  e.preventDefault();
  loginForm.classList.remove("active");
  signupForm.classList.add("active");
});

// Switch to Login
showLogin.addEventListener("click", (e) => {
  e.preventDefault();
  signupForm.classList.remove("active");
  loginForm.classList.add("active");
});
