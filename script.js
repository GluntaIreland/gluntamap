/*
  Glúnta Research Church Map
  Version: v0.6.3-lea-name-and-spatial-count-fix

  Changes in this version:
  - Improves LEA name detection from many possible GeoJSON property fields.
  - Counts churches inside the clicked Leaflet boundary layer rather than relying on an LEA column.
  - Keeps County and LEA boundary switching.
  - Keeps multi-select "Denomination or affiliation" filter.
  - Keeps church detail panel.
  - Forces fresh loading of CSV and GeoJSON files.
*/

// --------------------------------------------------
// CACHE VERSION
// --------------------------------------------------

const CACHE_VERSION = "0.6.3";

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

let currentBoundaryType = "county";
let currentBoundaryLayer = null;
let selectedBoundaryName = null;
let selectedBoundaryLeafletLayer = null;

let countyData = {};
let leaData = {};

const boundaryConfigs = {
  county: {
    labelSingular: "County",
    labelPlural: "Counties",
    geojsonFile: "counties.geojson"
  },
  lea: {
    labelSingular: "LEA",
    labelPlural: "LEAs",
    geojsonFile: "lea-boundaries.geojson"
  }
};

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
// BASIC HELPERS
// --------------------------------------------------

function withCacheBust(filePath) {
  return `${filePath}?v=${CACHE_VERSION}`;
}

