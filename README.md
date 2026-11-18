# ParkEasy

**Team:** ParkEasy  
**Track:** Build for the Physical World  
**Tagline:** Parking before you arrive.

Drivers heading to DLF Cyber City often learn whether parking is available only after they reach the entrance. Public lots, office visitor bays and gated societies are hard to compare because each location has its own availability, access rules and prices. ParkEasy lets a driver pick an eligible space in advance and know which gate to use.

## Run the demo

[Open the live ParkEasy demo](https://buildathon-parkeasy-ymu.netlify.app/)

## Judge walkthrough

1. Open **Ask ParkEasy** and tap **Covered bike at CyberHub for 2 hr**. The inline agent offers one bookable match with the price, location, and duration. Tap **Reserve** to go directly to the parking pass. The map and results are available for comparison.
2. Select **I’ve parked** to confirm the simulated payment and start the session.
3. The parking map and personal forest stay visible in separate panels. Drag **Forest level preview** through levels 0–15 to show any tree count immediately, then select **Back to live forest**. Select **View my forest** for a shortcut to the scene. Use **Demo · Add 30 min** to demonstrate the forest growing in increments. After 120 parked minutes, the first tree is complete. Rotate the scene to see the garage and forest.
4. Open **My parking** and select **I’ve moved my vehicle**. **Submit review** shows a demo notification and closes checkout. **Done** dismisses checkout immediately.

## How it works

- The hard part is preserving a consistent inventory through reserve, manual check-in and checkout. A reservation holds one slot for its vehicle. Check-in records demo payment and an end time exactly once. Checkout restores the slot and completes the session. The optional review action shows a demo acknowledgment. Session state and the last search persist in browser storage. Browsers with Web Locks serialize booking transitions across tabs on the same origin.
- Recommendations check the vehicle’s available capacity and the selected preferences within 900 m of the chosen DLF destination. The app returns up to five using straight-line distance by default. Price and rating sorts use the same eligibility checks.
- Ask ParkEasy sends supported requests to the same-origin Netlify function at `/api/parking-intent`. Before deploying, set `GEMINI_API_KEY` in the Netlify project’s Functions environment. Gemini contributes validated preferences. The curated catalog sets the destination, inventory, and price. Local matching works if Gemini is unavailable or the standalone file is opened offline.
- Online map imagery uses [OpenStreetMap](https://www.openstreetmap.org/copyright). Google Maps opens only through a directions link. A labeled DLF schematic keeps browsing available if the map cannot load.
- Listings, host permissions, addresses/entrances, prices, ratings, capacities, receipts and 360° scenes are simulated. Demo availability assumes the listing is open for the requested session. Arrival and departure are self-reported. There is no supplier UI, payment gateway, shared inventory, or background alert service.
- The isometric garage and personal forest use original canvas artwork. The forest grows one tree per 120 parked minutes, up to 15 trees. The slider previews each level and leaves earned progress intact.
- Search includes DLF Cyber Park, CDS Corporate Tower, Capital Building, 383 Building, Wipro GDC and the Gurugram Ambience Mall. Capital and Plot 383 use approximate landmark anchors. Parking bays, opening availability and rates are simulated.
- For a real pilot, onboard permitted hosts offline in one DLF cluster and build enough legal supply within 500 m before inviting drivers.
