# Glúnta Map

An interactive Leaflet map for visualising publicly discoverable non-Roman Catholic Christian church presence in the Republic of Ireland, alongside county, Local Electoral Area, urban-zone, and Gospel Opportunities data.

The project is part of Glúnta Research and is designed as a missiological tool rather than an ecclesiological judgement. Its purpose is to help churches, leaders, networks, and mission partners see where visible gospel presence appears strong, thin, fragile, or absent, and to encourage prayerful, practical collaboration for gospel ministry across Ireland.

---

## Current Version

Current public release: `v0.8.0`

Current development track: `v0.8.x`

The latest public release added the Gospel Opportunities layer, unreached town markers, improved church interaction, and removed the old bottom-right church details panel in favour of displaying information in the main side panel.

The current working development line continues to refine:

- Gospel Opportunities colour categories
- unreached town display
- Gospel Opportunities CSV download
- denomination and tradition filters
- mobile layout
- LEA and region name display
- overall usability of the map interface

---

## Project Purpose

The Glúnta Map is intended to help answer questions such as:

- Where are publicly listed Protestant, Evangelical, and other non-Roman Catholic Christian churches located in the Republic of Ireland?
- Which counties, LEAs, and urban areas have relatively few churches compared with population?
- Which towns appear to have no clearly discoverable non-Roman Catholic Christian church presence?
- Where might there be opportunities for church planting, strengthening, partnership, or further research?
- How can churches and mission partners better understand the geography of gospel presence in Ireland?

This map should not be read as a final or exhaustive judgement on the spiritual life of any place. It is a research tool, a conversation starter, and a way to identify areas where better information, local knowledge, and gospel partnership may be needed.

---

## Current Main Features

The map currently includes:

- Leaflet map centred on the Republic of Ireland
- OpenStreetMap base layer
- church data loaded from `churches.csv`
- church markers displayed as clickable map points
- church filtering by denomination or affiliation
- tradition-based filtering where available
- search filter for church names and locations
- county boundary layer
- Local Electoral Area boundary layer
- urban-zone boundary layer
- Gospel Opportunities layer
- clickable polygons for administrative and analytical areas
- side-panel information for selected counties, LEAs, urban zones, churches, or Gospel Opportunities
- population and church-count data where available
- people-per-church calculations where available
- unreached town markers
- downloadable CSV list for Gospel Opportunities, filtered according to selected options
- reset map controls
- clear boundary selection controls
- mobile layout improvements

---

## Repository Contents

The main files in this repository are:

| File | Purpose |
|---|---|
| `index.html` | Main page structure for the map |
| `style.css` | Layout, styling, panels, controls, and mobile presentation |
| `script.js` | Main Leaflet map logic and data-loading behaviour |
| `churches.csv` | Publicly discoverable church dataset |
| `county-data.csv` | County-level population and church-count data |
| `counties.geojson` | County boundary geometry |
| `lea-data.csv` | Local Electoral Area population and church-count data |
| `lea-boundaries.geojson` | Local Electoral Area boundary geometry |
| `urban-zone-data.csv` | Urban-zone population and church-count data |
| `urban-zones.geojson` | Urban-zone boundary geometry |
| `gospel-opportunities.csv` | Gospel Opportunities and unreached town data |
| `LICENSE` | MIT licence for source code |
| `DATA-LICENSE.md` | Data licence information |

---

## Version History

This project has developed through a series of staged versions. Earlier versions are retained here to show the development pathway and to make it easier to understand when features were added, tested, paused, or replaced.

| Version | Status | Summary |
|---|---|---|
| `v0.0` | Completed | Initial Leaflet map centred on Ireland with OpenStreetMap base layer |
| `v0.1` | Completed | Church points added from `churches.csv` |
| `v0.2` | Completed | Search and denomination filter added |
| `v0.3` | Completed | County boundaries added |
| `v0.3.1` | Completed | County population and people-per-church data added |
| `v0.4` | Completed | County profile side panel added |
| `v0.4.1` | Superseded | Attempted zoom-control repositioning through JavaScript |
| `v0.4.2` | Stable baseline | CSS safety fix for zoom-control positioning |
| `v0.4.3` | Completed | County click now fits whole county boundary into view |
| `v0.4.4` | Superseded | Denomination colour work |
| `v0.4.5` | Rolled back | Custom denomination dropdown experiment paused |
| `v0.4.6` | Stable baseline | Reliable denomination filter and marker colours restored |
| `v0.5` | Paused | Church detail panel experiment paused |
| `v0.5.1` | Paused | Leaflet panes experiment paused after interaction issues |
| `v0.5.2` | Paused | County dropdown alternative paused in favour of clickable polygons |
| `v0.6.x` | Completed | LEA layer and profile data added |
| `v0.7.x` | Completed | Counties, LEAs, and Urban Zones consolidated |
| `v0.8.0` | Public release | Gospel Opportunities layer added |
| `v0.8.x` | Current development | Gospel Opportunities refinements, CSV download, filters, colour scale, and usability improvements |

