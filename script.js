const map = L.map("map", {
  zoomControl: false
}).setView([53.35, -7.8], 7);

L.control.zoom({
  position: "topleft"
}).addTo(map);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

let churches = [];
let markers = [];
let colourMode = "tradition";

const denominationColours = {
  "Pentecostal": "#d62728",
  "RCCG": "#e41a1c",
  "Assemblies of God": "#fb6a4a",
  "Elim Pentecostal": "#cb181d",
  "Elim / Pentecostal": "#cb181d",
  "Vineyard": "#f16913",
  "New Apostolic": "#a50f15",
  "Indian Pentecostal Church of God": "#ef3b2c",
  "Ireland Christian Revival Mission": "#fb6a4a",
  "TREM": "#de2d26",
  "The Redeemed Evangelical Mission": "#de2d26",

  "Baptist": "#1f77b4",
  "ABCI": "#08519c",
  "Independent Baptist": "#3182bd",
  "Reformed Baptist": "#6baed6",
  "Independent Evangelical": "#2171b5",
  "Christian Fellowship": "#4292c6",

  "PCI": "#6a3d9a",
  "Presbyterian": "#54278f",
  "Reformed Presbyterian Church of Ireland": "#756bb1",
  "Congregational": "#9e9ac8",

  "Methodist": "#2ca02c",
  "Church of the Nazarene": "#238b45",

  "Brethren": "#8c564b",
  "Christian Assembly": "#a65628",

  "Chinese Gospel Church": "#ff7f0e",
  "Romanian Pentecostal": "#fdae6b",
  "Tamil Pentecostal": "#fd8d3c",
  "Pentecostal (Romanian)": "#fdae6b",
  "Pentecostal (Tamil)": "#fd8d3c",

  "Christian Churches Ireland": "#636363",
  "Calvary Chapel": "#969696",
  "ICM": "#525252",
  "Church of Christ": "#737373",
  "Four12": "#bdbdbd",
  "Plumbline": "#969696",
  "Christian Congregation in Ireland": "#636363",
  "Church of Ireland": "#7f7f7f",

  "Other": "#444444"
};

const traditionColours = {
  "Pentecostal/Charismatic": "#d62728",
  "Baptist/Independent Evangelical": "#1f77b4",
  "Presbyterian/Reformed": "#8e44ad",
  "Methodist/Wesleyan": "#2ca02c",
  "Other Protestant/Evangelical": "#7f7f7f",
  "Brethren/Gospel Hall": "#8c564b",
  "International/Migrant-led": "#ff7f0e"
};

const traditionMap = {
  "Pentecostal": "Pentecostal/Charismatic",
  "RCCG": "Pentecostal/Charismatic",
  "Assemblies of God": "Pentecostal/Charismatic",
  "Elim Pentecostal": "Pentecostal/Charismatic",
  "Elim / Pentecostal": "Pentecostal/Charismatic",
  "Vineyard": "Pentecostal/Charismatic",
  "New Apostolic": "Pentecostal/Charismatic",
  "Indian Pentecostal Church of God": "Pentecostal/Charismatic",
  "Ireland Christian Revival Mission": "Pentecostal/Charismatic",
  "TREM": "Pentecostal/Charismatic",
  "The Redeemed Evangelical Mission": "Pentecostal/Charismatic",

  "Baptist": "Baptist/Independent Evangelical",
  "ABCI": "Baptist/Independent Evangelical",
  "Independent Baptist": "Baptist/Independent Evangelical",
  "Reformed Baptist": "Baptist/Independent Evangelical",
  "Independent Evangelical": "Baptist/Independent Evangelical",
  "Christian Fellowship": "Baptist/Independent Evangelical",

  "PCI": "Presbyterian/Reformed",
  "Presbyterian": "Presbyterian/Reformed",
  "Reformed Presbyterian Church of Ireland": "Presbyterian/Reformed",
  "Congregational": "Presbyterian/Reformed",

  "Methodist": "Methodist/Wesleyan",
  "Church of the Nazarene": "Methodist/Wesleyan",

  "Brethren": "Brethren/Gospel Hall",
  "Christian Assembly": "Brethren/Gospel Hall",

  "Chinese Gospel Church": "International/Migrant-led",
  "Romanian Pentecostal": "International/Migrant-led",
  "Tamil Pentecostal": "International/Migrant-led",
  "Pentecostal (Romanian)": "International/Migrant-led",
  "Pentecostal (Tamil)": "International/Migrant-led",

  "Christian Churches Ireland": "Other Protestant/Evangelical",
  "Calvary Chapel": "Other Protestant/Evangelical",
  "ICM": "Other Protestant/Evangelical",
  "Church of Christ": "Other Protestant/Evangelical",
  "Four12": "Other Protestant/Evangelical",
  "Plumbline": "Other Protestant/Evangelical",
  "Christian Congregation in Ireland": "Other Protestant/Evangelical",
  "Church of Ireland": "Other Protestant/Evangelical",
  "Other": "Other Protestant/Evangelical"
};

