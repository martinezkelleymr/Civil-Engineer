// Price provider ("supplier pricing API"). Ships with a built-in sample catalog so the app
// works with no key or server. To use live prices, set PRICE_API_URL to an endpoint that
// returns JSON in the same shape as SAMPLE_SUPPLIERS: [{ id, name, note, prices: { materialId: price } }].

const PRICE_API_URL = "";

// Sample prices (USD) for illustration only – edit them in the app to match real quotes.
const SAMPLE_SUPPLIERS = [
  {
    id: "harbor",
    name: "Harbor Lumber Yard",
    note: "Local yard",
    prices: {
      concrete_bag: 6.48, ready_mix: 165, rebar: 13.98, gravel: 48,
      stud_8: 3.98, stud_10: 6.48, plate: 3.98, framing_nails: 24.97,
      drywall: 15.98, joint_compound: 19.98, drywall_tape: 5.48, drywall_screws: 32.97,
      paint: 38.98, primer: 27.98, tile: 21.9, thinset: 18.98, grout: 21.98,
      brick: 0.68, mortar: 9.98, shingles: 36.97, underlayment: 98, roofing_nails: 69.98, drip_edge: 9.48,
      lvp: 52.8, lvp_underlay: 29.98, transition: 24.98, baseboard: 18.48, casing: 7.98, brad_nails: 8.97, caulk: 4.98,
      mosaic: 12.98, mastic: 17.98, grout_unsanded: 16.98, counter_quartz: 75, counter_granite: 60, counter_laminate: 25,
      sink_cutout: 150, dumpster: 525, contractor_bags: 24.98,
      block_cmu: 2.35, block_bond: 3.1, rebar5: 21.5, grout_fill: 175, vapor_barrier: 92, pt_plate: 5.48, hurricane_tie: 1.48,
      stucco_bag: 13.98, metal_lath: 11.98, elastomeric: 54.98, impact_window: 1150, impact_slider: 3650, impact_door: 2950,
      pavers: 4.25, limerock: 38, poly_sand: 32.98, self_adhered: 129, ring_nails: 39.98,
    },
  },
  {
    id: "summit",
    name: "Summit Building Supply",
    note: "Contractor supplier",
    prices: {
      concrete_bag: 6.2, ready_mix: 158, rebar: 12.75, gravel: 42,
      stud_8: 4.25, stud_10: 6.95, plate: 4.25, framing_nails: 22.5,
      drywall: 14.75, joint_compound: 18.5, drywall_tape: 4.95, drywall_screws: 29.99,
      paint: 34.99, primer: 24.5, tile: 24.5, thinset: 16.75, grout: 19.5,
      brick: 0.62, mortar: 9.25, shingles: 34.5, underlayment: 92.5, roofing_nails: 64.5, drip_edge: 8.75,
      lvp: 49.9, lvp_underlay: 27.5, transition: 22.5, baseboard: 17.25, casing: 7.5, brad_nails: 8.25, caulk: 4.5,
      mosaic: 11.5, mastic: 16.5, grout_unsanded: 15.25, counter_quartz: 68, counter_granite: 55, counter_laminate: 22,
      sink_cutout: 125, dumpster: 495, contractor_bags: 22.5,
      block_cmu: 2.18, block_bond: 2.95, rebar5: 19.75, grout_fill: 168, vapor_barrier: 86, pt_plate: 5.25, hurricane_tie: 1.35,
      stucco_bag: 12.95, metal_lath: 10.75, elastomeric: 49.5, impact_window: 1095, impact_slider: 3480, impact_door: 2790,
      pavers: 3.95, limerock: 34, poly_sand: 29.5, self_adhered: 119, ring_nails: 36.5,
    },
  },
  {
    id: "metro",
    name: "Metro Wholesale Materials",
    note: "Wholesale, bulk pricing",
    prices: {
      concrete_bag: 5.95, ready_mix: 172, rebar: 14.5, gravel: 52,
      stud_8: 3.65, stud_10: 5.98, plate: 3.65, framing_nails: 21,
      drywall: 13.9, joint_compound: 21.25, drywall_tape: 4.75, drywall_screws: 28.5,
      paint: 32.5, primer: 22.99, tile: 19.8, thinset: 17.5, grout: 18.75,
      brick: 0.59, mortar: 8.75, shingles: 38.25, underlayment: 89.99, roofing_nails: 62, drip_edge: 8.25,
      lvp: 46, lvp_underlay: 26, transition: 21.75, baseboard: 16.4, casing: 6.95, brad_nails: 7.9, caulk: 4.25,
      mosaic: 10.75, mastic: 15.75, grout_unsanded: 14.5, counter_quartz: 72, counter_granite: 58, counter_laminate: 24,
      sink_cutout: 175, dumpster: 550, contractor_bags: 21,
      block_cmu: 2.05, block_bond: 2.8, rebar5: 22.4, grout_fill: 182, vapor_barrier: 84, pt_plate: 4.98, hurricane_tie: 1.29,
      stucco_bag: 12.5, metal_lath: 10.5, elastomeric: 47.9, impact_window: 1180, impact_slider: 3590, impact_door: 2880,
      pavers: 3.8, limerock: 36, poly_sand: 28.75, self_adhered: 124, ring_nails: 35.25,
    },
  },
];

const PricingAPI = {
  source: "sample",

  async loadSuppliers() {
    if (PRICE_API_URL) {
      try {
        const res = await fetch(PRICE_API_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (Array.isArray(data) && data.length) {
          PricingAPI.source = "live";
          return data;
        }
      } catch (err) {
        console.warn("Price API unavailable, using sample prices:", err);
      }
    }
    PricingAPI.source = "sample";
    return structuredClone(SAMPLE_SUPPLIERS);
  },

  // Price for one material at one supplier, with the user's own quote taking precedence.
  priceOf(supplier, materialId, overrides = {}) {
    const custom = overrides[supplier.id]?.[materialId];
    if (Number.isFinite(custom)) return custom;
    const price = supplier.prices[materialId];
    return Number.isFinite(price) ? price : null;
  },

  // Cheapest supplier for a material; ties go to the first supplier listed.
  cheapest(suppliers, materialId, overrides) {
    let best = null;
    for (const supplier of suppliers) {
      const price = PricingAPI.priceOf(supplier, materialId, overrides);
      if (price !== null && (best === null || price < best.price)) best = { supplier, price };
    }
    return best;
  },
};

if (typeof module !== "undefined") module.exports = { PricingAPI, SAMPLE_SUPPLIERS };
