/*
  Ireland Church Map
  Version: v0.4.6-denomination-colour-fix
  Notes:
  - Based on v0.4.5-denomination-dropdown-colours.
  - Rolls back the fragile custom denomination dropdown.
  - Restores the normal HTML select dropdown for reliability.
  - Adds a colour preview dot beside the denomination dropdown.
  - Church marker colours are fixed by denomination.
  - Colour palette has been adjusted to make denominations as visually distinct as possible.
  - County polygons are clickable.
  - Left panel shows county profile.
  - Clicking a county fits the map to the full county boundary.
  - Zoom CSS safety fix remains in index.html.
  - No church-detail side panel yet.
  - Expected files:
    - churches.csv
    - county-data.csv
    - counties.geojson
*/

// Create the map and centre it on Ireland
const map = L.map("map", {
  zoomControl: false
}).setView([53.4, -8.0], 7);

// Add zoom control to bottom right
L.control.zoom({
  position: "bottomright"
}).addTo(map);

// Add the OpenStreetMap background layer
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

// Layers
const countyLayer = L.layerGroup().addTo(map);
const churchLayer = L.layerGroup().addTo(map);

/*
  Fixed denomination colours.

  These match the denominations currently found in churches.csv.
  I have tried to keep adjacent and similar traditions visually distinct,
  though 34 denominations will always involve a few colours that feel related.
*/
const denominationColours = {
  "ABCI": "#0057ff",
  "Assemblies of God": "#ff8c00",
  "Baptist": "#d90429",
  "Brethren": "#7b2cbf",
  "Calvary Chapel": "#3a0ca3",
  "Chinese Gospel Church": "#00a896",
  "Christian Assembly": "#00b4d8",
  "Christian Churches Ireland": "#0077b6",
  "Christian Congregation in Ireland": "#70e000",
  "Christian Fellowship (Telugu)": "#38b000",
  "Church of Christ": "#9c6644",
  "Church of Ireland": "#6c757d",
  "Church of the Nazarene": "#ff006e",
  "Congregational": "#bc6c25",
  "Elim / Pentecostal": "#fb5607",
  "Elim Pentecostal": "#ffbe0b",
  "Four12": "#2ec4b6",
  "ICM": "#343a40",
  "Independent Baptist": "#9d0208",
  "Independent Evangelical": "#008000",
  "Indian Pentecostal Church of God": "#f77f00",
  "Ireland Christian Revival Mission": "#006400",
  "Methodist": "#00c853",
  "New Apostolic": "#4361ee",
  "PCI": "#003566",
  "Pentecostal": "#ffd60a",
  "Pentecostal (Romanian)": "#f15bb5",
  "Pentecostal (Tamil)": "#fee440",
  "Plumbline": "#00f5d4",
  "RCCG": "#c1121f",
  "Reformed Baptist": "#540b0e",
  "Reformed Presbyterian Church of Ireland": "#001d3d",
  "The Redeemed Evangelical Mission (TREM)": "#9b2226",
  "Vineyard": "#8338ec",
  "Unknown": "#111827"
};

// Fallback colours for future denominations not yet listed above
const fallbackColours = [
  "#0057ff",
  "#d90429",
  "#00c853",
  "#ff8c00",
  "#7b2cbf",
  "#00a896",
  "#ff006e",
  "#003566",
  "#bc6c25",
  "#4361ee",
  "#fb5607",
  "#008000",
  "#8338ec",
  "#00b4d8",
  "#9d0208",
  "#ffd60a",
  "#343a40",
  "#f15bb5",
  "#38b000",
  "#9c6644"
];

// Store data once loaded
let allChurches = [];
let countyData = {};
let selectedCounty = null;
let selectedCountyLayer = null;

// Page controls
const searchBox = document.getElementById("search-box");
const denominationFilter = document.getElementById("denomination-filter");
const denominationColourPreview = document.getElementById("denomination-colour-preview");
const resultsCount = document.getElementById("results-count");
const resetButton = document.getElementById("reset-button");
const clearCountyButton = document.getElementById("clear-county-button");
const countyPanel = document.getElementById("county-panel");

