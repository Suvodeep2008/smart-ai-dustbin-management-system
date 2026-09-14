// ============================================================
// SMART WASTE AI
// DASHBOARD CONTROLLER
// ============================================================

// ------------------------------------------------------------
// GLOBAL STATE
// ------------------------------------------------------------

let bins = [];
let selectedId = null;
let activeFilter = "all";


// ------------------------------------------------------------
// SHORT DOM HELPER
// ------------------------------------------------------------

const $ = (id) => document.getElementById(id);


// ============================================================
// STATUS FUNCTIONS
// ============================================================

function getStatus(level) {

    level = Number(level) || 0;

    if (level >= 85) {
        return "critical";
    }

    if (level >= 60) {
        return "warning";
    }

    return "normal";
}


function getStatusLabel(status) {

    if (status === "critical") {
        return "Critical";
    }

    if (status === "warning") {
        return "Near Full";
    }

    return "Normal";
}


function getStatusClass(status) {

    if (status === "critical") {
        return "status-critical";
    }

    if (status === "warning") {
        return "status-warning";
    }

    return "status-normal";
}


function getStatusColor(status) {

    if (status === "critical") {
        return "#df6b55";
    }

    if (status === "warning") {
        return "#e1ad45";
    }

    return "#67b995";
}


// ============================================================
// AI PRIORITY FUNCTIONS
// ============================================================

function getPriorityScore(bin) {

    const score = Number(
        bin.priority_score ??
        bin.priorityScore ??
        bin.ai_priority ??
        0
    );

    return Math.max(
        0,
        Math.min(100, score)
    );
}


function getPriorityLabel(score) {

    score = Number(score) || 0;

    if (score >= 75) {
        return "URGENT";
    }

    if (score >= 50) {
        return "HIGH";
    }

    if (score >= 30) {
        return "MEDIUM";
    }

    return "LOW";
}


function getPriorityClass(score) {

    score = Number(score) || 0;

    if (score >= 75) {
        return "priority-urgent";
    }

    if (score >= 50) {
        return "priority-high";
    }

    if (score >= 30) {
        return "priority-medium";
    }

    return "priority-low";
}


// ============================================================
// ETA CALCULATION
// ============================================================

function getEta(bin) {

    // Use backend prediction if available

    if (
        bin.eta &&
        bin.eta.text
    ) {
        return bin.eta.text;
    }


    const level =
        Number(bin.level) || 0;

    const rate =
        Number(bin.rateHr) || 0;


    if (level >= 100) {
        return "Full now";
    }


    if (rate <= 0) {
        return "Unknown";
    }


    const hours =
        (100 - level) / rate;


    if (hours < 1) {

        const minutes =
            Math.max(
                1,
                Math.round(hours * 60)
            );

        return `${minutes} min`;
    }


    if (hours < 24) {

        return `${Math.ceil(hours)} hours`;
    }


    return `${Math.ceil(hours / 24)} days`;
}


// ============================================================
// TOAST MESSAGE
// ============================================================

function showToast(message) {

    const toast = $("toast");

    if (!toast) {
        return;
    }


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    clearTimeout(
        window.smartWasteToastTimer
    );


    window.smartWasteToastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            3000
        );
}


// ============================================================
// LOAD AI PRIORITY FOR ALL BINS
// ============================================================

async function loadAIPriorities() {

    if (!bins.length) {
        return;
    }


    const updatedBins =
        await Promise.all(

            bins.map(
                async (bin) => {

                    try {

                        const result =
                            await apiRequest(
                                `/ai/predict/${encodeURIComponent(bin.id)}`
                            );


                        return {
                            ...bin,

                            priority_score:
                                Number(
                                    result.priority_score
                                ) || 0,

                            ai_prediction:
                                result.prediction ||
                                null
                        };

                    }
                    catch (error) {

                        console.warn(
                            `AI prediction unavailable for ${bin.id}`,
                            error
                        );


                        return {
                            ...bin,

                            priority_score:
                                Number(
                                    bin.priority_score
                                ) || 0
                        };
                    }

                }
            )

        );


    bins =
        updatedBins;


    console.log(
        "AI priority scores loaded:",
        bins
    );
}


// ============================================================
// RENDER BIN LIST
// ============================================================

