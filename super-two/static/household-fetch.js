/* ---------- Household Products Script ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("household-container"); 
  // make sure household.html has <div id="household-container"></div>

  async function loadHousehold() {
    try {
      let url = "/api/products/household";
      if (currentSubcat !== "all") {
        url += `?subcategory=${encodeURIComponent(currentSubcat)}`;
      }
      const res = await fetch(url);

      const householdItems = await res.json();

      container.innerHTML = ""; // clear old content

      householdItems.forEach(item => {
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
      console.error("Error loading household products:", err);
      container.innerHTML = "<p>Failed to load household products. Please try again later.</p>";
    }
  }

  let currentSubcat = "all"; 
  const subcatBtns = $$("#subcatFilters .chip");

  subcatBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      // update highlight
      subcatBtns.forEach(b => b.classList.remove("chip--select"));
      btn.classList.add("chip--select");

      // update subcat + reload household items
      currentSubcat = btn.dataset.subcat || "all";
      loadHousehold();
    });
  });

  loadHousehold();
});

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

