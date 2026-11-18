# Wanderplan — travel itinerary prototype

**Created by:** Amit, Francis and Christian

Open `index.html` in a browser, or serve the folder locally (`python3 -m http.server 8765`). There is no build step and no dependencies.

- **Destinations:** Japan, Italy, France, Thailand, Greece and Indonesia, each with a fixed route of cities. The app does not cover each whole country.
- **Inputs:** 1–14 days, 1–20 travelers, and a total group budget in USD excluding flights.
- **Itinerary:** a day-by-day plan with transportation options for every change of city. The selected options affect the total cost.
- **Friends:** a sample friends list. Adding a friend adds one traveler and recalculates the costs. No invitations are sent.
- **Currency converter:** converts an amount in USD or CAD to each destination's local currency (JPY, EUR, THB, IDR), listing the selected destination's currency first. Live ECB reference rates load from the [Frankfurter API](https://frankfurter.dev/); if they can't load, saved fallback rates are shown and labeled. Rates are for planning only.
- **Checkout and confirmation:** a simulated booking with card, PayPal or Apple Pay options. No payment details are collected, no money is charged and nothing is reserved.
- **Ads:** sample promotions rotate in the top banner. Automatic rotation is off when the system's reduced-motion setting is on.
- **Typography:** uses the Manrope web font when online, with local system-font fallbacks.
- **Photos:** loaded from the Wikipedia REST API, which requires an internet connection. Maps, flags and logos are skipped, and an illustration appears when no suitable photo loads.
- **Video backgrounds:** the home screen opens with a muted, looping travel clip from a randomly chosen country (19 places across six continents), and planning another trip picks a new one without repeating the last. Choosing a destination starts its muted, looping travel clip behind the UI; generating an itinerary keeps that destination's video playing without restarting it. Pause/play is available above the planner and remains respected when switching destinations. Reduced-motion preferences show a still preview without loading the video until Play video is pressed. Playback pauses in hidden tabs. If a clip cannot play, the still preview remains and a status message explains why. Videos and posters require an internet connection; the planner works without them.
- **Prices:** illustrative estimates only (see `planner.js`).

Footage sources: [Tokyo](https://mixkit.co/free-stock-video/pedestrian-walk-in-tokyo-4231/), [Venice](https://mixkit.co/free-stock-video/navigating-the-central-canal-of-venice-4691/), and [Paris](https://mixkit.co/free-stock-video/the-eiffel-tower-and-the-buildings-near-it-4145/) use the [Mixkit Stock Video Free License](https://mixkit.co/license/#videoFree). [Bangkok](https://www.pexels.com/video/vibrant-tuk-tuk-ride-in-bangkok-chinatown-at-night-29799083/), [Santorini](https://www.pexels.com/video/fira-drone-flight-20398401/), and [Bali](https://www.pexels.com/video/lush-green-landscape-of-bali-10907981/) use the [Pexels License](https://www.pexels.com/license/). Home-screen clips of [New York](https://mixkit.co/free-stock-video/times-square-during-a-sunny-day-4442/), [London](https://mixkit.co/free-stock-video/tower-bridge-in-london-during-sunset-4457/), and [Chichén Itzá](https://mixkit.co/free-stock-video/chichen-itza-pyramid-4106/) use the Mixkit free license; Egypt, Brazil, South Africa, Türkiye, Canada, Kenya, Australia, Iceland, Norway, and Vietnam clips come from Pexels. Each clip links to its source in the UI.

Run the tests with `node --test planner.test.js video-background.test.js fx.test.js`.
