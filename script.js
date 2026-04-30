/*
  Glúnta Research Church Map
  Version: v0.8.4-remove-church-details-panel
*/

const CACHE_VERSION = "0.8.4";

// --------------------------------------------------
// MAP SETUP
// --------------------------------------------------

const map = L.map("map", {
  zoomControl: false
}).setView([53.4, -8.0], 7);

map.createPane("boundaryPane");
map.getPane("boundaryPane").style.zIndex = 400;

map.createPane("urbanOpportunityPane");
map.getPane("urbanOpportunityPane").style.zIndex = 575;

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

let urbanOpportunityLayer = null;
let urbanGeoJsonData = null;

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

function getSelectedAffiliations() {
  const checkedBoxes = document.querySelectorAll(
    "#affiliationFilterBox input[type='checkbox']:checked"
  );

  return Array.from(checkedBoxes).map((box) => box.value);
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

  refreshUrbanOpportunityMarkers();
}

// --------------------------------------------------
// URBAN ZONE OPPORTUNITY MARKERS
// --------------------------------------------------

function getPopulationForUrbanZone(urbanName) {
  const normalised = normaliseName(urbanName);
  const data = urbanData[normalised] || {};

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

function getLayerCentre(layer) {
  if (layer && layer.getBounds) {
    return layer.getBounds().getCenter();
  }

  return null;
}

function getCountedChurches() {
  return allChurches.filter((church) => churchCountsForOpportunity(church));
}

function getClosestCountedChurchToPoint(point) {
  const countedChurches = getCountedChurches();

  let closest = null;

  countedChurches.forEach((church) => {
    const lat = getLatitude(church);
    const lng = getLongitude(church);

    if (Number.isNaN(lat) || Number.isNaN(lng)) return;

    const churchPoint = L.latLng(lat, lng);
    const distanceKm = point.distanceTo(churchPoint) / 1000;

    if (!closest || distanceKm < closest.distanceKm) {
      closest = {
        church,
        distanceKm
      };
    }
  });

  return closest;
}

function calculateUrbanOpportunity(urbanName, urbanLayer) {
  const populationValue = getPopulationForUrbanZone(urbanName);
  const populationNumber = Number(String(populationValue).replace(/,/g, ""));

  const countedChurchesInside = allChurches.filter((church) => {
    return (
      churchCountsForOpportunity(church) &&
      churchIsInsideBoundaryLayer(church, urbanLayer)
    );
  });

  if (countedChurchesInside.length > 0) {
    return {
      shouldShow: false,
      level: "Covered",
      population: populationValue,
      churchCount: countedChurchesInside.length,
      nearestChurch: null,
      distanceKm: null
    };
  }

  if (Number.isNaN(populationNumber) || populationNumber < 1500) {
    return {
      shouldShow: false,
      level: "Hidden",
      population: populationValue,
      churchCount: 0,
      nearestChurch: null,
      distanceKm: null
    };
  }

  const centre = getLayerCentre(urbanLayer);

  if (!centre) {
    return {
      shouldShow: false,
      level: "Hidden",
      population: populationValue,
      churchCount: 0,
      nearestChurch: null,
      distanceKm: null
    };
  }

  const closest = getClosestCountedChurchToPoint(centre);

  if (!closest) {
    return {
      shouldShow: true,
      level: "High",
      population: populationValue,
      churchCount: 0,
      nearestChurch: null,
      distanceKm: null
    };
  }

  const distanceKm = closest.distanceKm;

  let shouldShow = false;
  let level = "";

  if (populationNumber >= 1500) {
    shouldShow = true;
    level = distanceKm > 10 ? "High" : "Significant";
  }

  return {
    shouldShow,
    level,
    population: populationValue,
    churchCount: 0,
    nearestChurch: closest.church,
    distanceKm
  };
}

function buildUrbanOpportunityPopup(urbanName, result) {
  const selectedAffiliations = getSelectedAffiliations();

  const nearestChurchName = result.nearestChurch
    ? getChurchName(result.nearestChurch)
    : "No counted church found";

  const nearestChurchTown = result.nearestChurch
    ? getCity(result.nearestChurch)
    : "";

  return `
    <strong>${escapeHtml(urbanName)}</strong><br>
    <strong>Population:</strong> ${result.population ? formatNumber(result.population) : "Not available"}<br>
    <strong>Churches counted in urban zone:</strong> ${result.churchCount}<br>
    <strong>Nearest counted church:</strong> ${escapeHtml(nearestChurchName)}${nearestChurchTown ? `, ${escapeHtml(nearestChurchTown)}` : ""}<br>
    <strong>Distance:</strong> ${result.distanceKm !== null ? `${result.distanceKm.toFixed(1)} km` : "Not available"}<br>
    <strong>Town opportunity:</strong> ${escapeHtml(result.level)}<br><br>
    <strong>Partnership lens:</strong><br>
    ${
      selectedAffiliations.length === 0
        ? "All churches are currently counted."
        : escapeHtml(selectedAffiliations.join(", "))
    }
  `;
}

function clearUrbanOpportunityMarkers() {
  if (urbanOpportunityLayer) {
    map.removeLayer(urbanOpportunityLayer);
    urbanOpportunityLayer = null;
  }
}

function refreshUrbanOpportunityMarkers() {
  clearUrbanOpportunityMarkers();

  if (currentBoundaryType !== "gospel") return;
  if (!urbanGeoJsonData) return;

  urbanOpportunityLayer = L.layerGroup([], {
    pane: "urbanOpportunityPane"
  }).addTo(map);

  L.geoJSON(urbanGeoJsonData, {
    onEachFeature: function (feature, layer) {
      const urbanName = getBoundaryFeatureName(feature, "urban");
      const result = calculateUrbanOpportunity(urbanName, layer);

      if (!result.shouldShow) return;

      const centre = getLayerCentre(layer);
      if (!centre) return;

      const icon = L.divIcon({
        className: "",
        html: `<div class="urban-opportunity-marker"></div>`,
        iconSize: [15, 15],
        iconAnchor: [7.5, 7.5]
      });

      const marker = L.marker(centre, {
        icon: icon,
        pane: "urbanOpportunityPane"
      });

      marker.bindPopup(buildUrbanOpportunityPopup(urbanName, result));
      marker.addTo(urbanOpportunityLayer);
    }
  });

  churchMarkers.forEach((marker) => {
    if (map.hasLayer(marker)) marker.bringToFront();
  });
}

function loadUrbanGeoJsonData() {
  fetch(withCacheBust("urban-zones.geojson"))
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Could not load urban-zones.geojson: ${response.status}`);
      }

      return response.json();
    })
    .then((geojson) => {
      urbanGeoJsonData = geojson;
      console.log("Urban GeoJSON cached for opportunity markers.");
    })
    .catch((error) => {
      console.error("Error loading urban-zones.geojson for opportunity markers", error);
    });
}

// --------------------------------------------------
// AFFILIATION FILTER
// --------------------------------------------------

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

  if (affiliations.length === 0) {
    filterBox.textContent = "No affiliations found.";
  }
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
  const website = getWebsite(church);
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
    ${
      website
        ? `<br><a href="${escapeHtml(website.startsWith("http") ? website : `https://${website}`)}" target="_blank" rel="noopener">Website</a>`
        : ""
    }
  `;
}

// --------------------------------------------------
// CHURCH MARKERS
// --------------------------------------------------

function createChurchMarker(church) {
  const lat = getLatitude(church);
  const lng = getLongitude(church);
  const denomination = getDenomination(church);
  const colour = getDenominationColour(denomination);

  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

  const marker = L.circleMarker([lat, lng], {
    pane: "churchPane",
    radius: 6,
    fillColor: colour,
    color: "#ffffff",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.95
  });

  marker.bindPopup(buildPopupContent(church));
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
      marker.bringToFront();
      visibleCount++;
    }
  });

  document.getElementById("church-count").textContent =
    `${visibleCount} of ${allChurches.length} churches shown`;

  if (selectedBoundaryLeafletLayer && selectedBoundaryName !== null) {
    updateProfilePanel(selectedBoundaryName, selectedBoundaryLeafletLayer);
  }

  refreshGospelOpportunityLayerStyles();
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

        if (countyName) countyData[countyName] = row;
      });

      console.log("County data rows loaded:", Object.keys(countyData).length);
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
          row["Local Electoral Area"] ||
          row.Name ||
          row.NAME
        );

        if (leaName) leaData[leaName] = row;
      });

      console.log("LEA data rows loaded:", Object.keys(leaData).length);
    }
  });
}

