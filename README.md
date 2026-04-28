# Glúnta Research Leaflet Map Progress

This document tracks the development history of the Glúnta Research Leaflet map, including completed versions, stable baselines, paused experiments, rolled-back changes, and publishing/deployment progress.

---

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
| v0.4.6 | Current map-code baseline | `index.html`; `script.js`; `glunta-map-progress.csv` | Denomination colour fix | Restored the normal denomination dropdown, added a colour preview dot, and fixed church marker colours by denomination. |
| v0.5 | Paused / rolled back | `script.js` | Church detail panel | Paused because it introduced interaction and layout complications. |
| v0.5.1 | Paused / rolled back | `script.js` | Leaflet panes fix attempt | Paused after marker and county click issues. |
| v0.5.2 | Paused / rolled back | `index.html`; `script.js` | County dropdown alternative | Paused in favour of keeping clickable county polygons. |

---

## Publishing and Deployment History

| Version / Stage | Status | Changed Area | Summary | Notes |
|---|---|---|---|---|
| deploy-0.1 | Completed | GitHub repository | Project moved into GitHub | Map files were added to a GitHub repository so the project can be versioned and hosted publicly. |
| deploy-0.2 | Completed | Repository visibility | Repository made public | Required so GitHub Pages can serve the map publicly. |
| deploy-0.3 | Completed / in progress depending on GitHub Actions | GitHub Pages | GitHub Pages enabled | GitHub Pages build was queued. This is the first public-hosting step for the map. |
| deploy-0.4 | Pending confirmation | GitHub Pages live URL | Confirm live public map link | Once the GitHub Pages action completes successfully, the map should be available at the GitHub Pages URL. |
| deploy-0.5 | Future | Wix embed | Embed map into Wix | Once the GitHub Pages URL is live, it can be embedded into a Wix page using an HTML iframe/embed element. |

---

## Current Stable Version

**Current map-code version:** `v0.4.6`

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

## Current Deployment Status

The map has now moved beyond local-only development and into GitHub hosting.

### Current publishing position

- The project files are in GitHub.
- The repository has been made public.
- GitHub Pages has been enabled.
- GitHub Actions / Pages build has been queued or is being processed.
- The next step is to confirm that the GitHub Pages build completes successfully.
- Once the live GitHub Pages URL is available, it can be embedded into Wix.

### Important distinction

`v0.4.6` remains the current stable **map-code version**.

The GitHub/GitHub Pages work is a **deployment milestone**, not a change to the actual Leaflet map behaviour.

---

## Stable Baselines

### v0.4.2

This version is an important stable baseline because it fixed the layout issue where the Leaflet zoom control overlapped the county profile panel.

### v0.4.6

This is the current stable working map-code version. It restores reliable denomination filtering while also fixing marker colours by denomination.

### deploy-0.3

This is the current hosting baseline. The project is now being prepared for public access through GitHub Pages.

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
8. The project should remain safely versioned in GitHub before major new changes.
9. Major experiments should be developed as new versions rather than overwriting the current stable baseline.
10. Hosting changes should be tracked separately from map-code changes.

---

## Next Possible Development Steps

Possible future versions may include:

| Proposed Version | Feature | Notes |
|---|---|---|
| deploy-0.4 | Confirm GitHub Pages live URL | Check that the map loads correctly from the public GitHub Pages address. |
| deploy-0.5 | Embed map into Wix | Use the GitHub Pages URL inside a Wix embed/HTML element. |
| v0.4.7 | Improve denomination colour palette | Make denomination colours more visually distinct while preserving current working filter behaviour. |
| v0.4.8 | Improve mobile layout | Adjust side panels and controls for smaller screens. |
| v0.4.9 | Add better county profile formatting | Improve typography and spacing in the county profile panel. |
| v0.5 | Re-attempt church detail panel | Only attempt once the current click/filter behaviour is safely preserved. |
| v0.6 | Add LEA layer | Add Local Electoral Area polygons and profile data. |
| v0.7 | Add Small Areas layer | Add Small Areas polygons and related population/church analysis. |
| v0.8 | Add Urban Zones layer | Add urban/town zones with population and church data only. |
| v0.9 | Add population overlays | Add population-based visual layers for county, LEA, small area, or urban analysis. |
| v1.0 | First public research release | A stable, hosted version suitable for wider sharing and feedback. |

---

## Planned Four-Layer Development Track

The next major map development phase is likely to move beyond counties and add four distinct analytical layers.

### Layer 1: LEA Boundaries

Add Local Electoral Area boundaries with the same core layout already used for counties:

- LEA name
- Population
- Churches listed
- People per church
- Church list within selected LEA
- Clickable polygon interaction

This should probably become `v0.6`.

### Layer 2: Small Areas

Add Small Areas as a more granular layer.

This would allow analysis below county and LEA level, especially for identifying areas of thin or absent church presence.

This should probably become `v0.7`.

### Layer 3: Urban Zones

Add urban/town zones.

At present this layer should only include:

- Population data
- Church data

No extra demographic or religious-affiliation data should be added yet.

This should probably become `v0.8`.

### Layer 4: Priority LEA Analysis

Create a ranked analytical list of LEAs based on mission priority.

The first version should identify LEAs with:

- Highest population
- Fewer than 3 churches
- Largest distance from another church

This should probably become `v0.10` or a separate analytical file/module.

---

## Suggested Release Structure

The current project does not need to be labelled as a full public release yet unless a stable, shareable version is ready.

A sensible approach would be:

| Release | Meaning |
|---|---|
| v0.4.6 | Current stable development baseline |
| deploy-0.3 | GitHub Pages hosting enabled / queued |
| v1.0 | First public-facing release once the hosted map is stable, tested, and ready to share |

For now, `v0.4.6` should be treated as the safest working baseline.
