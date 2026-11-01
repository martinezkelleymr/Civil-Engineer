// Quantity engine ("build calculator API"): turns project dimensions into material quantities.
// Pure functions only – no DOM access – so it can be reused or moved behind a server endpoint.

// `exact` items are counted, not cut, so the waste allowance does not apply to them.
const MATERIALS = {
  concrete_bag:   { name: "Concrete mix, 80 lb bag",          unit: "bag",    step: 1 },
  ready_mix:      { name: "Ready-mix concrete",               unit: "yd³",    step: 0.25 },
  rebar:          { name: "#4 rebar, 20 ft stick",            unit: "stick",  step: 1 },
  gravel:         { name: "Crushed gravel base",              unit: "ton",    step: 0.5 },
  stud_8:         { name: "2×4×8 stud",                       unit: "each",   step: 1 },
  stud_10:        { name: "2×4×10 stud",                      unit: "each",   step: 1 },
  plate:          { name: "2×4×8 plate lumber",               unit: "each",   step: 1 },
  framing_nails:  { name: "16d framing nails, 5 lb box",      unit: "box",    step: 1 },
  drywall:        { name: '1/2" drywall, 4×8 sheet',          unit: "sheet",  step: 1 },
  joint_compound: { name: "Joint compound, 4.5 gal bucket",   unit: "bucket", step: 1 },
  drywall_tape:   { name: "Paper joint tape, 500 ft roll",    unit: "roll",   step: 1 },
  drywall_screws: { name: "Drywall screws, 5 lb box",         unit: "box",    step: 1 },
  paint:          { name: "Interior paint",                   unit: "gal",    step: 1 },
  primer:         { name: "Primer",                           unit: "gal",    step: 1 },
  tile:           { name: "Porcelain tile, 10 ft² box",       unit: "box",    step: 1 },
  thinset:        { name: "Thinset mortar, 50 lb bag",        unit: "bag",    step: 1 },
  grout:          { name: "Sanded grout, 25 lb bag",          unit: "bag",    step: 1 },
  brick:          { name: "Modular brick",                    unit: "each",   step: 1 },
  mortar:         { name: "Type S mortar, 80 lb bag",         unit: "bag",    step: 1 },
  shingles:       { name: "Architectural shingles, bundle",   unit: "bundle", step: 1 },
  underlayment:   { name: "Synthetic underlayment, 1,000 ft²", unit: "roll",  step: 1 },
  roofing_nails:  { name: "Coil roofing nails, 7,200 ct box", unit: "box",    step: 1 },
  drip_edge:      { name: "Drip edge, 10 ft",                 unit: "piece",  step: 1 },
  lvp:            { name: "Luxury vinyl plank, 20 ft² box",   unit: "box",    step: 1 },
  lvp_underlay:   { name: "Foam underlayment, 100 ft² roll",  unit: "roll",   step: 1 },
  transition:     { name: "Floor transition strip",           unit: "each",   step: 1, exact: true },
  baseboard:      { name: '3-1/4" MDF baseboard, 16 ft',      unit: "piece",  step: 1 },
  casing:         { name: "Door casing, 7 ft",                unit: "piece",  step: 1 },
  brad_nails:     { name: "18 ga brad nails, 1,000 ct",       unit: "box",    step: 1 },
  caulk:          { name: "Paintable caulk, 10 oz tube",      unit: "tube",   step: 1 },
  mosaic:         { name: "Backsplash mosaic tile, 1 ft² sheet", unit: "sheet", step: 1 },
  mastic:         { name: "Tile mastic, 1 gal",               unit: "gal",    step: 1 },
  grout_unsanded: { name: "Unsanded grout, 10 lb bag",        unit: "bag",    step: 1 },
  counter_quartz: { name: "Quartz countertop, fabricated",    unit: "ft²",    step: 1 },
  counter_granite:{ name: "Granite countertop, fabricated",   unit: "ft²",    step: 1 },
  counter_laminate:{ name: "Laminate countertop",             unit: "ft²",    step: 1 },
  sink_cutout:    { name: "Sink cutout & polish",             unit: "each",   step: 1, exact: true },
  dumpster:       { name: "20 yd³ dumpster rental",           unit: "each",   step: 1, exact: true },
  contractor_bags:{ name: "Contractor bags, 32 ct box",       unit: "box",    step: 1 },
  // Florida: CBS construction, code-required items and hurricane protection
  block_cmu:      { name: "8×8×16 concrete block (CMU)",      unit: "each",   step: 1 },
  block_bond:     { name: "8×8×16 bond beam U-block",         unit: "each",   step: 1 },
  rebar5:         { name: "#5 rebar, 20 ft stick",            unit: "stick",  step: 1 },
  grout_fill:     { name: "Masonry grout / fill concrete",    unit: "yd³",    step: 0.25 },
  vapor_barrier:  { name: "6-mil vapor retarder, 10×100 ft",  unit: "roll",   step: 1 },
  pt_plate:       { name: "2×4×8 pressure-treated plate",     unit: "each",   step: 1 },
  hurricane_tie:  { name: "Galvanized hurricane tie",         unit: "each",   step: 1, exact: true },
  stucco_bag:     { name: "Portland cement stucco, 80 lb",    unit: "bag",    step: 1 },
  metal_lath:     { name: "Galvanized metal lath, 27\"×8 ft", unit: "sheet",  step: 1 },
  elastomeric:    { name: "Elastomeric exterior paint",       unit: "gal",    step: 1 },
  impact_window:  { name: "Impact-rated window, ~3×5 ft",     unit: "each",   step: 1, exact: true },
  impact_slider:  { name: "Impact sliding glass door, 8 ft",  unit: "each",   step: 1, exact: true },
  impact_door:    { name: "Impact entry door",                unit: "each",   step: 1, exact: true },
  pavers:         { name: "Concrete pavers",                  unit: "ft²",    step: 1 },
  limerock:       { name: "Crushed limerock base",            unit: "ton",    step: 0.5 },
  poly_sand:      { name: "Polymeric joint sand, 50 lb",      unit: "bag",    step: 1 },
  self_adhered:   { name: "Self-adhered roof underlayment, 2 sq", unit: "roll", step: 1 },
  ring_nails:     { name: "8d ring-shank nails, 5 lb box",    unit: "box",    step: 1 },
};

