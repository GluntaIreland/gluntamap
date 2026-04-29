/*
  Glúnta Research Church Map
  Version: v0.7.2-layer-panes-click-fix

  Changes in this version:
  - Introduces Leaflet panes for proper layer ordering
  - LEA and Urban Zone polygons no longer block church markers
  - Churches always remain clickable above boundaries
*/

// --------------------------------------------------
// CACHE VERSION
// --------------------------------------------------

const CACHE_VERSION = "0.7.2";

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
// 🆕 PANES (THIS IS THE FIX)
// --------------------------------------------------

map.createPane("boundaryPane");
map.createPane("churchPane");

map.getPane("boundaryPane").style.zIndex = 400;
map.getPane("churchPane").style.zIndex = 650;

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

// --------------------------------------------------
// (UNCHANGED CODE BELOW)
// --------------------------------------------------
