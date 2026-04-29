/*
  Glúnta Research Church Map
  Version: v0.7.5-partnership-sensitive-gospel-opportunities

  Gospel Opportunities are calculated automatically and now respond to
  denomination / affiliation filters.

  Logic:
  - No affiliation selected = count all churches
  - One or more affiliations selected = count only selected churches

  Opportunity levels:
  - 0 selected/countable churches = Urgent
  - >15,000 people per selected/countable church = High
  - 10,000–15,000 = Significant
  - 5,000–10,000 = Lower
  - <5,000 = Established Presence
*/

const CACHE_VERSION = "0.7.5";

// --------------------------------------------------
// MAP SETUP
// --------------------------------------------------

const map = L.map("map", {
  zoomControl: false
}).setView([53.4, -8.0], 7);

map.createPane("boundaryPane");
map.getPane("boundaryPane").style.zIndex = 400;

map.createPane("churchPane");
map.getPane("churchPane").style.zIndex = 650;

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
let urbanData = {};

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
  },
  urban: {
    labelSingular: "Urban Zone",
    labelPlural: "Urban Zones",
    geojsonFile: "urban-zones.geojson"
  },
  gospel: {
    labelSingular: "Gospel Opportunity",
    labelPlural: "Gospel Opportunities",
    geojsonFile: "lea-boundaries.geojson"
  }
};

// --------------------------------------------------
// COLOURS
// --------------------------------------------------

const gospelOpportunityColours = {
  "Urgent": "#8b0000",
  "High": "#e74c3c",
  "Significant": "#f39c12",
  "Lower": "#9ccc65",
  "Established Presence": "#2e8b57"
};

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
  "#0066ff", "#00a65a", "#ffd700", "#008000", "#c1121f", "#00c7c7",
  "#1f77b4", "#ff8c00", "#7b2cbf", "#8b4513", "#2a9d8f", "#e76f51",
  "#6a4c93", "#bc5090", "#4d908e", "#f94144", "#577590", "#43aa8b",
  "#f3722c", "#90be6d", "#277da1", "#9b5de5", "#f15bb5", "#fee440"
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
  if (Number.isNaN(number)) return value || "Not available";
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
  return clean(church["Church Name"] || church["Name"] || church["name"]);
}

function getStreetAddress(church) {
  return clean(church["Street Address"] || church["Address"] || church["address"]);
}

function getCity(church) {
  return clean(church["City"] || church["Town"] || church["city"] || church["town"]);
}

function getCounty(church) {
  return clean(church["County"] || church["county"]);
}

function getLea(church) {
  return clean(church["LEA"] || church["Lea"] || church["lea"] || church["Local Electoral Area"]);
}

function getEircode(church) {
  return clean(church["EirCode"] || church["Eircode"] || church["Postal / EirCode"] || church["eircode"]);
}

function getWebsite(church) {
  return clean(church["Website"] || church["Website (if available)"] || church["website"]);
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
  return Number(church["Latitude"] || church["latitude"] || church["Lat"] || church["lat"]);
}

function getLongitude(church) {
  return Number(church["Longitude"] || church["longitude"] || church["Lng"] || church["lng"]);
}

