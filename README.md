# Wanderplan — travel itinerary prototype

**Created by:** Amit, Francis and Christian

Open `index.html` in a browser, or serve the folder locally (`python3 -m http.server 8765`). There is no build step and no dependencies.

- **Destinations:** Japan, Italy, France, Thailand, Greece and Indonesia, each with a fixed route of cities. The app does not cover each whole country.
- **Inputs:** 1–14 days, 1–20 travelers, and a total group budget in USD excluding flights.
- **Itinerary:** a day-by-day plan with transportation options for every change of city. The selected options affect the total cost.
- **Friends:** a sample friends list. Adding a friend adds one traveler and recalculates the costs. No invitations are sent.
- **Checkout and confirmation:** a simulated booking with card, PayPal or Apple Pay options. No payment details are collected, no money is charged and nothing is reserved.
- **Ads:** sample promotions rotate in the top banner. Automatic rotation is off when the system's reduced-motion setting is on.
- **Photos:** loaded from the Wikipedia REST API, which requires an internet connection. Maps, flags and logos are skipped, and an illustration appears when no suitable photo loads.
- **Prices:** illustrative estimates only (see `planner.js`).

Run the tests with `node --test planner.test.js`.
