/**
 * NomadCompass — AI Travel Concierge Client Logic
 * Balanced interaction: presets, style chips, mission HUD,
 * tabbed dossier filtering, PDF export, and local trip history.
 */

let currentThreadId = localStorage.getItem("travel_thread_id") || null;
let latestAnswerMarkdown = "";
let radarInterval = null;
let radarSeconds = 0;

// Curated Wanderlust Inspiration Prompts
const SURPRISE_EXPEDITIONS = [
    "Plan a 7-day culinary and cultural adventure in Tokyo and Kyoto from Delhi for 2 people with boutique stays, bullet train trips, and local food under 2.5 Lakhs INR.",
    "Plan a 6-day tropical retreat to Bali and Ubud from Mumbai with private pool villas, waterfall treks, beach clubs, and wellness spas under 1.8 Lakhs.",
    "Plan a 5-day luxury Dubai getaway from Delhi including Burj Khalifa lounge, desert safari with BBQ, marina yacht cruise, and 5-star hotel under 1.8 Lakhs.",
    "Plan a 7-day scenic Switzerland rail journey covering Zurich, Lucerne, and Interlaken with panoramic mountain trains and cozy alpine stays under 3.5 Lakhs.",
    "Plan a 7-day historic and coastal journey across Italy: Rome, Florence, and the Amalfi Coast with scenic rail travel and vineyard visits.",
    "Plan a 6-day island-hopping vacation across Phuket and Krabi from Bangalore with beachfront resorts and night markets under 1.3 Lakhs."
];

let surpriseIndex = 0;

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
    updateWordCount();
    updateHistoryBadge();

    if (currentThreadId) {
        const threadBadge = document.getElementById("threadInfo");
        if (threadBadge) {
            threadBadge.textContent = `Thread: ${currentThreadId.slice(0, 14)}...`;
        }
    }
});

/**
 * Destination Preset Loader
 */
function setPreset(destName, text) {
    const input = document.getElementById("userInput");
    input.value = text;
    updateWordCount();
    input.focus();
    input.scrollIntoView({ behavior: "smooth", block: "center" });
    showToast(`Loaded ${destName} trip template ✈️`);
}

/**
 * Direct Prompt Setter
 */
function setPrompt(text) {
    const input = document.getElementById("userInput");
    input.value = text;
    updateWordCount();
    input.focus();
}

/**
 * Append Travel Style Modifier
 */
function appendStyle(styleModifier) {
    const input = document.getElementById("userInput");
    let current = input.value.trim();

    if (!current) {
        input.value = `Plan a trip with ${styleModifier}.`;
    } else {
        if (!current.toLowerCase().includes(styleModifier.toLowerCase())) {
            input.value = `${current} Focus on: ${styleModifier}.`;
        }
    }

    updateWordCount();
    input.focus();
    showToast(`Added travel preference ✨`);
}

/**
 * Surprise Me Inspiration Generator
 */
function surpriseMe() {
    const prompt = SURPRISE_EXPEDITIONS[surpriseIndex % SURPRISE_EXPEDITIONS.length];
    surpriseIndex++;
    setPrompt(prompt);
    showToast("Inspired with a new journey 🎲");
}

/**
 * Clear Input Field
 */
function clearInput() {
    const input = document.getElementById("userInput");
    input.value = "";
    updateWordCount();
    input.focus();
}

/**
 * Word Counter
 */
function handleInputTyping() {
    updateWordCount();
}

function updateWordCount() {
    const input = document.getElementById("userInput");
    const countElem = document.getElementById("charCount");
    if (!input || !countElem) return;

    const words = input.value.trim().split(/\s+/).filter(Boolean).length;
    countElem.textContent = `${words} ${words === 1 ? 'word' : 'words'}`;
}

/**
 * Toast Notifications
 */
