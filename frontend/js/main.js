(function () {
  'use strict';

  const API_BASE = '/api';

  // Static fallback so the site still looks correct if the backend/API is unreachable
  // (e.g. during local file-preview, or a brief backend outage).
  const FALLBACK_PRODUCTS = [
    { id: 1, name: 'Zig-Zag Block', description: 'Heavy duty • 80mm', image_url: '/assets/products/zig-zag-block.jpg' },
    { id: 2, name: 'Toras Interlock', description: 'Residential • 60mm', image_url: '/assets/products/toras-interlock.jpg' },
    { id: 3, name: 'Grass Paver', description: 'Eco drainage', image_url: '/assets/products/grass-paver.jpg' },
    { id: 4, name: 'Chequered Tile', description: 'Parking areas', image_url: '/assets/products/chequered-tile.jpg' }
  ];

  const productGrid = document.getElementById('productGrid');
  const productSelect = document.getElementById('productSelect');
  let currentProducts = [];
  let activeProductId = null;

  // ---------- Mobile nav ----------
  const menuBtn = document.getElementById('menuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  menuBtn.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(isOpen));
  });
  mobileMenu.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      menuBtn.setAttribute('aria-expanded', 'false');
    })
  );

  // ---------- Toast ----------
  function showToast(message, isError) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'toast' + (isError ? ' error' : '');
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  function starString(avg) {
    const rounded = Math.round(avg || 0);
    return '★'.repeat(rounded) + '☆'.repeat(5 - rounded);
  }

  // Missing photo -> clean placeholder with the product name.
  // NOTE: this is wired up from JS rather than an inline onerror attribute,
  // because server.js sets Helmet's script-src without 'unsafe-inline', which
  // makes the browser ignore inline event handlers entirely.
  function applyImageFallback(img) {
    function activate() {
      if (img.dataset.failed === '1') return;
      img.dataset.failed = '1';
      img.src =
        'https://placehold.co/400x300/0f172a/c9a24d?text=' +
        encodeURIComponent(img.dataset.name || 'Paras Pavers');
    }
    img.addEventListener('error', activate);
    // The image can fail before this listener attaches (it starts loading as
    // soon as innerHTML is assigned) — in that case the event is already gone.
    if (img.complete && img.naturalWidth === 0) activate();
  }

  // ---------- Render product cards ----------
  async function loadProducts() {
    let products = FALLBACK_PRODUCTS;
    try {
      const res = await fetch(`${API_BASE}/products`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length) {
          products = json.data;
        }
      }
    } catch (e) {
      // Silent fallback — static products still render
    }
    currentProducts = products;
    renderProductGrid(products);
    populateProductSelect(products);
    products.forEach((p) => loadRatingSummary(p.id));
  }

  function renderProductGrid(products) {
    productGrid.innerHTML = '';
    products.forEach((p) => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.innerHTML = `
        <div class="img-container">
          <img src="${escapeAttr(p.image_url || '')}" alt="${escapeAttr(p.name)}"
               class="product-image" loading="lazy" data-name="${escapeAttr(p.name)}">
        </div>
        <div class="p-5">
            <h4 class="heading-font text-lg">${escapeHtml(p.name)}</h4>
            <p class="text-sm text-gray-600 mb-2">${escapeHtml(p.description || '')}</p>
            <div class="flex items-center justify-between mt-3">
                <div class="text-sm">
                    <span class="star-display" data-rating-stars="${p.id}">☆☆☆☆☆</span>
                    <span class="text-xs text-gray-500 ml-1" data-rating-count="${p.id}">(0)</span>
                </div>
                <button class="text-xs uppercase font-semibold text-[#c9a24d] hover:text-[#0f172a]" data-rate-btn="${p.id}">
                    Rate this
                </button>
            </div>
        </div>`;
      productGrid.appendChild(card);
    });

    productGrid.querySelectorAll('.product-image').forEach(applyImageFallback);

    productGrid.querySelectorAll('[data-rate-btn]').forEach((btn) => {
      btn.addEventListener('click', () => openRatingModal(Number(btn.getAttribute('data-rate-btn'))));
    });
  }

  function populateProductSelect(products) {
    products.forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      productSelect.appendChild(opt);
    });
  }

  async function loadRatingSummary(productId) {
    try {
      const res = await fetch(`${API_BASE}/products/${productId}/rating`);
      if (!res.ok) return;
      const json = await res.json();
      if (!json.success) return;
      const starsEl = document.querySelector(`[data-rating-stars="${productId}"]`);
      const countEl = document.querySelector(`[data-rating-count="${productId}"]`);
      if (starsEl) starsEl.textContent = starString(json.data.average);
      if (countEl) countEl.textContent = `${json.data.average} (${json.data.count})`;
    } catch (e) {
      /* leave default */
    }
  }

  // ---------- Rating modal ----------
  const overlay = document.getElementById('ratingModalOverlay');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const ratingForm = document.getElementById('ratingForm');
  const ratingModalProduct = document.getElementById('ratingModalProduct');
  const starPicker = document.getElementById('starPicker');
  const ratingValueInput = document.getElementById('ratingValue');
  const ratingFormError = document.getElementById('ratingFormError');
  const ratingSubmitBtn = document.getElementById('ratingSubmitBtn');

  function openRatingModal(productId) {
    activeProductId = productId;
    const product = currentProducts.find((p) => p.id === productId);
    ratingModalProduct.textContent = product ? product.name : '';
    ratingValueInput.value = '0';
    updateStarPicker(0);
    document.getElementById('reviewerName').value = '';
    document.getElementById('reviewText').value = '';
    ratingFormError.classList.add('hidden');
    overlay.classList.remove('hidden');
  }

  function closeRatingModal() {
    overlay.classList.add('hidden');
  }

  closeModalBtn.addEventListener('click', closeRatingModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeRatingModal();
  });

  starPicker.querySelectorAll('.star-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const val = Number(btn.getAttribute('data-star'));
      ratingValueInput.value = String(val);
      updateStarPicker(val);
    });
  });

  function updateStarPicker(val) {
    starPicker.querySelectorAll('.star-btn').forEach((btn) => {
      const starVal = Number(btn.getAttribute('data-star'));
      btn.classList.toggle('active', starVal <= val);
      btn.setAttribute('aria-checked', String(starVal === val));
    });
  }

  ratingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const rating = Number(ratingValueInput.value);
    if (!rating || rating < 1 || rating > 5) {
      ratingFormError.textContent = 'Please select a star rating.';
      ratingFormError.classList.remove('hidden');
      return;
    }
    ratingFormError.classList.add('hidden');
    ratingSubmitBtn.disabled = true;
    const originalLabel = ratingSubmitBtn.innerHTML;
    ratingSubmitBtn.innerHTML = '<span class="spinner"></span> Submitting...';

    try {
      const res = await fetch(`${API_BASE}/products/${activeProductId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          customer_name: document.getElementById('reviewerName').value,
          review: document.getElementById('reviewText').value
        })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to submit review');

      showToast('Thank you! Your rating has been submitted.');
      closeRatingModal();
      loadRatingSummary(activeProductId);
    } catch (err) {
      ratingFormError.textContent = err.message || 'Something went wrong. Please try again.';
      ratingFormError.classList.remove('hidden');
    } finally {
      ratingSubmitBtn.disabled = false;
      ratingSubmitBtn.innerHTML = originalLabel;
    }
  });

  // ---------- Calculator ----------
  const calcForm = document.getElementById('calcForm');
  const calcFormError = document.getElementById('calcFormError');
  const calcSubmitBtn = document.getElementById('calcSubmitBtn');
  const calcSubmitLabel = document.getElementById('calcSubmitLabel');
  const calcResult = document.getElementById('calcResult');

  calcForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    calcFormError.classList.add('hidden');

    const payload = {
      length: Number(document.getElementById('landLength').value),
      width: Number(document.getElementById('landWidth').value),
      unit: document.getElementById('unit').value,
      blockLength: Number(document.getElementById('blockLength').value),
      blockWidth: Number(document.getElementById('blockWidth').value),
      wastage: document.getElementById('wastage').value ? Number(document.getElementById('wastage').value) : 0,
      depth: document.getElementById('depth').value ? Number(document.getElementById('depth').value) : undefined,
      productId: productSelect.value || undefined
    };

    if (!(payload.length > 0) || !(payload.width > 0) || !(payload.blockLength > 0) || !(payload.blockWidth > 0)) {
      calcFormError.textContent = 'Please fill in all required fields with valid positive numbers.';
      calcFormError.classList.remove('hidden');
      return;
    }

    calcSubmitBtn.disabled = true;
    calcSubmitLabel.innerHTML = '<span class="spinner"></span> Calculating...';

    try {
      const res = await fetch(`${API_BASE}/calculate-quantity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Calculation failed');

      renderCalcResult(json, payload);

      // Fire-and-forget AI explanation (falls back automatically server-side if no AI key)
      const productName = productSelect.selectedOptions[0] ? productSelect.selectedOptions[0].textContent : 'paver';
      fetch(`${API_BASE}/ai/quantity-advice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, productName })
      })
        .then((r) => r.json())
        .then((aiJson) => {
          if (aiJson.success) document.getElementById('aiMessage').textContent = aiJson.message;
        })
        .catch(() => {});

      calcResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      calcFormError.textContent = err.message || 'Something went wrong. Please try again.';
      calcFormError.classList.remove('hidden');
    } finally {
      calcSubmitBtn.disabled = false;
      calcSubmitLabel.textContent = 'Calculate';
    }
  });

  function renderCalcResult(json, payload) {
    document.getElementById('resLandArea').textContent = json.landArea;
    document.getElementById('resBasicBlocks').textContent = json.basicBlocks;
    document.getElementById('resRecommended').textContent = json.recommendedBlocks;

    const volumeWrap = document.getElementById('resVolumeWrap');
    const brassWrap = document.getElementById('resBrassWrap');
    if (json.estimatedVolume) {
      document.getElementById('resVolume').textContent = json.estimatedVolume;
      volumeWrap.classList.remove('hidden');
    } else {
      volumeWrap.classList.add('hidden');
    }
    if (json.estimatedBrass !== null && json.estimatedBrass !== undefined) {
      document.getElementById('resBrass').textContent = `${json.estimatedBrass} Brass`;
      brassWrap.classList.remove('hidden');
    } else {
      brassWrap.classList.add('hidden');
    }

    document.getElementById('aiMessage').textContent = json.message || '';

    const productName = productSelect.selectedOptions[0] ? productSelect.selectedOptions[0].textContent : 'Pavers';
    const waMessage = encodeURIComponent(
      `Hi, I'm interested in ${productName}. My land is ${payload.length}${payload.unit} x ${payload.width}${payload.unit}. ` +
      `Estimated requirement: ${json.recommendedBlocks} blocks` +
      (json.estimatedBrass ? `, approx. ${json.estimatedBrass} brass.` : '.')
    );
    document.getElementById('whatsappResultBtn').href = `https://wa.me/917066909899?text=${waMessage}`;

    calcResult.classList.remove('hidden');
  }

  // ---------- Utils ----------
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }
  function escapeAttr(str) {
    return escapeHtml(str).replace(/"/g, '&quot;');
  }

  // ---------- Init ----------
  loadProducts();
})();
