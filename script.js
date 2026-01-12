/**
 * Global Haircut Index - Logic
 */

const FIREBASE_CONFIG = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

const isMockMode = FIREBASE_CONFIG.apiKey === "YOUR_API_KEY";

let db;
if (!isMockMode) {
    firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.firestore();
}

const COL_NAME = 'haircuts';

// Initial Data State
let haircuts = [];
let searchTerm = '';
let sortBy = 'newest';
let useUSD = false;
let map;
let geoJsonLayer;
let geoData;

// DOM Elements
const gridEl = document.getElementById('haircut-grid');
const addModal = document.getElementById('add-modal');
const openModalBtn = document.getElementById('open-add-modal');
const closeModalBtn = document.getElementById('close-modal');
const cancelBtn = document.getElementById('cancel-btn');
const form = document.getElementById('haircut-form');

// Filter Elements
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');
const currencyToggle = document.getElementById('currency-toggle');

// Stats Elements
const totalCutsEl = document.getElementById('total-cuts');
const totalCountriesEl = document.getElementById('total-countries');
const avgPriceEl = document.getElementById('avg-price');

// --- Initialization ---
async function init() {
    if (isMockMode) {
        console.warn("Firebase credentials not found. Running in MOCK MODE (data will save to LocalStorage).");
        setupMockListener();
    } else {
        setupRealtimeListener();
    }
    updateStats();
    setupEventListeners();
    await initMap();
}

async function initMap() {
    map = L.map('map', {
        center: [20, 0],
        zoom: 2,
        minZoom: 2,
        maxZoom: 5,
        zoomControl: true,
        attributionControl: false
    });

    // Dark themed tiles (optional, but looks better with the theme)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    try {
        const response = await fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson');
        geoData = await response.json();
        updateMap();
    } catch (e) {
        console.error("Failed to load map data:", e);
    }
}

function setupRealtimeListener() {
    db.collection(COL_NAME).orderBy('timestamp', 'desc').onSnapshot(snapshot => {
        haircuts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        renderFeed();
        updateStats();
        updateMap();
    }, error => {
        console.error("Firestore Error:", error);
        if (error.code === 'permission-denied') {
            console.warn("Permission denied. Switching to MOCK MODE.");
            setupMockListener();
        }
    });
}

function setupMockListener() {
    // Load from LocalStorage
    const saved = localStorage.getItem('mock_haircuts');
    if (saved) {
        haircuts = JSON.parse(saved);
    }
    renderFeed();
    updateStats();
    updateMap();
}

function saveMockData() {
    localStorage.setItem('mock_haircuts', JSON.stringify(haircuts));
    renderFeed();
    updateStats();
    updateMap();
}

function setupEventListeners() {
    openModalBtn.addEventListener('click', () => {
        // Set today's date as default
        document.getElementById('date').valueAsDate = new Date();
        addModal.classList.remove('hidden');
    });

    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    // Close on click outside
    addModal.addEventListener('click', (e) => {
        if (e.target === addModal) closeModal();
    });

    form.addEventListener('submit', handleAddHaircut);

    // Search and Filters
    searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value.toLowerCase();
        renderFeed();
    });

    sortSelect.addEventListener('change', (e) => {
        sortBy = e.target.value;
        renderFeed();
    });

    currencyToggle.addEventListener('click', () => {
        useUSD = !useUSD;
        currencyToggle.classList.toggle('active', useUSD);
        renderFeed();
        updateStats();
    });
}

function closeModal() {
    addModal.classList.add('hidden');
    form.reset();
}

// --- Data Logic ---
// loadData and saveData removed in favor of real-time listener and Firestore API

async function handleAddHaircut(e) {
    e.preventDefault();

    const formData = new FormData(form);
    const saveBtn = form.querySelector('button[type="submit"]');
    saveBtn.disabled = true;
    saveBtn.innerText = 'Saving...';

    const newEntry = {
        country: formData.get('country'),
        city: formData.get('city'),
        price: parseFloat(formData.get('price')),
        currency: formData.get('currency').toUpperCase(),
        rating: parseInt(formData.get('rating') || '0'),
        comment: formData.get('comment'),
        date: formData.get('date'),
        timestamp: Date.now()
    };

    try {
        if (isMockMode) {
            newEntry.id = Date.now().toString();
            haircuts.unshift(newEntry);
            saveMockData();
            closeModal();
        } else {
            await db.collection(COL_NAME).add(newEntry);
            closeModal();
        }
    } catch (error) {
        console.error("Error adding document: ", error);
        alert("Firestore Error: " + error.message + "\n\nPlease ensure you have initialized Firebase with valid credentials.");
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerText = 'Save Entry';
    }
}