---

## Public Releases

The repository currently uses GitHub Releases to mark stable public points in the project.

Recent public releases include:

| Release | Summary |
|---|---|
| `v0.6.3-baseline` | Baseline map with church dataset, denominational filtering, county and LEA overlays, and population data |
| `v0.6.4-doi-update` | DOI / Zenodo baseline release, with no functional change from `v0.6.3` |
| `v0.7.1` | Counties, LEAs, and Urban Zones |
| `v0.8.0` | Gospel Opportunities layer, unreached town markers, church popup interaction, and removal of the old bottom-right church details panel |

---

## Data Scope

The core map focuses on the Republic of Ireland.

The church dataset is based on publicly discoverable information, including church websites, denominational directories, public listings, Google Maps listings, and other open sources.

The map currently does not attempt to include Roman Catholic parishes. In some research passes, Church of Ireland listings may be treated separately depending on the purpose of the analysis.

The project is particularly interested in visible, discoverable congregational presence rather than private, informal, or unlisted gatherings.

---

## Important Methodological Notes

This project is missiological, not ecclesiological.

Inclusion on the map does not necessarily imply endorsement of a church’s theology, practice, health, leadership, or current activity. Exclusion from the map does not imply that no Christian witness exists in that location.

Some records may be incomplete, outdated, duplicated, or incorrectly located. The project is actively being refined and depends on local knowledge, church feedback, and ongoing verification.

Key data questions include:

- Is the church still active?
- Is the listed meeting place correct?
- Is the Eircode correct?
- Do the latitude and longitude match the actual meeting place?
- Is the denomination or affiliation category accurate?
- Is the tradition category helpful and fair?
- Are there missing churches in a county, LEA, town, or urban area?

Corrections and suggested improvements are welcome.

---

## Gospel Opportunities Layer

The Gospel Opportunities layer highlights towns and areas where publicly discoverable church presence appears thin or absent.

This layer is intended to help identify possible places for:

- prayer
- further research
- local verification
- gospel partnership
- church strengthening
- pioneering ministry
- future church planting conversations

The categories in this layer should be treated as research prompts, not final judgements. A town may appear as an opportunity because no church has yet been identified in the dataset, because the available data is incomplete, or because the nearest listed church is outside the town or urban area being analysed.

---

## Development Priorities

The project is currently prioritising:

1. Data accuracy
2. Clearer denomination and tradition categorisation
3. Better mobile usability
4. Gospel Opportunities layer refinement
5. Downloadable filtered data
6. Cleaner documentation
7. Public transparency around method and limitations
8. Stable versioning before major feature changes

Before adding major new features, the map should preserve the following behaviours:

- church markers remain visible and clickable
- boundary layers remain selectable
- filters continue to work reliably
- selected area information appears clearly in the side panel
- Gospel Opportunities categories display with their correct colour range
- reset and clear-selection controls remain usable
- mobile view remains readable
- CSV downloads reflect selected filters
- version history remains traceable

---

## Known Issues / Active Refinements

Current or recent issues being refined include:

- Gospel Opportunities colour categories not always displaying the full intended spectrum
- region or LEA names displaying incorrectly where source field names do not match expected code fields
- mobile layout needing continued improvement
- denomination and tradition filtering needing clearer separation
- data accuracy checks still required across church names, meeting places, Eircodes, and coordinates
- removal of development clutter such as `.DS_Store`

---

## Licensing

The source code in this repository is licensed under the MIT License. See `LICENSE`.

The data files, including CSV and GeoJSON files created for the Glúnta Map project, are licensed under the Creative Commons Attribution 4.0 International License, CC BY 4.0, unless otherwise stated. See `DATA-LICENSE.md`.

Please attribute data use to:

Glúnta Research, Glúnta Map  
https://gluntaireland.github.io/gluntamap/

The Glúnta name, logo, and branding are not automatically licensed for reuse simply because the code and data are available. Reuse of the code or data should not imply endorsement by Glúnta Research unless permission has been given.

---

## Contributing Corrections

This project is still developing and will benefit from careful local knowledge.

Useful corrections include:

- missing churches
- closed churches
- incorrect church names
- incorrect meeting locations
- incorrect Eircodes
- incorrect coordinates
- duplicate entries
- wrong denomination or affiliation
- wrong tradition category
- better public source links
- local information about towns currently marked as Gospel Opportunities

When suggesting a correction, please include as much public evidence as possible.

---

## Project Status

Glúnta Map is an active research and development project.

It is usable as a public-facing exploratory map, but it should still be treated as a developing dataset rather than a finished national directory.

The goal is not merely to count churches. The goal is to help the church in Ireland see, pray, collaborate, and act with greater clarity.