function renderBins() {

    const binList =
        $("binList");


    if (!binList) {
        return;
    }


    let visibleBins =
        [...bins];


    // --------------------------------------------------------
    // FILTER
    // --------------------------------------------------------

    if (
        activeFilter !== "all"
    ) {

        visibleBins =
            visibleBins.filter(
                bin =>
                    bin.type ===
                    activeFilter
            );
    }


    // --------------------------------------------------------
    // SORT
    // Highest AI priority first
    // --------------------------------------------------------

    visibleBins.sort(
        (a, b) =>
            getPriorityScore(b) -
            getPriorityScore(a)
    );


    // --------------------------------------------------------
    // EMPTY STATE
    // --------------------------------------------------------

    if (
        visibleBins.length === 0
    ) {

        binList.innerHTML = `

            <div class="empty-state">

                <div class="empty-icon">
                    ◎
                </div>

                <strong>
                    No bins available
                </strong>

                <span>
                    No bins match the selected filter.
                </span>

            </div>

        `;

        return;
    }


    // --------------------------------------------------------
    // CREATE BIN CARDS
    // --------------------------------------------------------

    binList.innerHTML =

        visibleBins.map(
            (bin) => {

                const level =
                    Math.round(
                        Number(bin.level) || 0
                    );


                const status =
                    bin.status ||
                    getStatus(level);


                const statusLabel =
                    bin.statusLabel ||
                    getStatusLabel(status);


                const statusClass =
                    getStatusClass(status);


                const priority =
                    getPriorityScore(bin);


                const priorityLabel =
                    getPriorityLabel(
                        priority
                    );


                const priorityClass =
                    getPriorityClass(
                        priority
                    );


                const location =
                    bin.loc ||
                    "Unknown location";


                const wasteType =
                    bin.type ===
                    "non-degradable"
                        ? "Non-degradable"
                        : "Degradable";


                const eta =
                    getEta(bin);


                const selectedClass =
                    bin.id === selectedId
                        ? "selected"
                        : "";


                return `

                    <article
                        class="bin ${selectedClass}"
                        data-id="${bin.id}"
                    >

                        <!-- =========================
                             TOP
                        ========================== -->

                        <div class="bin-top">


                            <!-- FILL RING -->

                            <div
                                class="ring"
                                style="
                                    --level:${level};
                                    --ring:${getStatusColor(status)};
                                "
                            >

                                <div class="ring-inner">
                                    ${level}%
                                </div>

                            </div>


                            <!-- BIN INFORMATION -->

                            <div class="bin-main-info">

                                <div class="bin-name">
                                    ${bin.id}
                                </div>

                                <div class="bin-loc">
                                    ${location}
                                </div>

                                <span
                                    class="
                                        tag
                                        ${
                                            bin.type ===
                                            "non-degradable"
                                                ? "non"
                                                : ""
                                        }
                                    "
                                >
                                    ${wasteType}
                                </span>

                            </div>


                            <!-- STATUS -->

                            <span
                                class="
                                    pill
                                    ${statusClass}
                                "
                            >
                                ${statusLabel}
                            </span>


                        </div>


                        <!-- =========================
                             PREDICTED FULL
                        ========================== -->

                        <div class="bin-eta">

                            <span>
                                Predicted full
                            </span>

                            <strong>
                                ${eta}
                            </strong>

                        </div>


                        <!-- =========================
                             AI PRIORITY
                        ========================== -->

                        <div class="ai-priority">


                            <div class="priority-header">

                                <span>
                                    AI Priority Score
                                </span>

                                <strong>
                                    ${priority.toFixed(1)}
                                </strong>

                            </div>


                            <div class="priority-track">

                                <div
                                    class="
                                        priority-fill
                                        ${priorityClass}
                                    "
                                    style="
                                        width:${priority}%;
                                    "
                                ></div>

                            </div>


                            <div class="priority-footer">

                                <span>
                                    Collection urgency
                                </span>

                                <b
                                    class="${priorityClass}"
                                >
                                    ${priorityLabel}
                                </b>

                            </div>


                        </div>

                    </article>

                `;

            }
        ).join("");


    // --------------------------------------------------------
    // CLICK EVENTS
    // --------------------------------------------------------

    binList
        .querySelectorAll(".bin")
        .forEach(
            card => {

                card.addEventListener(
                    "click",
                    () => {

                        selectBin(
                            card.dataset.id
                        );

                    }
                );

            }
        );
}


// ============================================================
// SELECT BIN
// ============================================================

function selectBin(id) {

    if (!id) {
        return;
    }


    const bin =
        bins.find(
            item =>
                item.id === id
        );


    if (!bin) {

        console.warn(
            `Bin ${id} not found`
        );

        return;
    }


    selectedId =
        id;


    const level =
        Number(bin.level) || 0;


    const status =
        bin.status ||
        getStatus(level);


    const priority =
        getPriorityScore(bin);


    const priorityLabel =
        getPriorityLabel(
            priority
        );


    const priorityClass =
        getPriorityClass(
            priority
        );


    // --------------------------------------------------------
    // TITLE
    // --------------------------------------------------------

    if ($("detailTitle")) {

        $("detailTitle").textContent =
            `${bin.id} · ${bin.loc || "Unknown location"}`;
    }


    // --------------------------------------------------------
    // SUBTITLE
    // --------------------------------------------------------

    if ($("detailSub")) {

        $("detailSub").textContent =
            bin.type === "degradable"
                ? "Degradable waste sensor"
                : "Non-degradable waste sensor";
    }


    // --------------------------------------------------------
    // STATUS
    // --------------------------------------------------------

    if ($("detailStatus")) {

        $("detailStatus").textContent =
            bin.statusLabel ||
            getStatusLabel(status);


        $("detailStatus").className =
            `pill ${getStatusClass(status)}`;
    }


    // --------------------------------------------------------
    // LEVEL
    // --------------------------------------------------------

    if ($("detailLevel")) {

        $("detailLevel").textContent =
            `${Math.round(level)}%`;
    }


    // --------------------------------------------------------
    // RATE
    // --------------------------------------------------------

    if ($("detailRate")) {

        $("detailRate").textContent =
            `${Number(
                bin.rateHr || 0
            ).toFixed(1)}% / hr`;
    }


    // --------------------------------------------------------
    // ETA
    // --------------------------------------------------------

    if ($("detailEta")) {

        $("detailEta").textContent =
            getEta(bin);
    }


    // --------------------------------------------------------
    // MAIN GAUGE
    // --------------------------------------------------------

    if ($("gaugeRing")) {

        $("gaugeRing")
            .style
            .setProperty(
                "--p",
                level
            );


        $("gaugeRing")
            .style
            .setProperty(
                "--c",
                getStatusColor(status)
            );
    }


    // --------------------------------------------------------
    // SMALL PRIORITY SCORE
    // --------------------------------------------------------

    if ($("detailPrioritySmall")) {

        $("detailPrioritySmall")
            .textContent =
                priority.toFixed(1);
    }


    // --------------------------------------------------------
    // LARGE PRIORITY SCORE
    // --------------------------------------------------------

    if ($("detailPriority")) {

        $("detailPriority")
            .textContent =
                priority.toFixed(1);
    }


    // --------------------------------------------------------
    // PRIORITY BAR
    // --------------------------------------------------------

    if ($("detailPriorityFill")) {

        $("detailPriorityFill")
            .style
            .width =
                `${priority}%`;


        $("detailPriorityFill")
            .className =
                priorityClass;
    }


    // --------------------------------------------------------
    // PRIORITY LABEL
    // --------------------------------------------------------

    if ($("detailPriorityLabel")) {

        $("detailPriorityLabel")
            .textContent =
                priorityLabel;


        $("detailPriorityLabel")
            .className =
                priorityClass;
    }


    // --------------------------------------------------------
    // COLLECTION BUTTON
    // --------------------------------------------------------

    if ($("collectBtn")) {

        $("collectBtn").disabled =
            level === 0;


        $("collectBtn").textContent =

            level === 0

                ? "✓ Bin already empty"

                : "✓ Mark garbage collected";
    }


    // --------------------------------------------------------
    // AI RECOMMENDATION
    // --------------------------------------------------------

    let insight;


    if (priority >= 75) {

        insight =
            "AI has classified this bin as urgent. It should receive the highest priority during the next collection dispatch.";

    }
    else if (priority >= 50) {

        insight =
            "AI has classified this bin as high priority. It should be included in the upcoming collection route.";

    }
    else if (status === "warning") {

        insight =
            "Fill level is approaching the collection threshold. Continue monitoring this bin.";

    }
    else {

        insight =
            "Current fill level is healthy. No immediate collection action is required.";
    }


    if ($("detailInsight")) {

        $("detailInsight")
            .textContent =
                insight;
    }


    // --------------------------------------------------------
    // UPDATE SELECTED CARD
    // --------------------------------------------------------

    document
        .querySelectorAll(".bin")
        .forEach(
            card => {

                card.classList.toggle(
                    "selected",
                    card.dataset.id ===
                    selectedId
                );

            }
        );
}