// Rules of thumb used below (adjust here if your trade uses different figures).
const RULES = {
  bagYieldFt3: 0.6,          // one 80 lb bag of concrete
  gravelTonsPerYd3: 1.4,
  rebarOverlap: 1.1,         // +10% for laps
  nailLbPerPiece: 0.25,
  drywallSheetFt2: 32,
  mudFt2PerBucket: 450,
  tapeFtPerFt2: 0.37,
  screwsPerSheet: 32,
  screwsPerBox: 1500,
  paintFt2PerGal: 350,
  primerFt2PerGal: 300,
  tileFt2PerBox: 10,
  thinsetFt2PerBag: 95,
  groutFt2PerBag: 100,
  bricksPerFt2: 6.75,
  bricksPerMortarBag: 40,
  bundlesPerSquare: 3,
  underlaymentFt2PerRoll: 1000,
  nailsPerSquare: 320,       // 6 nails per shingle (high-wind pattern)
  nailsPerBox: 7200,
  lvpFt2PerBox: 20,
  underlayFt2PerRoll: 100,
  baseboardFt: 16,
  doorWidthFt: 3,
  casingPiecesPerDoor: 5,   // both sides: 4 legs + 2 heads cut from one piece
  casingFt: 7,
  bradsPerFt: 1.5,
  bradsPerBox: 1000,
  caulkFtPerTube: 50,
  mosaicFt2PerSheet: 1,
  masticFt2PerGal: 40,
  unsandedFt2PerBag: 50,
  dumpsterYd3: 20,
  bagsFt2PerBox: 250,
  vaporFt2PerRoll: 1000,
  blockFaceFt2: 0.889,       // 8×16 in face
  blocksPerMortarBag: 30,
  bondBeamBlockFt: 1.333,    // 16 in per U-block
  groutFt3PerCellFt: 0.17,   // one 8 in CMU cell, per foot of height
  groutFt3PerBondFt: 0.25,
  rebarLapFt: 2,
  stuccoFt2PerBag3Coat: 9,   // 7/8 in, three coats
  stuccoFt2PerBag1Coat: 18,  // 1/2 in one-coat system
  lathFt2PerSheet: 18,
  elastomericFt2PerGal: 100, // per coat
  paverSandFt2PerBag: 50,
  limerockTonsPerYd3: 1.4,
  selfAdheredFt2PerRoll: 200,
  deckSheetFt2: 32,
  ringNailsPerSheet: 90,     // 6 in o.c. edges and field
  ringNailsPerBox: 500,
  trussSpacingIn: 24,
};