let toastTimeout = null;
function showToast(message, icon = "✨") {
    const toast = document.getElementById("toastNotification");
    const toastIcon = document.getElementById("toastIcon");
    const toastText = document.getElementById("toastText");

    if (!toast) return;
    if (toastTimeout) clearTimeout(toastTimeout);

    toastIcon.textContent = icon;
    toastText.textContent = message;
    toast.classList.remove("hidden");

    toastTimeout = setTimeout(() => {
        toast.classList.add("hidden");
    }, 2400);
}

/**
 * Error Banner
 */
function showError(message) {
    const errorBox = document.getElementById("errorBox");
    const errorMessage = document.getElementById("errorMessage");

    if (errorMessage) errorMessage.textContent = message;
    if (errorBox) {
        errorBox.classList.remove("hidden");
        errorBox.scrollIntoView({ behavior: "smooth", block: "center" });
    }
}

function hideError() {
    const errorBox = document.getElementById("errorBox");
    if (errorBox) errorBox.classList.add("hidden");
}

function scrollToTop() {
    const plannerCard = document.getElementById("plannerCard");
    if (plannerCard) {
        plannerCard.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    document.getElementById("userInput").focus();
}

/**
 * Live Multi-Agent Mission HUD Tracker
 */
function startRadarAnimation() {
    const hudSection = document.getElementById("agentRadarSection");
    const resultSection = document.getElementById("resultSection");
    const timerElem = document.getElementById("radarTimer");
    const fill = document.getElementById("radarProgressFill");
    const heading = document.getElementById("radarStatusHeading");
    const sub = document.getElementById("radarStatusSub");

    if (resultSection) resultSection.classList.add("hidden");
    if (hudSection) {
        hudSection.classList.remove("hidden");
        hudSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    radarSeconds = 0;
    if (timerElem) timerElem.textContent = "00:00";
    if (fill) fill.style.width = "25%";

    const stepIds = ["stepFlight", "stepHotel", "stepItinerary", "stepDossier"];
    stepIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.remove("active", "completed");
            const st = el.querySelector(".hud-step-status");
            if (st) st.textContent = "Standby";
        }
    });

    const flightStep = document.getElementById("stepFlight");
    if (flightStep) {
        flightStep.classList.add("active");
        const st = flightStep.querySelector(".hud-step-status");
        if (st) st.textContent = "Scanning...";
    }

    if (heading) heading.textContent = "Scanning Flight Routes...";
    if (sub) sub.textContent = "Querying live AviationStack flight schedules & carriers";

    if (radarInterval) clearInterval(radarInterval);

    radarInterval = setInterval(() => {
        radarSeconds++;
        const mins = String(Math.floor(radarSeconds / 60)).padStart(2, '0');
        const secs = String(radarSeconds % 60).padStart(2, '0');
        if (timerElem) timerElem.textContent = `${mins}:${secs}`;

        if (radarSeconds === 3) {
            advanceHudStep("stepFlight", "stepHotel", "Curating Stays & Lodging...", "Searching verified boutique hotels and guest ratings with Tavily", "50%", "Searching...");
        } else if (radarSeconds === 8) {
            advanceHudStep("stepHotel", "stepItinerary", "Architecting Daily Route...", "Crafting optimized sightseeing, cultural hotspots, and transit tips", "75%", "Planning...");
        } else if (radarSeconds === 15) {
            advanceHudStep("stepItinerary", "stepDossier", "Finalizing Travel Dossier...", "Polishing budget breakdown, currency notes, and practical guidance", "95%", "Polishing...");
        }
    }, 1000);
}

function advanceHudStep(prevId, nextId, headingText, subText, fillPercent, statusText) {
    const prev = document.getElementById(prevId);
    const next = document.getElementById(nextId);
    const heading = document.getElementById("radarStatusHeading");
    const sub = document.getElementById("radarStatusSub");
    const fill = document.getElementById("radarProgressFill");

    if (prev) {
        prev.classList.remove("active");
        prev.classList.add("completed");
        const st = prev.querySelector(".hud-step-status");
        if (st) st.textContent = "✓ Done";
    }

    if (next) {
        next.classList.add("active");
        const st = next.querySelector(".hud-step-status");
        if (st) st.textContent = statusText;
    }

    if (fill && fillPercent) fill.style.width = fillPercent;
    if (heading) heading.textContent = headingText;
    if (sub) sub.textContent = subText;
}

