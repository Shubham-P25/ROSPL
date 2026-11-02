# PackGo Knowledge Base & Frequently Asked Questions

## What is PackGo?
PackGo is a free, 100% open-source intelligent travel planner engineered specifically for exploration across India. Built on deterministic algorithmic foundations with zero paid API dependencies, PackGo generates reliable itineraries, budget breakdowns, weather analyses, route maps, and tailored packing checklists.

## How does the Itinerary Tab work?
The Itinerary Tab organizes your trip into clear day-by-day sections with sticky headers showing the day number, formatted calendar date, total stop count, and estimated expenditure. Each stop features a structured time slot (Morning 09:00-12:30, Afternoon 13:30-17:00, Evening 17:30-20:30), validated landmark photographs, estimated entry costs, direct Google Maps navigation links, curated travel vlog links, and inter-stop transit connectors calculating walking distance and transit minutes via Haversine geodesic algorithms. You can add custom stops or rearrange stops easily.

## How does the Places and Route Map Tab work?
The Places Tab renders an interactive dual-effect Leaflet map powered by clean CARTO Voyager tiles with OpenStreetMap attribution. It traces actual road routes using OSRM driving geometry (with straight-line fallback), provides an "All Days" panoramic mode with unique color coding per day, displays verified Wikimedia Commons photographs, and lists numbered stops with a "Locate" button that smoothly pans and opens the stop popup. Places further than 80km from the destination center are filtered out to keep plans realistic.

## How does the Budget Tab work?
The Budget Tab provides a deterministic budget allocation engine dividing your total trip budget into six standard categories: Stay (30%), Transport (25%), Food (20%), Activities (10%), Shopping (5%), and Buffer (10%). Allocations automatically adjust for trip duration, flight or train travel, adventure activities, and group size, rounding each category to ₹50 while placing any remainder into the safety buffer so that the sum always equals your total budget. Interactive sliders allow real-time adjustments with a locked total. The system tracks itemized expenses against allocated targets and triggers an alert when any category exceeds 90% of its budget. Group expenses are calculated per traveler.

## How does the Packing Checklist Tab work?
The Packing Tab features a 1-click Smart Packing recommendation engine that analyzes your destination climate, live weather temperatures, precipitation probabilities, trip duration, and group size. It generates personalized checklists spanning Clothing, Toiletries, Electronics, Documents, Medicine, and Miscellaneous categories, scaling clothing quantities by duration. Clicking "Recommend my packing list" adds all necessary items immediately with zero confirmation dialogs, accompanied by an instant Undo toast and "Why" justification tooltips for every recommendation.

## How does the Weather Tab work?
The Weather Tab queries Open-Meteo's open-access meteorological API without API keys to deliver 16-day forecasts including daily maximum/minimum temperatures, precipitation probabilities, sunrise/sunset times, and WMO weather condition descriptions. For dates further than 15 days in the future, PackGo automatically queries historical archive climatology from the same calendar window one year prior, displaying a transparent "Historical Climatology" badge so you always have realistic expectations.

## How does the Emergency Tab work?
The Emergency Tab displays nationwide Indian emergency helplines: Police (112 / 100), Fire Services (101), Medical Ambulance (108 / 102), National Tourist Helpline (1363 / 1800-11-1363), Women Safety Helpline (1091), and Disaster Management (1078).

## How does Trip Sharing work?
PackGo allows you to generate a secure read-only public share link with a unique cryptographic token. Anyone with the link can view your itinerary, map, and overview without needing to log in, while editing controls remain protected under your account. You can toggle sharing on or off at any time.