function loadUrbanData() {
  Papa.parse(withCacheBust("urban-zone-data.csv"), {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function (results) {
      urbanData = {};

      results.data.forEach((row) => {
        const urbanName = normaliseName(
          row.UrbanZone ||
          row["Urban Zone"] ||
          row.URBAN_AREA_NAME ||
          row["Urban Area"] ||
          row["Town Name"] ||
          row.Name ||
          row.NAME
        );

        if (urbanName) urbanData[urbanName] = row;
      });

      console.log("Urban zone data rows loaded:", Object.keys(urbanData).length);
    }
  });
}

function getPopulationForBoundary(boundaryName) {
  const normalised = normaliseName(boundaryName);

  let data = {};

  if (currentBoundaryType === "lea" || currentBoundaryType === "gospel") {
    data = leaData[normalised] || {};
  } else if (currentBoundaryType === "urban") {
    data = urbanData[normalised] || {};
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

  title.textContent = boundaryName
    ? `${config.labelSingular} ${boundaryName.toUpperCase()}`
    : `${config.labelSingular}`;

  if (currentBoundaryType === "gospel") {
    const result = calculateGospelOpportunity(boundaryName, boundaryLeafletLayer);
    const selectedAffiliations = getSelectedAffiliations();

    summary.innerHTML = `
      <strong>Population:</strong> ${result.population ? formatNumber(result.population) : "Not available"}<br>
      <strong>Churches counted for this view:</strong> ${result.churchCount}<br>
      <strong>People per counted church:</strong> ${
        result.populationPerChurch
          ? `1 church for every ${formatNumber(result.populationPerChurch)} people`
          : "Not available"
      }<br>
      <strong>Opportunity level:</strong> ${escapeHtml(result.level)}<br>
      <strong>Opportunity type:</strong> ${escapeHtml(result.type)}<br><br>
      <strong>Partnership lens:</strong><br>
      ${
        selectedAffiliations.length === 0
          ? "All churches are currently counted."
          : escapeHtml(selectedAffiliations.join(", "))
      }<br><br>
      <em>Opportunity levels are indicative, not definitive. Local knowledge is essential.</em>
    `;
  } else {
    summary.innerHTML = `
      <strong>Population:</strong> ${populationValue ? formatNumber(populationValue) : "Not available"}<br>
      <strong>Churches listed:</strong> ${churchCount}<br>
      <strong>People per church:</strong> ${peoplePerChurch}
    `;
  }

  if (currentBoundaryType === "urban") {
    listHeading.textContent = "Churches in this urban zone";
  } else if (currentBoundaryType === "lea") {
    listHeading.textContent = "Churches in this LEA";
  } else if (currentBoundaryType === "gospel") {
    listHeading.textContent = "Churches counted in this Gospel Opportunity area";
  } else {
    listHeading.textContent = "Churches in this county";
  }

  list.innerHTML = "";

  const churchesForList =
    currentBoundaryType === "gospel"
      ? allChurches.filter((church) => {
          return (
            churchIsInsideBoundaryLayer(church, boundaryLeafletLayer) &&
            churchCountsForOpportunity(church)
          );
        })
      : churchesInBoundary;

  if (churchesForList.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No churches currently counted inside this boundary.";
    list.appendChild(li);
  } else {
    churchesForList
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
          }
        });

        list.appendChild(li);
      });
  }
}