// ============================================================
// LOAD DASHBOARD
// ============================================================

async function loadDashboard() {

    try {

        showToast(
            "Updating city waste network..."
        );


        // ----------------------------------------------------
        // LOAD SUMMARY + BINS
        // ----------------------------------------------------

        const [
            summary,
            binData
        ] = await Promise.all([

            apiRequest(
                "/dashboard/summary"
            ),

            apiRequest(
                "/bins"
            )

        ]);


        bins =
            Array.isArray(binData)
                ? binData
                : [];


        console.log(
            "Bins loaded:",
            bins
        );


        console.log(
            "Dashboard summary:",
            summary
        );


        // ----------------------------------------------------
        // LOAD AI PRIORITY
        // ----------------------------------------------------

        await loadAIPriorities();


        // ----------------------------------------------------
        // UPDATE STATISTICS
        // ----------------------------------------------------

        if ($("total")) {

            $("total").textContent =
                summary.total_bins ??
                bins.length;
        }


        if ($("critical")) {

            $("critical").textContent =
                summary.critical_bins ??
                0;
        }


        if ($("needs")) {

            $("needs").textContent =
                summary.needs_collection ??
                0;
        }


        if ($("risk")) {

            $("risk").textContent =
                summary.overflow_risk ??
                0;
        }


        // ----------------------------------------------------
        // SELECT BIN
        // ----------------------------------------------------

        if (
            !selectedId ||
            !bins.some(
                bin =>
                    bin.id === selectedId
            )
        ) {

            selectedId =
                bins.length
                    ? bins[0].id
                    : null;
        }


        // ----------------------------------------------------
        // RENDER
        // ----------------------------------------------------

        renderBins();


        if (selectedId) {

            selectBin(
                selectedId
            );
        }


        // ----------------------------------------------------
        // ROUTES
        // ----------------------------------------------------

        await loadRoutes();


        showToast(
            "Network updated successfully"
        );

    }
    catch (error) {

        console.error(
            "Dashboard loading error:",
            error
        );


        showToast(
            "Unable to load dashboard. Check FastAPI."
        );
    }
}


// ============================================================
// ROUTE TIME FORMATTER
// ============================================================

function routeTime(minutes) {

    minutes =
        Math.round(
            Number(minutes) || 0
        );


    if (minutes < 60) {

        return `${minutes} min`;
    }


    const hours =
        Math.floor(
            minutes / 60
        );


    const remaining =
        minutes % 60;


    return `${hours}h ${remaining}m`;
}


// ============================================================
// LOAD ROUTES
// ============================================================

async function loadRoutes() {

    try {

        const [
            degradableRoute,
            nonDegradableRoute
        ] = await Promise.all([

            apiRequest(
                "/routes/degradable"
            ),

            apiRequest(
                "/routes/non-degradable"
            )

        ]);


        renderRoute(
            degradableRoute,
            "deg"
        );


        renderRoute(
            nonDegradableRoute,
            "non"
        );

    }
    catch (error) {

        console.error(
            "Route loading error:",
            error
        );
    }
}


// ============================================================
// RENDER ROUTE
// ============================================================

function renderRoute(
    data,
    prefix
) {

    if (!data) {
        return;
    }


    const stops =
        Array.isArray(data.stops)
            ? data.stops
            : [];


    // --------------------------------------------------------
    // STOP COUNT
    // --------------------------------------------------------

    const stopsElement =
        $(`${prefix}Stops`);


    if (stopsElement) {

        stopsElement.textContent =
            stops.length;
    }


    // --------------------------------------------------------
    // DISTANCE
    // --------------------------------------------------------

    const kmElement =
        $(`${prefix}Km`);


    if (kmElement) {

        kmElement.textContent =
            `${data.distanceKm ?? 0} km`;
    }


    // --------------------------------------------------------
    // TIME
    // --------------------------------------------------------

    const timeElement =
        $(`${prefix}Time`);


    if (timeElement) {

        timeElement.textContent =
            routeTime(
                data.timeMinutes
            );
    }


    // --------------------------------------------------------
    // ROUTE LIST
    // --------------------------------------------------------

    const routeElement =
        $(`${prefix}Route`);


    if (!routeElement) {
        return;
    }


    if (stops.length === 0) {

        routeElement.innerHTML = `

            <div class="route-empty">
                ✓ No urgent stops
            </div>

        `;

        return;
    }


    routeElement.innerHTML =

        stops.map(
            (bin, index) => {

                const score =
                    getPriorityScore(
                        bin
                    );


                const label =
                    score > 0
                        ? getPriorityLabel(score)
                        : "PRIORITY";


                return `

                    <div class="route-stop">


                        <span class="route-number">
                            ${index + 1}
                        </span>


                        <div class="route-bin-info">

                            <strong>
                                ${bin.id}
                            </strong>

                            <span>
                                ${Math.round(
                                    Number(bin.level) || 0
                                )}% full
                            </span>

                        </div>


                        <span
                            class="
                                route-priority
                                ${getPriorityClass(score)}
                            "
                        >

                            ${
                                score > 0
                                    ? `${score.toFixed(1)} · ${label}`
                                    : label
                            }

                        </span>


                    </div>

                `;

            }
        ).join("");
}


