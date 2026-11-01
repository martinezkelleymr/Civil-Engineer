// BuildCost – UI layer. Quantities come from MaterialsAPI (calculator.js),
// prices from PricingAPI (pricing.js).

const $ = (id) => document.getElementById(id);
const BEST = "best";
const STATE_TAX = 6;

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const qtyFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

// ---------- storage helpers (safe in private mode) ----------
function load(key) {
  try {
    return JSON.parse(localStorage.getItem(`buildcost:${key}`));
  } catch {
    return null;
  }
}
function save(key, value) {
  try {
    localStorage.setItem(`buildcost:${key}`, JSON.stringify(value));
  } catch {
    /* storage unavailable – the app still works for this visit */
  }
}

function esc(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

const svg = (d, cls = "") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}" /></svg>`;

// ---------- static content ----------
const ICONS = {
  lvp: "M3 3h18v18H3ZM3 9h18M3 15h18M9 3v6M15 9v6M9 15v6",
  tile: "M3 3h8v8H3ZM13 3h8v8h-8ZM3 13h8v8H3ZM13 13h8v8h-8Z",
  backsplash: "M3 4h18v10H3ZM3 9h18M8 4v5M14 9v5M5 18h14M7 22h10",
  countertop: "M2 9h20v3H2ZM4 12v9M20 12v9M8 12v5h8v-5",
  drywall: "M3 3h18v18H3ZM12 3v18",
  paint: "M4 3h14v5H4ZM18 5h2v6h-8v3M10 14h4v7h-4Z",
  trim: "M3 21h18M3 17h18M6 17V7M3 7h6",
  demo: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4Z",
  impact: "M4 3h16v18H4ZM12 3v18M4 12h16",
  stucco: "M14 4l6 6-8 8H6v-6ZM6 18l-3 3",
  block: "M2 6h20v12H2ZM2 12h20M8 6v6M16 6v6M12 12v6",
  framing: "M4 21V3M12 21V3M20 21V3M2 3h20M2 21h20",
  slab: "M12 3 2 8l10 5 10-5-10-5ZM2 13l10 5 10-5M2 17l10 5 10-5",
  pavers: "M3 7h18v10H3ZM9 7v5M15 12v5M3 12h18",
  roof: "M2 12 12 4l10 8M5 10v10h14V10",
  brick: "M3 5h18v14H3ZM3 9.7h18M3 14.3h18M9 5v4.7M15 9.7v4.6M9 14.3V19",
};
// Types whose calculators include Florida code items (vapor retarder, PT plates, reroof rules).
const FL_CODE_TYPES = new Set(["slab", "framing", "roof"]);
const INTERIOR = new Set(["lvp", "tile", "backsplash", "countertop", "drywall", "paint", "trim", "demo"]);

// Quick sizes per project type (values replace the matching fields).
const PRESETS = {
  lvp: [["10×12 bedroom", { length: 12, width: 10 }], ["12×14 bedroom", { length: 14, width: 12 }], ["15×20 living room", { length: 20, width: 15 }]],
  tile: [["5×8 bathroom", { length: 8, width: 5 }], ["8×10 bathroom", { length: 10, width: 8 }], ["12×14 kitchen", { length: 14, width: 12 }]],
  backsplash: [["10 ft run", { length: 10 }], ["16 ft run", { length: 16 }], ["24 ft L-shape", { length: 24 }]],
  countertop: [["Galley 16 ft", { length: 16, island: 0 }], ["L-shape 22 ft", { length: 22, island: 0 }], ["With 3×6 island", { length: 20, island: 18 }]],
  drywall: [["10×12 room", { length: 12, width: 10 }], ["12×14 room", { length: 14, width: 12 }], ["5×8 bath", { length: 8, width: 5, openings: 21 }]],
  paint: [["10×12 room", { length: 12, width: 10 }], ["12×14 room", { length: 14, width: 12 }], ["15×20 living room", { length: 20, width: 15 }]],
  trim: [["10×12 room", { length: 12, width: 10 }], ["12×14 room", { length: 14, width: 12 }], ["15×20 room", { length: 20, width: 15, doors: 2 }]],
  demo: [["Bath tear-out", { area: 60, scope: "room" }], ["Kitchen tear-out", { area: 200, scope: "room" }], ["Whole-house floors", { area: 1500, scope: "flooring" }]],
  impact: [["Condo (6 + slider)", { windows: 6, sliders: 1, doors: 0 }], ["3/2 house", { windows: 12, sliders: 1, doors: 1 }], ["4/3 house", { windows: 18, sliders: 2, doors: 2 }]],
  stucco: [["Addition, 600 ft²", { area: 600 }], ["House, 2,000 ft²", { area: 2000 }], ["Garden wall, 240 ft²", { area: 240 }]],
  block: [["Garden wall 30×4", { length: 30, height: 4, openings: 0, bond: "yes" }], ["Room addition 48 ft", { length: 48, height: 9.33, openings: 60 }], ["Garage 64 ft", { length: 64, height: 9.33, openings: 120 }]],
  framing: [["Closet 12 ft", { length: 12, openings: 1, corners: 2 }], ["Room 40 ft", { length: 40 }], ["Addition 64 ft", { length: 64, openings: 6, corners: 4 }]],
  slab: [["10×12 patio", { length: 12, width: 10 }], ["12×12 shed pad", { length: 12, width: 12 }], ["20×12 garage", { length: 20, width: 12 }], ["24×24 two-car", { length: 24, width: 24 }]],
  pavers: [["12×16 patio", { length: 16, width: 12 }], ["Pool deck 20×30", { length: 30, width: 20 }], ["Driveway 18×36", { length: 36, width: 18, base: 6 }]],
  roof: [["1,200 ft² home", { length: 40, width: 30 }], ["1,800 ft² home", { length: 60, width: 30 }], ["2,500 ft² home", { length: 62.5, width: 40 }]],
  brick: [["Planter 20×2", { length: 20, height: 2 }], ["Garden wall 30×4", { length: 30, height: 4 }], ["Mailbox column", { length: 6, height: 5 }]],
};

const TIPS = {
  waste: "Extra material for cuts, breakage and mistakes. Rules of thumb: 5% for concrete and block, 10% for flooring, drywall and lumber, 10–15% for tile on a diagonal.",
  "slab.thickness": "4 in is standard for patios, walkways and garage floors. Use 5–6 in for driveways or heavy loads.",
  "slab.rebar": "Spacing between #4 bars in both directions. 18 in on center is common for slabs; 12 in for driveways. Includes 10% for laps.",
  "slab.vapor": "The Florida Building Code requires a 6-mil vapor retarder under slabs for living space (FBC R506.2.3). Lap seams at least 6 in.",
  "block.spacing": "Vertical #5 bars in grout-filled cells. 48 in on center is common; engineered plans may call for closer spacing near corners and openings.",
  "block.height": "9 ft 4 in (9.33 ft) is a standard 14-course wall of 8 in block.",
  "block.bond": "A continuous reinforced bond beam ties the top of CBS walls together and anchors the roof – standard in Florida.",
  "stucco.system": "Three-coat (scratch, brown, finish) is the traditional Florida system. One-coat systems are thinner and need a product approval.",
  "stucco.base": "Over wood framing, stucco needs a water-resistive barrier, galvanized lath and a weep screed (FBC R703.7).",
  "impact.windows": "Impact windows must have Florida Product Approval (or a Miami-Dade NOA in the HVHZ) with a design-pressure rating for their spot on the house.",
  "framing.onSlab": "Wood touching concrete or masonry must be pressure-treated (FBC R317).",
  "framing.ties": "Florida wind rules require a continuous load path. One galvanized tie per truss or rafter at 24 in on center.",
  "roof.pitch": "Rise per 12 in of run. Steeper roofs have more surface area for the same footprint.",
  "roof.barrier": "Florida reroofs need a sealed secondary water barrier. Self-adhered underlayment is the most common way to meet it.",
  "roof.renail": "On reroofs, Florida requires re-nailing the roof deck with 8d ring-shank nails at 6 in on center.",
  "pavers.base": "Crushed limerock is the usual South Florida base: 4 in for patios and pool decks, 6 in for driveways.",
  "countertop.depth": "25.5 in is a standard kitchen counter with overhang. Bathroom vanities are about 22 in.",
  "demo.scope": "Debris volume per ft² differs a lot by scope. A kitchen or bath tear-out creates far more debris than flooring removal.",
  "paint.coats": "Two coats is standard. Use one when repainting the same color.",
  tax: () => `Florida charges ${STATE_TAX}% state sales tax plus a county surtax. ${state.location.county} County: ${state.location.surtax}%, so ${STATE_TAX + state.location.surtax}% total. Change it from the location button.`,
  delivery: "Flat delivery fee for the order. Many yards waive it above an order minimum – ask when you request a quote.",
  labor: "Rough labor cost as a share of materials. Typical remodels run 30–60%. Enter 0 for DIY or when labor is quoted separately.",
  contingency: "Buffer for surprises like hidden water damage or price changes. 10% is common; 15–20% for older Florida homes.",
  markup: "Your company's overhead and profit, applied to the job cost. 15–25% is common for remodelers.",
};