function stopRadarAnimation() {
    if (radarInterval) {
        clearInterval(radarInterval);
        radarInterval = null;
    }
    const hudSection = document.getElementById("agentRadarSection");
    if (hudSection) hudSection.classList.add("hidden");
}

function setLoading(isLoading) {
    const sendBtn = document.getElementById("sendBtn");
    const btnText = document.getElementById("btnText");
    const btnIcon = document.getElementById("btnIcon");
    const btnLoader = document.getElementById("btnLoader");

    if (!sendBtn) return;
    sendBtn.disabled = isLoading;

    if (isLoading) {
        btnText.textContent = "Agents Working...";
        if (btnIcon) btnIcon.classList.add("hidden");
        if (btnLoader) btnLoader.classList.remove("hidden");
        startRadarAnimation();
    } else {
        btnText.textContent = "Craft My Itinerary";
        if (btnIcon) btnIcon.classList.remove("hidden");
        if (btnLoader) btnLoader.classList.add("hidden");
        stopRadarAnimation();
    }
}

/**
 * Enhanced Markdown Parser
 */
function renderEnhancedMarkdown(markdownText) {
    if (typeof marked === "undefined") {
        return markdownText;
    }

    marked.setOptions({
        breaks: true,
        gfm: true
    });

    let html = marked.parse(markdownText);

    // Decorate H2 headings with relevant travel icons
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;

    const headings = tempDiv.querySelectorAll("h1, h2, h3");
    headings.forEach((h) => {
        const text = h.textContent.toLowerCase();
        let icon = "";

        if (text.includes("trip summary") || text.includes("overview")) {
            icon = "🗺️ ";
        } else if (text.includes("flight")) {
            icon = "🛫 ";
        } else if (text.includes("hotel") || text.includes("stay") || text.includes("accommodation")) {
            icon = "🏨 ";
        } else if (text.includes("day") || text.includes("itinerary")) {
            icon = "🗓️ ";
        } else if (text.includes("budget") || text.includes("cost") || text.includes("expense")) {
            icon = "💰 ";
        } else if (text.includes("recommendation") || text.includes("tip")) {
            icon = "✨ ";
        }

        if (icon && !h.textContent.startsWith(icon)) {
            h.innerHTML = `<span>${icon}</span> ${h.innerHTML}`;
        }
    });

    return tempDiv.innerHTML;
}

/**
 * Show Itinerary Result
 */