// Cubic yards of debris per ft² of work area, by demolition scope.
const DEBRIS_FACTORS = { flooring: 0.01, room: 0.08, gut: 0.05 };

const PITCH_FACTORS = { "4/12": 1.054, "6/12": 1.118, "8/12": 1.202, "10/12": 1.302, "12/12": 1.414 };

const num = (label, unit, value, min = 0, step = 1) => ({ type: "number", label, unit, value, min, step });
const pick = (label, options, value) => ({ type: "select", label, options, value });

const PROJECT_TYPES = {
  lvp: {
    label: "Vinyl plank floor",
    icon: "🪵",
    waste: 10,
    fields: {
      length: num("Room length", "ft", 14, 0, 0.5),
      width: num("Room width", "ft", 12, 0, 0.5),
      pad: pick("Underlayment", { attached: "Attached pad", separate: "Separate foam" }, "attached"),
      doorways: num("Doorway transitions", "", 1, 0, 1),
    },
    compute(v) {
      const area = v.length * v.width;
      const items = [["lvp", area / RULES.lvpFt2PerBox]];
      if (v.pad === "separate") items.push(["lvp_underlay", area / RULES.underlayFt2PerRoll]);
      if (v.doorways > 0) items.push(["transition", v.doorways]);
      return { items, summary: `${fmt(area)} ft² of floor` };
    },
  },

  trim: {
    label: "Baseboard & trim",
    icon: "📏",
    waste: 10,
    fields: {
      length: num("Room length", "ft", 14, 0, 0.5),
      width: num("Room width", "ft", 12, 0, 0.5),
      doors: num("Doors", "", 1, 0, 1),
      casing: pick("Replace door casing", { yes: "Yes", no: "No" }, "yes"),
    },
    compute(v) {
      const baseFt = Math.max(0, 2 * (v.length + v.width) - v.doors * RULES.doorWidthFt);
      const casingPieces = v.casing === "yes" ? v.doors * RULES.casingPiecesPerDoor : 0;
      const trimFt = baseFt + casingPieces * RULES.casingFt;
      const items = [["baseboard", baseFt / RULES.baseboardFt]];
      if (casingPieces) items.push(["casing", casingPieces]);
      items.push(["brad_nails", (trimFt * RULES.bradsPerFt) / RULES.bradsPerBox], ["caulk", trimFt / RULES.caulkFtPerTube]);
      return { items, summary: `${fmt(baseFt)} ft of baseboard` };
    },
  },

  backsplash: {
    label: "Kitchen backsplash",
    icon: "🍳",
    waste: 10,
    fields: {
      length: num("Wall length", "ft", 16, 0, 0.5),
      height: num("Backsplash height", "in", 18, 0, 1),
      openings: num("Window/range area to skip", "ft²", 0, 0, 1),
    },
    compute(v) {
      const area = Math.max(0, v.length * (v.height / 12) - v.openings);
      return {
        items: [
          ["mosaic", area / RULES.mosaicFt2PerSheet],
          ["mastic", area / RULES.masticFt2PerGal],
          ["grout_unsanded", area / RULES.unsandedFt2PerBag],
        ],
        summary: `${fmt(area)} ft² of tile`,
      };
    },
  },

  countertop: {
    label: "Countertops",
    icon: "🪨",
    waste: 5,
    fields: {
      length: num("Counter run", "ft", 16, 0, 0.5),
      depth: num("Depth", "in", 25.5, 0, 0.5),
      island: num("Island area", "ft²", 0, 0, 1),
      material: pick("Material", { counter_quartz: "Quartz", counter_granite: "Granite", counter_laminate: "Laminate" }, "counter_quartz"),
      sinks: num("Sink cutouts", "", 1, 0, 1),
    },
    compute(v) {
      const area = v.length * (v.depth / 12) + v.island;
      const items = [[v.material, area]];
      if (v.sinks > 0 && v.material !== "counter_laminate") items.push(["sink_cutout", v.sinks]);
      return { items, summary: `${fmt(area)} ft² of countertop` };
    },
  },

  demo: {
    label: "Demolition & haul-off",
    icon: "🔨",
    waste: 0,
    fields: {
      area: num("Work area", "ft²", 150, 0, 1),
      scope: pick("Scope", { flooring: "Flooring removal", room: "Kitchen / bath tear-out", gut: "Whole-house gut" }, "room"),
    },
    compute(v) {
      const debris = v.area * DEBRIS_FACTORS[v.scope];
      return {
        items: [
          ["dumpster", debris / RULES.dumpsterYd3],
          ["contractor_bags", v.area / RULES.bagsFt2PerBox],
        ],
        summary: `≈ ${fmt(debris)} yd³ of debris`,
      };
    },
  },

  slab: {
    label: "Concrete slab",
    icon: "🧱",
    waste: 5,
    fields: {
      length: num("Length", "ft", 20, 0, 0.5),
      width: num("Width", "ft", 12, 0, 0.5),
      thickness: num("Thickness", "in", 4, 1, 0.5),
      supply: pick("Concrete", { ready_mix: "Ready-mix truck", concrete_bag: "80 lb bags" }, "ready_mix"),
      gravel: num("Gravel base depth", "in", 4, 0, 1),
      rebar: num("Rebar grid spacing (0 = none)", "in", 18, 0, 1),
      vapor: pick("6-mil vapor retarder", { yes: "Yes (code)", no: "No" }, "yes"),
    },
    compute(v) {
      const area = v.length * v.width;
      const ft3 = area * (v.thickness / 12);
      const items = [
        v.supply === "concrete_bag"
          ? ["concrete_bag", ft3 / RULES.bagYieldFt3]
          : ["ready_mix", ft3 / 27],
      ];
      if (v.gravel > 0) items.push(["gravel", ((area * (v.gravel / 12)) / 27) * RULES.gravelTonsPerYd3]);
      if (v.rebar > 0) {
        const barsAlongLength = Math.ceil((v.width * 12) / v.rebar) + 1;
        const barsAlongWidth = Math.ceil((v.length * 12) / v.rebar) + 1;
        const linearFt = barsAlongLength * v.length + barsAlongWidth * v.width;
        items.push(["rebar", (linearFt * RULES.rebarOverlap) / 20]);
      }
      if (v.vapor === "yes") items.push(["vapor_barrier", area / RULES.vaporFt2PerRoll]);
      return { items, summary: `${fmt(area)} ft² · ${fmt(ft3 / 27)} yd³` };
    },
  },

  framing: {
    label: "Wall framing",
    icon: "🧰",
    waste: 10,
    fields: {
      length: num("Total wall length", "ft", 40, 0, 0.5),
      height: pick("Wall height", { 8: "8 ft", 10: "10 ft" }, "8"),
      spacing: pick("Stud spacing", { 16: '16" on center', 24: '24" on center' }, "16"),
      openings: num("Doors + windows", "", 3, 0, 1),
      corners: num("Corners", "", 4, 0, 1),
      onSlab: pick("Bottom plate on concrete", { yes: "Yes – pressure-treated", no: "No" }, "yes"),
      ties: pick("Hurricane ties at roof", { yes: "Yes", no: "No" }, "yes"),
    },
    compute(v) {
      const studs = Math.ceil((v.length * 12) / v.spacing) + 1 + v.openings * 2 + v.corners * 2;
      const bottom = v.length / 8;
      const top = (v.length * 2) / 8; // two top plates
      const plates = bottom + top;
      const items = [[Number(v.height) === 10 ? "stud_10" : "stud_8", studs]];
      if (v.onSlab === "yes") items.push(["pt_plate", bottom], ["plate", top]);
      else items.push(["plate", plates]);
      items.push(["framing_nails", ((studs + plates) * RULES.nailLbPerPiece) / 5]);
      if (v.ties === "yes") items.push(["hurricane_tie", Math.ceil((v.length * 12) / RULES.trussSpacingIn) + 1]);
      return { items, summary: `${studs} studs before waste` };
    },
  },

  drywall: {
    label: "Drywall",
    icon: "📐",
    waste: 10,
    fields: {
      length: num("Room length", "ft", 14, 0, 0.5),
      width: num("Room width", "ft", 12, 0, 0.5),
      height: num("Wall height", "ft", 8, 0, 0.5),
      openings: num("Door/window area", "ft²", 40, 0, 1),
      ceiling: pick("Include ceiling", { yes: "Yes", no: "No" }, "yes"),
    },
    compute(v) {
      const area = roomArea(v) + (v.ceiling === "yes" ? v.length * v.width : 0);
      const sheets = area / RULES.drywallSheetFt2;
      return {
        items: [
          ["drywall", sheets],
          ["joint_compound", area / RULES.mudFt2PerBucket],
          ["drywall_tape", (area * RULES.tapeFtPerFt2) / 500],
          ["drywall_screws", (Math.ceil(sheets) * RULES.screwsPerSheet) / RULES.screwsPerBox],
        ],
        summary: `${fmt(area)} ft² to cover`,
      };
    },
  },

  paint: {
    label: "Interior paint",
    icon: "🎨",
    waste: 10,
    fields: {
      length: num("Room length", "ft", 14, 0, 0.5),
      width: num("Room width", "ft", 12, 0, 0.5),
      height: num("Wall height", "ft", 8, 0, 0.5),
      openings: num("Door/window area", "ft²", 40, 0, 1),
      coats: num("Coats", "", 2, 1, 1),
      primer: pick("Prime first", { yes: "Yes", no: "No" }, "yes"),
    },
    compute(v) {
      const area = roomArea(v);
      const items = [["paint", (area * v.coats) / RULES.paintFt2PerGal]];
      if (v.primer === "yes") items.push(["primer", area / RULES.primerFt2PerGal]);
      return { items, summary: `${fmt(area)} ft² of wall` };
    },
  },

  tile: {
    label: "Tile floor / shower",
    icon: "🔲",
    waste: 10,
    fields: {
      length: num("Floor length", "ft", 12, 0, 0.5),
      width: num("Floor width", "ft", 10, 0, 0.5),
    },
    compute(v) {
      const area = v.length * v.width;
      return {
        items: [
          ["tile", area / RULES.tileFt2PerBox],
          ["thinset", area / RULES.thinsetFt2PerBag],
          ["grout", area / RULES.groutFt2PerBag],
        ],
        summary: `${fmt(area)} ft² of floor`,
      };
    },
  },

  brick: {
    label: "Brick wall",
    icon: "🏗️",
    waste: 5,
    fields: {
      length: num("Wall length", "ft", 30, 0, 0.5),
      height: num("Wall height", "ft", 4, 0, 0.5),
      openings: num("Opening area", "ft²", 0, 0, 1),
    },
    compute(v) {
      const area = Math.max(0, v.length * v.height - v.openings);
      const bricks = area * RULES.bricksPerFt2;
      return {
        items: [["brick", bricks], ["mortar", bricks / RULES.bricksPerMortarBag]],
        summary: `${fmt(area)} ft² of wall`,
      };
    },
  },

  roof: {
    label: "Shingle roof",
    icon: "🏠",
    waste: 10,
    fields: {
      length: num("Footprint length", "ft", 40, 0, 0.5),
      width: num("Footprint width", "ft", 30, 0, 0.5),
      pitch: pick("Roof pitch", Object.fromEntries(Object.keys(PITCH_FACTORS).map((p) => [p, p])), "6/12"),
      barrier: pick("Underlayment", { self: "Self-adhered (FL secondary water barrier)", synthetic: "Synthetic" }, "self"),
      renail: pick("Re-nail roof deck (FL reroof)", { yes: "Yes", no: "No" }, "yes"),
    },
    compute(v) {
      const area = v.length * v.width * PITCH_FACTORS[v.pitch];
      const squares = area / 100;
      const items = [
        ["shingles", squares * RULES.bundlesPerSquare],
        v.barrier === "synthetic"
          ? ["underlayment", area / RULES.underlaymentFt2PerRoll]
          : ["self_adhered", area / RULES.selfAdheredFt2PerRoll],
        ["roofing_nails", (squares * RULES.nailsPerSquare) / RULES.nailsPerBox],
        ["drip_edge", (2 * (v.length + v.width)) / 10],
      ];
      if (v.renail === "yes") items.push(["ring_nails", ((area / RULES.deckSheetFt2) * RULES.ringNailsPerSheet) / RULES.ringNailsPerBox]);
      return { items, summary: `${fmt(area)} ft² · ${fmt(squares)} squares` };
    },
  },
};

