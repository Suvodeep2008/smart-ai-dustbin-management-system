from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.bins import router as bins_router
from api.dashboard import router as dashboard_router
from api.routes import router as routes_router
from api.trucks import router as trucks_router
from api.ai import router as ai_router


app = FastAPI(
    title="Smart Waste AI API",
    description="AI-powered smart waste collection and city operations API",
    version="1.0.0"
)


# ============================================================
# CORS CONFIGURATION
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:5501",
    "http://localhost:5501",
    "https://smart-ai-dustbin-management-system-1.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# API ROUTES
# ============================================================

# ============================================================
# API ROUTES
# ============================================================

app.include_router(bins_router)
app.include_router(dashboard_router)
app.include_router(ai_router)
app.include_router(routes_router)
app.include_router(trucks_router)


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():
    return {
        "message": "Smart Waste AI API is running",
        "status": "online",
        "version": "1.0.0"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }