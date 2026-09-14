# Smart Waste AI

A modular prototype for the SIH Smart AI Dustbin Management System.

## Architecture
Frontend (HTML/CSS/JS) → FastAPI → Services → JSON data.

The code is intentionally split by responsibility:
- `backend/main.py` = application entry point / merger
- `backend/api/` = API endpoints
- `backend/services/` = business logic
- `backend/data/bins.json` = prototype data
- `frontend/js/api.js` = backend connection
- `frontend/js/dashboard.js` = UI logic
- `frontend/css/style.css` = design

## 1. Install Python
Install Python 3.10+.

## 2. Open terminal in backend
Windows:
`cd smart-waste-ai\backend`

## 3. Create virtual environment
`python -m venv venv`

Activate:
`venv\Scripts\activate`

## 4. Install packages
`pip install -r requirements.txt`

## 5. Start backend
`uvicorn main:app --reload`

Backend runs at:
`http://127.0.0.1:8000`

API documentation:
`http://127.0.0.1:8000/docs`

## 6. Start frontend
Do NOT open `index.html` directly if your browser blocks API requests.
In another terminal, open the frontend folder:
`cd smart-waste-ai\frontend`

If you have Python installed:
`python -m http.server 5500`

Then open:
`http://127.0.0.1:5500`

## 7. How the modules merge
`main.py` imports the routers:
- bins router
- routes router
- dashboard router

Each router imports a service.
Services read/update the data.
The frontend calls the API through `api.js`.

## 8. Important demo feature
Select any non-empty bin and click "Mark garbage collected".
The backend changes that bin's fill level to `0`, clears its trend, and returns the updated bin.
The dashboard then reloads and the route is recalculated.

## 9. Next production upgrades
1. Replace `bins.json` with Supabase/PostgreSQL.
2. Replace the baseline prediction in `bin_service.py` with a trained ML model.
3. Add ESP32/LoRaWAN/IoT ingestion.
4. Replace simulated coordinates with Leaflet/OpenStreetMap.
5. Add authentication and municipal admin roles.
