/* DPC — catalog filters, sort & view, plus product & cart modals */
(function () {
  const grid = document.getElementById("grid");

  if (grid) {
    const state = { availability: "all", sort: "featured", view: "grid" };
    const products = Array.from(grid.querySelectorAll(".product"));

    function apply() {
      let visible = products.filter(function (p) {
        if (state.availability === "soldout" && !p.classList.contains("sold-out")) return false;
        if (state.availability === "available" && p.classList.contains("sold-out")) return false;
        return true;
      });

      if (state.sort === "az") {
        visible.sort(function (a, b) { return a.dataset.name.localeCompare(b.dataset.name, "en"); });
      } else if (state.sort === "price-asc") {
        visible.sort(function (a, b) { return a.dataset.price - b.dataset.price; });
      } else if (state.sort === "price-desc") {
        visible.sort(function (a, b) { return b.dataset.price - a.dataset.price; });
      }

      products.forEach(function (p) { p.style.display = "none"; });
      visible.forEach(function (p) { grid.appendChild(p); p.style.display = ""; });

      let empty = grid.querySelector(".empty");
      if (!visible.length && !empty) {
        empty = document.createElement("p");
        empty.className = "empty";
        empty.textContent = "Nothing matches these filters.";
        grid.appendChild(empty);
      } else if (visible.length && empty) {
        empty.remove();
      }

      document.getElementById("count").textContent =
        visible.length + (visible.length === 1 ? " item" : " items");
    }

    document.querySelectorAll(".menu").forEach(function (menu) {
      const key = menu.dataset.filter;
      menu.addEventListener("change", function (e) {
        state[key] = e.target.value;
        menu.querySelectorAll("label").forEach(function (l) {
          l.classList.toggle("checked", l.contains(e.target));
        });
        menu.closest("details").removeAttribute("open");
        apply();
      });
    });

    const viewGrid = document.getElementById("view-grid");
    const viewList = document.getElementById("view-list");
    function setView(view) {
      state.view = view;
      grid.classList.toggle("list", view === "list");
      viewGrid.classList.toggle("active", view === "grid");
      viewList.classList.toggle("active", view === "list");
    }
    viewGrid.addEventListener("click", function () { setView("grid"); });
    viewList.addEventListener("click", function () { setView("list"); });

    document.addEventListener("click", function (e) {
      document.querySelectorAll("details.filter[open]").forEach(function (d) {
        if (!d.contains(e.target)) d.removeAttribute("open");
      });
    });

    apply();
  }

  /* ---------- product & cart ---------- */
  const productModal = document.getElementById("product-modal");
  const cartModal = document.getElementById("cart-modal");
  if (!productModal || !cartModal) return;

  const pmImg = document.getElementById("pm-img");
  const pmName = document.getElementById("pm-name");
  const pmPrice = document.getElementById("pm-price");
  const pmAdd = document.getElementById("pm-add");
  const pmError = document.getElementById("pm-size-error");
  const sizesFieldset = productModal.querySelector(".sizes");
  const cartItems = document.getElementById("cart-items");
  const cartEmpty = document.getElementById("cart-empty");
  const cartTotal = document.getElementById("cart-total");
  const checkout = document.getElementById("checkout");
  const checkoutNote = document.getElementById("checkout-note");
  const cartCount = document.getElementById("cart-count");
  const cartLink = document.getElementById("cart-link");

  let cart = loadCart();
  let currentProduct = null;
  let lastFocused = null;

  function loadCart() {
    try { return JSON.parse(localStorage.getItem("dpc-cart")) || []; }
    catch (err) { return []; }
  }

  function saveCart() {
    try { localStorage.setItem("dpc-cart", JSON.stringify(cart)); }
    catch (err) { /* storage unavailable */ }
  }

  function openModal(modal) {
    closeModals();
    lastFocused = document.activeElement;
    modal.hidden = false;
    document.body.classList.add("modal-open");
    const closer = modal.querySelector(".modal-close");
    if (closer) closer.focus();
  }

  function closeModals() {
    document.querySelectorAll(".modal:not([hidden])").forEach(function (m) {
      m.hidden = true;
    });
    document.body.classList.remove("modal-open");
    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus();
      lastFocused = null;
    }
  }

  document.querySelectorAll("[data-close]").forEach(function (el) {
    el.addEventListener("click", closeModals);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeModals();
  });

  function openProduct(product) {
    const img = product.querySelector("img");
    currentProduct = {
      name: product.dataset.name,
      price: Number(product.dataset.price),
      img: img ? img.getAttribute("src") : ""
    };
    pmImg.setAttribute("src", currentProduct.img);
    pmImg.setAttribute("alt", currentProduct.name);
    pmName.textContent = currentProduct.name;
    pmPrice.textContent = "$" + currentProduct.price;
    productModal.querySelectorAll('input[name="pm-size"]').forEach(function (r) { r.checked = false; });
    sizesFieldset.classList.remove("invalid");
    pmError.hidden = true;
    openModal(productModal);
  }

  document.querySelectorAll(".product").forEach(function (product) {
    product.addEventListener("click", function (e) {
      e.preventDefault();
      openProduct(product);
    });
  });

  productModal.querySelectorAll('input[name="pm-size"]').forEach(function (radio) {
    radio.addEventListener("change", function () {
      sizesFieldset.classList.remove("invalid");
      pmError.hidden = true;
    });
  });

  pmAdd.addEventListener("click", function () {
    if (!currentProduct) return;
    const size = productModal.querySelector('input[name="pm-size"]:checked');
    if (!size) {
      sizesFieldset.classList.add("invalid");
      pmError.hidden = false;
      return;
    }
    const line = cart.find(function (item) {
      return item.name === currentProduct.name && item.size === size.value;
    });
    if (line) {
      line.qty += 1;
    } else {
      cart.push({
        name: currentProduct.name,
        price: currentProduct.price,
        size: size.value,
        img: currentProduct.img,
        qty: 1
      });
    }
    saveCart();
    renderCart();
    openModal(cartModal);
  });

  function renderCart() {
    cartItems.innerHTML = "";
    let total = 0;
    let count = 0;

    cart.forEach(function (item, index) {
      total += item.price * item.qty;
      count += item.qty;

      const row = document.createElement("div");
      row.className = "cart-item";

      const img = document.createElement("img");
      img.src = item.img;
      img.alt = item.name;

      const info = document.createElement("div");
      info.className = "cart-item-info";

      const name = document.createElement("p");
      name.className = "cart-item-name";
      name.textContent = item.name;

      const meta = document.createElement("p");
      meta.className = "cart-item-meta";
      meta.textContent = "Size " + item.size + " · Qty " + item.qty + " · $" + (item.price * item.qty);

      const remove = document.createElement("button");
      remove.className = "cart-remove";
      remove.type = "button";
      remove.textContent = "Remove";
      remove.addEventListener("click", function () {
        cart.splice(index, 1);
        saveCart();
        renderCart();
      });

      info.appendChild(name);
      info.appendChild(meta);
      info.appendChild(remove);
      row.appendChild(img);
      row.appendChild(info);
      cartItems.appendChild(row);
    });

    cartCount.textContent = count;
    cartTotal.textContent = "$" + total;

    const hasItems = cart.length > 0;
    cartEmpty.hidden = hasItems;
    cartItems.hidden = !hasItems;
    cartTotal.parentElement.hidden = !hasItems;
    checkout.hidden = !hasItems;
    if (!hasItems) checkoutNote.hidden = true;
  }

  checkout.addEventListener("click", function () {
    checkoutNote.hidden = false;
  });

  cartLink.addEventListener("click", function (e) {
    e.preventDefault();
    renderCart();
    openModal(cartModal);
  });

  renderCart();
})();