function showResult(answer, threadId, userQuery = "") {
    latestAnswerMarkdown = answer;

    const resultSection = document.getElementById("resultSection");
    const resultBox = document.getElementById("resultBox");
    const threadInfo = document.getElementById("threadInfo");
    const dossierTitle = document.getElementById("dossierTitle");
    const dossierTimestamp = document.getElementById("dossierTimestamp");

    if (userQuery) {
        const words = userQuery.split(" ").slice(0, 6).join(" ");
        dossierTitle.textContent = `${words}...`;
    } else {
        dossierTitle.textContent = "Your Curated Travel Dossier";
    }

    resultBox.innerHTML = renderEnhancedMarkdown(answer);

    if (threadInfo) {
        threadInfo.textContent = `Thread: ${threadId.slice(0, 14)}...`;
    }

    if (dossierTimestamp) {
        const now = new Date();
        dossierTimestamp.textContent = `Crafted ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    resetTabs();

    resultSection.classList.remove("hidden");
    resultSection.scrollIntoView({ behavior: "smooth", block: "start" });

    saveToHistory(userQuery || "Custom Journey", answer, threadId);
}

/**
 * Filter Sections (Complete, Flights, Stays, Daily Schedule, Budget)
 */
function filterDossierView(section) {
    const tabs = document.querySelectorAll(".dossier-tabs .tab-btn");
    tabs.forEach(t => t.classList.remove("active"));

    const activeTab = Array.from(tabs).find(t => t.getAttribute("onclick")?.includes(section));
    if (activeTab) activeTab.classList.add("active");

    const resultBox = document.getElementById("resultBox");
    if (!resultBox) return;

    if (section === "all") {
        resultBox.innerHTML = renderEnhancedMarkdown(latestAnswerMarkdown);
        return;
    }

    const sectionKeywords = {
        flights: ["flight information", "flights", "flight details"],
        hotels: ["hotel suggestions", "hotels", "accommodations", "where to stay"],
        itinerary: ["day-by-day", "itinerary", "daily itinerary"],
        budget: ["estimated budget", "budget", "expenses", "final recommendations"]
    };

    const keywords = sectionKeywords[section] || [];
    const lines = latestAnswerMarkdown.split("\n");
    let capturing = false;
    let filteredLines = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lower = line.toLowerCase();

        if (line.startsWith("#") || line.startsWith("##") || line.startsWith("###")) {
            const matches = keywords.some(k => lower.includes(k));
            if (matches) {
                capturing = true;
            } else if (capturing && (line.startsWith("# ") || line.startsWith("## "))) {
                capturing = false;
            }
        }

        if (capturing) {
            filteredLines.push(line);
        }
    }

    if (filteredLines.length > 0) {
        resultBox.innerHTML = renderEnhancedMarkdown(filteredLines.join("\n"));
    } else {
        resultBox.innerHTML = renderEnhancedMarkdown(latestAnswerMarkdown);
    }
}

function resetTabs() {
    const tabs = document.querySelectorAll(".dossier-tabs .tab-btn");
    tabs.forEach((t, i) => {
        if (i === 0) t.classList.add("active");
        else t.classList.remove("active");
    });
}

/**
 * Primary API Call
 */
async function sendMessage() {
    hideError();

    const input = document.getElementById("userInput");
    const message = input.value.trim();

    if (!message) {
        showError("Please describe your destination, style, or travel requirements first.");
        input.focus();
        return;
    }

    setLoading(true);

    try {
        const response = await fetch("/api/travel", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: message,
                thread_id: currentThreadId
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || "Unable to retrieve travel recommendations. Please try again.");
        }

        currentThreadId = data.thread_id;
        localStorage.setItem("travel_thread_id", currentThreadId);

        showResult(data.answer, data.thread_id, message);
        showToast("Your travel dossier is ready! 🌍", "🎉");

    } catch (error) {
        showError(error.message || "An unexpected error occurred during journey synthesis.");
    } finally {
        setLoading(false);
    }
}

/**
 * Copy to Clipboard
 */
function copyResult() {
    if (!latestAnswerMarkdown) {
        showToast("No itinerary to copy yet.", "⚠️");
        return;
    }

    navigator.clipboard.writeText(latestAnswerMarkdown)
        .then(() => {
            showToast("Complete dossier copied to clipboard! 📋");
            const copyBtn = document.getElementById("copyBtn");
            if (copyBtn) {
                const oldHtml = copyBtn.innerHTML;
                copyBtn.innerHTML = `<span>✓ Copied!</span>`;
                setTimeout(() => { copyBtn.innerHTML = oldHtml; }, 1600);
            }
        })
        .catch(() => {
            showError("Could not copy dossier to clipboard.");
        });
}

/**
 * Print Itinerary
 */
function printDossier() {
    if (!latestAnswerMarkdown) {
        showToast("No travel plan available to print.", "⚠️");
        return;
    }
    window.print();
}

/**
 * Download High-Resolution A4 PDF
 */
function downloadPDF() {
    const pdfContent = document.getElementById("pdfContent");
    if (!latestAnswerMarkdown || !pdfContent) {
        showError("No travel plan available to download.");
        return;
    }

    const downloadBtn = document.getElementById("downloadPdfBtn");
    const oldHtml = downloadBtn.innerHTML;

    downloadBtn.innerHTML = `<span>Preparing...</span>`;
    downloadBtn.disabled = true;

    showToast("Generating crisp travel dossier PDF...", "⏳");

    const printHeader = pdfContent.querySelector(".pdf-print-header");
    const printFooter = pdfContent.querySelector(".pdf-print-footer");
    if (printHeader) printHeader.style.display = "block";
    if (printFooter) printFooter.style.display = "block";

    const options = {
        margin: [0.4, 0.4, 0.4, 0.4],
        filename: `NomadCompass-Itinerary-${new Date().toISOString().slice(0, 10)}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false },
        jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] }
    };

    html2pdf()
        .set(options)
        .from(pdfContent)
        .save()
        .then(() => {
            downloadBtn.innerHTML = oldHtml;
            downloadBtn.disabled = false;
            showToast("PDF downloaded successfully! 📄", "✓");
            if (printHeader) printHeader.style.display = "";
            if (printFooter) printFooter.style.display = "";
        })
        .catch((err) => {
            downloadBtn.innerHTML = oldHtml;
            downloadBtn.disabled = false;
            if (printHeader) printHeader.style.display = "";
            if (printFooter) printFooter.style.display = "";
            showError("Could not generate PDF: " + err.message);
        });
}

