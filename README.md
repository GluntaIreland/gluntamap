# Glúnta Research Leaflet Map Progress

This document tracks the development history of the Glúnta Research Leaflet map, including completed versions, stable baselines, paused experiments, and rolled-back changes.

## Version History

| Version | Status | Changed File(s) | Summary | Notes |
|---|---|---|---|---|
| v0.0 | Completed | `index.html`; `script.js` | Initial Leaflet map | Map centred on Ireland with an OpenStreetMap base layer. |
| v0.1 | Completed | `script.js`; `churches.csv` | Church points added | Loaded `churches.csv` and displayed churches as map points. |
| v0.2 | Completed | `index.html`; `script.js` | Search and denomination filter added | Added a right-side panel with search and denomination filtering. |
| v0.3 | Completed | `script.js`; `counties.geojson` | County boundaries added | Loaded `counties.geojson` and added clickable county polygons. |
| v0.3.1 | Completed | `script.js`; `county-data.csv` | County population and people-per-church added | Loaded `county-data.csv` and calculated population-to-church ratios. |
| v0.4 | Completed | `index.html`; `script.js` | County profile side panel added | Left panel shows county population, churches listed, people per church, and church list. |
| v0.4.1 | Rolled forward, then superseded | `script.js` | Attempted zoom control bottom-right via JavaScript | Zoom control was moved using Leaflet configuration, but still needed a CSS safety fix. |
| v0.4.2 | Stable baseline | `index.html` | Zoom CSS safety fix | Forced Leaflet zoom control away from the top-left county panel using CSS. |
| v0.4.3 | Completed | `script.js` | County fit bounds on click | Clicking a county now keeps the whole county boundary in view instead of zooming only to church markers. |
| v0.4.4 | Superseded | `script.js`; `glunta-map-progress.csv` | Fixed denomination colours | Church dots used fixed colours by denomination while preserving county selection, search, filter reset, and county profile behaviour. |
| v0.4.5 | Paused / rolled back | `index.html`; `script.js`; `glunta-map-progress.csv` | Custom denomination dropdown colours | Custom dropdown proved unreliable, and church dots did not colour correctly. |
| v0.4.6 | Current | `index.html`; `script.js`; `glunta-map-progress.csv` | Denomination colour fix | Restored the normal denomination dropdown, added a colour preview dot, and fixed church marker colours by denomination. |
| v0.5 | Paused / rolled back | `script.js` | Church detail panel | Paused because it introduced interaction and layout complications. |
| v0.5.1 | Paused / rolled back | `script.js` | Leaflet panes fix attempt | Paused after marker and county click issues. |
| v0.5.2 | Paused / rolled back | `index.html`; `script.js` | County dropdown alternative | Paused in favour of keeping clickable county polygons. |

---

## Current Stable Version

**Current version:** `v0.4.6`

This is the current working version of the map.

### Current features

- Leaflet map centred on Ireland.
- OpenStreetMap base layer.
- Church data loaded from `churches.csv`.
- Churches displayed as round markers.
- Church markers coloured by denomination.
- Normal denomination dropdown retained for reliability.
- Colour preview dot added beside the denomination filter.
- Search filter for churches.
- County boundaries loaded from `counties.geojson`.
- County polygons are clickable.
- Clicking a county updates the county profile panel.
- Clicking a county fits the whole county boundary into view.
- County profile panel shows:
  - County name
  - Population
  - Number of churches listed
  - People per church
  - List of churches in that county
- Zoom controls safely positioned away from the county profile panel.

---

## Stable Baselines

### v0.4.2

This version is an important stable baseline because it fixed the layout issue where the Leaflet zoom control overlapped the county profile panel.

### v0.4.6

This is the current stable working version. It restores reliable denomination filtering while also fixing marker colours by denomination.

---

## Rolled-Back or Paused Experiments

The following versions were tested but paused or rolled back because they introduced layout, filtering, or interaction problems.

### v0.4.5

Attempted to create a custom denomination dropdown with visible colours inside the dropdown menu. This proved unreliable and caused issues with marker colouring.

### v0.5

Attempted to add a church detail panel. This was paused because it introduced interaction and layout complications.

### v0.5.1

Attempted to fix marker and county click behaviour using Leaflet panes. This was paused because marker and county interactions became unreliable.

### v0.5.2

Attempted to add a county dropdown alternative. This was paused in favour of keeping the clickable county polygon interaction.

---

## Development Notes

The project is currently prioritising stability over extra features.

The map should preserve the following core behaviours before new features are added:

1. Churches must remain clickable and visible.
2. County polygons must remain clickable.
3. Clicking a county must update the left county profile panel.
4. Clicking a county must fit the full county boundary in view.
5. Search and denomination filters must continue working.
6. Church marker colours must remain tied to denomination.
7. The zoom control must not overlap the county profile panel.

---

## Next Possible Development Steps

Possible future versions may include:

| Proposed Version | Feature | Notes |
|---|---|---|
| v0.4.7 | Improve denomination colour palette | Make denomination colours more visually distinct while preserving current working filter behaviour. |
| v0.4.8 | Improve mobile layout | Adjust side panels and controls for smaller screens. |
| v0.4.9 | Add better county profile formatting | Improve typography and spacing in the county profile panel. |
| v0.5 | Re-attempt church detail panel | Only attempt once the current click/filter behaviour is safely preserved. |
| v0.6 | Add LEA layer | Add Local Electoral Area polygons and profile data. |
| v0.7 | Add population overlays | Add population-based visual layers for county or LEA analysis. |
