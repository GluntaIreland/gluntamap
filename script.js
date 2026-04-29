/*
  Glúnta Research Church Map
  Version: v0.7.3-gospel-opportunities-four-levels
*/

const CACHE_VERSION = "0.7.3";

// ---------------- MAP ----------------

const map = L.map("map", { zoomControl: false }).setView([53.4, -8.0], 7);

map.createPane("boundaryPane");
map.getPane("boundaryPane").style.zIndex = 400;

map.createPane("churchPane");
map.getPane("churchPane").style.zIndex = 650;

L.control.zoom({ position: "bottomright" }).addTo(map);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19
}).addTo(map);

// ---------------- GLOBAL DATA ----------------

let allChurches = [];
let churchMarkers = [];
let currentBoundaryLayer = null;
let currentBoundaryType = "county";

let gospelOpportunityData = {};

// ---------------- COLOURS ----------------

const gospelColours = {
  "High": "#e74c3c",
  "Significant": "#f39c12",
  "Lower": "#9ccc65",
  "Established Presence": "#2e8b57"
};

// ---------------- HELPERS ----------------

function clean(v) {
  return (v || "").toString().trim();
}

function norm(v) {
  return clean(v).toUpperCase();
}

function getColour(level) {
  return gospelColours[level] || "#cccccc";
}

// ---------------- LOAD GOSPEL CSV ----------------

function loadGospelData() {
  Papa.parse(`gospel-opportunities.csv?v=${CACHE_VERSION}`, {
    download: true,
    header: true,
    complete: function (res) {
      res.data.forEach(row => {
        const name = norm(row.LEA);
        if (name) gospelOpportunityData[name] = row;
      });
      console.log("Gospel data loaded");
    }
  });
}

// ---------------- LOAD BOUNDARIES ----------------

function loadBoundary(type) {

  if (currentBoundaryLayer) map.removeLayer(currentBoundaryLayer);

  currentBoundaryType = type;

  document.getElementById("gospelOpportunityLegend").style.display =
    (type === "gospel") ? "block" : "none";

  let file = "counties.geojson";
  if (type === "lea" || type === "gospel") file = "lea-boundaries.geojson";
  if (type === "urban") file = "urban-zones.geojson";

  fetch(`${file}?v=${CACHE_VERSION}`)
    .then(r => r.json())
    .then(data => {

      currentBoundaryLayer = L.geoJSON(data, {
        pane: "boundaryPane",

        style: function (feature) {

          if (type !== "gospel") {
            return {
              color: "#333",
              weight: 2,
              fillOpacity: 0.05
            };
          }

          const name = norm(
            feature.properties.LEA ||
            feature.properties.NAME ||
            feature.properties.Name
          );

          const row = gospelOpportunityData[name];
          const level = row ? clean(row.OpportunityLevel) : "";

          return {
            color: "#fff",
            weight: 1,
            fillColor: getColour(level),
            fillOpacity: 0.6
          };
        },

        onEachFeature: function (feature, layer) {

          const name =
            feature.properties.LEA ||
            feature.properties.NAME ||
            feature.properties.Name;

          layer.on("click", function () {

            let html = `<strong>${name}</strong><br>`;

            if (type === "gospel") {

              const row = gospelOpportunityData[norm(name)];

              if (row) {
                html += `
                  Population: ${row.Population || "?"}<br>
                  Churches: ${row.Churches || "?"}<br>
                  Level: ${row.OpportunityLevel}<br>
                  Type: ${row.OpportunityType || ""}
                `;
              } else {
                html += "No data yet";
              }

            }

            layer.bindPopup(html).openPopup();
          });
        }

      }).addTo(map);

      churchMarkers.forEach(m => m.bringToFront());

    });
}

// ---------------- CHURCHES ----------------

function loadChurches() {
  Papa.parse(`churches.csv?v=${CACHE_VERSION}`, {
    download: true,
    header: true,
    complete: function (res) {

      allChurches = res.data;

      churchMarkers = allChurches.map(c => {

        const lat = Number(c.Latitude);
        const lng = Number(c.Longitude);

        if (!lat || !lng) return null;

        const m = L.circleMarker([lat, lng], {
          pane: "churchPane",
          radius: 6,
          fillColor: "#0077cc",
          color: "#fff",
          weight: 1,
          fillOpacity: 0.9
        }).addTo(map);

        m.bindPopup(c["Church Name"] || "Church");

        return m;

      }).filter(Boolean);

    }
  });
}

// ---------------- EVENTS ----------------

document.getElementById("boundaryLayerSelect")
  .addEventListener("change", e => loadBoundary(e.target.value));

// ---------------- INIT ----------------

loadGospelData();
loadChurches();
loadBoundary("county");