function getDenominationColour(denomination) {
  const denom = clean(denomination);

  if (!denom) return "#333333";
  if (denominationColours[denom]) return denominationColours[denom];

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
// BOUNDARY NAME HELPERS
// --------------------------------------------------

function getFirstUsefulProperty(props) {
  const ignoredKeyParts = [
    "OBJECTID", "FID", "GUID", "GLOBALID", "GEOGID", "CENTROID",
    "SHAPE", "AREA", "LENGTH", "PERIMETER", "SMALL_AREA", "ED_ID", "CODE"
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

  if (boundaryType === "urban") {
    return clean(
      props.URBAN_AREA_NAME ||
      props.UrbanZone ||
      props["Urban Zone"] ||
      props.URBAN_NAME ||
      props.BUA_NAME ||
      props.BUILT_UP_AREA_NAME ||
      props.SETTLEMENT_NAME ||
      props.TOWN_NAME ||
      props.NAME ||
      props.Name ||
      getFirstUsefulProperty(props)
    );
  }

  if (boundaryType === "lea" || boundaryType === "gospel") {
    return clean(
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
      props["Local Electoral Area"] ||
      props.ENGLISH ||
      props.English ||
      props.NAME ||
      props.Name ||
      props.name ||
      props.AREA_NAME ||
      props.AreaName ||
      getFirstUsefulProperty(props)
    );
  }

  return clean(
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
    props.name ||
    getFirstUsefulProperty(props)
  );
}

// --------------------------------------------------
// POINT IN POLYGON
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
  return Array.isArray(latlngs) &&
    latlngs.length > 0 &&
    latlngs[0] &&
    typeof latlngs[0].lat === "number" &&
    typeof latlngs[0].lng === "number";
}

function isPolygon(latlngs) {
  return Array.isArray(latlngs) && latlngs.length > 0 && isRing(latlngs[0]);
}

function pointInLatLngPolygon(point, polygonLatLngs) {
  if (!isPolygon(polygonLatLngs)) return false;

  const outerRing = polygonLatLngs[0];

  if (!pointInLatLngRing(point, outerRing)) return false;

  for (let i = 1; i < polygonLatLngs.length; i++) {
    if (pointInLatLngRing(point, polygonLatLngs[i])) return false;
  }

  return true;
}

function pointInLatLngStructure(point, latlngs) {
  if (isRing(latlngs)) return pointInLatLngRing(point, latlngs);
  if (isPolygon(latlngs)) return pointInLatLngPolygon(point, latlngs);

  if (Array.isArray(latlngs)) {
    return latlngs.some((part) => pointInLatLngStructure(point, part));
  }

  return false;
}

function churchIsInsideBoundaryLayer(church, leafletLayer) {
  if (!leafletLayer || !leafletLayer.getLatLngs) return false;

  const lat = getLatitude(church);
  const lng = getLongitude(church);

  if (Number.isNaN(lat) || Number.isNaN(lng)) return false;

  const point = L.latLng(lat, lng);

  if (leafletLayer.getBounds && !leafletLayer.getBounds().contains(point)) {
    return false;
  }

  return pointInLatLngStructure(point, leafletLayer.getLatLngs());
}

// --------------------------------------------------
// GOSPEL OPPORTUNITY CALCULATION
// --------------------------------------------------

function getGospelOpportunityColour(level) {
  return gospelOpportunityColours[clean(level)] || "#cccccc";
}

function churchCountsForOpportunity(church) {
  const selectedAffiliations = getSelectedAffiliations();

  if (selectedAffiliations.length === 0) {
    return true;
  }

  return selectedAffiliations.includes(getDenomination(church));
}

function calculateGospelOpportunity(boundaryName, boundaryLayer) {
  const churchesInBoundary = allChurches.filter((church) => {
    return (
      churchIsInsideBoundaryLayer(church, boundaryLayer) &&
      churchCountsForOpportunity(church)
    );
  });

  const churchCount = churchesInBoundary.length;

  const populationValue = getPopulationForBoundary(boundaryName);
  const populationNumber = Number(String(populationValue).replace(/,/g, ""));

  let populationPerChurch = "";
  let level = "Established Presence";

  if (churchCount === 0) {
    level = "Urgent";
  } else if (!Number.isNaN(populationNumber) && populationNumber > 0) {
    populationPerChurch = Math.round(populationNumber / churchCount);

    if (populationPerChurch > 15000) {
      level = "High";
    } else if (populationPerChurch >= 10000) {
      level = "Significant";
    } else if (populationPerChurch >= 5000) {
      level = "Lower";
    } else {
      level = "Established Presence";
    }
  }

  let type = "Established Presence";

  if (level === "Urgent") type = "Pioneer Location";
  else if (level === "High") type = "Pioneer Location";
  else if (level === "Significant") type = "Strengthen Existing Work";
  else if (level === "Lower") type = "Partner / Support";

  return {
    level,
    type,
    churchCount,
    population: populationValue,
    populationPerChurch
  };
}

function showOrHideGospelLegend() {
  const legend = document.getElementById("gospelOpportunityLegend");
  if (!legend) return;

  legend.style.display = currentBoundaryType === "gospel" ? "block" : "none";
}

function refreshGospelOpportunityLayerStyles() {
  if (currentBoundaryType !== "gospel" || !currentBoundaryLayer) return;

  currentBoundaryLayer.eachLayer((layer) => {
    const boundaryName = getBoundaryFeatureName(layer.feature, "gospel");
    const result = calculateGospelOpportunity(boundaryName, layer);

    layer.setStyle({
      fillColor: getGospelOpportunityColour(result.level),
      fillOpacity: 0.58,
      color: "#ffffff",
      weight: 1
    });
  });

  if (selectedBoundaryLeafletLayer && selectedBoundaryName) {
    selectedBoundaryLeafletLayer.setStyle(selectedBoundaryStyle());
    updateProfilePanel(selectedBoundaryName, selectedBoundaryLeafletLayer);
  }
}

// --------------------------------------------------
// AFFILIATION FILTER
// --------------------------------------------------

function getSelectedAffiliations() {
  const checkedBoxes = document.querySelectorAll(
    "#affiliationFilterBox input[type='checkbox']:checked"
  );

  return Array.from(checkedBoxes).map((box) => box.value);
}

function clearSelectedAffiliations() {
  document
    .querySelectorAll("#affiliationFilterBox input[type='checkbox']")
    .forEach((box) => {
      box.checked = false;
    });
}

function populateAffiliationFilter() {
  const filterBox = document.getElementById("affiliationFilterBox");

  const affiliations = [...new Set(
    allChurches.map(getDenomination).filter(Boolean)
  )].sort();

  filterBox.innerHTML = "";

  affiliations.forEach((affiliation) => {
    const colour = getDenominationColour(affiliation);

    const label = document.createElement("label");
    label.className = "affiliation-option";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = affiliation;
    checkbox.addEventListener("change", updateVisibleChurches);

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

  if (affiliations.length === 0)
