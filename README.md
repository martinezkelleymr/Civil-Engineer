# BuildCost – Home Remodeling Estimator

A glassmorphic web app for a home remodeling company. It calculates material quantities for a job,
shows the price per material, estimates the total cost (including labor, overhead and profit),
compares suppliers, and prints a client-ready quote.

## Features
- 12 calculators: vinyl plank floor, tile floor/shower, kitchen backsplash, countertops, drywall,
  interior paint, baseboard & trim, wall framing, demolition & haul-off, concrete slab, brick wall, shingle roof
- Waste allowance per calculation; quantities rounded up to how materials are sold (boxes, sheets, bags…)
- Combine several calculations (rooms or tasks) into one job estimate
- Buy from one supplier or "Best price" (cheapest supplier per item)
- Totals with sales tax, delivery, labor (% of materials), contingency and overhead & profit
- Quote details (company, client, job address, date) and a print view that shows only the client quote –
  supplier names and the comparison table stay internal
- Supplier comparison table with the cheapest price highlighted, plus savings per option
- Click any price to enter your own supplier quote (saved in the browser)
- CSV export, Light / Dark / System themes

## Files
- `calculator.js` – quantity engine (`MaterialsAPI`): formulas and rules of thumb, no DOM code
- `pricing.js` – supplier price provider (`PricingAPI`): built-in sample catalog, optional live API
- `app.js` – UI rendering and events
- `index.html`, `style.css` – markup and glassmorphism styles
- `netlify.toml` – Netlify config (static site, no build step)

## Prices
Supplier names and prices are **sample data for illustration**, not real quotes. Edit them in the
app, or point `PRICE_API_URL` in `pricing.js` at an endpoint that returns JSON shaped like
`SAMPLE_SUPPLIERS`: `[{ "id", "name", "note", "prices": { "<materialId>": 12.34 } }]`.
If the endpoint fails, the app falls back to the sample prices.

## Run locally
Open `index.html` in a browser, or serve the repo folder:
```
python3 -m http.server 8000
```

## Deploy to Netlify
- **Connected repo:** import this repo in Netlify, branch `main`, leave base directory and build
  command empty (`netlify.toml` sets the publish directory to the repo root).
- **Netlify Drop:** drag the project folder onto https://app.netlify.com/drop