function normalise(value) {
  return value ? String(value).trim() : "";
}

function getChurchName(church) {
  return (
    church["Church Name"] ||
    church["Church"] ||
    church["Name"] ||
    "Unnamed church"
  );
}

function getDenomination(church) {
  return normalise(church["Denomination"]) || "Other";
}

function getTradition(church) {
  const existingTradition = normalise(church["Tradition"]);

  if (existingTradition) {
    return existingTradition;
  }

  const denomination = getDenomination(church);
  return traditionMap[denomination] || "Other Protestant/Evangelical";
}

function getLatitude(church) {
  return parseFloat(church["Latitude"] || church["lat"] || church["Lat"]);
}

function getLongitude(church) {
  return parseFloat(
    church["Longitude"] ||
    church["lng"] ||
    church["Long"] ||
    church["Lon"]
  );
}

function getEircode(church) {
  return normalise(
    church["EirCode"] ||
    church["Eircode"] ||
    church["Postal / EirCode"] ||
    church["Postal / Eircode"]
  );
}

function getColour(church) {
  if (colourMode === "tradition") {
    const tradition = getTradition(church);
    return traditionColours[tradition] || traditionColours["Other Protestant/Evangelical"];
  }

  const denomination = getDenomination(church);
  return denominationColours[denomination] || denominationColours["Other"];
}

function clearMarkers() {
  markers.forEach(marker => map.removeLayer(marker));
  markers = [];
}

function getFilteredChurches() {
  const search = document.getElementById("searchInput").value.toLowerCase();
  const traditionFilter = document.getElementById("traditionFilter").value;
  const denominationFilter = document.getElementById("denominationFilter").value;

  return churches.filter(church => {
    const name = getChurchName(church).toLowerCase();
    const city = normalise(church["City"]).toLowerCase();
    const county = normalise(church["County"]).toLowerCase();
    const denomination = getDenomination(church);
    const tradition = getTradition(church);

    const matchesSearch =
      !search ||
      name.includes(search) ||
      city.includes(search) ||
      county.includes(search) ||
      denomination.toLowerCase().includes(search) ||
      tradition.toLowerCase().includes(search);

    const matchesTradition =
      !traditionFilter || tradition === traditionFilter;

    const matchesDenomination =
      !denominationFilter || denomination === denominationFilter;

    return matchesSearch && matchesTradition && matchesDenomination;
  });
}

function renderMarkers() {
  clearMarkers();

  const filtered = getFilteredChurches();

  filtered.forEach(church => {
    const lat = getLatitude(church);
    const lng = getLongitude(church);

    if (Number.isNaN(lat) || Number.isNaN(lng)) return;

    const marker = L.circleMarker([lat, lng], {
      radius: 6,
      fillColor: getColour(church),
      color: "#ffffff",
      weight: 1,
      opacity: 1,
      fillOpacity: 0.9
    }).addTo(map);

    marker.bindPopup(`
      <div class="popup-title">${getChurchName(church)}</div>
      <div><strong>Denomination:</strong> ${getDenomination(church)}</div>
      <div><strong>Tradition:</strong> ${getTradition(church)}</div>
      <div><strong>City:</strong> ${normalise(church["City"])}</div>
      <div><strong>County:</strong> ${normalise(church["County"])}</div>
      <div><strong>Eircode:</strong> ${getEircode(church)}</div>
    `);

    markers.push(marker);
  });

  renderSummary(filtered);
  renderLegend(filtered);
}

