// ============================================================
// SMART WASTE AI - API CONNECTION
// ============================================================

const API_BASE_URL = "http://127.0.0.1:8000/api";


// ============================================================
// GENERIC API REQUEST
// ============================================================

async function apiRequest(endpoint, options = {}) {

    const response = await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
            ...options,

            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        }
    );


    if (!response.ok) {

        throw new Error(
            `API Error ${response.status}: ${response.statusText}`
        );

    }


    return await response.json();
}


// ============================================================
// BINS
// ============================================================

async function getBins() {

    return await apiRequest("/bins");

}


async function getBin(binId) {

    return await apiRequest(
        `/bins/${encodeURIComponent(binId)}`
    );

}


async function collectBin(binId) {

    return await apiRequest(
        `/bins/${encodeURIComponent(binId)}/collect`,
        {
            method: "POST"
        }
    );

}


// ============================================================
// DASHBOARD
// ============================================================

async function getDashboardSummary() {

    return await apiRequest(
        "/dashboard/summary"
    );

}


// ============================================================
// ROUTES
// ============================================================

async function getDegradableRoute() {

    return await apiRequest(
        "/routes/degradable"
    );

}


async function getNonDegradableRoute() {

    return await apiRequest(
        "/routes/non-degradable"
    );

}