function clearProfilePanel() {
  const config = boundaryConfigs[currentBoundaryType];

  selectedBoundaryName = null;
  selectedBoundaryLeafletLayer = null;

  document.getElementById("profile-title").textContent =
    `${config.labelSingular} Profile`;

  document.getElementById("profile-summary").textContent =
    `Click a ${config.labelSingular.toLowerCase()} to view population and church data.`;

  if (currentBoundaryType === "urban") {
    document.getElementById("profile-list-heading").textContent =
      "Churches in this urban zone";
  } else if (currentBoundaryType === "lea") {
    document.getElementById("profile-list-heading").textContent =
      "Churches in this LEA";
  } else if (currentBoundaryType === "gospel") {
    document.getElementById("profile-list-heading").textContent =
      "Churches counted in this Gospel Opportunity area";
  } else {
    document.getElementById("profile-list-heading").textContent =
      "Churches in this county";
  }

  document.getElementById("profile-church-list").innerHTML = "";
}

// --------------------------------------------------
// BOUNDARY LAYERS
// --------------------------------------------------

function boundaryStyle(feature) {
  if (currentBoundaryType === "urban") {
    return {
      pane: "boundaryPane",
      color: "#b0006d",
      weight: 2,
      opacity: 0.9,
      fillColor: "#ff4fb3",
      fillOpacity: 0.18
    };
  }

  if (currentBoundaryType === "gospel") {
    return {
      pane: "boundaryPane",
      color: "#ffffff",
      weight: 1,
      opacity: 0.9,
      fillColor: "#cccccc",
      fillOpacity: 0.55
    };
  }

  return {
    pane: "boundaryPane",
    color: "#222222",
    weight: 2,
    opacity: 0.9,
    fillColor: "#ffffff",
    fillOpacity: 0.08
  };
}