// ============================================================
// COLLECT SELECTED BIN
// ============================================================

async function collectSelectedBin() {

    if (!selectedId) {

        showToast(
            "Please select a bin first."
        );

        return;
    }


    const bin =
        bins.find(
            item =>
                item.id === selectedId
        );


    if (!bin) {

        showToast(
            "Selected bin not found."
        );

        return;
    }


    const level =
        Number(bin.level) || 0;


    if (level === 0) {

        showToast(
            "This bin is already empty."
        );

        return;
    }


    try {

        // ----------------------------------------------------
        // DISABLE BUTTON
        // ----------------------------------------------------

        if ($("collectBtn")) {

            $("collectBtn").disabled =
                true;


            $("collectBtn").textContent =
                "Collecting...";
        }


        // ----------------------------------------------------
        // CALL BACKEND
        // ----------------------------------------------------

        const result =
            await apiRequest(
                `/bins/${encodeURIComponent(selectedId)}/collect`,
                {
                    method: "POST"
                }
            );


        console.log(
            "Collection response:",
            result
        );


        // ----------------------------------------------------
        // UPDATE LOCAL BIN
        // ----------------------------------------------------

        if (result.bin) {

            const index =
                bins.findIndex(
                    item =>
                        item.id ===
                        result.bin.id
                );


            if (index !== -1) {

                bins[index] =
                    result.bin;
            }
        }


        // ----------------------------------------------------
        // SUCCESS
        // ----------------------------------------------------

        showToast(
            `${selectedId} collected successfully — fill level reset to 0%`
        );


        // ----------------------------------------------------
        // RELOAD EVERYTHING
        // ----------------------------------------------------

        await loadDashboard();

    }
    catch (error) {

        console.error(
            "Collection failed:",
            error
        );


        showToast(
            "Collection update failed."
        );


        if ($("collectBtn")) {

            $("collectBtn").disabled =
                false;


            $("collectBtn").textContent =
                "✓ Mark garbage collected";
        }
    }
}


// ============================================================
// COLLECTION BUTTON
// ============================================================

function setupCollectionButton() {

    const button =
        $("collectBtn");


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        collectSelectedBin
    );
}


// ============================================================
// FILTER BUTTONS
// ============================================================

function setupFilters() {

    document
        .querySelectorAll(".filter")
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        document
                            .querySelectorAll(
                                ".filter"
                            )
                            .forEach(
                                item =>
                                    item.classList.remove(
                                        "active"
                                    )
                            );


                        button.classList.add(
                            "active"
                        );


                        activeFilter =
                            button.dataset.filter ||
                            "all";


                        renderBins();

                    }
                );

            }
        );
}


// ============================================================
// REFRESH BUTTON
// ============================================================

function setupRefreshButton() {

    const button =
        $("refreshBtn");


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        loadDashboard
    );
}



// ============================================================
// TRUCK SIMULATION
// ============================================================

let truckSimulationRunning = false;
let truckSimulationVisible = true;

const truckSimulation = {
    truckId: null,
    truckName: "",
    wasteType: "",
    stops: [],
    currentIndex: -1,
    load: 0,
    status: "available",
    position: null
};


function truckDisplayStatus(status) {

    const labels = {
        available: "AVAILABLE",
        en_route: "EN ROUTE",
        collecting: "COLLECTING",
        returning: "RETURNING"
    };

    return labels[status] || String(status || "AVAILABLE").toUpperCase();
}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