const FL_NOTES = {
  slab: ["Termite protection is required under new slabs – budget a soil pretreatment by a licensed pest control company (FBC R318).", "A 6-mil vapor retarder goes over the base before the pour.", "Pull a building permit; record a Notice of Commencement for jobs over $5,000."],
  framing: ["Bottom plates on concrete must be pressure-treated.", "Tie roof to walls to foundation with hurricane straps or connectors – Florida requires a continuous load path."],
  block: ["CBS walls need grout-filled cells with vertical rebar and a continuous bond beam.", "Structural walls usually need sealed drawings from a Florida engineer."],
  stucco: ["Over wood framing, use a water-resistive barrier, galvanized lath and a weep screed (FBC R703.7).", "Elastomeric paint helps bridge hairline cracks in Florida rain."],
  impact: ["Every window and door needs Florida Product Approval (Miami-Dade NOA in Miami-Dade and Broward).", "Window replacement needs a permit and inspections. Impact glass can lower windstorm insurance premiums."],
  roof: ["Roofing products need Florida Product Approval for your wind zone.", "Reroofs: sealed secondary water barrier and deck re-nailing with 8d ring-shank nails.", "Replacing more than 25% of an older roof in 12 months can mean bringing the whole roof up to code."],
  pavers: ["Pool decks must keep the required pool barrier in place (F.S. 515).", "Check your HOA and setbacks before extending a driveway."],
  tile: ["Use mold-resistant backer board and a waterproofing membrane in showers.", "Plumbing changes need a separate permit by a licensed plumber."],
  drywall: ["Use mold-resistant drywall in bathrooms, laundry rooms and other humid spaces."],
  demo: ["Homes built before 1978 may have lead paint – use EPA RRP-certified workers.", "Popcorn ceilings and old flooring can contain asbestos; test before removal."],
};

const COUNTIES = ["Alachua", "Baker", "Bay", "Bradford", "Brevard", "Broward", "Calhoun", "Charlotte", "Citrus", "Clay", "Collier", "Columbia", "DeSoto", "Dixie", "Duval", "Escambia", "Flagler", "Franklin", "Gadsden", "Gilchrist", "Glades", "Gulf", "Hamilton", "Hardee", "Hendry", "Hernando", "Highlands", "Hillsborough", "Holmes", "Indian River", "Jackson", "Jefferson", "Lafayette", "Lake", "Lee", "Leon", "Levy", "Liberty", "Madison", "Manatee", "Marion", "Martin", "Miami-Dade", "Monroe", "Nassau", "Okaloosa", "Okeechobee", "Orange", "Osceola", "Palm Beach", "Pasco", "Pinellas", "Polk", "Putnam", "St. Johns", "St. Lucie", "Santa Rosa", "Sarasota", "Seminole", "Sumter", "Suwannee", "Taylor", "Union", "Volusia", "Wakulla", "Walton", "Washington"];
const HVHZ = new Set(["Miami-Dade", "Broward"]);

const FL_CATALOG = [
  ["Structure", "8×8×16 concrete block (CMU)", "The standard for Florida CBS homes. Stands up to wind, rot and termites.", "FBC R606", "block_cmu", "block"],
  ["Structure", "8×8×16 bond beam U-block", "Forms the continuous reinforced beam along the top of block walls.", "FBC R606", "block_bond", "block"],
  ["Structure", "#5 rebar, 20 ft stick", "Vertical bars in grout-filled block cells.", "", "rebar5", "block"],
  ["Structure", "Masonry grout / fill concrete", "Fills the reinforced cells and bond beams in CBS walls.", "", "grout_fill", "block"],
  ["Structure", "Type S mortar, 80 lb bag", "High-strength mortar for block in hurricane zones.", "", "mortar", "block"],
  ["Structure", "Galvanized hurricane ties", "Roof-to-wall connectors that resist wind uplift.", "FBC R802.11", "hurricane_tie", "framing"],
  ["Structure", "Pressure-treated 2×4 plate", "Required for wood touching concrete or block.", "FBC R317", "pt_plate", "framing"],
  ["Slab & site", "6-mil vapor retarder", "Goes over the base before any slab is poured.", "FBC R506.2.3", "vapor_barrier", "slab"],
  ["Slab & site", "Termite soil pretreatment", "Applied under new slabs by a licensed pest control company. Quote it separately.", "FBC R318", "", ""],
  ["Slab & site", "Crushed limerock base", "Common South Florida base for slabs, pavers and driveways.", "", "limerock", "pavers"],
  ["Slab & site", "Concrete pavers", "Popular for pool decks and patios. Drains and stays cooler than plain concrete.", "", "pavers", "pavers"],
  ["Slab & site", "Polymeric joint sand", "Locks pavers and resists washout in heavy rain.", "", "poly_sand", "pavers"],
  ["Envelope", "Impact-rated window", "Protects openings from wind-borne debris. Can lower insurance premiums.", "FL Product Approval", "impact_window", "impact"],
  ["Envelope", "Impact sliding glass door", "Must match the design pressure for its spot on the house.", "FL Product Approval", "impact_slider", "impact"],
  ["Envelope", "Impact entry door", "Rated door, frame and hardware tested together.", "FL Product Approval", "impact_door", "impact"],
  ["Envelope", "Accordion shutters / storm panels", "Approved alternative to impact glass. Quote per opening.", "FL Product Approval", "", ""],
  ["Envelope", "Portland cement stucco", "Three-coat or one-coat finish over block walls.", "FBC R703.7", "stucco_bag", "stucco"],
  ["Envelope", "Galvanized metal lath", "Base for stucco over wood framing.", "FBC R703.7", "metal_lath", "stucco"],
  ["Envelope", "Elastomeric exterior paint", "Flexible coating that bridges hairline stucco cracks and sheds rain.", "", "elastomeric", "stucco"],
  ["Roofing", "Self-adhered roof underlayment", "Peel-and-stick secondary water barrier for reroofs.", "FBC Existing Bldg. 706", "self_adhered", "roof"],
  ["Roofing", "8d ring-shank nails", "For re-nailing roof decking to Florida reroof rules.", "FBC Existing Bldg. 706", "ring_nails", "roof"],
  ["Roofing", "High-wind architectural shingles", "Look for 130 mph+ ratings and six nails per shingle.", "FL Product Approval", "shingles", "roof"],
  ["Roofing", "Standing-seam metal roofing", "High wind ratings, long life and reflects heat. Quote per square.", "FL Product Approval", "", ""],
  ["Roofing", "Concrete roof tile", "A classic South Florida look. Installed with foam or mortar per its approval.", "FL Product Approval", "", ""],
  ["Interior", "Porcelain floor tile", "Florida's go-to floor: cool, moisture-proof and easy to clean.", "", "tile", "tile"],
  ["Interior", "Luxury vinyl plank", "Waterproof, quiet underfoot – popular in condos (check HOA sound rules).", "", "lvp", "lvp"],
  ["Interior", "Mold-resistant drywall", "For bathrooms, laundry rooms and other humid spaces.", "", "", "drywall"],
  ["Interior", "Shower waterproofing membrane", "Sheet or liquid membrane behind tile in wet areas.", "FBC R702.4", "", "tile"],
];
const CAT_COLORS = { Structure: "amber", "Slab & site": "gray", Envelope: "blue", Roofing: "red", Interior: "green" };

// ---------- state ----------
const state = {
  type: load("type") || "lvp",
  drafts: load("drafts") || {},
  jobs: load("jobs") || [],
  supplier: load("supplier") || BEST,
  location: { city: "Boca Raton", county: "Palm Beach", surtax: 1, ...(load("location") || {}) },
  settings: { tax: 7, delivery: 0, labor: 0, contingency: 10, markup: 20, ...(load("settings") || {}) },
  quote: { company: "", client: "", address: "", date: "", ...(load("quote") || {}) },
  overrides: load("overrides") || {},
  qty: load("qty") || {},
  saved: load("saved") || [],
  savedId: load("savedId") || null,
  scope: load("scope") || {},
  suppliers: [],
  editingId: null,
  lastAddedId: null,
  view: "calculator",
  filter: "all",
  search: "",
  matCat: "All",
  matSearch: "",
};

// Drop anything saved by an older version that the engine no longer knows about.
state.jobs = state.jobs.filter((job) => MaterialsAPI.types[job.type]);
if (!MaterialsAPI.types[state.type]) state.type = "lvp";