function selectedBoundaryStyle() {
  if (currentBoundaryType === "urban") {
    return {
      color: "#7a004a",
      weight: 4,
      opacity: 1,
      fillColor: "#ff4fb3",
      fillOpacity: 0.28
    };
  }

  if (currentBoundaryType === "gospel") {
    return {
      color: "#111111",
      weight: 4,
      opacity: 1,
      fillOpacity: 0.68
    };
  }

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

  clearUrbanOpportunityMarkers();

  selectedBoundaryName = null;
  selectedBoundaryLeafletLayer = null;
  currentBoundaryType = boundaryType;

  showOrHideGospelLegend();
  clearProfilePanel();

  fetch(withCacheBust(config.geojsonFile))
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Could not load ${config.geojsonFile}: ${response.status}`);
      }

      return response.json();
    })
    .then((geojson) => {
      currentBoundaryLayer = L.geoJSON(geojson, {
        pane: "boundaryPane",
        style: boundaryStyle,
        onEachFeature: function (feature, layer) {
          const boundaryName = getBoundaryFeatureName(feature, boundaryType);

          if (boundaryType === "gospel") {
            const result = calculateGospelOpportunity(boundaryName, layer);

            layer.setStyle({
              fillColor: getGospelOpportunityColour(result.level),
              fillOpacity: 0.58,
              color: "#ffffff",
              weight: 1
            });
          }

          layer.on("click", function () {
            if (selectedBoundaryLeafletLayer && currentBoundaryLayer) {
              currentBoundaryLayer.resetStyle(selectedBoundaryLeafletLayer);

              if (currentBoundaryType === "gospel") {
                refreshGospelOpportunityLayerStyles();
              }
            }

            selectedBoundaryName = boundaryName;
            selectedBoundaryLeafletLayer = layer;

            layer.setStyle(selectedBoundaryStyle());
            updateProfilePanel(boundaryName, layer);

            if (layer.getBounds) {
              map.fitBounds(layer.getBounds(), {
                padding: [40, 40],
                maxZoom:
                  boundaryType === "urban"
                    ? 13
                    : boundaryType === "lea" || boundaryType === "gospel"
                      ? 11
                      : 10
              });
            }
          });
        }
      }).addTo(map);

      if (boundaryType === "gospel") {
        refreshUrbanOpportunityMarkers();
      }

      churchMarkers.forEach((marker) => {
        if (map.hasLayer(marker)) marker.bringToFront();
      });
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
    error: function () {
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

  updateVisibleChurches();
});

document.getElementById("clearSelectionButton").addEventListener("click", function () {
  clearProfilePanel();
});

// --------------------------------------------------
// INITIAL LOAD
// --------------------------------------------------

loadCountyData();
loadLeaData();
loadUrbanData();
loadUrbanGeoJsonData();
loadChurches();
loadBoundaryLayer("county");
