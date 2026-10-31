/*
  Mukahtaeain Digital Menu
  Paste the deployed Google Apps Script Web App URL into API_URL below.
*/
const API_URL = "PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE";

const state = { items: [], category: "all", query: "" };
const els = {
  status: document.getElementById("statusText"),
  search: document.getElementById("searchInput"),
  clear: document.getElementById("clearSearch"),
  categories: document.getElementById("categoryFilters"),
  grid: document.getElementById("menuGrid"),
  count: document.getElementById("itemCount"),
  title: document.getElementById("sectionTitle"),
  empty: document.getElementById("emptyState"),
  error: document.getElementById("errorState"),
  errorMessage: document.getElementById("errorMessage"),
  retry: document.getElementById("retryButton")
};

function normalize(value) {
  return String(value ?? "").trim().toLocaleLowerCase();
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}
function formatPrice(value) {
  const number = Number(String(value ?? "").replace(/,/g, "").trim());
  if (!Number.isFinite(number)) return escapeHtml(value || "ဈေးနှုန်းမသတ်မှတ်ရသေး");
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(number) + " ကျပ်";
}
function isAvailable(value) {
  if (typeof value === "boolean") return value;
  const text = normalize(value);
  return ["true", "yes", "1", "ရ", "ရှိ", "ရရှိနိုင်"].includes(text);
}
function showError(message) {
  els.error.hidden = false;
  els.errorMessage.textContent = message;
  els.status.textContent = "မီနူးကို ဖွင့်မရသေးပါ";
}
function loadMenu() {
  if (!API_URL.startsWith("https://script.google.com/")) {
    showError("app.js ထဲက API_URL နေရာမှာ Google Apps Script Web App URL ကို ထည့်ရန် လိုအပ်ပါတယ်။");
    return;
  }
  els.error.hidden = true;
  els.status.textContent = "မီနူးကို ဖွင့်နေပါတယ်…";
  const callbackName = "__menuCallback_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
  const script = document.createElement("script");
  let finished = false;
  const timeout = setTimeout(() => finish(new Error("အချိန်ကုန်သွားပါတယ်။ Internet နဲ့ Apps Script URL ကို စစ်ဆေးပါ။")), 15000);

  function cleanup() {
    clearTimeout(timeout);
    delete window[callbackName];
    script.remove();
  }
  function finish(error, data) {
    if (finished) return;
    finished = true;
    cleanup();
    if (error) {
      showError(error.message || "မီနူးအချက်အလက်ကို ရယူမရပါ။");
      return;
    }
    if (!data || data.success !== true || !Array.isArray(data.items)) {
      showError((data && data.message) || "Google Sheets မှ မှန်ကန်တဲ့ မီနူးအချက်အလက် မရရှိပါ။");
      return;
    }
    state.items = data.items.map(item => ({
      name: String(item.ItemName ?? "").trim(),
      category: String(item.Category ?? "အခြား").trim() || "အခြား",
      price: item.Price ?? "",
      description: String(item.Description ?? "").trim(),
      image: String(item.Image ?? "").trim(),
      available: isAvailable(item.Available)
    })).filter(item => item.name);
    buildCategories();
    renderMenu();
    els.status.textContent = "မီနူးအသစ်တင်ပြီး • " + state.items.length + " မျိုး";
  }

  window[callbackName] = data => finish(null, data);
  script.onerror = () => finish(new Error("Google Apps Script ကို ချိတ်ဆက်မရပါ။ URL နဲ့ Web App access ကို စစ်ဆေးပါ။"));
  const separator = API_URL.includes("?") ? "&" : "?";
  script.src = API_URL + separator + "callback=" + encodeURIComponent(callbackName) + "&_=" + Date.now();
  document.body.appendChild(script);
}
function buildCategories() {
  const categories = [...new Set(state.items.map(item => item.category).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "my"));
  els.categories.innerHTML = "";
  const allButton = makeCategoryButton("all", "အားလုံး");
  els.categories.appendChild(allButton);
  categories.forEach(category => els.categories.appendChild(makeCategoryButton(category, category)));
}
function makeCategoryButton(value, label) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "chip" + (state.category === value ? " active" : "");
  button.dataset.category = value;
  button.textContent = label;
  button.addEventListener("click", () => {
    state.category = value;
    [...els.categories.querySelectorAll(".chip")].forEach(chip =>
      chip.classList.toggle("active", chip.dataset.category === value)
    );
    renderMenu();
  });
  return button;
}
function renderMenu() {
  const query = normalize(state.query);
  const filtered = state.items.filter(item => {
    const matchesCategory = state.category === "all" || item.category === state.category;
    const matchesQuery = !query || normalize(item.name).includes(query) ||
      normalize(item.category).includes(query) || normalize(item.description).includes(query);
    return matchesCategory && matchesQuery;
  });
  els.grid.innerHTML = filtered.map(item => {
    const image = item.image
      ? `<img class="card-image" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=&quot;image-placeholder&quot;>🍲</div>'">`
      : `<div class="image-placeholder" aria-label="ဓာတ်ပုံမရှိပါ">🍲</div>`;
    const availability = item.available
      ? `<span class="availability">ရရှိနိုင်</span>`
      : `<span class="availability unavailable">မရရှိနိုင်</span>`;
    const soldOut = item.available ? "" : `<div class="sold-out">လောလောဆယ် မရရှိနိုင်</div>`;
    return `<article class="menu-card">
      <div class="card-image-wrap">${image}<span class="category-tag">${escapeHtml(item.category)}</span>${soldOut}</div>
      <div class="card-body">
        <h3 class="item-name">${escapeHtml(item.name)}</h3>
        ${item.description ? `<p class="description">${escapeHtml(item.description)}</p>` : ""}
        <div class="card-bottom"><span class="price">${formatPrice(item.price)}</span>${availability}</div>
      </div>
    </article>`;
  }).join("");
  els.count.textContent = filtered.length + " မျိုး";
  els.title.textContent = state.category === "all" ? "မီနူးစာရင်း" : state.category;
  els.empty.hidden = filtered.length !== 0;
}
els.search.addEventListener("input", () => {
  state.query = els.search.value;
  els.clear.hidden = !state.query;
  renderMenu();
});
els.clear.addEventListener("click", () => {
  els.search.value = "";
  state.query = "";
  els.clear.hidden = true;
  renderMenu();
  els.search.focus();
});
els.retry.addEventListener("click", loadMenu);
loadMenu();
// Periodically refresh data so price/availability edits appear without reopening the page.
setInterval(loadMenu, 60000);