function persist() {
  save("type", state.type);
  save("drafts", state.drafts);
  save("jobs", state.jobs);
  save("supplier", state.supplier);
  save("settings", state.settings);
  save("overrides", state.overrides);
  save("quote", state.quote);
  save("location", state.location);
  save("qty", state.qty);
  save("saved", state.saved);
  save("savedId", state.savedId);
  save("scope", state.scope);
}

function draft(typeId = state.type) {
  if (!state.drafts[typeId]) state.drafts[typeId] = MaterialsAPI.defaults(typeId);
  // Fields added in a newer version get their defaults.
  const defaults = MaterialsAPI.defaults(typeId);
  for (const key of Object.keys(defaults)) if (!(key in state.drafts[typeId])) state.drafts[typeId][key] = defaults[key];
  return state.drafts[typeId];
}

const tipText = (key) => {
  const t = TIPS[key];
  return typeof t === "function" ? t() : t;
};

// ---------- feedback ----------
function toast(title, text = "", action = null) {
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `<span class="toast-icon">${svg("m5 12 5 5 9-10")}</span>
    <span class="toast-text"><strong>${esc(title)}</strong>${text ? `<small>${esc(text)}</small>` : ""}</span>
    ${action ? `<a href="${action.href}" class="toast-action">${esc(action.label)}</a>` : ""}`;
  $("toasts").append(el);
  setTimeout(() => el.classList.add("out"), 3200);
  setTimeout(() => el.remove(), 3700);
}

function pulse(el) {
  el.classList.remove("pulse");
  void el.offsetWidth;
  el.classList.add("pulse");
}

// ---------- step 1: calculator ----------
function visibleTypes() {
  const q = state.search.trim().toLowerCase();
  return Object.entries(MaterialsAPI.types).filter(([id, t]) => {
    if (state.filter === "interior" && !INTERIOR.has(id)) return false;
    if (state.filter === "exterior" && INTERIOR.has(id)) return false;
    if (state.filter === "florida" && !t.florida && !FL_CODE_TYPES.has(id)) return false;
    return !q || t.label.toLowerCase().includes(q);
  });
}

