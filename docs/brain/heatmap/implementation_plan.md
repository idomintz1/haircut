# Seed 50 Dummy Haircut Reports

Generate and inject 50 diverse haircut records into the Firestore database to provide a rich visual experience for the heatmap and grid.

## Proposed Changes

### Data Generation

#### [NEW] [seeds.js](file:///Users/idomintz/.gemini/antigravity/scratch/global-haircut-index/seeds.js)
- Create a script that defines an array of 50 diverse haircut objects.
- Countries: USA, UK, Thailand, Japan, Brazil, Germany, France, Italy, Australia, South Africa, Canada, Mexico, etc.
- Cities: Bangkok, New York, London, Berlin, Tokyo, Rio, etc.
- Varied prices and ratings.

#### [MODIFY] [script.js](file:///Users/idomintz/.gemini/antigravity/scratch/global-haircut-index/script.js)
- Add a hidden global function `window.seedData()` that the user can call from the console to batch-add the records to Firestore.

## Verification Plan

### Manual Verification
1. Run `window.seedData()` in the browser console.
2. Confirm that 50 new cards appear in the grid.
3. Verify that the heatmap colors update to reflect the new global data.
4. Check that statistics (Total Cuts, Avg Price) reflect the seeded data.


fgvfgf