// Load both CSV files first, then load county boundaries
loadData();

function loadData() {
  Papa.parse("churches.csv", {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function(churchResults) {
      allChurches = cleanChurchData(churchResults.data);

      Papa.parse("county-data.csv", {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(countyResults) {
          countyData = cleanCountyData(countyResults.data);

          populateDenominationFilter(allChurches);
          updateDenominationColourPreview();
          renderChurches(allChurches);
          updateResultsCount(allChurches.length, allChurches.length);

          loadCountyBoundaries();
        }
      });
    },
    error: function(error) {
      console.error("Could not load churches.csv:", error);
      alert("Could not load churches.csv. Check that the file is in the same folder as index.html.");
    }
  });
}

// Clean the church CSV rows and remove anything without valid coordinates
function cleanChurchData(rows) {
  return rows
    .map(row => {
      return {
        name: row["Church Name"]?.trim() || "",
        street: row["Street Address"]?.trim() || "",
        city: row["City"]?.trim() || "",
        county: normaliseCountyName(row["County"]?.trim() || ""),
        eircode: row["EirCode"]?.trim() || row["Postal / EirCode"]?.trim() || "",
        denomination: row["Denomination"]?.trim() || "Unknown",
        lat: parseFloat(row["Latitude"]),
        lng: parseFloat(row["Longitude"])
      };
    })
    .filter(church => {
      return church.name && Number.isFinite(church.lat) && Number.isFinite(church.lng);
    });
}

// Clean the county CSV into an easy lookup object
function cleanCountyData(rows) {
  const lookup = {};

  rows.forEach(row => {
    const countyName = normaliseCountyName(row["County"] || "");
    const population = parseNumber(row["Population"]);

    if (countyName) {
      lookup[countyName] = {
        county: countyName,
        population: population
      };
    }
  });

  return lookup;
}

// Load county boundary GeoJSON
function loadCountyBoundaries() {
  fetch("counties.geojson")
    .then(response => response.json())
    .then(data => {
      const counties = L.geoJSON(data, {
        style: countyStyle,
        onEachFeature: onEachCounty
      });

      counties.addTo(countyLayer);
    })
    .catch(error => {
      console.error("Could not load counties.geojson:", error);
      alert("Could not load counties.geojson. Check that the file is in the same folder as index.html.");
    });
}

// County polygon styling
function countyStyle(feature) {
  return {
    color: "#333333",
    weight: 1.5,
    fillColor: "#ffffff",
    fillOpacity: 0.08
  };
}

// Style for selected county
function selectedCountyStyle() {
  return {
    color: "#111111",
    weight: 3,
    fillColor: "#cccccc",
    fillOpacity: 0.28
  };
}

// What happens for each county polygon
function onEachCounty(feature, layer) {
  const countyName = getCountyName(feature);
  const normalisedCountyName = normaliseCountyName(countyName);

  layer.on({
    mouseover: function(e) {
      if (selectedCountyLayer !== e.target) {
        e.target.setStyle({
          weight: 3,
          fillOpacity: 0.18
        });
      }
    },
    mouseout: function(e) {
      if (selectedCountyLayer !== e.target) {
        e.target.setStyle(countyStyle(feature));
      }
    },
    click: function(e) {
      selectCounty(countyName, normalisedCountyName, layer);
    }
  });
}

// Select a county and update the panel
function selectCounty(countyName, normalisedCountyName, layer) {
  selectedCounty = normalisedCountyName;

  if (selectedCountyLayer) {
    selectedCountyLayer.setStyle(countyStyle(selectedCountyLayer.feature));
  }

  selectedCountyLayer = layer;
  selectedCountyLayer.setStyle(selectedCountyStyle());

  const churchesInCounty = allChurches.filter(church => {
    return church.county === normalisedCountyName;
  });

  const countyStats = countyData[normalisedCountyName] || null;

  updateCountyPanel(countyName, churchesInCounty, countyStats);
  renderChurches(getCurrentlyFilteredChurches());
  updateResultsCount(getCurrentlyFilteredChurches().length, allChurches.length);

  map.fitBounds(layer.getBounds(), {
    paddingTopLeft: [380, 40],
    paddingBottomRight: [320, 40],
    maxZoom: 10
  });
}

