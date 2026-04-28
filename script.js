/*
  Glúnta Research Church Map
  Version: v0.5.2-clean-github-online-replacement

  Changes in this version:
  - Uses "Denomination or affiliation" wording.
  - Replaces the old single denomination dropdown with a checkbox list.
  - Allows multiple denominations/affiliations to be selected together.
  - No selected boxes means all churches are shown.
  - County selection updates the county panel without hiding other map markers.
*/

// --------------------------------------------------
// MAP SETUP
// --------------------------------------------------

const map = L.map("map", {
  zoomControl: false
}).setView([53.4, -8.0], 7);

L.control.zoom({
  position: "bottomright"
}).addTo(map);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

// --------------------------------------------------
// GLOBAL DATA
// --------------------------------------------------

let allChurches = [];
let churchMarkers = [];
let countyLayer = null;
let selectedCountyName = null;
let countyData = {};
let selectedCountyLayer = null;

// --------------------------------------------------
// DENOMINATION / AFFILIATION COLOURS
// --------------------------------------------------

const denominationColours = {
  "ABCI": "#0066ff",
  "Baptist": "#0066ff",
  "Methodist": "#00a65a",
  "Pentecostal": "#ffd700",
  "Independent Evangelical": "#008000",
  "RCCG": "#c1121f",
  "Plumbline": "#00c7c7",
  "PCI": "#1f77b4",
  "Presbyterian": "#1f77b4",
  "Elim / Pentecostal": "#ff8c00",
  "Calvary Chapel": "#7b2cbf",
  "Brethren": "#8b4513",
  "Church of Ireland": "#2a9d8f",
  "Christian Churches Ireland": "#e76f51",
  "Redeemed Christian Church of God": "#c1121f",
  "Apostolic": "#6a4c93",
  "Vineyard": "#bc5090",
  "Non-denominational": "#4d908e",
  "Independent": "#008000",
  "Evangelical": "#008000"
};

const fallbackColours = [
  "#0066ff",
  "#00a65a",
  "#ffd700",
  "#008000",
  "#c1121f",
  "#00c7c7",
  "#1f77b4",
  "#ff8c00",
  "#7b2cbf",
  "#8b4513",
  "#2a9d8f",
  "#e76f51",
  "#6a4c93",
  "#bc5090",
  "#4d908e",
  "#f94144",
  "#577590",
  "#43aa8b",
  "#f3722c",
  "#90be6d",
  "#277da1",
  "#9b5de5",
  "#f15bb5",
  "#fee440",
  "#00bbf9",
  "#00f5d4",
  "#7209b7",
  "#3a0ca3",
  "#4361ee",
  "#4cc9f0",
  "#606c38",
  "#bc6c25"
];

let generatedDenominationColours = {};

// --------------------------------------------------
// HELPER FUNCTIONS
// --------------------------------------------------