Object.assign(PROJECT_TYPES, {
  block: {
    label: "CBS block wall",
    icon: "🧱",
    florida: true,
    waste: 5,
    fields: {
      length: num("Wall length", "ft", 40, 0, 0.5),
      height: num("Wall height", "ft", 9.33, 0, 0.5),
      openings: num("Door/window area", "ft²", 40, 0, 1),
      spacing: num("Vertical rebar spacing", "in", 48, 8, 8),
      bond: pick("Bond beam on top", { yes: "Yes", no: "No" }, "yes"),
    },
    compute(v) {
      const area = Math.max(0, v.length * v.height - v.openings);
      const blocks = area / RULES.blockFaceFt2;
      const cells = Math.ceil((v.length * 12) / v.spacing) + 1;
      const bondFt = v.bond === "yes" ? v.length : 0;
      const items = [
        ["block_cmu", blocks],
        ["mortar", blocks / RULES.blocksPerMortarBag],
        ["rebar5", (cells * (v.height + RULES.rebarLapFt) + bondFt * 2 * RULES.rebarOverlap) / 20],
        ["grout_fill", (cells * v.height * RULES.groutFt3PerCellFt + bondFt * RULES.groutFt3PerBondFt) / 27],
      ];
      if (bondFt) items.push(["block_bond", bondFt / RULES.bondBeamBlockFt]);
      return { items, summary: `${fmt(area)} ft² of wall · ${cells} grouted cells` };
    },
  },

  stucco: {
    label: "Stucco",
    icon: "🪣",
    florida: true,
    waste: 10,
    fields: {
      area: num("Wall area", "ft²", 600, 0, 10),
      system: pick("System", { three: "Three-coat (7/8 in)", one: "One-coat (1/2 in)" }, "three"),
      base: pick("Over", { block: "CBS block", frame: "Wood frame (needs lath)" }, "block"),
      paint: pick("Elastomeric paint, 2 coats", { yes: "Yes", no: "No" }, "yes"),
    },
    compute(v) {
      const perBag = v.system === "one" ? RULES.stuccoFt2PerBag1Coat : RULES.stuccoFt2PerBag3Coat;
      const items = [["stucco_bag", v.area / perBag]];
      if (v.base === "frame") items.push(["metal_lath", v.area / RULES.lathFt2PerSheet]);
      if (v.paint === "yes") items.push(["elastomeric", (v.area * 2) / RULES.elastomericFt2PerGal]);
      return { items, summary: `${fmt(v.area)} ft² of wall` };
    },
  },

  impact: {
    label: "Impact windows & doors",
    icon: "🪟",
    florida: true,
    waste: 0,
    fields: {
      windows: num("Windows", "", 8, 0, 1),
      sliders: num("Sliding glass doors", "", 1, 0, 1),
      doors: num("Entry doors", "", 1, 0, 1),
      caulk: pick("Perimeter sealant", { yes: "Yes", no: "No" }, "yes"),
    },
    compute(v) {
      const items = [
        ["impact_window", v.windows],
        ["impact_slider", v.sliders],
        ["impact_door", v.doors],
      ];
      const openings = v.windows + v.sliders + v.doors;
      if (v.caulk === "yes") items.push(["caulk", openings / 2]);
      return { items, summary: `${openings} openings` };
    },
  },

  pavers: {
    label: "Pavers / pool deck",
    icon: "🟫",
    florida: true,
    waste: 5,
    fields: {
      length: num("Length", "ft", 16, 0, 0.5),
      width: num("Width", "ft", 12, 0, 0.5),
      base: num("Limerock base depth", "in", 4, 0, 1),
    },
    compute(v) {
      const area = v.length * v.width;
      const items = [["pavers", area], ["poly_sand", area / RULES.paverSandFt2PerBag]];
      if (v.base > 0) items.push(["limerock", ((area * (v.base / 12)) / 27) * RULES.limerockTonsPerYd3]);
      return { items, summary: `${fmt(area)} ft² of pavers` };
    },
  },
});