// Update county profile panel
function updateCountyPanel(countyName, churches, countyStats) {
  const churchCount = churches.length;
  const population = countyStats?.population || null;

  let peoplePerChurchText = "Not available";

  if (population && churchCount > 0) {
    const peoplePerChurch = Math.round(population / churchCount);
    peoplePerChurchText = `1 church for every ${formatNumber(peoplePerChurch)} people`;
  }

  if (population && churchCount === 0) {
    peoplePerChurchText = "No listed churches in this county";
  }

  const churchList = churches
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(church => {
      const place = church.city ? `, ${escapeHtml(church.city)}` : "";
      const denominationColour = getDenominationColour(church.denomination);
      const denomination = church.denomination
        ? ` <span class="colour-dot" style="background:${escapeHtml(denominationColour)};"></span> <em>(${escapeHtml(church.denomination)})</em>`
        : "";

      return `<li>${escapeHtml(church.name)}${place}${denomination}</li>`;
    })
    .join("");

  countyPanel.innerHTML = `
    <h2>County ${escapeHtml(countyName)}</h2>

    <div class="stat-box">
      <p><strong>Population:</strong> ${population ? formatNumber(population) : "Not available"}</p>
      <p><strong>Churches listed:</strong> ${churchCount}</p>
      <p><strong>People per church:</strong> ${peoplePerChurchText}</p>
    </div>

    <h3>Churches in this county</h3>

    <ol class="church-list">
      ${churchList || "<li>No churches currently listed for this county.</li>"}
    </ol>
  `;
}

// Reset county panel to default message
function resetCountyPanel() {
  countyPanel.innerHTML = `
    <h2>County Profile</h2>
    <p class="county-help">
      Click a county on the map to see population, churches listed, people per church, and the churches in that county.
    </p>
  `;
}

// Try to find the county name field in your GeoJSON
function getCountyName(feature) {
  const props = feature.properties || {};

  return (
    props.COUNTY ||
    props.County ||
    props.county ||
    props.COUNTYNAME ||
    props.COUNTY_NAME ||
    props.ENGLISH_NAME ||
    props.CONTAE ||
    props.ENGLISH ||
    props.English ||
    props.NAME ||
    props.Name ||
    props.name ||
    "Unknown"
  );
}

// Put denomination options into the normal dropdown
function populateDenominationFilter(churches) {
  denominationFilter.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "All denominations";
  denominationFilter.appendChild(allOption);

  const denominations = [...new Set(
    churches
      .map(church => church.denomination)
      .filter(Boolean)
  )].sort();

  denominations.forEach(denomination => {
    const option = document.createElement("option");
    option.value = denomination;
    option.textContent = `● ${denomination}`;
    option.style.color = getDenominationColour(denomination);
    denominationFilter.appendChild(option);
  });
}

// Render church dots onto the map
function renderChurches(churches) {
  churchLayer.clearLayers();

  churches.forEach(church => {
    const denominationColour = getDenominationColour(church.denomination);

    const marker = L.circleMarker([church.lat, church.lng], {
      radius: 6,
      color: denominationColour,
      weight: 1,
      fillColor: denominationColour,
      fillOpacity: 0.88
    });

    marker.bindPopup(`
      <div class="popup-title">${escapeHtml(church.name)}</div>
      <div class="popup-detail">
        ${church.street ? escapeHtml(church.street) + "<br>" : ""}
        ${church.city ? escapeHtml(church.city) + ", " : ""}
        ${church.county ? escapeHtml(displayCountyName(church.county)) + "<br>" : ""}
        ${church.eircode ? escapeHtml(church.eircode) + "<br>" : ""}
        <div class="popup-denomination-row">
          <span class="colour-dot" style="background:${escapeHtml(denominationColour)};"></span>
          <em>${escapeHtml(church.denomination)}</em>
        </div>
      </div>
    `);

    marker.addTo(churchLayer);
  });
}