// --- Map Logic ---
function updateMap() {
    if (!map || !geoData) return;

    if (geoJsonLayer) map.removeLayer(geoJsonLayer);

    // Aggregate data per country
    const countryStats = {};
    haircuts.forEach(cut => {
        const country = cut.country.toLowerCase().trim();
        const priceUSD = parseFloat(estimateUSD(cut.price, cut.currency));

        if (!countryStats[country]) {
            countryStats[country] = { total: 0, count: 0 };
        }
        countryStats[country].total += priceUSD;
        countryStats[country].count += 1;
    });

    // Calculate averages
    Object.keys(countryStats).forEach(c => {
        countryStats[c].avg = countryStats[c].total / countryStats[c].count;
    });

    geoJsonLayer = L.geoJson(geoData, {
        style: (feature) => {
            const name = (feature.properties.name || feature.properties.ADMIN || "").toLowerCase();
            const stats = matchCountryStats(name, countryStats);
            return {
                fillColor: stats ? getColor(stats.avg) : '#475569',
                weight: 1,
                opacity: 1,
                color: 'rgba(255,255,255,0.1)',
                fillOpacity: 0.7
            };
        },
        onEachFeature: (feature, layer) => {
            const name = feature.properties.name || feature.properties.ADMIN || "Unknown";
            const stats = matchCountryStats(name.toLowerCase(), countryStats);

            let popupContent = `<div class="map-tooltip"><h4>${name}</h4>`;
            if (stats) {
                popupContent += `
                    <p>Avg Price: <strong>$${stats.avg.toFixed(2)}</strong></p>
                    <p>Entries: <strong>${stats.count}</strong></p>
                `;
            } else {
                popupContent += `<p>No data yet</p>`;
            }
            popupContent += `</div>`;

            layer.bindTooltip(popupContent, { sticky: true, className: 'map-tooltip' });

            layer.on({
                mouseover: (e) => { e.target.setStyle({ fillOpacity: 0.9, weight: 2 }); },
                mouseout: (e) => { geoJsonLayer.resetStyle(e.target); }
            });
        }
    }).addTo(map);
}

function matchCountryStats(name, stats) {
    if (stats[name]) return stats[name];

    // Robust matching for common variations
    const aliases = {
        "united states": ["united states of america", "usa", "us"],
        "united kingdom": ["uk", "britain"],
        "vietnam": ["viet nam"],
        "uae": ["united arab emirates"]
    };

    for (const [canonical, variants] of Object.entries(aliases)) {
        if (name === canonical || variants.includes(name)) {
            return stats[canonical] || stats[variants[0]];
        }
    }

    // Reverse check: if name is "United States of America", and we have "united states" in stats
    for (const [key, val] of Object.entries(stats)) {
        if (name.includes(key) || key.includes(name)) return val;
    }

    return null;
}

function getColor(avgPrice) {
    // Simple gradient: Green (0) to Red (100+)
    // Normalize $0 - $100 range
    const normalized = Math.min(avgPrice / 100, 1);

    // RGB interpolation (Roughly Emerald-500 #10b981 to Red-500 #ef4444)
    const r = Math.floor(16 + (239 - 16) * normalized);
    const g = Math.floor(185 + (68 - 185) * normalized);
    const b = Math.floor(129 + (68 - 129) * normalized);

    return `rgb(${r},${g},${b})`;
}
// --- Rendering ---
function renderFeed() {
    gridEl.innerHTML = '';

    // Filter and Sort
    let filtered = haircuts.filter(cut =>
        cut.city.toLowerCase().includes(searchTerm) ||
        cut.country.toLowerCase().includes(searchTerm) ||
        (cut.comment && cut.comment.toLowerCase().includes(searchTerm))
    );

    filtered.sort((a, b) => {
        if (sortBy === 'price-low') return a.price - b.price;
        if (sortBy === 'price-high') return b.price - a.price;
        if (sortBy === 'rating') return b.rating - a.rating;
        return b.timestamp - a.timestamp; // newest
    });

    if (filtered.length === 0) {
        gridEl.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-magnifying-glass" style="font-size: 3rem; margin-bottom: 1rem; color: var(--text-secondary);"></i>
                <h3>${haircuts.length === 0 ? 'No haircuts tracked yet' : 'No results found'}</h3>
                <p>${haircuts.length === 0 ? 'Add your first cut to start comparing!' : 'Try adjusting your search or filters.'}</p>
            </div>
        `;
        return;
    }

    filtered.forEach(cut => {
        const card = document.createElement('div');
        card.className = 'haircut-card';

        const displayPrice = useUSD ? estimateUSD(cut.price, cut.currency) : cut.price;
        const displayCurrency = useUSD ? 'USD' : cut.currency;

        card.innerHTML = `
            <div class="card-header">
                <div class="card-location">
                    <h3>${cut.city}</h3>
                    <p><i class="fa-solid fa-location-dot"></i> ${cut.country}</p>
                </div>
                <div class="card-price">
                    <span class="price-main">${displayPrice} ${displayCurrency}</span>
                    ${useUSD && cut.currency !== 'USD' ? `<div class="price-sub">Original: ${cut.price} ${cut.currency}</div>` : ''}
                </div>
            </div>
            <div class="rating-stars">
                ${renderStars(cut.rating)}
            </div>
            ${cut.comment ? `<p class="card-comment">"${cut.comment}"</p>` : ''}
            <div class="card-footer">
                <span>${formatDate(cut.date)}</span>
                <button class="btn-icon" style="font-size: 0.9rem;" onclick="deleteCut('${cut.id}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
        gridEl.appendChild(card);
    });
}

