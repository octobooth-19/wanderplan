/* Travel itinerary data and pure generation logic. Works in the browser (window.Planner) and Node (require). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Planner = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const LIMITS = { minDays: 1, maxDays: 14, minTravelers: 1, maxTravelers: 20 };

  // Illustrative per-tier costs (USD). lodging = per room per night (2 travelers per room);
  // food and transport = per person per day.
  const TIER_NAMES = { budget: 'Budget', comfort: 'Comfort', luxury: 'Luxury' };

  // Activity tuple: [name, city, category, costPerPersonUSD, wikipediaTitle, description]
  const DESTINATIONS = {
    japan: {
      name: 'Japan', flag: '🇯🇵', wiki: 'Japan', colors: ['#bc002d', '#f7c5cc'],
      route: ['Tokyo', 'Hakone', 'Kyoto', 'Nara', 'Osaka'],
      tagline: 'Neon cities, ancient temples and mountain onsen.',
      tiers: { budget: { lodging: 90, food: 35, transport: 20 }, comfort: { lodging: 190, food: 70, transport: 35 }, luxury: { lodging: 480, food: 150, transport: 60 } },
      activities: [
        ['Senso-ji Temple', 'Tokyo', 'culture', 0, 'Sensō-ji', "Tokyo's oldest temple, entered through the giant Kaminarimon gate."],
        ['Meiji Shrine', 'Tokyo', 'culture', 0, 'Meiji Shrine', 'A tranquil Shinto shrine set in a forest in the heart of the city.'],
        ['Shibuya Crossing & Sky', 'Tokyo', 'city', 15, 'Shibuya Crossing', "Watch the world's busiest scramble crossing from above."],
        ['Tsukiji Outer Market', 'Tokyo', 'food', 30, 'Tsukiji fish market', 'Graze on fresh sushi, tamagoyaki and street snacks.'],
        ['teamLab Planets', 'Tokyo', 'art', 25, ['TeamLab Planets', 'TeamLab'], 'An immersive digital art museum you walk through barefoot.'],
        ['Lake Ashi Cruise', 'Hakone', 'nature', 15, 'Lake Ashi', 'Sail the crater lake with views of Mount Fuji on clear days.'],
        ['Hakone Open-Air Museum', 'Hakone', 'art', 15, 'Hakone Open-Air Museum', 'Sculpture park in the mountains with a Picasso pavilion.'],
        ['Owakudani Volcanic Valley', 'Hakone', 'nature', 10, 'Ōwakudani', 'Steaming vents and famous black eggs boiled in hot springs.'],
        ['Fushimi Inari Shrine', 'Kyoto', 'culture', 0, 'Fushimi Inari-taisha', 'Hike through thousands of vermilion torii gates.'],
        ['Kinkaku-ji (Golden Pavilion)', 'Kyoto', 'culture', 5, 'Kinkaku-ji', 'A Zen temple covered in gold leaf reflected in a pond.'],
        ['Arashiyama Bamboo Grove', 'Kyoto', 'nature', 0, 'Arashiyama', 'Walk the towering bamboo paths of western Kyoto.'],
        ['Kiyomizu-dera', 'Kyoto', 'culture', 5, 'Kiyomizu-dera', 'Wooden hillside temple with sweeping views over Kyoto.'],
        ['Nishiki Market', 'Kyoto', 'food', 25, 'Nishiki Market', '"Kyoto\'s Kitchen" — a narrow arcade of local delicacies.'],
        ['Nara Park & Todai-ji', 'Nara', 'culture', 5, 'Tōdai-ji', 'Meet the bowing deer and see the giant bronze Buddha.'],
        ['Osaka Castle', 'Osaka', 'culture', 5, 'Osaka Castle', 'Iconic castle tower surrounded by moats and gardens.'],
        ['Dotonbori Food Crawl', 'Osaka', 'food', 35, 'Dōtonbori', 'Takoyaki and okonomiyaki under the famous neon signs.']
      ],
      strolls: [
        ['Asakusa backstreets', 'Tokyo'], ['Yanaka old town', 'Tokyo'], ['Shimokitazawa', 'Tokyo'], ['Hakone-Yumoto onsen town', 'Hakone'],
        ['Gion evening walk', 'Kyoto'], ['Philosopher\'s Path', 'Kyoto'], ['Pontocho alley', 'Kyoto'], ['Naramachi merchant quarter', 'Nara'],
        ['Shinsekai', 'Osaka'], ['Nakazakicho cafés', 'Osaka']
      ]
    },
    italy: {
      name: 'Italy', flag: '🇮🇹', wiki: 'Italy', colors: ['#009246', '#ce2b37'],
      route: ['Rome', 'Florence', 'Tuscany', 'Venice'],
      tagline: 'Ancient ruins, Renaissance art and Tuscan hills.',
      tiers: { budget: { lodging: 100, food: 40, transport: 15 }, comfort: { lodging: 210, food: 80, transport: 30 }, luxury: { lodging: 520, food: 170, transport: 60 } },
      activities: [
        ['Colosseum & Roman Forum', 'Rome', 'culture', 25, 'Colosseum', 'The amphitheatre of ancient Rome and its political heart.'],
        ['Vatican Museums & Sistine Chapel', 'Rome', 'art', 30, 'Sistine Chapel', "Michelangelo's ceiling and the papal art collections."],
        ["St. Peter's Basilica", 'Rome', 'culture', 0, "St. Peter's Basilica", 'The largest church in the world, with a climbable dome.'],
        ['Pantheon', 'Rome', 'culture', 5, 'Pantheon, Rome', 'A 2,000-year-old temple with an open oculus.'],
        ['Trevi Fountain & Spanish Steps', 'Rome', 'city', 0, 'Trevi Fountain', 'Toss a coin and climb the famous Baroque steps.'],
        ['Trastevere Food Tour', 'Rome', 'food', 60, 'Trastevere', 'Supplì, carbonara and gelato in a cobbled quarter.'],
        ['Florence Cathedral (Duomo)', 'Florence', 'culture', 30, 'Florence Cathedral', "Climb Brunelleschi's dome for city-wide views."],
        ['Uffizi Gallery', 'Florence', 'art', 30, 'Uffizi', 'Botticelli, Leonardo and Raphael under one roof.'],
        ["Accademia: Michelangelo's David", 'Florence', 'art', 20, 'Galleria dell\'Accademia', 'See the original marble David up close.'],
        ['Ponte Vecchio', 'Florence', 'city', 0, 'Ponte Vecchio', 'Medieval bridge lined with goldsmiths over the Arno.'],
        ['Chianti Wine Tasting', 'Tuscany', 'food', 70, 'Chianti', 'Vineyards, cellars and olive oil in the Tuscan hills.'],
        ['Leaning Tower of Pisa', 'Tuscany', 'culture', 25, 'Leaning Tower of Pisa', 'Climb the famously tilted bell tower.'],
        ['Siena & Piazza del Campo', 'Tuscany', 'city', 10, 'Piazza del Campo', 'Shell-shaped medieval square of the Palio horse race.'],
        ["St. Mark's Basilica", 'Venice', 'culture', 5, "St Mark's Basilica", 'Golden Byzantine mosaics on the lagoon.'],
        ['Grand Canal Gondola', 'Venice', 'city', 35, 'Grand Canal (Venice)', 'Glide past palazzi on a classic gondola (shared).'],
        ['Murano & Burano Islands', 'Venice', 'nature', 20, 'Burano', 'Glass-blowing furnaces and rainbow-coloured houses.']
      ],
      strolls: [
        ['Monti neighbourhood', 'Rome'], ['Campo de\' Fiori market', 'Rome'], ['Aventine Hill', 'Rome'], ['Oltrarno artisans', 'Florence'],
        ['Piazzale Michelangelo sunset', 'Florence'], ['San Lorenzo market', 'Florence'], ['Lucca city walls', 'Tuscany'], ['Cannaregio', 'Venice'],
        ['Dorsoduro', 'Venice'], ['Rialto market', 'Venice']
      ]
    },
    france: {
      name: 'France', flag: '🇫🇷', wiki: 'France', colors: ['#0055a4', '#ef4135'],
      route: ['Paris', 'Loire Valley', 'Provence', 'Nice'],
      tagline: 'Parisian boulevards, châteaux and lavender fields.',
      tiers: { budget: { lodging: 110, food: 40, transport: 15 }, comfort: { lodging: 230, food: 85, transport: 30 }, luxury: { lodging: 600, food: 180, transport: 65 } },
      activities: [
        ['Eiffel Tower', 'Paris', 'city', 30, ['Eiffel Tower', 'Champ de Mars'], 'Ride to the summit of the iron lady.'],
        ['Louvre Museum', 'Paris', 'art', 25, 'Louvre', 'Home of the Mona Lisa and the Venus de Milo.'],
        ["Musée d'Orsay", 'Paris', 'art', 20, "Musée d'Orsay", 'Impressionist masterpieces in a Beaux-Arts railway station.'],
        ['Notre-Dame & Île de la Cité', 'Paris', 'culture', 0, 'Notre-Dame de Paris', 'The restored Gothic cathedral on the Seine.'],
        ['Montmartre & Sacré-Cœur', 'Paris', 'culture', 0, 'Sacré-Cœur, Paris', "Artists' hilltop village crowned by a white basilica."],
        ['Seine River Cruise', 'Paris', 'city', 20, 'Seine', 'See the monuments from the water.'],
        ['Palace of Versailles', 'Paris', 'culture', 25, 'Palace of Versailles', 'Hall of Mirrors and royal gardens.'],
        ['Château de Chambord', 'Loire Valley', 'culture', 20, 'Château de Chambord', 'Renaissance castle with a double-helix staircase.'],
        ['Château de Chenonceau', 'Loire Valley', 'culture', 20, 'Château de Chenonceau', 'Elegant château arching over the River Cher.'],
        ['Loire Wine Tasting', 'Loire Valley', 'food', 50, 'Loire Valley (wine)', 'Sample Vouvray and Sancerre in cave cellars.'],
        ['Palais des Papes, Avignon', 'Provence', 'culture', 15, 'Palais des Papes', 'Medieval palace of the popes.'],
        ['Valensole Lavender Fields', 'Provence', 'nature', 0, 'Valensole', 'Rolling purple fields (best in early summer).'],
        ['Pont du Gard', 'Provence', 'culture', 10, 'Pont du Gard', 'Three-tiered Roman aqueduct over the Gardon.'],
        ['Promenade des Anglais', 'Nice', 'nature', 0, 'Promenade des Anglais', 'Seaside promenade along the Baie des Anges.'],
        ['Èze Village', 'Nice', 'city', 10, 'Èze', 'Perched medieval village above the Riviera.'],
        ['Monaco Day Trip', 'Nice', 'city', 25, ['Monte Carlo Casino', 'Monte Carlo'], 'Casino square, harbour yachts and the Prince\'s Palace.']
      ],
      strolls: [
        ['Le Marais', 'Paris'], ['Latin Quarter', 'Paris'], ['Canal Saint-Martin', 'Paris'], ['Rue Cler market street', 'Paris'],
        ['Amboise old town', 'Loire Valley'], ['Tours old quarter', 'Loire Valley'], ['Aix-en-Provence cafés', 'Provence'], ['Gordes hilltop', 'Provence'],
        ['Vieux Nice', 'Nice'], ['Cours Saleya flower market', 'Nice']
      ]
    },
    thailand: {
      name: 'Thailand', flag: '🇹🇭', wiki: 'Thailand', colors: ['#2d2a4a', '#a51931'],
      route: ['Bangkok', 'Ayutthaya', 'Chiang Mai', 'Phuket'],
      tagline: 'Golden temples, night markets and turquoise bays.',
      tiers: { budget: { lodging: 40, food: 15, transport: 10 }, comfort: { lodging: 110, food: 35, transport: 20 }, luxury: { lodging: 320, food: 90, transport: 45 } },
      activities: [
        ['Grand Palace & Wat Phra Kaew', 'Bangkok', 'culture', 15, 'Grand Palace', 'The dazzling royal complex and Emerald Buddha.'],
        ['Wat Pho', 'Bangkok', 'culture', 7, 'Wat Pho', 'Home of the 46-metre reclining Buddha.'],
        ['Wat Arun', 'Bangkok', 'culture', 3, 'Wat Arun', 'Temple of Dawn, glittering on the Chao Phraya.'],
        ['Chatuchak Weekend Market', 'Bangkok', 'food', 15, 'Chatuchak Weekend Market', 'Over 15,000 stalls of food, crafts and curios.'],
        ['Damnoen Saduak Floating Market', 'Bangkok', 'food', 20, 'Damnoen Saduak floating market', 'Boats piled with fruit and noodle soup.'],
        ['Ayutthaya Historical Park', 'Ayutthaya', 'culture', 10, ['Wat Mahathat (Ayutthaya)', 'Ayutthaya Historical Park', 'Wat Chaiwatthanaram'], 'Ruins of the ancient Siamese capital.'],
        ['Wat Phra That Doi Suthep', 'Chiang Mai', 'culture', 3, 'Wat Phra That Doi Suthep', 'Mountain temple reached by a naga staircase.'],
        ['Ethical Elephant Sanctuary', 'Chiang Mai', 'nature', 70, ['Elephant Nature Park', 'Asian elephant'], 'Observe rescued elephants — no riding.'],
        ['Thai Cooking Class', 'Chiang Mai', 'food', 35, ['Thai cuisine', 'Pad thai', 'Green curry'], 'Shop the market, then cook curry and pad thai.'],
        ['Chiang Mai Old City Temples', 'Chiang Mai', 'culture', 2, 'Wat Chedi Luang', 'Wat Chedi Luang and Wat Phra Singh by bicycle.'],
        ['Doi Inthanon National Park', 'Chiang Mai', 'nature', 15, 'Doi Inthanon National Park', "Waterfalls and cloud forest on Thailand's highest peak."],
        ['Phi Phi Islands Boat Trip', 'Phuket', 'nature', 45, 'Phi Phi Islands', 'Snorkel crystal coves and Maya Bay.'],
        ['Phang Nga Bay Kayaking', 'Phuket', 'nature', 40, 'Phang Nga Bay', 'Paddle into limestone sea caves.'],
        ['Big Buddha Phuket', 'Phuket', 'culture', 0, 'Big Buddha (Phuket)', 'A 45-metre marble Buddha overlooking the island.'],
        ['Old Phuket Town', 'Phuket', 'city', 0, 'Phuket (city)', 'Sino-Portuguese shophouses and cafés.'],
        ['Kata Beach Day', 'Phuket', 'nature', 5, 'Kata Beach', 'Swim, sunbathe and catch the sunset.']
      ],
      strolls: [
        ['Chinatown (Yaowarat) street food', 'Bangkok'], ['Khao San Road evening', 'Bangkok'], ['Lumphini Park', 'Bangkok'], ['Ari café district', 'Bangkok'],
        ['Ayutthaya riverside', 'Ayutthaya'], ['Nimmanhaemin Road', 'Chiang Mai'], ['Sunday Walking Street', 'Chiang Mai'], ['Riverside night bazaar', 'Chiang Mai'],
        ['Karon viewpoint', 'Phuket'], ['Rawai seafood market', 'Phuket']
      ]
    },
    greece: {
      name: 'Greece', flag: '🇬🇷', wiki: 'Greece', colors: ['#0d5eaf', '#9cc3ef'],
      route: ['Athens', 'Delphi', 'Santorini', 'Crete'],
      tagline: 'Ancient wonders, whitewashed villages and Aegean sunsets.',
      tiers: { budget: { lodging: 80, food: 35, transport: 15 }, comfort: { lodging: 180, food: 70, transport: 30 }, luxury: { lodging: 500, food: 150, transport: 60 } },
      activities: [
        ['Acropolis & Parthenon', 'Athens', 'culture', 30, 'Acropolis of Athens', 'The temple-crowned citadel above Athens.'],
        ['Acropolis Museum', 'Athens', 'art', 20, 'Acropolis Museum', 'Original sculptures in a glass-floored museum.'],
        ['Ancient Agora', 'Athens', 'culture', 20, 'Ancient Agora of Athens', 'Where Socrates walked — and the Temple of Hephaestus.'],
        ['Plaka Food Tour', 'Athens', 'food', 55, 'Plaka', 'Souvlaki, loukoumades and meze in the old town.'],
        ['Cape Sounion Sunset', 'Athens', 'nature', 15, 'Cape Sounion', 'Temple of Poseidon on a cliff above the sea.'],
        ['Ancient Delphi', 'Delphi', 'culture', 20, 'Delphi', 'Sanctuary of the Oracle on Mount Parnassus.'],
        ['Oia Sunset', 'Santorini', 'city', 0, 'Oia, Greece', 'Blue domes and the most famous sunset in Greece.'],
        ['Fira to Oia Caldera Hike', 'Santorini', 'nature', 0, 'Fira', 'Clifftop trail along the volcanic caldera.'],
        ['Santorini Catamaran Cruise', 'Santorini', 'nature', 110, ['Catamaran', 'Santorini caldera'], 'Hot springs, volcano and swimming stops.'],
        ['Akrotiri Archaeological Site', 'Santorini', 'culture', 15, 'Akrotiri (prehistoric city)', 'Bronze Age town preserved in volcanic ash.'],
        ['Red Beach', 'Santorini', 'nature', 0, 'Red Beach (Santorini)', 'Dramatic red cliffs above dark sand.'],
        ['Santorini Winery Tour', 'Santorini', 'food', 60, 'Santorini (wine)', 'Taste Assyrtiko from basket-trained vines.'],
        ['Palace of Knossos', 'Crete', 'culture', 20, ['Palace of Knossos', 'Knossos'], 'The labyrinthine Minoan palace of legend.'],
        ['Samaria Gorge Hike', 'Crete', 'nature', 10, 'Samaria Gorge', 'A 16 km hike through a spectacular gorge to the sea.'],
        ['Balos Lagoon', 'Crete', 'nature', 30, 'Balos', 'Turquoise lagoon reached by boat or trail.'],
        ['Chania Old Harbour', 'Crete', 'city', 0, 'Chania', 'Venetian harbour and lighthouse.']
      ],
      strolls: [
        ['Anafiotika', 'Athens'], ['Monastiraki flea market', 'Athens'], ['Psyrri', 'Athens'], ['Lycabettus Hill', 'Athens'],
        ['Arachova village', 'Delphi'], ['Pyrgos village', 'Santorini'], ['Imerovigli', 'Santorini'], ['Kamari beachfront', 'Santorini'],
        ['Heraklion market street', 'Crete'], ['Rethymno old town', 'Crete']
      ]
    },
    indonesia: {
      name: 'Indonesia', flag: '🇮🇩', wiki: 'Indonesia', colors: ['#ce1126', '#f4a259'],
      route: ['Bali (Ubud)', 'Bali (South)', 'Nusa Penida', 'Java (Yogyakarta)'],
      tagline: 'Rice terraces, volcanoes and temple-dotted islands.',
      tiers: { budget: { lodging: 35, food: 15, transport: 10 }, comfort: { lodging: 100, food: 35, transport: 20 }, luxury: { lodging: 330, food: 90, transport: 45 } },
      activities: [
        ['Tegallalang Rice Terraces', 'Bali (Ubud)', 'nature', 5, ['Tegallalang Rice Terrace', 'Jatiluwih', 'Rice terrace'], 'Emerald stepped paddies of the subak system.'],
        ['Sacred Monkey Forest', 'Bali (Ubud)', 'nature', 6, 'Ubud Monkey Forest', 'Temple jungle home to long-tailed macaques.'],
        ['Tirta Empul Water Temple', 'Bali (Ubud)', 'culture', 4, 'Tirta Empul', 'Holy spring temple with purification pools.'],
        ['Mount Batur Sunrise Trek', 'Bali (Ubud)', 'nature', 45, 'Mount Batur', 'Pre-dawn hike up an active volcano.'],
        ['Balinese Cooking Class', 'Bali (Ubud)', 'food', 30, ['Balinese cuisine', 'Satay'], 'Learn to make sambal, satay and lawar.'],
        ['Ubud Palace & Legong Dance', 'Bali (Ubud)', 'culture', 8, 'Legong', 'Traditional dance performance at the royal palace.'],
        ['Uluwatu Temple & Kecak Dance', 'Bali (South)', 'culture', 15, 'Uluwatu Temple', 'Clifftop temple and fire dance at sunset.'],
        ['Tanah Lot', 'Bali (South)', 'culture', 5, 'Tanah Lot', 'Sea temple perched on a tidal rock.'],
        ['Seminyak Beach', 'Bali (South)', 'nature', 0, 'Seminyak', 'Surf, beach clubs and sunset cocktails.'],
        ['Jimbaran Seafood Dinner', 'Bali (South)', 'food', 25, 'Jimbaran', 'Grilled seafood with your toes in the sand.'],
        ['Kelingking Beach', 'Nusa Penida', 'nature', 3, 'Nusa Penida', 'The famous T-Rex shaped cliff.'],
        ['Manta Ray Snorkelling', 'Nusa Penida', 'nature', 45, 'Manta ray', 'Swim alongside graceful reef mantas.'],
        ['Borobudur Temple', 'Java (Yogyakarta)', 'culture', 25, 'Borobudur', "The world's largest Buddhist temple."],
        ['Prambanan Temple', 'Java (Yogyakarta)', 'culture', 25, 'Prambanan', 'Soaring 9th-century Hindu temple compound.'],
        ['Kraton Sultan\'s Palace', 'Java (Yogyakarta)', 'culture', 5, 'Kraton Ngayogyakarta Hadiningrat', 'Living palace of the Yogyakarta sultanate.'],
        ['Batik Workshop', 'Java (Yogyakarta)', 'art', 15, 'Batik', 'Wax-resist dye your own batik cloth.']
      ],
      strolls: [
        ['Ubud art market', 'Bali (Ubud)'], ['Campuhan Ridge Walk', 'Bali (Ubud)'], ['Penestanan village', 'Bali (Ubud)'], ['Canggu cafés', 'Bali (South)'],
        ['Sanur beach path', 'Bali (South)'], ['Kuta night market', 'Bali (South)'], ['Crystal Bay sunset', 'Nusa Penida'], ['Malioboro Street', 'Java (Yogyakarta)'],
        ['Taman Sari Water Castle', 'Java (Yogyakarta)'], ['Kotagede silver quarter', 'Java (Yogyakarta)']
      ]
    }
  };


  // Inter-city legs between adjacent route stops: [mode key, label, icon, costPerPersonUSD, hours, note]
  const LEGS = {
    japan: {
      local: 'IC card (Suica/ICOCA) for metro, JR lines and buses',
      legs: [
        [['train', 'Romancecar train', '🚆', 20, 1.5, 'Shinjuku → Hakone-Yumoto'], ['bus', 'Highway bus', '🚌', 15, 2.5, 'Odakyu express bus'], ['car', 'Rental car (shared)', '🚗', 30, 2, 'Per person, 4 per car incl. tolls']],
        [['train', 'Shinkansen', '🚄', 90, 2.5, 'Odawara → Kyoto via Hikari'], ['bus', 'Highway bus', '🚌', 45, 8, 'Overnight option available'], ['car', 'Rental car (shared)', '🚗', 60, 6, 'Per person incl. tolls']],
        [['train', 'JR Nara Line', '🚆', 6, 0.8, 'Kyoto → Nara'], ['bus', 'Local bus', '🚌', 8, 1.5, ''], ['car', 'Private transfer', '🚐', 35, 1, 'Per person, shared van']],
        [['train', 'Kintetsu train', '🚆', 6, 0.7, 'Nara → Namba'], ['bus', 'Local bus', '🚌', 8, 1.2, ''], ['car', 'Private transfer', '🚐', 35, 1, 'Per person, shared van']]
      ]
    },
    italy: {
      local: 'Metro, trams and walking; vaporetto pass in Venice',
      legs: [
        [['train', 'Frecciarossa high-speed', '🚄', 45, 1.6, 'Roma Termini → Firenze SMN'], ['bus', 'Intercity coach', '🚌', 15, 3.5, ''], ['car', 'Rental car (shared)', '🚗', 40, 3, 'Per person incl. fuel & tolls']],
        [['train', 'Regional train', '🚆', 10, 1, 'To Pisa / Siena'], ['bus', 'Regional bus', '🚌', 9, 1.3, ''], ['car', 'Rental car (shared)', '🚗', 30, 1, 'Best for Chianti villages']],
        [['train', 'Frecciarossa high-speed', '🚄', 50, 2.5, 'Florence → Venezia S. Lucia'], ['bus', 'Intercity coach', '🚌', 18, 4, ''], ['flight', 'Domestic flight', '✈️', 110, 3, 'Incl. airport transfers']]
      ]
    },
    france: {
      local: 'Paris Métro & RER; regional TER trains elsewhere',
      legs: [
        [['train', 'TGV / Intercités', '🚄', 35, 1.5, 'Paris → Tours / Blois'], ['bus', 'Intercity coach', '🚌', 18, 3, ''], ['car', 'Rental car (shared)', '🚗', 40, 2.5, 'Handy for multiple châteaux']],
        [['train', 'TGV via Paris/Lyon', '🚄', 80, 5, 'Tours → Avignon'], ['flight', 'Domestic flight', '✈️', 120, 3.5, 'Incl. airport transfers'], ['car', 'Rental car (shared)', '🚗', 70, 7.5, 'Scenic drive south']],
        [['train', 'TER regional train', '🚆', 35, 3, 'Avignon / Marseille → Nice'], ['bus', 'Intercity coach', '🚌', 20, 4, ''], ['car', 'Rental car (shared)', '🚗', 40, 2.5, 'Coastal autoroute']]
      ]
    },
    thailand: {
      local: 'BTS Skytrain, MRT, river boats, Grab and tuk-tuks',
      legs: [
        [['train', 'State railway', '🚆', 2, 1.5, 'Bangkok → Ayutthaya'], ['bus', 'Minivan', '🚐', 4, 1.5, ''], ['boat', 'River cruise', '⛴️', 45, 5, 'Scenic Chao Phraya day cruise']],
        [['train', 'Overnight sleeper train', '🚆', 35, 11, 'Book lower berths early'], ['flight', 'Domestic flight', '✈️', 60, 2.5, 'Via Bangkok, incl. transfers'], ['bus', 'VIP bus', '🚌', 22, 9, '']],
        [['flight', 'Domestic flight', '✈️', 70, 2, 'Chiang Mai → Phuket direct'], ['bus', 'Bus via Bangkok', '🚌', 40, 22, 'Long but cheapest']]
      ]
    },
    greece: {
      local: 'Athens Metro, local KTEL buses and taxis',
      legs: [
        [['bus', 'KTEL bus', '🚌', 20, 3, 'Athens → Delphi'], ['car', 'Rental car (shared)', '🚗', 30, 2.5, ''], ['car-private', 'Private driver', '🚐', 70, 2.5, 'Per person, shared van']],
        [['ferry', 'High-speed ferry', '⛴️', 90, 5, 'Via Piraeus'], ['ferry-slow', 'Conventional ferry', '🚢', 50, 8, ''], ['flight', 'Domestic flight', '✈️', 110, 3.5, 'Via Athens, incl. transfers']],
        [['ferry', 'High-speed ferry', '⛴️', 85, 2, 'Santorini → Heraklion'], ['flight', 'Domestic flight', '✈️', 120, 3, 'Usually via Athens']]
      ]
    },
    indonesia: {
      local: 'Private drivers, Grab/Gojek scooters and taxis',
      legs: [
        [['car', 'Private driver', '🚐', 12, 1.5, 'Per person, shared car'], ['bus', 'Kura-Kura shuttle bus', '🚌', 6, 2, ''], ['scooter', 'Scooter taxi (Gojek)', '🛵', 8, 1.2, 'Light luggage only']],
        [['boat', 'Fast boat', '🚤', 25, 0.8, 'Sanur → Nusa Penida'], ['ferry', 'Public ferry', '⛴️', 5, 2, '']],
        [['flight', 'Flight via Denpasar', '✈️', 75, 3, 'Incl. transfers'], ['ferry', 'Ferry + train', '🚆', 35, 16, 'Gilimanuk → Banyuwangi → Yogyakarta']]
      ]
    }
  };

  function toActivity([name, city, category, cost, wiki, description]) {
    return { name, city, category, cost, wiki, description, type: 'attraction' };
  }

  function parseWhole(raw) {
    const s = String(raw ?? '').trim();
    if (!/^\d+$/.test(s)) return NaN;
    return Number(s);
  }

  function validateInput(input) {
    const errors = {};
    const destination = String(input.destination ?? '');
    if (!DESTINATIONS[destination]) errors.destination = 'Choose a destination.';

    const days = parseWhole(input.days);
    if (String(input.days ?? '').trim() === '') errors.days = 'Enter the trip length.';
    else if (!Number.isInteger(days) || days < LIMITS.minDays || days > LIMITS.maxDays)
      errors.days = `Enter a whole number of days from ${LIMITS.minDays} to ${LIMITS.maxDays}.`;

    const travelers = parseWhole(input.travelers);
    if (String(input.travelers ?? '').trim() === '') errors.travelers = 'Enter the number of travelers.';
    else if (!Number.isInteger(travelers) || travelers < LIMITS.minTravelers || travelers > LIMITS.maxTravelers)
      errors.travelers = `Enter a whole number of travelers from ${LIMITS.minTravelers} to ${LIMITS.maxTravelers}.`;

    const budgetStr = String(input.budget ?? '').trim();
    const budget = /^\d+(\.\d{1,2})?$/.test(budgetStr) ? Number(budgetStr) : NaN;
    if (budgetStr === '') errors.budget = 'Enter your total group budget.';
    else if (!Number.isFinite(budget) || budget <= 0) errors.budget = 'Enter a positive amount in USD (e.g. 3500).';

    return { valid: Object.keys(errors).length === 0, errors, values: { destination, days, travelers, budget } };
  }

  // Evenly sample n items across the route so short trips still span it.
  function sample(list, n) {
    if (n >= list.length) return list.slice();
    if (n <= 0) return [];
    if (n === 1) return [list[0]];
    const picked = new Set();
    for (let i = 0; i < n; i++) picked.add(Math.round((i * (list.length - 1)) / (n - 1)));
    return [...picked].sort((a, b) => a - b).map((i) => list[i]);
  }

  function buildDays(destKey, dest, days) {
    // Slots: day 1 = arrival + stroll; middle days = 2 activities; last day = 1 activity + departure.
    const middle = Math.max(0, days - 2);
    const attractionSlots = days === 1 ? 1 : middle * 2 + 1;
    const all = dest.activities.map(toActivity);
    const chosen = sample(all, Math.min(attractionSlots, all.length));
    const strolls = dest.strolls.map(([name, city]) => ({
      name: `Stroll: ${name}`, city, category: 'stroll', cost: 0, wiki: null, type: 'stroll',
      description: `Free time to wander ${name}, browse local shops and try street snacks.`
    }));
    const usedStrolls = new Set();
    const takeStroll = (city) => {
      let idx = strolls.findIndex((s, i) => !usedStrolls.has(i) && s.city === city);
      if (idx < 0) idx = strolls.findIndex((s, i) => !usedStrolls.has(i));
      usedStrolls.add(idx);
      return strolls[idx];
    };

    // Distribute chosen attractions into day buckets in route order.
    const capacities = [];
    for (let d = 1; d <= days; d++) {
      if (days === 1) capacities.push(1);
      else if (d === 1) capacities.push(0);
      else if (d === days) capacities.push(1);
      else capacities.push(2);
    }
    const buckets = capacities.map(() => []);
    let q = 0;
    // Spread: assign one attraction per non-arrival day first, then second slots.
    const order = [];
    capacities.forEach((c, i) => { if (c >= 1) order.push(i); });
    capacities.forEach((c, i) => { if (c >= 2) order.push(i); });
    const fillOrder = order.slice(0, chosen.length).sort((a, b) => a - b);
    fillOrder.forEach((dayIdx) => buckets[dayIdx].push(chosen[q++]));

    let lastCity = chosen[0] ? chosen[0].city : dest.route[0];
    const result = [];
    for (let d = 0; d < days; d++) {
      const items = [];
      const startCity = buckets[d][0] ? buckets[d][0].city : lastCity;
      if (d === 0) items.push({ name: `Arrive in ${startCity}`, city: startCity, category: 'arrival', cost: 0, type: 'logistics', description: 'Transfer to your accommodation, check in and settle in.' });
      // Every change of city (from yesterday or within the day) becomes a transport leg.
      const legs = [];
      let here = d === 0 ? startCity : lastCity;
      const cities = [here];
      buckets[d].forEach((a) => {
        if (a.city !== here) {
          legs.push({ id: `${d + 1}-${legs.length}`, from: here, to: a.city });
          items.push({ name: `Travel to ${a.city}`, city: a.city, category: 'travel', cost: 0, type: 'logistics', description: `Journey ${here} → ${a.city} — choose how below.` });
          here = a.city;
          cities.push(here);
        }
        items.push(a);
      });
      const target = days === 1 ? 2 : d === 0 ? 1 : d === days - 1 ? 1 : 2;
      while (items.filter((i) => i.type !== 'logistics').length < target) items.push(takeStroll(here));
      if (d === days - 1 && days > 1) items.push({ name: 'Departure', city: here, category: 'departure', cost: 0, type: 'logistics', description: 'Check out and transfer for your onward journey.' });
      lastCity = here;
      result.push({ day: d + 1, city: cities.join(' → '), legs, items });
    }
    return result;
  }


  const MODE_NAMES = { train: 'Train', bus: 'Bus', car: 'Car / transfer', 'car-private': 'Private driver', flight: 'Flight', ferry: 'Ferry', 'ferry-slow': 'Conventional ferry', boat: 'Boat', scooter: 'Scooter taxi' };

  // Options for travelling between two route cities, combining adjacent legs when stops are skipped.
  function legOptions(destKey, from, to) {
    const dest = DESTINATIONS[destKey];
    const a = dest.route.indexOf(from), b = dest.route.indexOf(to);
    if (a < 0 || b < 0 || a === b) return [];
    const [lo, hi] = a < b ? [a, b] : [b, a];
    const hops = LEGS[destKey].legs.slice(lo, hi);
    const byMode = new Map();
    hops.forEach((hop, h) => hop.forEach(([key, label, icon, cost, hours, note]) => {
      const cur = byMode.get(key) || { key, label, icon, cost: 0, hours: 0, notes: [], parts: [], hops: 0 };
      cur.cost += cost; cur.hours += hours; cur.hops++; cur.parts.push(label); if (note) cur.notes.push(note);
      byMode.set(key, cur);
    }));
    const round = (h) => Math.round(h * 10) / 10;
    const options = [...byMode.values()].filter((o) => o.hops === hops.length).map((o) => ({
      key: o.key, label: hops.length > 1 ? `${MODE_NAMES[o.key] || o.label} (${hops.length} legs)` : o.label,
      icon: o.icon, cost: o.cost, hours: round(o.hours),
      note: hops.length > 1 ? o.parts.join(' + ') : o.notes.join(' · ')
    }));
    if (hops.length > 1) {
      const combo = (key, label, icon, pick) => {
        const parts = hops.map((hop) => hop.reduce((best, h) => (pick(h, best) ? h : best)));
        return {
          key, label, icon,
          cost: parts.reduce((s, p) => s + p[3], 0),
          hours: round(parts.reduce((s, p) => s + p[4], 0)),
          note: parts.map((p) => p[1]).join(' + ')
        };
      };
      const cheap = combo('combo-cheap', 'Cheapest connection', '💸', (h, b) => h[3] < b[3]);
      const fast = combo('combo-fast', 'Fastest connection', '⚡', (h, b) => h[4] < b[4]);
      [cheap, fast].forEach((c) => {
        if (!options.some((o) => o.cost === c.cost && o.hours === c.hours)) options.push(c);
      });
    }
    return options;
  }

  function costFor(dest, tierKey, days, travelers, activityPP, intercityPP) {
    const t = dest.tiers[tierKey];
    const rooms = Math.ceil(travelers / 2);
    const breakdown = {
      accommodation: t.lodging * rooms * days,
      food: t.food * travelers * days,
      transport: t.transport * travelers * days,
      activities: activityPP * travelers,
      intercity: intercityPP * travelers
    };
    const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
    return { tier: tierKey, tierName: TIER_NAMES[tierKey], rooms, breakdown, total };
  }

  function generateItinerary(rawInput) {
    const v = validateInput(rawInput);
    if (!v.valid) return { ok: false, errors: v.errors };
    const { destination, days, travelers, budget } = v.values;
    const dest = DESTINATIONS[destination];
    const dayPlans = buildDays(destination, dest, days);
    const activityPP = dayPlans.flatMap((d) => d.items).reduce((s, i) => s + i.cost, 0);
    const choices = (rawInput && rawInput.transport) || {};
    let intercityPP = 0, cheapestIntercityPP = 0;
    dayPlans.flatMap((d) => d.legs).forEach((leg) => {
      leg.options = legOptions(destination, leg.from, leg.to);
      const cheapest = leg.options.reduce((m, o) => (o.cost < m.cost ? o : m), leg.options[0]);
      const picked = leg.options.find((o) => o.key === choices[leg.id]) || cheapest;
      leg.selected = picked.key;
      intercityPP += picked.cost;
      cheapestIntercityPP += cheapest.cost;
    });
    const options = ['luxury', 'comfort', 'budget'].map((k) => costFor(dest, k, days, travelers, activityPP, intercityPP));
    const minimum = costFor(dest, 'budget', days, travelers, activityPP, cheapestIntercityPP);
    const budgetWithSelection = options[options.length - 1];
    const chosen = options.find((o) => o.total <= budget) || null;
    return {
      ok: true,
      feasible: !!chosen,
      destination: { key: destination, name: dest.name, flag: dest.flag, wiki: dest.wiki, route: dest.route, tagline: dest.tagline, colors: dest.colors },
      days, travelers, budget,
      days_plan: dayPlans,
      cost: chosen,
      localTransport: LEGS[destination].local,
      minimumTotal: minimum.total,
      selectionMinimumTotal: budgetWithSelection.total,
      shortfall: chosen ? 0 : budgetWithSelection.total - budget,
      remaining: chosen ? budget - chosen.total : 0
    };
  }

  return { DESTINATIONS, LEGS, LIMITS, TIER_NAMES, validateInput, generateItinerary, legOptions };
});