// Get currently filtered churches
function getCurrentlyFilteredChurches() {
  const searchTerm = searchBox.value.toLowerCase().trim();
  const selectedDenomination = denominationFilter.value;

  return allChurches.filter(church => {
    const matchesCounty =
      !selectedCounty || church.county === selectedCounty;

    const matchesSearch =
      church.name.toLowerCase().includes(searchTerm) ||
      church.city.toLowerCase().includes(searchTerm) ||
      church.county.toLowerCase().includes(searchTerm) ||
      church.denomination.toLowerCase().includes(searchTerm);

    const matchesDenomination =
      selectedDenomination === "all" ||
      church.denomination === selectedDenomination;

    return matchesCounty && matchesSearch && matchesDenomination;
  });
}

// Apply search and denomination filters
function applyFilters() {
  updateDenominationColourPreview();

  const filteredChurches = getCurrentlyFilteredChurches();

  renderChurches(filteredChurches);
  updateResultsCount(filteredChurches.length, allChurches.length);

  if (filteredChurches.length > 0) {
    const bounds = L.latLngBounds(
      filteredChurches.map(church => [church.lat, church.lng])
    );

    map.fitBounds(bounds, {
      padding: [40, 40],
      maxZoom: 11
    });
  }
}

// Update the denomination preview dot beside the dropdown
function updateDenominationColourPreview() {
  const selectedDenomination = denominationFilter.value;

  if (selectedDenomination === "all") {
    denominationColourPreview.style.background = "#111827";
    denominationColourPreview.title = "All denominations";
    return;
  }

  const colour = getDenominationColour(selectedDenomination);
  denominationColourPreview.style.background = colour;
  denominationColourPreview.title = selectedDenomination;
}

// Get the fixed colour for a denomination
function getDenominationColour(denomination) {
  if (denominationColours[denomination]) {
    return denominationColours[denomination];
  }

  return fallbackColours[getStringHashIndex(denomination, fallbackColours.length)];
}

// Create a stable fallback colour index for future denomination names
function getStringHashIndex(value, max) {
  const text = String(value || "Unknown");
  let hash = 0;

  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }

  return Math.abs(hash) % max;
}

// Update the little count in the panel
function updateResultsCount(visible, total) {
  resultsCount.textContent = `${visible} of ${total} churches shown`;
}

// Reset everything
function resetMap() {
  selectedCounty = null;

  if (selectedCountyLayer) {
    selectedCountyLayer.setStyle(countyStyle(selectedCountyLayer.feature));
    selectedCountyLayer = null;
  }

  searchBox.value = "";
  denominationFilter.value = "all";
  updateDenominationColourPreview();
  resetCountyPanel();
  renderChurches(allChurches);
  updateResultsCount(allChurches.length, allChurches.length);
  map.setView([53.4, -8.0], 7);
}

// Clear only the county selection, but keep search/filter settings
function clearCountySelection() {
  selectedCounty = null;

  if (selectedCountyLayer) {
    selectedCountyLayer.setStyle(countyStyle(selectedCountyLayer.feature));
    selectedCountyLayer = null;
  }

  resetCountyPanel();
  applyFilters();
}

// Normalise county names so CSV and GeoJSON match better
function normaliseCountyName(value) {
  return String(value)
    .toLowerCase()
    .replace("county ", "")
    .replace("co. ", "")
    .replace("co ", "")
    .trim();
}

// Display county name nicely in popups
function displayCountyName(value) {
  if (!value) return "";

  return value
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Convert values like "1,234" into numbers
function parseNumber(value) {
  if (!value) return null;

  const cleaned = String(value).replace(/,/g, "").trim();
  const number = Number(cleaned);

  return Number.isFinite(number) ? number : null;
}

// Format numbers with commas
function formatNumber(value) {
  return Number(value).toLocaleString("en-IE");
}

// Prevent broken HTML if a church name contains unusual characters
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Listen for user interaction
searchBox.addEventListener("input", applyFilters);
denominationFilter.addEventListener("change", applyFilters);
resetButton.addEventListener("click", resetMap);
clearCountyButton.addEventListener("click", clearCountySelection);