function roomArea(v) {
  return Math.max(0, 2 * (v.length + v.width) * v.height - v.openings);
}

function fmt(n) {
  return Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function roundUp(qty, step) {
  // Small epsilon keeps 3.0000000001 from becoming 4.
  return Math.ceil(qty / step - 1e-9) * step;
}

// Interior remodeling first, then Florida exterior, structural and site work.
const TYPE_ORDER = ["lvp", "tile", "backsplash", "countertop", "drywall", "paint", "trim", "demo",
  "impact", "stucco", "block", "framing", "slab", "pavers", "roof", "brick"];

const MaterialsAPI = {
  materials: MATERIALS,
  types: Object.fromEntries(TYPE_ORDER.map((id) => [id, PROJECT_TYPES[id]])),

  defaults(typeId) {
    const type = MaterialsAPI.types[typeId];
    const inputs = Object.fromEntries(Object.entries(type.fields).map(([k, f]) => [k, f.value]));
    return { ...inputs, waste: type.waste };
  },

  // Returns { items: [{ materialId, quantity }], summary } with waste applied and
  // quantities rounded up to the way each material is sold.
  calculate(typeId, rawInputs) {
    const type = MaterialsAPI.types[typeId];
    if (!type) throw new Error(`Unknown project type: ${typeId}`);
    const inputs = {};
    for (const [key, field] of Object.entries(type.fields)) {
      const raw = rawInputs[key] ?? field.value;
      inputs[key] = field.type === "number" ? Math.max(field.min, Number(raw) || 0) : String(raw);
    }
    const waste = 1 + Math.max(0, Number(rawInputs.waste ?? type.waste) || 0) / 100;
    const { items, summary } = type.compute(inputs);
    return {
      summary,
      items: items
        .map(([materialId, qty]) => ({
          materialId,
          quantity: roundUp(MATERIALS[materialId].exact ? qty : qty * waste, MATERIALS[materialId].step),
        }))
        .filter((item) => item.quantity > 0),
    };
  },

  // Sums the materials of several calculations into one list.
  combine(jobs) {
    const totals = new Map();
    for (const job of jobs) {
      for (const { materialId, quantity } of MaterialsAPI.calculate(job.type, job.inputs).items) {
        totals.set(materialId, (totals.get(materialId) || 0) + quantity);
      }
    }
    return [...totals].map(([materialId, quantity]) => ({ materialId, quantity }));
  },
};

if (typeof module !== "undefined") module.exports = { MaterialsAPI, RULES };