function clean(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function normaliseName(value) {
  return clean(value)
    .replace(/^County\s+/i, "")
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function formatNumber(value) {
  const number = Number(String(value).replace(/,/g, ""));
  if (Number.isNaN(number)) return value;
  return number.toLocaleString("en-IE");
}

function escapeHtml(value) {
  return clean(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// --------------------------------------------------
// CHURCH FIELD HELPERS
// --------------------------------------------------

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

function getLea(church) {
  return clean(
    church["LEA"] ||
    church["Lea"] ||
    church["lea"] ||
    church["Local Electoral Area"] ||
    church["local electoral area"]
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

// --------------------------------------------------
// DENOMINATION / AFFILIATION HELPERS
// --------------------------------------------------

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

// --------------------------------------------------
// BOUNDARY NAME DETECTION
// --------------------------------------------------

function getFirstUsefulProperty(props) {
  const ignoredKeyParts = [
    "OBJECTID",
    "FID",
    "GUID",
    "GLOBALID",
    "GEOGID",
    "CENTROID",
    "SHAPE",
    "AREA",
    "LENGTH",
    "PERIMETER"
  ];

  const keys = Object.keys(props || {});

  for (const key of keys) {
    const upperKey = key.toUpperCase();
    const value = clean(props[key]);

    if (!value) continue;
    if (/^\d+$/.test(value)) continue;
    if (/^\d+\.\d+$/.test(value)) continue;

    const ignored = ignoredKeyParts.some((part) => upperKey.includes(part));
    if (ignored) continue;

    return value;
  }

  return "";
}

function getBoundaryFeatureName(feature, boundaryType) {
  const props = feature.properties || {};

  if (boundaryType === "lea") {
    const possibleLeaName = clean(
      props.LEA ||
      props.Lea ||
      props.lea ||
      props.LEA_NAME ||
      props.LEAName ||
      props.LEA_NAME_EN ||
      props.LEA_ENGLISH ||
      props.LEA_EN ||
      props.CSO_LEA ||
      props.CSO_LEA_NAME ||
      props.CSO_LEA_2022 ||
      props.LEA2022 ||
      props.LEA_2022 ||
      props["LEA 2022"] ||
      props["LEA Name"] ||
      props["LEA_NAME"] ||
      props["Local Electoral Area"] ||
      props["Local Electoral Area Name"] ||
      props.ENGLISH ||
      props.English ||
      props.ENGLISH_NAME ||
      props.English_Name ||
      props.NAME ||
      props.Name ||
      props.name ||
      props.AREA_NAME ||
      props.AreaName ||
      props.AREANAME
    );

    if (possibleLeaName) {
      return possibleLeaName;
    }

    return getFirstUsefulProperty(props);
  }

  const possibleCountyName = clean(
    props.COUNTY ||
    props.County ||
    props.county ||
    props.COUNTYNAME ||
    props.CountyName ||
    props.COUNTY_NAME ||
    props.ENGLISH ||
    props.English ||
    props.NAME ||
    props.Name ||
    props.name
  );

  if (possibleCountyName) {
    return possibleCountyName;
  }

  return getFirstUsefulProperty(props);
}

// --------------------------------------------------
// POINT IN POLYGON USING LEAFLET LATLNGS
// --------------------------------------------------

function pointInLatLngRing(point, ring) {
  const x = point.lng;
  const y = point.lat;

  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i].lng;
    const yi = ring[i].lat;
    const xj = ring[j].lng;
    const yj = ring[j].lat;

    const intersects =
      (yi > y) !== (yj > y) &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersects) inside = !inside;
  }

  return inside;
}

function isRing(latlngs) {
  return (
    Array.isArray(latlngs) &&
    latlngs.length > 0 &&
    latlngs[0] &&
    typeof latlngs[0].lat === "number" &&
    typeof latlngs[0].lng === "number"
  );
}

function isPolygon(latlngs) {
  return (
    Array.isArray(latlngs) &&
    latlngs.length > 0 &&
    isRing(latlngs[0])
  );
}

function pointInLatLngPolygon(point, polygonLatLngs) {
  if (!isPolygon(polygonLatLngs)) return false;

  const outerRing = polygonLatLngs[0];

  if (!pointInLatLngRing(point, outerRing)) {
    return false;
  }

  for (let i = 1; i < polygonLatLngs.length; i++) {
    const hole = polygonLatLngs[i];

    if (pointInLatLngRing(point, hole)) {
      return false;
    }
  }

  return true;
}

function pointInLatLngStructure(point, latlngs) {
  if (isRing(latlngs)) {
    return pointInLatLngRing(point, latlngs);
  }

  if (isPolygon(latlngs)) {
    return pointInLatLngPolygon(point, latlngs);
  }

  if (Array.isArray(latlngs)) {
    return latlngs.some((part) => pointInLatLngStructure(point, part));
  }

  return false;
}

function churchIsInsideBoundaryLayer(church, leafletLayer) {
  if (!leafletLayer || !leafletLayer.getLatLngs) return false;

  const lat = getLatitude(church);
  const lng = getLongitude(church);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return false;
  }

  const point = L.latLng(lat, lng);

  if (leafletLayer.getBounds && !leafletLayer.getBounds().contains(point)) {
    return false;
  }

  return pointInLatLngStructure(point, leafletLayer.getLatLngs());
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
  const lea = getLea(church);
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

  if (street || city || county || lea || eircode) {
    html += `
      <div class="detail-row">
        <span class="detail-label">Address</span>
        ${street ? `${escapeHtml(street)}<br>` : ""}
        ${city ? `${escapeHtml(city)}<br>` : ""}
        ${county ? `${escapeHtml(county)}<br>` : ""}
        ${lea ? `LEA: ${escapeHtml(lea)}<br>` : ""}
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
  const lea = getLea(church).toLowerCase();
  const denomination = getDenomination(church);

  const matchesSearch =
    !searchTerm ||
    name.includes(searchTerm) ||
    street.includes(searchTerm) ||
    city.includes(searchTerm) ||
    county.includes(searchTerm) ||
    lea.includes(searchTerm) ||
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

  if (selectedBoundaryLeafletLayer && selectedBoundaryName !== null) {
    updateProfilePanel(selectedBoundaryName, selectedBoundaryLeafletLayer);
  }
}

// --------------------------------------------------
// DATA LOADING
// --------------------------------------------------

function loadCountyData() {
  Papa.parse(withCacheBust("county-data.csv"), {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function (results) {
      countyData = {};

      results.data.forEach((row) => {
        const countyName = normaliseName(
          row.County ||
          row.county ||
          row.COUNTY ||
          row.Name ||
          row.NAME
        );

        if (countyName) {
          countyData[countyName] = row;
        }
      });

      console.log("County data rows loaded:", Object.keys(countyData).length);
    },
    error: function (error) {
      console.error("Error loading county-data.csv", error);
    }
  });
}

function loadLeaData() {
  Papa.parse(withCacheBust("lea-data.csv"), {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function (results) {
      leaData = {};

      results.data.forEach((row) => {
        const leaName = normaliseName(
          row.LEA ||
          row.Lea ||
          row.lea ||
          row["LEA Name"] ||
          row["LEA_NAME"] ||
          row["Local Electoral Area"] ||
          row["Local Electoral Area Name"] ||
          row.Name ||
          row.NAME
        );

        if (leaName) {
          leaData[leaName] = row;
        }
      });

      console.log("LEA data rows loaded:", Object.keys(leaData).length);
    },
    error: function (error) {
      console.error("Error loading lea-data.csv", error);
    }
  });
}

function getPopulationForBoundary(boundaryName) {
  const normalised = normaliseName(boundaryName);

  let data = {};

  if (currentBoundaryType === "lea") {
    data = leaData[normalised] || {};
  } else {
    data = countyData[normalised] || {};
  }

  return (
    data.Population ||
    data.population ||
    data.POPULATION ||
    data.Total ||
    data.total ||
    data["Total Population"] ||
    data["Usually Resident Population"] ||
    ""
  );
}

// --------------------------------------------------
// PROFILE PANEL
// --------------------------------------------------

function updateProfilePanel(boundaryName, boundaryLeafletLayer) {
  const config = boundaryConfigs[currentBoundaryType];

  const title = document.getElementById("profile-title");
  const summary = document.getElementById("profile-summary");
  const listHeading = document.getElementById("profile-list-heading");
  const list = document.getElementById("profile-church-list");

  const churchesInBoundary = allChurches.filter((church) => {
    return churchIsInsideBoundaryLayer(church, boundaryLeafletLayer);
  });

  const populationValue = getPopulationForBoundary(boundaryName);
  const populationNumber = Number(String(populationValue).replace(/,/g, ""));
  const churchCount = churchesInBoundary.length;

  let peoplePerChurch = "Not available";

  if (!Number.isNaN(populationNumber) && populationNumber > 0 && churchCount > 0) {
    peoplePerChurch =
      `1 church for every ${Math.round(populationNumber / churchCount).toLocaleString("en-IE")} people`;
  }

  const displayName = boundaryName
    ? `${config.labelSingular} ${boundaryName.toUpperCase()}`
    : `${config.labelSingular}`;

  title.textContent = displayName;

  summary.innerHTML = `
    <strong>Population:</strong> ${populationValue ? formatNumber(populationValue) : "Not available"}<br>
    <strong>Churches listed:</strong> ${churchCount}<br>
    <strong>People per church:</strong> ${peoplePerChurch}
  `;

  listHeading.textContent =
    currentBoundaryType === "lea"
      ? "Churches in this LEA"
      : "Churches in this county";

  list.innerHTML = "";

  churchesInBoundary
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

  console.log("Clicked boundary:", boundaryName || "(no name found)");
  console.log("Boundary type:", currentBoundaryType);
  console.log("Churches inside boundary:", churchCount);
  console.log("Population found:", populationValue || "Not available");
}

function clearProfilePanel() {
  const config = boundaryConfigs[currentBoundaryType];

  selectedBoundaryName = null;
  selectedBoundaryLeafletLayer = null;

  document.getElementById("profile-title").textContent =
    `${config.labelSingular} Profile`;

  document.getElementById("profile-summary").textContent =
    `Click a ${config.labelSingular.toLowerCase()} to view population and church data.`;

  document.getElementById("profile-list-heading").textContent =
    currentBoundaryType === "lea"
      ? "Churches in this LEA"
      : "Churches in this county";

  document.getElementById("profile-church-list").innerHTML = "";

  if (selectedBoundaryLeafletLayer && currentBoundaryLayer) {
    currentBoundaryLayer.resetStyle(selectedBoundaryLeafletLayer);
  }

  updateVisibleChurches();
}

// --------------------------------------------------
// BOUNDARY LAYERS
// --------------------------------------------------

function boundaryStyle() {
  return {
    color: "#222222",
    weight: 2,
    opacity: 0.9,
    fillColor: "#ffffff",
    fillOpacity: 0.08
  };
}

function selectedBoundaryStyle() {
  return {
    color: "#111111",
    weight: 4,
    opacity: 1,
    fillColor: "#f5d76e",
    fillOpacity: 0.18
  };
}

function loadBoundaryLayer(boundaryType) {
  const config = boundaryConfigs[boundaryType];

  if (currentBoundaryLayer) {
    map.removeLayer(currentBoundaryLayer);
    currentBoundaryLayer = null;
  }

  selectedBoundaryName = null;
  selectedBoundaryLeafletLayer = null;
  currentBoundaryType = boundaryType;

  clearProfilePanel();

  fetch(withCacheBust(config.geojsonFile))
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Could not load ${config.geojsonFile}: ${response.status}`);
      }

      return response.json();
    })
    .then((geojson) => {
      console.log("Loaded boundary file:", config.geojsonFile);
      console.log("Boundary type:", boundaryType);
      console.log("Number of features:", geojson.features ? geojson.features.length : "No features array");
      console.log(
        "First feature properties:",
        geojson.features && geojson.features[0] ? geojson.features[0].properties : "No first feature"
      );

      currentBoundaryLayer = L.geoJSON(geojson, {
        style: boundaryStyle,
        onEachFeature: function (feature, layer) {
          const boundaryName = getBoundaryFeatureName(feature, boundaryType);

          layer.on("click", function () {
            if (selectedBoundaryLeafletLayer && currentBoundaryLayer) {
              currentBoundaryLayer.resetStyle(selectedBoundaryLeafletLayer);
            }

            selectedBoundaryName = boundaryName;
            selectedBoundaryLeafletLayer = layer;

            layer.setStyle(selectedBoundaryStyle());

            updateProfilePanel(boundaryName, layer);

            if (layer.getBounds) {
              map.fitBounds(layer.getBounds(), {
                padding: [40, 40],
                maxZoom: boundaryType === "lea" ? 11 : 10
              });
            }
          });
        }
      }).addTo(map);
    })
    .catch((error) => {
      console.error(`Error loading ${config.geojsonFile}`, error);
    });
}

// --------------------------------------------------
// CHURCH CSV LOADING
// --------------------------------------------------

function loadChurches() {
  Papa.parse(withCacheBust("churches.csv"), {
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

      console.log("Church rows loaded:", results.data.length);
      console.log("Churches with valid coordinates:", allChurches.length);
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

document.getElementById("boundaryLayerSelect").addEventListener("change", function () {
  loadBoundaryLayer(this.value);
});

document.getElementById("searchInput").addEventListener("input", function () {
  updateVisibleChurches();
});

document.getElementById("resetMapButton").addEventListener("click", function () {
  document.getElementById("searchInput").value = "";

  clearSelectedAffiliations();
  clearProfilePanel();

  map.setView([53.4, -8.0], 7);

  document.getElementById("church-detail-content").className = "detail-empty";
  document.getElementById("church-detail-content").innerHTML =
    "Click a church dot on the map to view its details here.";
});

document.getElementById("clearSelectionButton").addEventListener("click", function () {
  clearProfilePanel();
});

// --------------------------------------------------
// INITIAL LOAD
// --------------------------------------------------

loadCountyData();
loadLeaData();
loadChurches();
loadBoundaryLayer("county");