function ensureTruckSimulationUI() {

    if ($("truckSimulationPanel")) {
        return;
    }

    const style = document.createElement("style");

    style.id = "truckSimulationStyles";

    style.textContent = `
        #truckSimulationPanel {
            position: fixed;
            inset: 5vh 5vw;
            z-index: 9999;
            padding: 20px;
            border: 1px solid rgba(103,185,149,.28);
            border-radius: 22px;
            background: rgba(6,19,15,.97);
            box-shadow: 0 30px 100px rgba(0,0,0,.62);
            backdrop-filter: blur(18px);
            color: #eef8f3;
            font-family: inherit;
            display: flex;
            flex-direction: column;
        }

        #truckSimulationPanel.hidden {
            display: none;
        }

        .truck-sim-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 15px;
            margin-bottom: 13px;
        }

        .truck-sim-title {
            font-weight: 850;
            font-size: 19px;
        }

        .truck-sim-subtitle {
            margin-top: 4px;
            color: #91aaa0;
            font-size: 11px;
        }

        .truck-sim-close {
            border: 0;
            background: rgba(255,255,255,.07);
            color: #dcebe5;
            width: 34px;
            height: 34px;
            border-radius: 10px;
            cursor: pointer;
            font-size: 18px;
        }

        .truck-sim-status-row {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 9px;
            margin-bottom: 12px;
        }

        .truck-sim-stat {
            padding: 10px 12px;
            border-radius: 12px;
            background: rgba(255,255,255,.05);
            border: 1px solid rgba(255,255,255,.07);
        }

        .truck-sim-stat span {
            display: block;
            color: #91aaa0;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: .08em;
            margin-bottom: 4px;
        }

        .truck-sim-stat strong {
            font-size: 13px;
        }

        .truck-sim-stage {
            flex: 1;
            min-height: 330px;
            overflow: hidden;
            border-radius: 17px;
            background:
                linear-gradient(rgba(255,255,255,.018) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,.018) 1px, transparent 1px),
                #0b1b16;
            background-size: 34px 34px;
            border: 1px solid rgba(255,255,255,.08);
        }

        .truck-sim-stage svg {
            width: 100%;
            height: 100%;
            display: block;
        }

        .sim-road {
            fill: none;
            stroke: #293a35;
            stroke-width: 25;
            stroke-linecap: round;
            stroke-linejoin: round;
        }

        .sim-road-line {
            fill: none;
            stroke: #8b9993;
            stroke-width: 2;
            stroke-dasharray: 11 11;
            opacity: .52;
        }

        .sim-route {
            fill: none;
            stroke: #67b995;
            stroke-width: 5;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-dasharray: 11 8;
            animation: simRouteFlow .7s linear infinite;
        }

        @keyframes simRouteFlow {
            to {
                stroke-dashoffset: -19;
            }
        }

        .sim-bin {
            fill: #13271f;
            stroke: #67b995;
            stroke-width: 3;
        }

        .sim-bin.active {
            stroke: #f0d36a;
            stroke-width: 4;
        }

        .sim-bin.done {
            fill: #67b995;
        }

        .sim-label {
            fill: #d9e9e2;
            font-size: 10px;
            font-weight: 700;
        }

        .sim-depot {
            fill: #e7f1ec;
            stroke: #67b995;
            stroke-width: 3;
        }

        .sim-truck {
            filter: drop-shadow(0 7px 7px rgba(0,0,0,.6));
        }

        .sim-truck-body {
            fill: #67b995;
            stroke: white;
            stroke-width: 1.5;
        }

        .sim-truck-window {
            fill: #10251f;
            stroke: #b7d9cb;
            stroke-width: 1;
        }

        .sim-wheel {
            fill: #080d0c;
            stroke: #566761;
            stroke-width: 1;
        }

        .truck-sim-bottom {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-top: 12px;
            font-size: 11px;
        }

        .truck-sim-progress {
            flex: 1;
            height: 7px;
            border-radius: 99px;
            overflow: hidden;
            background: rgba(255,255,255,.08);
        }

        .truck-sim-progress > div {
            width: 0%;
            height: 100%;
            border-radius: inherit;
            background: #67b995;
            transition: width .3s ease;
        }

        .truck-sim-action {
            margin-top: 11px;
            width: 100%;
            border: 0;
            border-radius: 11px;
            padding: 11px 14px;
            background: #67b995;
            color: #092018;
            font-weight: 800;
            cursor: pointer;
        }

        .show-truck-simulation {
            position: fixed;
            right: 24px;
            bottom: 24px;
            z-index: 10000;
            border: 1px solid rgba(103,185,149,.35);
            border-radius: 12px;
            padding: 12px 17px;
            background: rgba(18,33,27,.97);
            color: #67b995;
            font-weight: 800;
            cursor: pointer;
            box-shadow: 0 15px 45px rgba(0,0,0,.4);
            backdrop-filter: blur(12px);
            transition: .2s ease;
        }

        .show-truck-simulation:hover {
            transform: translateY(-2px);
            background: rgba(32,55,45,.98);
        }

        .show-truck-simulation.hidden {
            display: none;
        }

        @media(max-width:700px) {
            #truckSimulationPanel {
                inset: 10px;
            }

            .truck-sim-status-row {
                grid-template-columns: repeat(2, 1fr);
            }
        }
    `;

    document.head.appendChild(style);

    const panel = document.createElement("section");

    panel.id = "truckSimulationPanel";
    panel.className = "hidden";

    panel.innerHTML = `
        <div class="truck-sim-head">
            <div>
                <div class="truck-sim-title">
                    🚛 Live 2D City Truck Simulation
                </div>

                <div
                    class="truck-sim-subtitle"
                    id="truckSimRouteText"
                >
                    AI optimized road route
                </div>
            </div>

            <button
                class="truck-sim-close"
                id="truckSimClose"
            >
                ×
            </button>
        </div>

        <div class="truck-sim-status-row">

            <div class="truck-sim-stat">
                <span>Truck</span>
                <strong id="truckSimTruck">—</strong>
            </div>

            <div class="truck-sim-stat">
                <span>Status</span>
                <strong id="truckSimStatus">
                    AVAILABLE
                </strong>
            </div>

            <div class="truck-sim-stat">
                <span>Current stop</span>
                <strong id="truckSimStop">
                    Collection Depot
                </strong>
            </div>

            <div class="truck-sim-stat">
                <span>Collected load</span>
                <strong id="truckSimLoad">
                    0%
                </strong>
            </div>

        </div>

        <div class="truck-sim-stage">

            <svg
                id="truckSimSvg"
                viewBox="0 0 800 520"
                preserveAspectRatio="xMidYMid meet"
            >

                <g id="truckSimRoadLayer"></g>
                <g id="truckSimRouteLayer"></g>
                <g id="truckSimStopLayer"></g>

                <g
                    id="truckSimTruck"
                    class="sim-truck"
                >

                    <rect
                        x="-22"
                        y="-12"
                        width="38"
                        height="21"
                        rx="5"
                        class="sim-truck-body"
                    ></rect>

                    <rect
                        x="10"
                        y="-9"
                        width="15"
                        height="18"
                        rx="3"
                        class="sim-truck-body"
                    ></rect>

                    <rect
                        x="13"
                        y="-6"
                        width="9"
                        height="7"
                        rx="1"
                        class="sim-truck-window"
                    ></rect>

                    <circle
                        cx="-12"
                        cy="12"
                        r="6"
                        class="sim-wheel"
                    ></circle>

                    <circle
                        cx="15"
                        cy="12"
                        r="6"
                        class="sim-wheel"
                    ></circle>

                </g>

            </svg>

        </div>

        <div class="truck-sim-bottom">

            <span id="truckSimProgressText">
                0 / 0 stops
            </span>

            <div class="truck-sim-progress">
                <div id="truckSimProgressBar"></div>
            </div>

        </div>

        <button
            class="truck-sim-action"
            id="truckSimStopButton"
        >
            Close simulation
        </button>
    `;

    document.body.appendChild(panel);

    const showButton =
    document.createElement("button");

    showButton.id =
      "showTruckSimulation";

    showButton.className =
       "show-truck-simulation hidden";

    showButton.textContent =
        "🚛 Show Simulation";

    document.body.appendChild(
      showButton
    );

    showButton.addEventListener(
        "click",
        () => {

        truckSimulationVisible = true;

        panel.classList.remove("hidden");

        showButton.classList.add("hidden");

        updateTruckSimulationPanel();
        }
    );

    $("truckSimClose").addEventListener(
    "click",
        () => {

        truckSimulationVisible = false;

        panel.classList.add("hidden");

        const showButton =
            $("showTruckSimulation");

        if (showButton) {
            showButton.classList.remove("hidden");
        }

        showToast(
            truckSimulationRunning
                ? "Simulation minimized. Truck continues working in the backend."
                : "Simulation closed."
        );
        }
    );

    $("truckSimStopButton").addEventListener(
    "click",
        () => {

        truckSimulationVisible = false;

        panel.classList.add("hidden");

        const showButton =
            $("showTruckSimulation");

        if (showButton) {
            showButton.classList.remove("hidden");
        }

        showToast(
            truckSimulationRunning
                ? "Simulation minimized. Truck continues working in the backend."
                : "Simulation closed."
        );
        }
    );



function truckPoint(point) {

    if (!point) {
        return {
            x: 140,
            y: 100
        };
    }

    const x = Number(point.x);
    const rawY = Number(point.y);

    return {
        x: Number.isFinite(x)
            ? Math.max(40, Math.min(760, x))
            : 140,

        y: Number.isFinite(rawY)
            ? Math.max(40, Math.min(480, 520 - rawY))
            : 100
    };
}


function buildRoadPath(from, to) {

    const startPoint = truckPoint(from);
    const endPoint = truckPoint(to);

    /*
       The route is intentionally orthogonal so the truck
       follows a city-road style path rather than teleporting
       or travelling diagonally through buildings.
    */

    const midX =
        Math.round(
            (startPoint.x + endPoint.x) / 2
        );

    return [
        startPoint,

        {
            x: midX,
            y: startPoint.y
        },

        {
            x: midX,
            y: endPoint.y
        },

        endPoint
    ];
}


function buildSimulationRoadNetwork() {

    const layer =
        $("truckSimRoadLayer");

    if (!layer) {
        return;
    }

    layer.innerHTML = "";

    const svgNS =
        "http://www.w3.org/2000/svg";

    const roads = [

        [[70, 100], [730, 100]],
        [[70, 260], [730, 260]],
        [[70, 420], [730, 420]],

        [[140, 50], [140, 470]],
        [[350, 50], [350, 470]],
        [[560, 50], [560, 470]],
        [[690, 50], [690, 470]]

    ];

    roads.forEach(points => {

        const road =
            document.createElementNS(
                svgNS,
                "polyline"
            );

        road.setAttribute(
            "points",
            points
                .map(
                    point =>
                        `${point[0]},${point[1]}`
                )
                .join(" ")
        );

        road.setAttribute(
            "class",
            "sim-road"
        );

        layer.appendChild(road);


        const roadLine =
            document.createElementNS(
                svgNS,
                "polyline"
            );

        roadLine.setAttribute(
            "points",
            points
                .map(
                    point =>
                        `${point[0]},${point[1]}`
                )
                .join(" ")
        );

        roadLine.setAttribute(
            "class",
            "sim-road-line"
        );

        layer.appendChild(
            roadLine
        );
    });


    const title =
        document.createElementNS(
            svgNS,
            "text"
        );

    title.setAttribute(
        "x",
        "35"
    );

    title.setAttribute(
        "y",
        "30"
    );

    title.setAttribute(
        "class",
        "sim-label"
    );

    title.textContent =
        "SMART WASTE COLLECTION NETWORK";

    layer.appendChild(title);
}


function drawTruckSimulationRoute(
    points,
    completedCount = 0,
    activeIndex = -1
) {

    const routeLayer =
        $("truckSimRouteLayer");

    const stopLayer =
        $("truckSimStopLayer");

    if (!routeLayer || !stopLayer) {
        return;
    }

    routeLayer.innerHTML = "";
    stopLayer.innerHTML = "";

    buildSimulationRoadNetwork();

    if (
        !Array.isArray(points) ||
        points.length < 2
    ) {
        return;
    }

    const svgNS =
        "http://www.w3.org/2000/svg";

    /*
       Build the complete road-following route.
    */

    let pathPoints = [];

    for (
        let i = 0;
        i < points.length - 1;
        i++
    ) {

        const segment =
            buildRoadPath(
                points[i],
                points[i + 1]
            );

        if (i > 0) {
            segment.shift();
        }

        pathPoints.push(
            ...segment
        );
    }


    const routeLine =
        document.createElementNS(
            svgNS,
            "polyline"
        );

    routeLine.setAttribute(
        "points",
        pathPoints
            .map(
                point =>
                    `${point.x},${point.y}`
            )
            .join(" ")
    );

    routeLine.setAttribute(
        "class",
        "sim-route"
    );

    routeLayer.appendChild(
        routeLine
    );


    /*
       Draw depot and bin markers.
    */

    points.forEach(
        (point, index) => {

            const position =
                truckPoint(point);

            const marker =
                document.createElementNS(
                    svgNS,
                    "circle"
                );

            marker.setAttribute(
                "cx",
                position.x
            );

            marker.setAttribute(
                "cy",
                position.y
            );

            marker.setAttribute(
                "r",
                index === 0 ||
                index === points.length - 1
                    ? 9
                    : 8
            );


            if (
                index === 0 ||
                index === points.length - 1
            ) {

                marker.setAttribute(
                    "class",
                    "sim-depot"
                );

            }
            else {

                let className =
                    "sim-bin";

                if (
                    index - 1 <
                    completedCount
                ) {
                    className +=
                        " done";
                }

                if (
                    index - 1 ===
                    activeIndex
                ) {
                    className +=
                        " active";
                }

                marker.setAttribute(
                    "class",
                    className
                );

            }

            stopLayer.appendChild(
                marker
            );


            if (
                index > 0 &&
                index < points.length - 1
            ) {

                const label =
                    document.createElementNS(
                        svgNS,
                        "text"
                    );

                label.setAttribute(
                    "x",
                    position.x + 12
                );

                label.setAttribute(
                    "y",
                    position.y - 12
                );

                label.setAttribute(
                    "class",
                    "sim-label"
                );

                const stop =
                    truckSimulation.stops[
                        index - 1
                    ];

                label.textContent =
                    stop?.id ||
                    stop?.bin_id ||
                    `STOP ${index}`;

                stopLayer.appendChild(
                    label
                );
            }

        }
    );
}




function setTruckSimulationStatus(status, stopText = null) {

    truckSimulation.status = status;

    if ($("truckSimStatus")) {
        $("truckSimStatus").textContent =
            truckDisplayStatus(status);
    }

    if ($("truckSimStop") && stopText !== null) {
        $("truckSimStop").textContent = stopText;
    }
}


function updateTruckSimulationPanel() {

    ensureTruckSimulationUI();

    const panel = $("truckSimulationPanel");

    if (!panel) {
        return;
    }

    if (truckSimulationVisible) {
    panel.classList.remove("hidden");
    }

    if ($("truckSimTruck")) {
        $("truckSimTruck").textContent =
            truckSimulation.truckId || "—";
    }

    if ($("truckSimRouteText")) {
        $("truckSimRouteText").textContent =
            `${truckSimulation.wasteType || "Waste"} · AI optimized route`;
    }

    if ($("truckSimLoad")) {
        $("truckSimLoad").textContent =
            `${Number(truckSimulation.load || 0).toFixed(0)}%`;
    }

    const completed = Math.max(
        0,
        Number(truckSimulation.currentIndex || -1) + 1
    );

    const total = truckSimulation.stops.length;

    if ($("truckSimProgressText")) {
        $("truckSimProgressText").textContent =
            `${Math.min(completed, total)} / ${total} stops`;
    }

    if ($("truckSimProgressBar")) {
        const percent =
            total
                ? Math.min(100, (Math.min(completed, total) / total) * 100)
                : 0;

        $("truckSimProgressBar").style.width =
            `${percent}%`;
    }
}


function moveTruckVisual(
    from,
    to,
    duration = 5000
) {

    const truck =
        $("truckSimTruck");

    if (!truck) {
        return Promise.resolve();
    }

    const path =
        buildRoadPath(
            from,
            to
        );

    const startedAt =
        performance.now();

    return new Promise(
        resolve => {

            function frame(now) {

                const elapsed =
                    now - startedAt;

                const progress =
                    Math.min(
                        1,
                        elapsed / duration
                    );

                /*
                   Smooth acceleration/deceleration.
                */

                const eased =
                    progress *
                    progress *
                    (3 - 2 * progress);

                const scaled =
                    eased *
                    (path.length - 1);

                const segment =
                    Math.min(
                        path.length - 2,
                        Math.floor(scaled)
                    );

                const localProgress =
                    scaled - segment;

                const a =
                    path[segment];

                const b =
                    path[segment + 1];

                const x =
                    a.x +
                    (b.x - a.x) *
                    localProgress;

                const y =
                    a.y +
                    (b.y - a.y) *
                    localProgress;

                /*
                   Rotate truck according to road direction.
                */

                const angle =
                    Math.atan2(
                        b.y - a.y,
                        b.x - a.x
                    ) *
                    180 /
                    Math.PI;

                truck.setAttribute(
                    "transform",
                    `translate(${x} ${y}) rotate(${angle})`
                );

                if (progress < 1) {

                    requestAnimationFrame(
                        frame
                    );

                }
                else {

                    resolve();

                }
            }

            requestAnimationFrame(
                frame
            );

        }
    );
}




async function refreshBinsAfterTruckCollection() {

    try {

        const binData =
            await apiRequest("/bins");

        bins =
            Array.isArray(binData)
                ? binData
                : [];

        await loadAIPriorities();

        renderBins();

        if (selectedId && bins.some(bin => bin.id === selectedId)) {
            selectBin(selectedId);
        }

        await loadRoutes();

    }
    catch (error) {

        console.warn(
            "Dashboard refresh after truck collection failed:",
            error
        );
    }
}


async function getBestTruckRoute() {

    const [degradable, nonDegradable] =
        await Promise.all([
            apiRequest("/routes/degradable"),
            apiRequest("/routes/non-degradable")
        ]);

    const candidates = [
        degradable,
        nonDegradable
    ].filter(
        route =>
            route &&
            Array.isArray(route.stops) &&
            route.stops.length > 0
    );

    if (!candidates.length) {
        return null;
    }

    candidates.sort((a, b) => {

        const scoreA =
            getPriorityScore(a.stops[0]);

        const scoreB =
            getPriorityScore(b.stops[0]);

        return scoreB - scoreA;
    });

    return candidates[0];
}


async function runTruckSimulation() {

    if (truckSimulationRunning) {
        return;
    }

    ensureTruckSimulationUI();

    truckSimulationVisible = true;

    const simulationPanel =
        $("truckSimulationPanel");

    const showSimulationButton =
        $("showTruckSimulation");

    if (simulationPanel) {
        simulationPanel.classList.remove("hidden");
    }

    if (showSimulationButton) {
        showSimulationButton.classList.add("hidden");
    }

    truckSimulationRunning = true;

    const button = $("demoBtn");

    if (button) {
        button.disabled = true;
        button.dataset.originalText =
            button.textContent;
        button.textContent =
            "🚛 Simulation running...";
    }

    try {

        showToast(
            "Finding the highest-priority AI collection route..."
        );

        const routeData =
            await getBestTruckRoute();

        if (!routeData) {

            showToast(
                "No urgent collection route is available. Restore a few bins to 60%+ and try again."
            );

            return;
        }

        const stops =
            routeData.stops;

        const points =
            Array.isArray(routeData.points)
                ? routeData.points
                : [];

        truckSimulation.truckId =
            routeData.truckId ||
            (
                routeData.wasteType === "degradable"
                    ? "GRN-01"
                    : "BLU-02"
            );

        truckSimulation.truckName =
            truckSimulation.truckId === "GRN-01"
                ? "Green Truck 01"
                : "Blue Truck 02";

        truckSimulation.wasteType =
            routeData.wasteType || "waste";

        truckSimulation.stops =
            stops.map(stop => ({ ...stop }));

        truckSimulation.currentIndex = -1;
        truckSimulation.load = 0;
        truckSimulation.position =
            routeData.depot || points[0] || null;

        updateTruckSimulationPanel();

        drawTruckSimulationRoute(
            points.length
                ? points
                : [
                    routeData.depot,
                    ...stops,
                    routeData.depot
                ],
            0
        );

        setTruckSimulationStatus(
            "available",
            "Collection Depot"
        );

        updateTruckSimulationPanel();

        // ---------------------------------------------
        // DISPATCH TO BACKEND
        // ---------------------------------------------

        await apiRequest(
            `/trucks/${encodeURIComponent(truckSimulation.truckId)}/dispatch`,
            {
                method: "POST",
                body: JSON.stringify(stops)
            }
        );

        setTruckSimulationStatus(
            "en_route",
            stops[0]?.id || "Next stop"
        );

        showToast(
            `${truckSimulation.truckId} dispatched with ${stops.length} AI-prioritized stops.`
        );

        // ---------------------------------------------
        // MOVE TO EACH STOP
        // ---------------------------------------------

        let previousPoint =
            routeData.depot || points[0];

        for (
            let index = 0;
            index < stops.length;
            index++
        ) {

            const stop =
                stops[index];

            truckSimulation.currentIndex =
                index - 1;

            updateTruckSimulationPanel();

            drawTruckSimulationRoute(
                points.length
                    ? points
                    : [
                        routeData.depot,
                        ...stops,
                        routeData.depot
                    ],
                index
            );

            setTruckSimulationStatus(
                "en_route",
                stop.id
            );

            await moveTruckVisual(
                previousPoint,
                stop,
                1600
            );

            truckSimulation.position =
                stop;

            setTruckSimulationStatus(
                "collecting",
                `${stop.id} · ${Math.round(Number(stop.level) || 0)}%`
            );

            showToast(
                `GRN-01 reached ${stop.id}. Collecting garbage...`
                    .replace(
                        "GRN-01",
                        truckSimulation.truckId
                    )
            );

            await sleep(2200);

            const result =
                await apiRequest(
                    `/trucks/${encodeURIComponent(truckSimulation.truckId)}/complete-stop`,
                    {
                        method: "POST"
                    }
                );

            truckSimulation.load =
                Number(result.load) || truckSimulation.load;

            truckSimulation.currentIndex =
                index;

            updateTruckSimulationPanel();

            drawTruckSimulationRoute(
                points.length
                    ? points
                    : [
                        routeData.depot,
                        ...stops,
                        routeData.depot
                    ],
                index + 1
            );

            await refreshBinsAfterTruckCollection();

            showToast(
                `${stop.id} collected successfully — fill level reset to 0%.`
            );

            await sleep(600);

            previousPoint =
                stop;
        }

        // ---------------------------------------------
        // RETURN TO DEPOT
        // ---------------------------------------------

        setTruckSimulationStatus(
            "returning",
            "Collection Depot"
        );

        await moveTruckVisual(
            previousPoint,
            routeData.depot || points[points.length - 1],
            6000
        );

        await sleep(500);

        await apiRequest(
            `/trucks/${encodeURIComponent(truckSimulation.truckId)}/return`,
            {
                method: "POST"
            }
        );

        truckSimulation.position =
            routeData.depot || points[points.length - 1];

        setTruckSimulationStatus(
            "available",
            "Collection Depot"
        );

        updateTruckSimulationPanel();

        showToast(
            `${truckSimulation.truckId} completed the route and is AVAILABLE.`
        );

    }
    catch (error) {

        console.error(
            "Truck simulation failed:",
            error
        );

        setTruckSimulationStatus(
            "available",
            "Simulation error"
        );

        showToast(
            "Truck simulation failed. Check the FastAPI terminal."
        );

    }
    finally {

        truckSimulationRunning = false;

        const button = $("demoBtn");

        if (button) {
            button.disabled = false;
            button.textContent =
                button.dataset.originalText ||
                "AI Dispatch";
        }
    }
}


// ============================================================
// AI DISPATCH BUTTON
// ============================================================

function setupDemoButton() {

    const button =
        $("demoBtn");

    if (!button) {
        return;
    }

    button.addEventListener(
        "click",
        runTruckSimulation
    );
}




// ============================================================
// AUTOMATIC BIN FILLING + AI AUTO DISPATCH
// ============================================================

let automaticSimulationTimer = null;
let automaticDispatchInProgress = false;

const AUTOMATIC_FILL_INTERVAL = 5000;
const AUTOMATIC_FILL_MULTIPLIER = 300;


async function automaticFillBins() {

    try {

        const updatedBins =
            await apiRequest(
                `/bins/simulate-fill?seconds=5&multiplier=${AUTOMATIC_FILL_MULTIPLIER}`,
                {
                    method: "POST"
                }
            );

        if (!Array.isArray(updatedBins)) {
            return;
        }

        bins = updatedBins;

        await loadAIPriorities();

        renderBins();

        if (
            selectedId &&
            bins.some(
                bin =>
                    bin.id === selectedId
            )
        ) {
            selectBin(selectedId);
        }

        await loadRoutes();

        const fullBin =
            bins.find(
                bin =>
                    Number(bin.level) >= 100 &&
                    Number(bin.rateHr) > 0
            );

        if (
            fullBin &&
            !truckSimulationRunning &&
            !automaticDispatchInProgress
        ) {

            automaticDispatchInProgress = true;

            showToast(
                `${fullBin.id} is 100% full. AI is dispatching a collection truck.`
            );

            try {

                await runTruckSimulation();

            }
            finally {

                automaticDispatchInProgress =
                    false;

            }
        }

    }
    catch (error) {

        console.warn(
            "Automatic waste simulation unavailable:",
            error
        );

    }
}


function startAutomaticWasteSimulation() {

    if (automaticSimulationTimer) {
        return;
    }

    automaticSimulationTimer =
        setInterval(
            automaticFillBins,
            AUTOMATIC_FILL_INTERVAL
        );

    console.log(
        "Automatic waste filling started."
    );
}


function stopAutomaticWasteSimulation() {

    if (!automaticSimulationTimer) {
        return;
    }

    clearInterval(
        automaticSimulationTimer
    );

    automaticSimulationTimer = null;
}


// ============================================================
// LIVE CLOCK
// ============================================================

function updateClock() {

    const clockElement =
        $("clock");


    if (!clockElement) {
        return;
    }


    clockElement.textContent =
        new Date().toLocaleTimeString(
            "en-IN",
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        );
}


setInterval(
    updateClock,
    1000
);


// ============================================================
// START APPLICATION
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "Smart Waste AI dashboard starting..."
        );


        setupCollectionButton();

        setupFilters();

        setupRefreshButton();

        setupDemoButton();

        updateClock();

        loadDashboard()
            .finally(() => {
                startAutomaticWasteSimulation();
            });

    }
);