/**
 * Local History
 */
function getSavedHistory() {
    try {
        const stored = localStorage.getItem("nomad_expeditions");
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

function saveToHistory(query, answer, threadId) {
    const history = getSavedHistory();
    const newEntry = {
        id: threadId || Date.now().toString(),
        query: query,
        answer: answer,
        timestamp: new Date().toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    };

    const updated = [newEntry, ...history.filter(h => h.query !== query)].slice(0, 10);
    localStorage.setItem("nomad_expeditions", JSON.stringify(updated));
    updateHistoryBadge();
}

function updateHistoryBadge() {
    const badge = document.getElementById("historyCountBadge");
    if (badge) {
        badge.textContent = getSavedHistory().length;
    }
}

function toggleHistoryDrawer() {
    const drawer = document.getElementById("historyDrawer");
    const overlay = document.getElementById("drawerOverlay");

    if (!drawer || !overlay) return;

    const isOpen = drawer.classList.contains("open");
    if (isOpen) {
        drawer.classList.remove("open");
        overlay.classList.remove("open");
    } else {
        renderHistoryList();
        drawer.classList.add("open");
        overlay.classList.add("open");
    }
}

function renderHistoryList() {
    const list = document.getElementById("historyList");
    if (!list) return;

    const history = getSavedHistory();

    if (history.length === 0) {
        list.innerHTML = `
            <div class="panel-empty">
                <p>No saved trips yet. When you generate an itinerary, it will appear here for 1-click reloads!</p>
            </div>
        `;
        return;
    }

    list.innerHTML = history.map((item, index) => `
        <div class="history-card" onclick="loadHistoricalTrip(${index})">
            <div class="history-card-header">
                <span>Expedition #${history.length - index}</span>
                <span class="history-card-time">${item.timestamp}</span>
            </div>
            <p class="history-card-query">${item.query}</p>
        </div>
    `).join("");
}

function loadHistoricalTrip(index) {
    const history = getSavedHistory();
    const item = history[index];
    if (!item) return;

    document.getElementById("userInput").value = item.query;
    updateWordCount();
    showResult(item.answer, item.id, item.query);

    toggleHistoryDrawer();
    showToast("Loaded historical expedition! 🗂️");
}

function clearExpeditionHistory() {
    localStorage.removeItem("nomad_expeditions");
    updateHistoryBadge();
    renderHistoryList();
    showToast("Expedition history cleared");
}

/**
 * Keyboard Shortcut (Ctrl + Enter / Cmd + Enter)
 */
document.addEventListener("keydown", function(event) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        sendMessage();
    }
});