function countBy(items, keyFn) {
  const counts = {};

  items.forEach(item => {
    const key = keyFn(item);
    counts[key] = (counts[key] || 0) + 1;
  });

  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

function renderSummary(filtered) {
  const summaryTitle = document.getElementById("summaryTitle");
  const summaryList = document.getElementById("summaryList");
  const summaryTotal = document.getElementById("summaryTotal");

  const counts =
    colourMode === "tradition"
      ? countBy(filtered, getTradition)
      : countBy(filtered, getDenomination);

  summaryTitle.textContent =
    colourMode === "tradition"
      ? "Summary (Broad Tradition)"
      : "Summary (Denomination / Affiliation)";

  summaryList.innerHTML = "";

  counts.forEach(([label, count]) => {
    const colour =
      colourMode === "tradition"
        ? traditionColours[label] || traditionColours["Other Protestant/Evangelical"]
        : denominationColours[label] || denominationColours["Other"];

    const row = document.createElement("div");
    row.className = "summary-item";
    row.innerHTML = `
      <span class="colour-dot" style="background:${colour}"></span>
      <span>${label}</span>
      <strong>${count}</strong>
    `;

    summaryList.appendChild(row);
  });

  summaryTotal.textContent = filtered.length;
}

function renderLegend(filtered) {
  const legendTitle = document.getElementById("legendTitle");
  const legendItems = document.getElementById("legendItems");
  const legendTotal = document.getElementById("legendTotal");

  const counts =
    colourMode === "tradition"
      ? countBy(filtered, getTradition)
      : countBy(filtered, getDenomination);

  legendTitle.textContent =
    colourMode === "tradition"
      ? "Broad Tradition"
      : "Denomination / Affiliation";

  legendItems.innerHTML = "";

  counts.forEach(([label, count]) => {
    const colour =
      colourMode === "tradition"
        ? traditionColours[label] || traditionColours["Other Protestant/Evangelical"]
        : denominationColours[label] || denominationColours["Other"];

    const row = document.createElement("div");
    row.className = "legend-item";
    row.innerHTML = `
      <span class="colour-dot" style="background:${colour}"></span>
      <span>${label}</span>
      <strong>${count}</strong>
    `;

    legendItems.appendChild(row);
  });

  legendTotal.textContent = `${filtered.length} churches`;
}

function populateFilters() {
  const traditionSelect = document.getElementById("traditionFilter");
  const denominationSelect = document.getElementById("denominationFilter");

  const traditions = [...new Set(churches.map(getTradition))].sort();
  const denominations = [...new Set(churches.map(getDenomination))].sort();

  traditions.forEach(tradition => {
    const option = document.createElement("option");
    option.value = tradition;
    option.textContent = tradition;
    traditionSelect.appendChild(option);
  });

  denominations.forEach(denomination => {
    const option = document.createElement("option");
    option.value = denomination;
    option.textContent = denomination;
    denominationSelect.appendChild(option);
  });
}

function setColourMode(mode) {
  colourMode = mode;

  document
    .getElementById("denominationMode")
    .classList.toggle("active", mode === "denomination");

  document
    .getElementById("traditionMode")
    .classList.toggle("active", mode === "tradition");

  renderMarkers();
}

document.getElementById("denominationMode").addEventListener("click", () => {
  setColourMode("denomination");
});

document.getElementById("traditionMode").addEventListener("click", () => {
  setColourMode("tradition");
});

document.getElementById("searchInput").addEventListener("input", renderMarkers);
document.getElementById("traditionFilter").addEventListener("change", renderMarkers);
document.getElementById("denominationFilter").addEventListener("change", renderMarkers);

Papa.parse("./churches.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: function(results) {
    churches = results.data;

    populateFilters();
    setColourMode("tradition");

    setTimeout(() => {
      map.invalidateSize();
    }, 250);
  },
  error: function(error) {
    console.error("Could not load churches.csv", error);
  }
});