function renderStars(count) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= count) html += '<i class="fa-solid fa-star"></i>';
        else html += '<i class="fa-regular fa-star" style="color: var(--glass-border);"></i>';
    }
    return html;
}

function updateStats() {
    totalCutsEl.innerText = haircuts.length;

    // Unique countries
    const countries = new Set(haircuts.map(h => h.country.toLowerCase().trim()));
    totalCountriesEl.innerText = countries.size;

    // Avg Price in USD
    if (haircuts.length === 0) {
        avgPriceEl.innerText = '$0';
        return;
    }

    const totalUSD = haircuts.reduce((acc, cut) => acc + parseFloat(estimateUSD(cut.price, cut.currency)), 0);
    const avg = totalUSD / haircuts.length;
    avgPriceEl.innerText = `$${avg.toFixed(2)}`;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Global scope for onclick handlers
window.deleteCut = async function (id) {
    if (confirm('Delete this entry?')) {
        try {
            if (isMockMode || !db) {
                haircuts = haircuts.filter(c => c.id !== id);
                saveMockData();
            } else {
                await db.collection(COL_NAME).doc(id).delete();
            }
        } catch (error) {
            console.error("Error deleting document: ", error);
        }
    }
};

// Placeholder for rough estimate (could be expanded)
function estimateUSD(amount, currency) {
    // Expanded dummy map (V2: Fetch real rates)
    const rates = {
        'EUR': 1.1, 'GBP': 1.3, 'THB': 0.03, 'JPY': 0.007, 'BRL': 0.17,
        'AUD': 0.65, 'ZAR': 0.05, 'VND': 0.00004, 'MXN': 0.05, 'CAD': 0.72,
        'TRY': 0.03, 'INR': 0.012, 'COP': 0.00025, 'ARS': 0.001, 'AED': 0.27,
        'CHF': 1.12, 'MAD': 0.1, 'KRW': 0.00075, 'EGP': 0.02, 'CZK': 0.04,
        'IDR': 0.00006, 'SGD': 0.74, 'SEK': 0.09, 'NOK': 0.09, 'DKK': 0.14,
        'PLN': 0.25, 'HUF': 0.0028, 'ILS': 0.27, 'CNY': 0.14, 'MYR': 0.21,
        'PHP': 0.018, 'NZD': 0.59, 'CLP': 0.001, 'PEN': 0.26, 'NGN': 0.001,
        'KES': 0.007, 'JOD': 1.41
    };
    const rate = rates[currency] || 1; // Default 1:1 if unknown
    return (amount * rate).toFixed(2);
}

// --- Seeding ---
window.seedData = async function () {
    if (!confirm("Are you sure you want to add 50 dummy reports?")) return;

    console.log("Seeding data...");
    let count = 0;
    for (const cut of DUMMY_HAIRCUTS) {
        const entry = {
            ...cut,
            timestamp: Date.now() - (Math.random() * 1000000000),
            id: Math.random().toString(36).substr(2, 9)
        };

        if (isMockMode || !db) {
            haircuts.push(entry);
            count++;
        } else {
            try {
                await db.collection(COL_NAME).add(entry);
                count++;
            } catch (e) {
                console.error("Failed to seed to Firestore:", e);
            }
        }
        console.log(`Added ${count}/50: ${cut.city}, ${cut.country}`);
    }

    if (isMockMode) saveMockData();
    alert(`Successfully seeded ${count} reports!`);
};

// Run
init();