function renderTypePicker() {
  const types = visibleTypes();
  $("type-picker").innerHTML = types
    .map(
      ([id, t]) => `
      <button type="button" role="tab" class="type-card" data-type="${id}" aria-selected="${id === state.type}">
        <span class="type-icon">${svg(ICONS[id] || ICONS.slab)}</span>
        <span class="type-name">${esc(t.label)}${t.florida ? ` <b class="fl-badge" title="Florida">FL</b>` : ""}</span>
      </button>`
    )
    .join("");
  $("type-empty").hidden = types.length > 0;
  $("type-empty").textContent = `No project types match “${state.search}”. Try “tile”, “roof” or “window”.`;
  document.querySelectorAll("#type-filter [data-filter]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.filter === state.filter)));
}

function fieldTip(key) {
  const tipKey = TIPS[`${state.type}.${key}`] ? `${state.type}.${key}` : null;
  if (!tipKey) return ["", ""];
  return [
    `<button type="button" class="info" data-tip="${tipKey}" aria-label="About this field" aria-expanded="false">i</button>`,
    `<p class="tip" data-tip-body="${tipKey}" hidden>${esc(tipText(tipKey))}</p>`,
  ];
}

function renderFields() {
  const type = MaterialsAPI.types[state.type];
  const values = draft();
  $("form-title").textContent = type.label;
  $("fields").innerHTML = Object.entries(type.fields)
    .map(([key, f]) => {
      const [tipBtn, tipBody] = fieldTip(key);
      const id = `f-${key}`;
      const label = `<div class="field-label"><label for="${id}">${esc(f.label)}</label>${tipBtn}</div>`;
      if (f.type === "select") {
        const options = Object.entries(f.options)
          .map(([v, text]) => `<option value="${esc(v)}"${String(values[key]) === v ? " selected" : ""}>${esc(text)}</option>`)
          .join("");
        return `<div class="field">${label}<select id="${id}" name="${key}">${options}</select>${tipBody}</div>`;
      }
      return `<div class="field">${label}
        <div class="stepper">
          <button type="button" class="step-btn" data-step-for="${id}" data-dir="-1" aria-label="Decrease ${esc(f.label.toLowerCase())}">−</button>
          <input id="${id}" name="${key}" type="number" inputmode="decimal" min="${f.min}" step="${f.step}" value="${esc(values[key])}" />
          ${f.unit ? `<span class="unit">${esc(f.unit)}</span>` : ""}
          <button type="button" class="step-btn" data-step-for="${id}" data-dir="1" aria-label="Increase ${esc(f.label.toLowerCase())}">+</button>
        </div>${tipBody}</div>`;
    })
    .join("");
  $("waste").value = values.waste;
  document.querySelector('[data-tip-body="waste"]').textContent = tipText("waste");
  $("add-btn").textContent = state.editingId ? "Save changes" : "Add to project";
  $("edit-flag").hidden = !state.editingId;
  $("cancel-edit").hidden = !state.editingId;

  const notes = FL_NOTES[state.type];
  $("fl-note").hidden = !notes;
  $("fl-note").innerHTML = notes
    ? `${svg("M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10ZM9 12l2 2 4-4", "fl-icon")}
       <div><strong>Florida checklist</strong><ul>${notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>
       <a href="#codes">See every code and permit for this project →</a></div>`
    : "";
  renderPresets();
}

function renderPresets() {
  const presets = PRESETS[state.type] || [];
  const values = draft();
  $("presets").hidden = !presets.length;
  $("presets").innerHTML = presets.length
    ? `<span class="presets-label">Quick sizes</span><div class="chips">${presets
        .map(([label, v], i) => {
          const on = Object.entries(v).every(([k, val]) => String(values[k]) === String(val));
          return `<button type="button" class="chip-btn" data-preset="${i}" aria-pressed="${on}">${esc(label)}</button>`;
        })
        .join("")}</div>`
    : "";
}

function bestLine(materialId, quantity) {
  const best = PricingAPI.cheapest(state.suppliers, materialId, state.overrides);
  return best ? { ...best, total: best.price * quantity } : null;
}

function renderPreview() {
  const { items, summary } = MaterialsAPI.calculate(state.type, draft());
  let total = 0;
  $("preview-summary").textContent = summary;
  $("preview-list").innerHTML = items.length
    ? items
        .map(({ materialId, quantity }) => {
          const m = MaterialsAPI.materials[materialId];
          const best = bestLine(materialId, quantity);
          if (best) total += best.total;
          return `<li class="mat-item">
            <span class="mat-icon">${svg(ICONS[state.type] || ICONS.slab)}</span>
            <span class="mat-text"><strong>${esc(m.name)}</strong><small>${qtyFmt.format(quantity)} ${esc(m.unit)}${
              best ? ` · ${money.format(best.price)} at ${esc(best.supplier.name.split(" ")[0])}` : ""
            }</small></span>
            <strong class="mat-total">${best ? money.format(best.total) : "—"}</strong>
          </li>`;
        })
        .join("")
    : `<li class="muted">Enter dimensions to see materials.</li>`;
  $("preview-total").textContent = money.format(total);
  $("bar-total").textContent = money.format(total);
  $("bar-summary").textContent = summary;
  const waste = Number(draft().waste) || 0;
  $("preview-note").textContent = waste ? `Includes ${waste}% waste, rounded up to how materials are sold.` : "Rounded up to how materials are sold.";
}

function selectType(typeId) {
  state.type = typeId;
  state.editingId = null;
  $("job-label").value = "";
  renderTypePicker();
  renderFields();
  renderPreview();
  persist();
}

// ---------- step 2: estimate ----------
// Combined quantities, with the user's manual adjustments applied.
function projectMaterials() {
  return MaterialsAPI.combine(state.jobs).map(({ materialId, quantity }) => {
    const manual = state.qty[materialId];
    return { materialId, auto: quantity, quantity: Number.isFinite(manual) ? manual : quantity };
  });
}

function priceLine(materialId, quantity, supplierId) {
  if (supplierId === BEST) {
    const best = PricingAPI.cheapest(state.suppliers, materialId, state.overrides);
    return best ? { supplier: best.supplier, price: best.price, total: best.price * quantity } : { supplier: null, price: null, total: 0 };
  }
  const supplier = state.suppliers.find((s) => s.id === supplierId) || null;
  const price = supplier ? PricingAPI.priceOf(supplier, materialId, state.overrides) : null;
  return { supplier, price, total: price === null ? 0 : price * quantity };
}

function lineItems(supplierId = state.supplier) {
  return projectMaterials().map((m) => ({ ...m, material: MaterialsAPI.materials[m.materialId], ...priceLine(m.materialId, m.quantity, supplierId) }));
}

// Materials subtotal per option, and how many items each supplier is missing.
function optionTotals() {
  const mats = projectMaterials();
  const sum = (id) => mats.reduce((a, m) => a + priceLine(m.materialId, m.quantity, id).total, 0);
  const missing = (s) => mats.filter((m) => PricingAPI.priceOf(s, m.materialId, state.overrides) === null).length;
  const singles = state.suppliers.map((s) => ({ id: s.id, name: s.name, total: sum(s.id), missing: missing(s) }));
  const complete = singles.filter((s) => !s.missing);
  const cheapest = complete.length ? complete.reduce((a, b) => (a.total <= b.total ? a : b)) : null;
  return { best: sum(BEST), singles, cheapest };
}

function costBreakdown(materialsSubtotal) {
  const s = state.settings;
  const tax = materialsSubtotal * (s.tax / 100);
  const labor = materialsSubtotal * (s.labor / 100);
  const beforeContingency = materialsSubtotal + tax + s.delivery + labor;
  const contingency = beforeContingency * (s.contingency / 100);
  const markup = (beforeContingency + contingency) * (s.markup / 100);
  return { materials: materialsSubtotal, tax, delivery: s.delivery, labor, contingency, markup, total: beforeContingency + contingency + markup };
}

function grandTotal() {
  return costBreakdown(lineItems().reduce((sum, it) => sum + it.total, 0)).total;
}

function renderJobs() {
  const hasJobs = state.jobs.length > 0;
  $("empty-state").hidden = hasJobs;
  $("estimate-body").hidden = !hasJobs;
  $("compare-empty").hidden = hasJobs;
  $("compare-body").hidden = !hasJobs;
  $("job-list").innerHTML =
    state.jobs
      .map((job) => {
        const type = MaterialsAPI.types[job.type];
        const { summary } = MaterialsAPI.calculate(job.type, job.inputs);
        const isNew = job.id === state.lastAddedId;
        return `
        <li class="job${job.id === state.editingId ? " editing" : ""}${isNew ? " is-new" : ""}">
          <span class="job-icon">${svg(ICONS[job.type] || ICONS.slab)}</span>
          <span class="job-text"><strong>${esc(job.label)}${isNew ? ` <b class="chip chip-green">Just added</b>` : ""}</strong><small>${esc(type.label)} · ${esc(summary)}</small></span>
          <button type="button" class="icon-btn" data-edit="${job.id}" aria-label="Edit ${esc(job.label)}">${svg("M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4")}</button>
          <button type="button" class="icon-btn" data-remove="${job.id}" aria-label="Remove ${esc(job.label)}">${svg("M6 6l12 12M18 6 6 18")}</button>
        </li>`;
      })
      .join("") +
    `<li><a href="#calculator" class="job job-add">${svg("M12 5v14M5 12h14")}Add calculation</a></li>`;
  const n = state.jobs.length;
  $("badge-jobs").textContent = n || "";
  const m = projectMaterials().length;
  $("estimate-sub").textContent = `${state.location.city}, FL · ${n} calculation${n === 1 ? "" : "s"} · ${m} material${m === 1 ? "" : "s"}`;
}

function renderBuyCards() {
  if (state.supplier !== BEST && !state.suppliers.some((s) => s.id === state.supplier)) state.supplier = BEST;
  const t = optionTotals();
  const card = (id, name, subtotal, note, noteClass, badge) => `
    <button type="button" role="radio" class="buy-card" aria-checked="${state.supplier === id}" data-supplier-card="${esc(id)}">
      <span class="buy-top"><strong>${esc(name)}</strong>${badge}</span>
      <span class="buy-total">${money.format(subtotal)}</span>
      <small class="${noteClass}">${esc(note)}</small>
    </button>`;
  const savedVsSingle = t.cheapest ? t.cheapest.total - t.best : 0;
  $("buy-cards").innerHTML =
    card(BEST, "Best price mix", t.best, savedVsSingle > 0.005 ? `Saves ${money.format(savedVsSingle)} vs one supplier` : "Cheapest supplier per item", "good", `<b class="chip chip-green-solid">Best price</b>`) +
    t.singles
      .map((s) =>
        card(s.id, s.name, s.total, s.missing ? `${s.missing} item(s) not priced` : `+${money.format(Math.max(0, s.total - t.best))} vs best mix`, s.missing ? "warn" : "muted", "")
      )
      .join("");
}

function renderEstimate() {
  const items = lineItems();
  const newMats = new Set();
  const newJob = state.jobs.find((j) => j.id === state.lastAddedId);
  if (newJob) MaterialsAPI.calculate(newJob.type, newJob.inputs).items.forEach((i) => newMats.add(i.materialId));

  $("estimate-rows").innerHTML = items
    .map((it) => {
      const edited = it.quantity !== it.auto;
      const jobsUsing = state.jobs.filter((j) => MaterialsAPI.calculate(j.type, j.inputs).items.some((i) => i.materialId === it.materialId));
      const icon = ICONS[jobsUsing[0]?.type] || ICONS.slab;
      return `
      <tr class="${newMats.has(it.materialId) ? "flash" : ""}">
        <th scope="row" data-label="Material">
          <span class="row-mat"><span class="row-icon">${svg(icon)}</span><span><strong>${esc(it.material.name)}</strong><small class="muted">${esc(
            jobsUsing.map((j) => j.label).join(", ")
          )}${it.supplier ? ` · ${esc(it.supplier.name)}` : ""}</small></span></span>
        </th>
        <td data-label="Qty" class="center">
          <span class="qty-ctl">
            <button type="button" class="step-btn sm" data-qty="${it.materialId}" data-dir="-1" aria-label="Decrease ${esc(it.material.name)}">−</button>
            <span class="qty-val">${qtyFmt.format(it.quantity)} <small>${esc(it.material.unit)}</small></span>
            <button type="button" class="step-btn sm" data-qty="${it.materialId}" data-dir="1" aria-label="Increase ${esc(it.material.name)}">+</button>
          </span>
          ${edited ? `<button type="button" class="link-btn tiny" data-qty-reset="${it.materialId}">Reset to ${qtyFmt.format(it.auto)}</button>` : ""}
        </td>
        <td data-label="Unit price" class="num muted">${it.price === null ? "—" : money.format(it.price)}</td>
        <td data-label="Line total" class="num"><strong>${it.price === null ? "No price" : money.format(it.total)}</strong></td>
      </tr>`;
    })
    .join("");

  const subtotal = items.reduce((sum, it) => sum + it.total, 0);
  const c = costBreakdown(subtotal);
  const s = state.settings;
  $("mat-subtotal").textContent = money.format(subtotal);
  $("grand-total").textContent = money.format(c.total);
  $("totals-list").innerHTML = [
    ["Materials", c.materials],
    [`FL sales tax (${s.tax}%)`, c.tax],
    ["Delivery", c.delivery],
    [`Labor (${s.labor}%)`, c.labor],
    [`Contingency (${s.contingency}%)`, c.contingency],
    [`Overhead & profit (${s.markup}%)`, c.markup],
  ]
    .map(([label, value]) => `<div><dt>${label}</dt><dd>${money.format(value)}</dd></div>`)
    .join("");

  const t = optionTotals();
  if (state.supplier === BEST && t.cheapest && t.cheapest.total - t.best > 0.005) {
    $("savings-note").innerHTML = `<p class="savings">${svg("M3 17l6-6 4 4 8-8M15 7h6v6")}<span><strong>You save ${money.format(t.cheapest.total - t.best)}</strong> on materials by mixing suppliers</span></p>`;
  } else if (state.supplier !== BEST && subtotal - t.best > 0.005) {
    $("savings-note").innerHTML = `<button type="button" class="savings-switch" data-supplier-card="${BEST}">Switch to best price and save ${money.format(subtotal - t.best)}</button>`;
  } else $("savings-note").innerHTML = "";

  $("pill-total").textContent = money.format(c.total);
  $("pill-meta").textContent = `Estimate · ${state.jobs.length} calculation${state.jobs.length === 1 ? "" : "s"}`;
  renderFlChecklist();
}

function renderFlChecklist() {
  const types = new Set(state.jobs.map((j) => j.type));
  const items = ["Building permit for anything beyond cosmetic work; Notice of Commencement for jobs over $5,000."];
  if (types.has("slab")) items.push("Slab: termite pretreatment + 6-mil vapor retarder.");
  if (types.has("framing") || types.has("block")) items.push("Walls: hurricane load path, pressure-treated plates on concrete.");
  if (types.has("impact")) items.push("Windows/doors: Florida Product Approval and design-pressure ratings.");
  if (types.has("roof")) items.push("Roof: product approval, secondary water barrier, deck re-nailing.");
  if (types.has("tile") || types.has("drywall")) items.push("Wet areas: mold-resistant board and waterproofing.");
  $("fl-checklist").innerHTML = `${svg("M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10ZM9 12l2 2 4-4", "fl-icon")}
    <div><strong>Florida code checklist</strong><ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul><a href="#codes">See everything your project needs →</a></div>`;
}

// ---------- step 3: supplier comparison ----------
function renderCompare() {
  const materials = projectMaterials();
  if (!materials.length) return;
  const focusedKey = document.activeElement?.dataset?.key;

  $("price-note").textContent =
    (PricingAPI.source === "live" ? "Live supplier prices." : "Sample prices for illustration.") +
    ` Materials only, before tax and labor. Type over any price to use your own quote.`;

  $("compare-head").innerHTML = `<tr><th scope="col">Material</th><th scope="col" class="num">Qty</th>${state.suppliers
    .map((s) => `<th scope="col" class="num">${esc(s.name)}<small class="muted">${esc(s.note || "")}</small></th>`)
    .join("")}</tr>`;

  const t = optionTotals();
  $("compare-rows").innerHTML = materials
    .map(({ materialId, quantity }) => {
      const m = MaterialsAPI.materials[materialId];
      const best = PricingAPI.cheapest(state.suppliers, materialId, state.overrides);
      const cells = state.suppliers
        .map((s) => {
          const price = PricingAPI.priceOf(s, materialId, state.overrides);
          const isBest = best && price === best.price;
          const edited = Number.isFinite(state.overrides[s.id]?.[materialId]);
          return `<td class="num price-cell${isBest ? " best" : ""}${edited ? " edited" : ""}">
            <span class="price-wrap"><span aria-hidden="true">$</span><input class="price-input" type="number" min="0" step="0.01" inputmode="decimal"
              value="${price ?? ""}" placeholder="—" data-supplier="${esc(s.id)}" data-material="${materialId}"
              data-key="${esc(s.id)}:${materialId}" aria-label="${esc(s.name)} price for ${esc(m.name)}${isBest ? ", lowest" : ""}${edited ? ", your quote" : ""}" /></span>
            <small>${price === null ? "no price" : money.format(price * quantity)}${edited ? " · your quote" : ""}</small>
          </td>`;
        })
        .join("");
      return `<tr><th scope="row">${esc(m.name)}<small class="muted">per ${esc(m.unit)}</small></th><td class="num">${qtyFmt.format(quantity)}</td>${cells}</tr>`;
    })
    .join("");

  $("compare-foot").innerHTML = `<tr><th scope="row">Materials subtotal</th><td></td>${t.singles
    .map((s) => `<td class="num${t.cheapest && s.id === t.cheapest.id ? " best" : ""}"><strong>${money.format(s.total)}</strong></td>`)
    .join("")}</tr>`;

  const options = [{ id: BEST, name: "Best price mix", total: t.best, isBest: true, missing: 0 }, ...t.singles].sort((a, b) => a.total - b.total);
  const max = Math.max(...options.map((o) => o.total), 1);
  $("compare-cards").innerHTML = options
    .map((o) => {
      const job = costBreakdown(o.total).total;
      const tag = o.isBest ? `<b class="chip chip-green-solid">Best price</b>` : o.missing ? `<b class="chip chip-warn">${o.missing} not priced</b>` : `<b class="chip">+${money.format(o.total - t.best)}</b>`;
      return `<button type="button" class="opt-row${state.supplier === o.id ? " selected" : ""}" data-supplier-card="${esc(o.id)}" aria-pressed="${state.supplier === o.id}">
        <span class="opt-name"><strong>${esc(o.name)}</strong><small class="muted">Job total ${money.format(job)}</small></span>
        <span class="opt-bar"><span class="${o.isBest ? "good" : ""}" style="width:${((o.total / max) * 100).toFixed(1)}%"></span></span>
        <span class="opt-total">${money.format(o.total)}</span>
        <span class="opt-tag">${tag}</span>
      </button>`;
    })
    .join("");

  const savings = t.cheapest ? t.cheapest.total - t.best : 0;
  $("best-banner").innerHTML =
    savings > 0.005
      ? `<div class="banner-good">
          <span class="banner-icon">${svg("M12 2l2.9 6.1 6.6.8-4.9 4.6 1.3 6.5L12 16.8 6.1 20l1.3-6.5L2.5 8.9l6.6-.8Z")}</span>
          <span><strong>Best price found – you save ${money.format(savings)}</strong><small>Buying each material where it's cheapest beats the best single supplier (${esc(t.cheapest.name)}).</small></span>
          ${state.supplier === BEST ? `<span class="chip chip-green">Using best price</span>` : `<button type="button" class="btn btn-dark" data-supplier-card="${BEST}">Use best price</button>`}
        </div>`
      : "";

  if (focusedKey) document.querySelector(`[data-key="${CSS.escape(focusedKey)}"]`)?.focus();
}

function renderPrintHeader() {
  const q = state.quote;
  const date = q.date ? new Date(`${q.date}T00:00`).toLocaleDateString("en-US", { dateStyle: "long" }) : "";
  $("print-header").innerHTML = `
    <strong class="print-company">${esc(q.company || "Remodeling estimate")}</strong>
    <span>Estimate${date ? ` · ${esc(date)}` : ""}</span>
    ${q.client ? `<span>Prepared for: ${esc(q.client)}</span>` : ""}
    ${q.address ? `<span>Job address: ${esc(q.address)}</span>` : ""}`;
  $("quote-summary").textContent = [q.client, q.address].filter(Boolean).join(" · ") || "Company, client and job address for the printed quote";
}

function renderProject() {
  renderPrintHeader();
  renderJobs();
  renderBuyCards();
  renderEstimate();
  renderCompare();
  renderSaved();
  if (state.view === "codes") renderCodes();
}

// ---------- saved estimates ----------
function renderSaved() {
  $("saved-list").innerHTML = state.saved.length
    ? state.saved
        .map(
          (s) => `<li class="${s.id === state.savedId ? "current" : ""}">
          <button type="button" class="saved-open" data-open="${s.id}"><strong>${esc(s.name)}</strong><small>${
            s.id === state.savedId ? "Open now" : `Saved ${new Date(s.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
          } · ${s.jobs.length} calc.</small></button>
          <button type="button" class="icon-btn small" data-delete-saved="${s.id}" aria-label="Delete ${esc(s.name)}">${svg("M6 6l12 12M18 6 6 18")}</button>
        </li>`
        )
        .join("")
    : `<li class="saved-empty">Save an estimate to find it here later.</li>`;
}

function snapshot() {
  return { jobs: structuredClone(state.jobs), settings: { ...state.settings }, quote: { ...state.quote }, qty: { ...state.qty }, supplier: state.supplier, location: { ...state.location } };
}

function saveEstimate() {
  if (!state.jobs.length) return toast("Nothing to save yet", "Add a calculation first.");
  const current = state.saved.find((s) => s.id === state.savedId);
  if (current) {
    Object.assign(current, snapshot(), { savedAt: Date.now() });
    toast("Estimate saved", current.name);
  } else {
    const suggested = state.quote.client || state.jobs[0].label;
    const name = (prompt("Name this estimate", suggested) || "").trim();
    if (!name) return;
    const entry = { id: crypto.randomUUID?.() || String(Date.now()), name, savedAt: Date.now(), ...snapshot() };
    state.saved.unshift(entry);
    state.saved = state.saved.slice(0, 20);
    state.savedId = entry.id;
    toast("Estimate saved", name);
  }
  persist();
  renderSaved();
}

function openEstimate(id) {
  const s = state.saved.find((e) => e.id === id);
  if (!s) return;
  Object.assign(state, { jobs: structuredClone(s.jobs), settings: { ...s.settings }, quote: { ...s.quote }, qty: { ...(s.qty || {}) }, supplier: s.supplier, savedId: s.id, editingId: null });
  if (s.location) state.location = { ...s.location };
  syncInputs();
  renderLocation();
  renderFields();
  renderProject();
  persist();
  location.hash = "#estimate";
  toast("Estimate opened", s.name);
}

// ---------- Florida materials ----------
function renderMaterials() {
  const cats = ["All", ...new Set(FL_CATALOG.map((m) => m[0]))];
  $("mat-cats").innerHTML = cats.map((c) => `<button type="button" class="chip-btn" data-cat="${esc(c)}" aria-pressed="${state.matCat === c}">${esc(c)}</button>`).join("");
  const q = state.matSearch.trim().toLowerCase();
  const items = FL_CATALOG.filter(([cat, name, why]) => (state.matCat === "All" || cat === state.matCat) && (!q || `${name} ${why}`.toLowerCase().includes(q)));
  $("mat-grid").innerHTML = items.length
    ? items
        .map(([cat, name, why, code, materialId, typeId]) => {
          const m = MaterialsAPI.materials[materialId];
          const best = materialId ? PricingAPI.cheapest(state.suppliers, materialId, state.overrides) : null;
          return `<article class="mat-card">
            <div class="mat-card-top"><span class="chip chip-${CAT_COLORS[cat]}">${esc(cat)}</span>${m ? `<small class="muted">per ${esc(m.unit)}</small>` : ""}</div>
            <h2>${esc(name)}</h2>
            <p>${esc(why)}</p>
            ${code ? `<span class="code-tag">${svg("M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z")}${esc(code)}</span>` : ""}
            <div class="mat-card-foot">
              <span>${best ? `<small class="muted">from</small> <strong>${money.format(best.price)}</strong>` : `<small class="muted">Get a quote</small>`}</span>
              ${typeId ? `<button type="button" class="btn btn-ghost btn-sm" data-open-type="${typeId}">Calculate</button>` : ""}
            </div>
          </article>`;
        })
        .join("")
    : `<p class="muted">No materials match. Try “block”, “impact” or “tile”.</p>`;
}

// ---------- Florida codes & permits ----------
const SCOPES = [
  ["slab", "New slab, patio or pavers", "Concrete or pavers on the ground"],
  ["structural", "Walls, framing or CBS block", "Structural or new walls"],
  ["roof", "Roof repair or reroof", "Shingle, metal or tile"],
  ["windows", "Windows, doors or shutters", "Exterior openings"],
  ["mep", "Electrical, plumbing or A/C", "New circuits, fixtures, ducts"],
  ["pool", "Pool, spa or pool deck", ""],
  ["flood", "Home is in a flood zone", "FEMA zone A, AE or V"],
  ["hoa", "Home is in an HOA or condo", ""],
  ["over5k", "Job costs over $5,000", ""],
  ["contractor", "Hiring a licensed contractor", "Off = you pull the permit yourself"],
];

function autoScope() {
  const t = new Set(state.jobs.map((j) => j.type));
  return {
    slab: t.has("slab") || t.has("pavers"),
    structural: t.has("framing") || t.has("block"),
    roof: t.has("roof"),
    windows: t.has("impact"),
    mep: t.has("tile") || t.has("countertop") || t.has("backsplash"),
    pool: false,
    flood: false,
    hoa: false,
    over5k: state.jobs.length > 0 && grandTotal() > 5000,
    contractor: true,
  };
}

function scopeOn() {
  const auto = autoScope();
  return Object.fromEntries(SCOPES.map(([k]) => [k, k in state.scope ? state.scope[k] : auto[k]]));
}

function requirements(on) {
  const { city, county } = state.location;
  const hvhz = HVHZ.has(county);
  const permitWork = on.slab || on.structural || on.roof || on.windows || on.mep || on.pool;
  const permits = [], build = [], legal = [];
  if (permitWork) permits.push(["Building permit", `Apply with the ${city} building department (${county} County if the home is in an unincorporated area). Inspections are required at each stage before work is covered up.`, "FBC 105"]);
  else permits.push(["Cosmetic work usually needs no permit", "Painting, flooring, cabinets and countertops typically don't need one. Confirm with your building department first.", "FBC 105.2"]);
  if (on.mep) permits.push(["Separate electrical, plumbing or mechanical permits", "Pulled by the licensed trade contractor doing that work. A/C changeouts need a mechanical permit.", "F.S. 489"]);
  if (on.over5k && permitWork) permits.push(["Notice of Commencement", `Record it with the ${county} County Clerk and post a copy at the job site before the first inspection. Required for jobs over $5,000 ($15,000 for A/C repair or replacement).`, "F.S. 713.13"]);
  if (on.hoa) permits.push(["HOA / condo approval", "Get written architectural approval before applying for the permit. An HOA can set the look of shutters or impact glass but can't ban hurricane protection.", "F.S. 720.3035"]);
  if (on.flood) permits.push(["Flood zone: 50% substantial improvement rule", "If the work costs 50% or more of the building's market value, the whole home must meet current flood rules, which can mean elevating it. Get an elevation certificate early.", "FBC / NFIP"]);

  if (on.slab) {
    build.push(["Termite protection under the slab", "Soil pretreatment (or another approved method) before the pour, with a certificate from a licensed pest control company.", "FBC R318"]);
    build.push(["6-mil vapor retarder", "Polyethylene sheet over the base, seams lapped at least 6 in.", "FBC R506.2.3"]);
  }
  if (on.structural) {
    build.push(["Hurricane-rated load path", "Straps or connectors from roof to wall to foundation, and anchor bolts in sill plates. Ask the building department for your design wind speed.", "FBC R301 / ASCE 7"]);
    build.push(["CBS block walls", "Grout-filled cells with vertical rebar and a continuous bond beam. Structural walls usually need sealed engineering drawings.", "FBC R606"]);
    build.push(["Pressure-treated lumber on concrete", "Bottom plates and any wood touching concrete or masonry must be pressure-treated.", "FBC R317"]);
  }
  if (on.roof) {
    build.push(["Product approval for roofing", hvhz ? "In Miami-Dade and Broward (HVHZ), roofing needs a Miami-Dade Notice of Acceptance (NOA)." : "Shingles, metal, tile and underlayment need a Florida Product Approval number for your wind zone.", hvhz ? "FBC 1500 HVHZ" : "F.S. 553.842"]);
    build.push(["Reroof upgrades", "Re-nail the roof deck with 8d ring-shank nails and install a sealed secondary water barrier (self-adhered underlayment).", "FBC Existing Bldg. 706"]);
    legal.push(["25% roof rule", "Replacing more than 25% of a roof within 12 months usually means bringing the whole roof up to code – unless it was built to the 2007 code or later.", "F.S. 553.844"]);
    legal.push(["Insurance-paid roofs", "A roofer can't offer gifts or promise to cover your deductible to win an insurance-claim job.", "F.S. 489.147"]);
  }
  if (on.windows) {
    build.push(["Impact-rated or protected openings", `${hvhz ? "In the HVHZ, use products with a Miami-Dade NOA." : "Most coastal Florida is a wind-borne debris region."} Use impact windows and doors or approved shutters, each rated for its design pressure.`, "FBC R301.2.1.2"]);
    build.push(["Energy code for new windows", "Solar heat gain coefficient (SHGC) of 0.25 or lower keeps cooling costs down.", "FBC Energy R402"]);
  }
  if (on.pool) build.push(["Pool safety barrier", "At least one approved barrier: a 4 ft fence, door alarms, self-closing gates or a safety cover.", "F.S. 515"]);

  if (on.contractor) {
    legal.push(["Use a state-licensed contractor", "Look for a CGC, CBC or CRC license and proof of insurance. Unlicensed contracting is a crime – a felony during a declared emergency.", "F.S. 489.127"]);
    if (on.over5k) legal.push(["Written contract with Recovery Fund notice", "Contracts over $2,500 must explain the Florida Homeowners' Construction Recovery Fund.", "F.S. 489.1425"]);
    legal.push(["Protect yourself from liens", "Keep every Notice to Owner you receive, and collect final releases of lien from the contractor, subs and suppliers before the final payment.", "F.S. 713"]);
  } else {
    legal.push(["Owner-builder permit", "You can pull the permit for your own home if you sign the owner-builder disclosure. You must do or directly supervise the work, and can't sell or rent the home within 1 year.", "F.S. 489.103(7)"]);
  }
  legal.push(["Sales tax on materials", `${STATE_TAX}% Florida + ${state.location.surtax}% ${county} County surtax = ${STATE_TAX + state.location.surtax}%, applied in your estimate.`, "F.S. 212"]);
  return [
    ["Permits & approvals", "amber", "M9 3h6v3H9ZM7 5H5v16h14V5h-2M9 13l2 2 4-4", permits],
    ["Building code", "blue", "M2 20h20M4 20V9l8-5 8 5v11M9 20v-6h6v6", build],
    ["Contracts & consumer law", "purple", "M4 4h11a3 3 0 0 1 3 3v14H7a3 3 0 0 1-3-3ZM4 18a3 3 0 0 1 3-3h11M8 8h6", legal],
  ].filter((g) => g[3].length);
}

function renderCodes() {
  const { city, county } = state.location;
  const hvhz = HVHZ.has(county);
  $("codes-loc").textContent = `${city}, FL · ${county} County`;
  $("codes-facts").innerHTML = [
    ["Code in force", "FBC 8th Edition (2023)", "Statewide since Dec 31, 2023"],
    ["Wind", hvhz ? "High-Velocity Hurricane Zone" : "Outside the HVHZ", hvhz ? "Miami-Dade NOA products required" : "Ask the building dept for your design wind speed"],
    ["Hurricane season", "June 1 – Nov 30", "Plan roof and exterior work around it"],
    ["Sales tax", `${STATE_TAX + state.location.surtax}% in ${county} Co.`, `${STATE_TAX}% state + ${state.location.surtax}% county surtax`],
  ]
    .map(([k, v, n]) => `<div class="fact"><small>${esc(k)}</small><strong>${esc(v)}</strong><span>${esc(n)}</span></div>`)
    .join("");

  const on = scopeOn();
  $("scope-list").innerHTML = SCOPES.map(
    ([k, label, hint]) => `<button type="button" role="checkbox" class="scope" aria-checked="${on[k]}" data-scope="${k}">
      <span class="box">${svg("m5 12 5 5 9-10")}</span>
      <span><strong>${esc(label)}</strong>${hint ? `<small>${esc(hint)}</small>` : ""}</span>
    </button>`
  ).join("");

  const groups = requirements(on);
  $("need-count").textContent = `· ${groups.reduce((a, g) => a + g[3].length, 0)} items`;
  $("req-groups").innerHTML = groups
    .map(
      ([title, color, icon, items]) => `<div class="card req-group req-${color}">
      <h3>${svg(icon)}${esc(title)}</h3>
      <ul>${items.map(([t, d, ref]) => `<li><span class="dot"></span><span class="req-text"><strong>${esc(t)}</strong><span>${esc(d)}</span></span><span class="ref">${esc(ref)}</span></li>`).join("")}</ul>
    </div>`
    )
    .join("");
}

// ---------- location ----------
function renderLocation() {
  const l = state.location;
  $("loc-city").textContent = `${l.city}, FL`;
  $("loc-meta").textContent = `${l.county} Co. · ${STATE_TAX + l.surtax}% sales tax`;
  $("price-source").textContent = PricingAPI.source === "live" ? "Live supplier prices." : "Sample prices for illustration. Confirm with suppliers before ordering.";
}

// ---------- views ----------
const VIEWS = ["calculator", "estimate", "compare", "materials", "codes"];
const STEP_ORDER = ["calculator", "estimate", "compare"];

function showView() {
  const view = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : "calculator";
  state.view = view;
  document.querySelectorAll("section[data-view]").forEach((s) => (s.hidden = s.dataset.view !== view));
  document.querySelectorAll("[data-nav]").forEach((a) => (a.dataset.nav === view ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
  const stepIdx = STEP_ORDER.indexOf(view);
  document.querySelectorAll("[data-step]").forEach((a, i) => {
    a.classList.toggle("current", i === stepIdx);
    a.classList.toggle("done", stepIdx > i || (stepIdx === -1 && false));
    i === stepIdx ? a.setAttribute("aria-current", "step") : a.removeAttribute("aria-current");
  });
  document.body.dataset.current = view;
  if (view === "materials") renderMaterials();
  if (view === "codes") renderCodes();
  closeMenu();
  window.scrollTo({ top: 0 });
}

function openMenu() {
  document.body.classList.add("menu-open");
  $("scrim").hidden = false;
  $("menu-open").setAttribute("aria-expanded", "true");
}
function closeMenu() {
  document.body.classList.remove("menu-open");
  $("scrim").hidden = true;
  $("menu-open").setAttribute("aria-expanded", "false");
}

// ---------- export ----------
function exportCsv() {
  const cell = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const items = lineItems();
  const q = state.quote;
  const lines = [
    ["Company", q.company],
    ["Client", q.client],
    ["Job address", q.address],
    ["Quote date", q.date],
    ["Location", `${state.location.city}, FL (${state.location.county} County)`],
    [],
    ["Material", "Quantity", "Unit", "Unit price", "Supplier", "Line total", ...state.suppliers.map((s) => `${s.name} unit price`)],
    ...items.map((it) => [
      it.material.name,
      it.quantity,
      it.material.unit,
      it.price ?? "",
      it.supplier?.name ?? "",
      it.price === null ? "" : it.total.toFixed(2),
      ...state.suppliers.map((s) => PricingAPI.priceOf(s, it.materialId, state.overrides) ?? ""),
    ]),
    [],
  ];
  const c = costBreakdown(items.reduce((sum, it) => sum + it.total, 0));
  for (const [label, value] of Object.entries(c)) lines.push([label, "", "", "", "", value.toFixed(2)]);

  const blob = new Blob([lines.map((row) => row.map(cell).join(",")).join("\n")], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "buildcost-estimate.csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  toast("Estimate exported", "buildcost-estimate.csv");
}

function printAs(mode) {
  document.body.dataset.print = mode;
  window.print();
}
window.addEventListener("afterprint", () => delete document.body.dataset.print);

// ---------- sample project ----------
function loadSample() {
  const mk = (type, label, inputs) => ({ id: crypto.randomUUID?.() || String(Math.random()), type, label, inputs: { ...MaterialsAPI.defaults(type), ...inputs } });
  state.jobs = [
    mk("tile", "Master bath floor", { length: 10, width: 8 }),
    mk("impact", "Impact windows", { windows: 6, sliders: 1, doors: 0 }),
    mk("slab", "Back patio slab", { length: 12, width: 10 }),
  ];
  state.qty = {};
  state.supplier = BEST;
  state.savedId = null;
  if (!state.quote.client) state.quote.client = "Sample homeowner";
  state.lastAddedId = null;
  syncInputs();
  renderProject();
  persist();
  toast("Sample project loaded", "A bath floor, impact windows and a patio slab. Clear it any time.");
}

function syncInputs() {
  for (const key of ["tax", "delivery", "labor", "contingency", "markup"]) $(key).value = state.settings[key];
  document.querySelectorAll("[data-quote]").forEach((input) => (input.value = state.quote[input.dataset.quote] || ""));
}

// ---------- events ----------
$("type-picker").addEventListener("click", (e) => {
  const card = e.target.closest("[data-type]");
  if (card) selectType(card.dataset.type);
});
$("type-search").addEventListener("input", (e) => {
  state.search = e.target.value;
  renderTypePicker();
});
$("type-filter").addEventListener("click", (e) => {
  const b = e.target.closest("[data-filter]");
  if (!b) return;
  state.filter = b.dataset.filter;
  renderTypePicker();
});

$("presets").addEventListener("click", (e) => {
  const b = e.target.closest("[data-preset]");
  if (!b) return;
  const [label, values] = PRESETS[state.type][Number(b.dataset.preset)];
  Object.assign(draft(), values);
  if (!$("job-label").value.trim() || $("job-label").dataset.auto === "1") {
    $("job-label").value = label.replace(/^\d.*?\s/, "").replace(/^./, (c) => c.toUpperCase());
    $("job-label").dataset.auto = "1";
  }
  renderFields();
  renderPreview();
  persist();
});
$("job-label").addEventListener("input", () => delete $("job-label").dataset.auto);

$("calc-form").addEventListener("input", (e) => {
  if (!e.target.name) return;
  draft()[e.target.name] = e.target.value;
  renderPreview();
  renderPresets();
  persist();
});
$("calc-form").addEventListener("change", (e) => {
  if (e.target.tagName === "SELECT") renderPresets();
});

// − / + steppers in the calculator form.
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-step-for]");
  if (!b) return;
  const input = $(b.dataset.stepFor);
  const step = Number(input.step) || 1;
  const min = input.min === "" ? -Infinity : Number(input.min);
  const next = Math.max(min, Math.round(((Number(input.value) || 0) + step * Number(b.dataset.dir)) * 1000) / 1000);
  input.value = next;
  input.dispatchEvent(new Event("input", { bubbles: true }));
});

// Info tips.
document.addEventListener("click", (e) => {
  const b = e.target.closest(".info");
  document.querySelectorAll(".info[aria-expanded=true]").forEach((other) => {
    if (other === b) return;
    other.setAttribute("aria-expanded", "false");
    other.closest(".field").querySelector(`[data-tip-body="${other.dataset.tip}"]`).hidden = true;
  });
  if (!b) return;
  const body = b.closest(".field").querySelector(`[data-tip-body="${b.dataset.tip}"]`);
  if (!body.textContent) body.textContent = tipText(b.dataset.tip);
  const open = body.hidden;
  body.hidden = !open;
  b.setAttribute("aria-expanded", String(open));
});

$("calc-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const type = MaterialsAPI.types[state.type];
  const inputs = { ...draft() };
  const label = $("job-label").value.trim() || `${type.label} ${state.jobs.filter((j) => j.type === state.type).length + 1}`;
  const existing = state.jobs.find((j) => j.id === state.editingId);
  const count = MaterialsAPI.calculate(state.type, inputs).items.length;
  if (existing) {
    Object.assign(existing, { inputs, label });
    state.lastAddedId = existing.id;
    toast("Changes saved", label, { href: "#estimate", label: "View" });
  } else {
    const job = { id: crypto.randomUUID?.() || String(Date.now()), type: state.type, label, inputs };
    state.jobs.push(job);
    state.lastAddedId = job.id;
    toast(`Added ${count} material${count === 1 ? "" : "s"}`, `${label} · ${$("preview-total").textContent}`, { href: "#estimate", label: "View" });
  }
  state.editingId = null;
  $("job-label").value = "";
  delete $("job-label").dataset.auto;
  const btn = $("add-btn");
  btn.classList.add("added");
  btn.textContent = "Added ✓";
  setTimeout(() => {
    btn.classList.remove("added");
    renderFields();
  }, 1400);
  pulse($("total-pill"));
  renderProject();
  persist();
  clearTimeout(state.newTimer);
  state.newTimer = setTimeout(() => {
    state.lastAddedId = null;
    renderJobs();
  }, 6000);
});

$("cancel-edit").addEventListener("click", () => {
  state.editingId = null;
  $("job-label").value = "";
  renderFields();
  renderJobs();
});

$("job-list").addEventListener("click", (e) => {
  const removeId = e.target.closest("[data-remove]")?.dataset.remove;
  const editId = e.target.closest("[data-edit]")?.dataset.edit;
  if (removeId) {
    const job = state.jobs.find((j) => j.id === removeId);
    state.jobs = state.jobs.filter((j) => j.id !== removeId);
    if (state.editingId === removeId) state.editingId = null;
    toast("Calculation removed", job?.label || "");
  } else if (editId) {
    const job = state.jobs.find((j) => j.id === editId);
    state.type = job.type;
    state.drafts[job.type] = { ...job.inputs };
    state.editingId = job.id;
    renderTypePicker();
    renderFields();
    renderPreview();
    $("job-label").value = job.label;
    location.hash = "#calculator";
    return;
  } else return;
  renderFields();
  renderProject();
  persist();
});

$("estimate-rows").addEventListener("click", (e) => {
  const step = e.target.closest("[data-qty]");
  const reset = e.target.closest("[data-qty-reset]");
  if (step) {
    const id = step.dataset.qty;
    const m = MaterialsAPI.materials[id];
    const cur = projectMaterials().find((x) => x.materialId === id);
    const next = Math.max(0, Math.round((cur.quantity + m.step * Number(step.dataset.dir)) * 1000) / 1000);
    if (next === cur.auto) delete state.qty[id];
    else state.qty[id] = next;
  } else if (reset) delete state.qty[reset.dataset.qtyReset];
  else return;
  renderEstimate();
  renderBuyCards();
  renderCompare();
  persist();
  document.querySelector(`[data-qty="${(step || reset).dataset.qty || reset.dataset.qtyReset}"][data-dir="${step?.dataset.dir || 1}"]`)?.focus();
});

document.addEventListener("click", (e) => {
  const card = e.target.closest("[data-supplier-card]");
  if (!card) return;
  state.supplier = card.dataset.supplierCard;
  renderProject();
  persist();
  if (card.dataset.supplierCard === BEST) toast("Using best price", "Each material from its cheapest supplier.");
});

for (const key of ["tax", "delivery", "labor", "contingency", "markup"]) {
  $(key).addEventListener("input", (e) => {
    state.settings[key] = Math.max(0, Number(e.target.value) || 0);
    renderEstimate();
    renderCompare();
    persist();
  });
}

document.querySelectorAll("[data-quote]").forEach((input) => {
  input.addEventListener("input", () => {
    state.quote[input.dataset.quote] = input.value.trim();
    renderPrintHeader();
    persist();
  });
});
if (!state.quote.date) {
  const today = new Date();
  state.quote.date = new Date(today - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

$("compare-rows").addEventListener("change", (e) => {
  const input = e.target.closest(".price-input");
  if (!input) return;
  const { supplier, material } = input.dataset;
  const base = state.suppliers.find((s) => s.id === supplier)?.prices[material];
  const value = input.value === "" ? null : Math.max(0, Number(input.value));
  state.overrides[supplier] = state.overrides[supplier] || {};
  const restored = value === null || value === base;
  if (restored) delete state.overrides[supplier][material];
  else state.overrides[supplier][material] = value;
  persist();
  toast(restored ? "Price restored" : "Prices updated", restored ? "Back to the supplier's list price." : "Your quote is saved and used in totals.");
  // Defer so focus has moved to the next field before the table is redrawn.
  setTimeout(() => {
    renderPreview();
    renderProject();
  });
});

$("reset-prices").addEventListener("click", () => {
  if (!confirm("Discard your edited prices and restore the original supplier prices?")) return;
  state.overrides = {};
  persist();
  renderPreview();
  renderProject();
  toast("Prices reset", "Back to the supplier list prices.");
});

$("clear-btn").addEventListener("click", () => {
  if (!confirm("Remove all calculations from this project?")) return;
  state.jobs = [];
  state.qty = {};
  state.editingId = null;
  state.savedId = null;
  renderFields();
  renderProject();
  persist();
});

$("sample-btn").addEventListener("click", loadSample);
$("export-btn").addEventListener("click", exportCsv);
$("print-btn").addEventListener("click", () => printAs("quote"));
$("codes-print").addEventListener("click", () => printAs("codes"));
$("save-btn").addEventListener("click", saveEstimate);

$("saved-list").addEventListener("click", (e) => {
  const open = e.target.closest("[data-open]");
  const del = e.target.closest("[data-delete-saved]");
  if (open) openEstimate(open.dataset.open);
  if (del) {
    const s = state.saved.find((x) => x.id === del.dataset.deleteSaved);
    if (!confirm(`Delete the saved estimate “${s.name}”?`)) return;
    state.saved = state.saved.filter((x) => x.id !== s.id);
    if (state.savedId === s.id) state.savedId = null;
    persist();
    renderSaved();
  }
});

$("mat-cats").addEventListener("click", (e) => {
  const b = e.target.closest("[data-cat]");
  if (!b) return;
  state.matCat = b.dataset.cat;
  renderMaterials();
});
$("mat-search").addEventListener("input", (e) => {
  state.matSearch = e.target.value;
  renderMaterials();
});
$("mat-grid").addEventListener("click", (e) => {
  const b = e.target.closest("[data-open-type]");
  if (!b) return;
  state.filter = "all";
  state.search = "";
  $("type-search").value = "";
  selectType(b.dataset.openType);
  location.hash = "#calculator";
});

$("scope-list").addEventListener("click", (e) => {
  const b = e.target.closest("[data-scope]");
  if (!b) return;
  const k = b.dataset.scope;
  state.scope[k] = !scopeOn()[k];
  persist();
  renderCodes();
  document.querySelector(`[data-scope="${k}"]`)?.focus();
});

// Location dialog.
$("loc-county-input").innerHTML = COUNTIES.map((c) => `<option>${esc(c)}</option>`).join("");
$("location-btn").addEventListener("click", () => {
  $("loc-city-input").value = state.location.city;
  $("loc-county-input").value = state.location.county;
  $("loc-surtax-input").value = state.location.surtax;
  $("location-dialog").showModal();
});
$("loc-cancel").addEventListener("click", () => $("location-dialog").close());
$("location-form").addEventListener("submit", () => {
  const surtax = Math.min(3, Math.max(0, Number($("loc-surtax-input").value) || 0));
  state.location = { city: $("loc-city-input").value.trim() || state.location.city, county: $("loc-county-input").value, surtax };
  state.settings.tax = STATE_TAX + surtax;
  $("tax").value = state.settings.tax;
  persist();
  renderLocation();
  renderProject();
  if (state.view === "codes") renderCodes();
  toast("Location updated", `${state.location.city}, FL · sales tax set to ${state.settings.tax}%`);
});

$("menu-open").addEventListener("click", openMenu);
$("menu-close").addEventListener("click", closeMenu);
$("scrim").addEventListener("click", closeMenu);
document.addEventListener("keydown", (e) => e.key === "Escape" && closeMenu());
window.addEventListener("hashchange", showView);

// ---------- theme ----------
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

function applyTheme(pref) {
  const dark = pref === "dark" || (pref === "system" && darkQuery.matches);
  document.documentElement.dataset.mode = dark ? "dark" : "light";
  document.querySelectorAll("[data-theme-choice]").forEach((btn) => {
    btn.setAttribute("aria-checked", String(btn.dataset.themeChoice === pref));
  });
}

let themePref = load("theme") || "system";
applyTheme(themePref);
document.querySelector(".theme-switch").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-theme-choice]");
  if (!btn) return;
  themePref = btn.dataset.themeChoice;
  save("theme", themePref);
  applyTheme(themePref);
});
darkQuery.addEventListener("change", () => themePref === "system" && applyTheme("system"));

// ---------- start ----------
(async function init() {
  state.suppliers = await PricingAPI.loadSuppliers();
  syncInputs();
  renderLocation();
  renderTypePicker();
  renderFields();
  renderPreview();
  renderProject();
  showView();
})();