function clean(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function normaliseCountyName(value) {
  return clean(value)
    .replace(/^County\s+/i, "")
    .toUpperCase();
}

function formatNumber(value) {
  const number = Number(String(value).replace(/,/g, ""));
  if (Number.isNaN(number)) return value;
  return number.toLocaleString("en-IE");
}

function getChurchName(church) {
  return clean(
    church["Church Name"] ||
    church["Name"] ||
    church["church name"] ||
    church["name"]
  );
}

function getStreetAddress(church) {
  return clean(
    church["Street Address"] ||
    church["Address"] ||
    church["street address"] ||
    church["address"]
  );
}

function getCity(church) {
  return clean(
    church["City"] ||
    church["Town"] ||
    church["city"] ||
    church["town"]
  );
}

function getCounty(church) {
  return clean(
    church["County"] ||
    church["county"]
  );
}

function getEircode(church) {
  return clean(
    church["EirCode"] ||
    church["Eircode"] ||
    church["Postal / EirCode"] ||
    church["EIRCODE"] ||
    church["eircode"]
  );
}

function getWebsite(church) {
  return clean(
    church["Website"] ||
    church["Website (if available)"] ||
    church["Website (if applicable)"] ||
    church["website"]
  );
}

function getDenomination(church) {
  return clean(
    church["Denomination or affiliation"] ||
    church["Denomination or Affiliation"] ||
    church["Affiliation"] ||
    church["Denomination"] ||
    church["denomination"] ||
    church["affiliation"]
  );
}

function getLatitude(church) {
  return Number(
    church["Latitude"] ||
    church["latitude"] ||
    church["Lat"] ||
    church["lat"]
  );
}

function getLongitude(church) {
  return Number(
    church["Longitude"] ||
    church["longitude"] ||
    church["Lng"] ||
    church["lng"] ||
    church["Long"] ||
    church["long"]
  );
}

function getDenominationColour(denomination) {
  const denom = clean(denomination);

  if (!denom) return "#333333";

  if (denominationColours[denom]) {
    return denominationColours[denom];
  }

  if (!generatedDenominationColours[denom]) {
    const existingCount = Object.keys(generatedDenominationColours).length;
    generatedDenominationColours[denom] =
      fallbackColours[existingCount % fallbackColours.length];
  }

  return generatedDenominationColours[denom];
}

function createDotHtml(colour) {
  return `<span class="denomination-dot" style="background:${colour};"></span>`;
}

function escapeHtml(value) {
  return clean(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getCountyFeatureName(feature) {
  const props = feature.properties || {};

  return clean(
    props.COUNTY ||
    props.County ||
    props.county ||
    props.NAME ||
    props.Name ||
    props.name ||
    props.ENGLISH ||
    props.English ||
    props.COUNTYNAME ||
    props.CountyName
  );
}

// --------------------------------------------------
// MULTI AFFILIATION FILTER
// --------------------------------------------------

function getSelectedAffiliations() {
  const checkedBoxes = document.querySelectorAll(
    "#affiliationFilterBox input[type='checkbox']:checked"
  );

  return Array.from(checkedBoxes).map((box) => box.value);
}

function clearSelectedAffiliations() {
  const boxes = document.querySelectorAll(
    "#affiliationFilterBox input[type='checkbox']"
  );

  boxes.forEach((box) => {
    box.checked = false;
  });
}

function populateAffiliationFilter() {
  const filterBox = document.getElementById("affiliationFilterBox");

  const affiliations = [...new Set(
    allChurches
      .map(getDenomination)
      .filter(Boolean)
  )].sort();

  filterBox.innerHTML = "";

  affiliations.forEach((affiliation) => {
    const colour = getDenominationColour(affiliation);

    const label = document.createElement("label");
    label.className = "affiliation-option";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = affiliation;

    checkbox.addEventListener("change", function () {
      updateVisibleChurches();
    });

    const dot = document.createElement("span");
    dot.className = "affiliation-dot";
    dot.style.background = colour;

    const text = document.createElement("span");
    text.textContent = affiliation;

    label.appendChild(checkbox);
    label.appendChild(dot);
    label.appendChild(text);

    filterBox.appendChild(label);
  });

  if (affiliations.length === 0) {
    filterBox.textContent = "No affiliations found.";
  }
}

// --------------------------------------------------
// CHURCH DETAIL PANEL
// --------------------------------------------------

function updateChurchDetailPanel(church) {
  const panel = document.getElementById("church-detail-content");

  const name = getChurchName(church);
  const street = getStreetAddress(church);
  const city = getCity(church);
  const county = getCounty(church);
  const eircode = getEircode(church);
  const denomination = getDenomination(church);
  const website = getWebsite(church);
  const latitude = getLatitude(church);
  const longitude = getLongitude(church);
  const colour = getDenominationColour(denomination);

  let html = "";

  html += `<h3>${escapeHtml(name || "Unnamed church")}</h3>`;

  if (denomination) {
    html += `
      <div class="detail-row">
        <span class="detail-label">Denomination or affiliation</span>
        ${createDotHtml(colour)}${escapeHtml(denomination)}
      </div>
    `;
  }

  if (street || city || county || eircode) {
    html += `
      <div class="detail-row">
        <span class="detail-label">Address</span>
        ${street ? `${escapeHtml(street)}<br>` : ""}
        ${city ? `${escapeHtml(city)}<br>` : ""}
        ${county ? `${escapeHtml(county)}<br>` : ""}
        ${eircode ? `${escapeHtml(eircode)}` : ""}
      </div>
    `;
  }

  if (website) {
    const safeWebsite = website.startsWith("http")
      ? website
      : `https://${website}`;

    html += `
      <div class="detail-row">
        <span class="detail-label">Website</span>
        <a href="${escapeHtml(safeWebsite)}" target="_blank" rel="noopener">
          ${escapeHtml(website)}
        </a>
      </div>
    `;
  }

  if (!Number.isNaN(latitude) && !Number.isNaN(longitude)) {
    html += `
      <div class="detail-row">
        <span class="detail-label">Coordinates</span>
        ${latitude.toFixed(6)}, ${longitude.toFixed(6)}
      </div>
    `;
  }

  panel.className = "";
  panel.innerHTML = html;
}

// --------------------------------------------------
// POPUPS
// --------------------------------------------------

function buildPopupContent(church) {
  const name = getChurchName(church);
  const street = getStreetAddress(church);
  const city = getCity(church);
  const county = getCounty(church);
  const eircode = getEircode(church);
  const denomination = getDenomination(church);
  const colour = getDenominationColour(denomination);

  return `
    <strong>${escapeHtml(name)}</strong><br>
    ${street ? `${escapeHtml(street)}<br>` : ""}
    ${city || county ? `${escapeHtml(city)}${city && county ? ", " : ""}${escapeHtml(county)}<br>` : ""}
    ${eircode ? `${escapeHtml(eircode)}<br>` : ""}
    ${
      denomination
        ? `<div class="popup-denomination">${createDotHtml(colour)}${escapeHtml(denomination)}</div>`
        : ""
    }
  `;
}

// --------------------------------------------------
// MARKER CREATION
// --------------------------------------------------

function createChurchMarker(church) {
  const lat = getLatitude(church);
  const lng = getLongitude(church);
  const denomination = getDenomination(church);
  const colour = getDenominationColour(denomination);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return null;
  }

  const marker = L.circleMarker([lat, lng], {
    radius: 6,
    fillColor: colour,
    color: "#ffffff",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.95
  });

  marker.bindPopup(buildPopupContent(church));

  marker.on("click", function () {
    updateChurchDetailPanel(church);
  });

  marker.churchData = church;

  return marker;
}

// --------------------------------------------------
// FILTERING
// --------------------------------------------------

function churchMatchesFilters(church) {
  const searchInput = document.getElementById("searchInput");

  const searchTerm = clean(searchInput.value).toLowerCase();
  const selectedAffiliations = getSelectedAffiliations();

  const name = getChurchName(church).toLowerCase();
  const street = getStreetAddress(church).toLowerCase();
  const city = getCity(church).toLowerCase();
  const county = getCounty(church).toLowerCase();
  const denomination = getDenomination(church);

  const matchesSearch =
    !searchTerm ||
    name.includes(searchTerm) ||
    street.includes(searchTerm) ||
    city.includes(searchTerm) ||
    county.includes(searchTerm) ||
    denomination.toLowerCase().includes(searchTerm);

  const matchesAffiliation =
    selectedAffiliations.length === 0 ||
    selectedAffiliations.includes(denomination);

  return matchesSearch && matchesAffiliation;
}

function updateVisibleChurches() {
  churchMarkers.forEach((marker) => {
    map.removeLayer(marker);
  });

  let visibleCount = 0;

  churchMarkers.forEach((marker) => {
    if (churchMatchesFilters(marker.churchData)) {
      marker.addTo(map);
      visibleCount++;
    }
  });

  document.getElementById("church-count").textContent =
    `${visibleCount} of ${allChurches.length} churches shown`;

  if (selectedCountyName) {
    updateCountyPanel(selectedCountyName);
  }
}

// --------------------------------------------------
// COUNTY DATA
// --------------------------------------------------

function loadCountyData() {
  Papa.parse("county-data.csv", {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function (results) {
      results.data.forEach((row) => {
        const countyName = normaliseCountyName(
          row.County ||
          row.county ||
          row.COUNTY
        );

        if (countyName) {
          countyData[countyName] = row;
        }
      });
    },
    error: function (error) {
      console.error("Error loading county-data.csv", error);
    }
  });
}

// --------------------------------------------------
// COUNTY PANEL
// --------------------------------------------------

function updateCountyPanel(countyName) {
  const title = document.getElementById("county-title");
  const summary = document.getElementById("county-summary");
  const list = document.getElementById("county-church-list");

  const normalisedCounty = normaliseCountyName(countyName);

  const churchesInCounty = allChurches.filter((church) => {
    return normaliseCountyName(getCounty(church)) === normalisedCounty;
  });

  const data = countyData[normalisedCounty] || {};

  const populationValue =
    data.Population ||
    data.population ||
    data.POPULATION ||
    "";

  const populationNumber = Number(String(populationValue).replace(/,/g, ""));
  const churchCount = churchesInCounty.length;

  let peoplePerChurch = "Not available";

  if (!Number.isNaN(populationNumber) && populationNumber > 0 && churchCount > 0) {
    peoplePerChurch =
      `1 church for every ${Math.round(populationNumber / churchCount).toLocaleString("en-IE")} people`;
  }

  title.textContent = `County ${countyName.toUpperCase()}`;

  summary.innerHTML = `
    <strong>Population:</strong> ${populationValue ? formatNumber(populationValue) : "Not available"}<br>
    <strong>Churches listed:</strong> ${churchCount}<br>
    <strong>People per church:</strong> ${peoplePerChurch}
  `;

  list.innerHTML = "";

  churchesInCounty
    .sort((a, b) => getChurchName(a).localeCompare(getChurchName(b)))
    .forEach((church) => {
      const li = document.createElement("li");

      const denomination = getDenomination(church);
      const colour = getDenominationColour(denomination);

      li.innerHTML = `
        ${escapeHtml(getChurchName(church))}
        ${getCity(church) ? `, ${escapeHtml(getCity(church))}` : ""}
        ${denomination ? ` ${createDotHtml(colour)}<em>(${escapeHtml(denomination)})</em>` : ""}
      `;

      li.style.cursor = "pointer";

      li.addEventListener("click", function () {
        const marker = churchMarkers.find((m) => m.churchData === church);

        if (marker) {
          map.setView(marker.getLatLng(), 13);
          marker.openPopup();
          updateChurchDetailPanel(church);
        }
      });

      list.appendChild(li);
    });
}

function clearCountyPanel() {
  selectedCountyName = null;

  document.getElementById("county-title").textContent = "County Profile";
  document.getElementById("county-summary").textContent =
    "Click a county to view population and church data.";
  document.getElementById("county-church-list").innerHTML = "";

  if (selectedCountyLayer) {
    countyLayer.resetStyle(selectedCountyLayer);
    selectedCountyLayer = null;
  }

  updateVisibleChurches();
}

// --------------------------------------------------
// COUNTY LAYER
// --------------------------------------------------

function countyStyle() {
  return {
    color: "#222222",
    weight: 2,
    opacity: 0.9,
    fillColor: "#ffffff",
    fillOpacity: 0.08
  };
}

function selectedCountyStyle() {
  return {
    color: "#111111",
    weight: 4,
    opacity: 1,
    fillColor: "#f5d76e",
    fillOpacity: 0.18
  };
}

function loadCountyBoundaries() {
  fetch("counties.geojson")
    .then((response) => response.json())
    .then((geojson) => {
      countyLayer = L.geoJSON(geojson, {
        style: countyStyle,
        onEachFeature: function (feature, layer) {
          const countyName = getCountyFeatureName(feature);

          layer.on("click", function () {
            selectedCountyName = countyName;

            if (selectedCountyLayer) {
              countyLayer.resetStyle(selectedCountyLayer);
            }

            selectedCountyLayer = layer;
            layer.setStyle(selectedCountyStyle());

            updateCountyPanel(countyName);
            updateVisibleChurches();

            if (layer.getBounds) {
              map.fitBounds(layer.getBounds(), {
                padding: [40, 40],
                maxZoom: 10
              });
            }
          });
        }
      }).addTo(map);
    })
    .catch((error) => {
      console.error("Error loading counties.geojson", error);
    });
}

// --------------------------------------------------
// CHURCH CSV LOADING
// --------------------------------------------------

function loadChurches() {
  Papa.parse("churches.csv", {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function (results) {
      allChurches = results.data.filter((church) => {
        return !Number.isNaN(getLatitude(church)) &&
               !Number.isNaN(getLongitude(church));
      });

      churchMarkers = allChurches
        .map(createChurchMarker)
        .filter(Boolean);

      populateAffiliationFilter();
      updateVisibleChurches();
    },
    error: function (error) {
      console.error("Error loading churches.csv", error);
      document.getElementById("church-count").textContent =
        "Error loading churches.";
    }
  });
}

// --------------------------------------------------
// BUTTONS AND INPUTS
// --------------------------------------------------

document.getElementById("searchInput").addEventListener("input", function () {
  updateVisibleChurches();
});

document.getElementById("resetMapButton").addEventListener("click", function () {
  document.getElementById("searchInput").value = "";

  clearSelectedAffiliations();
  clearCountyPanel();

  map.setView([53.4, -8.0], 7);

  document.getElementById("church-detail-content").className = "detail-empty";
  document.getElementById("church-detail-content").innerHTML =
    "Click a church dot on the map to view its details here.";
});

document.getElementById("clearCountyButton").addEventListener("click", function () {
  clearCountyPanel();
});

// --------------------------------------------------
// INITIAL LOAD
// --------------------------------------------------

loadCountyData();
loadCountyBoundaries();
loadChurches();
