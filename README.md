kspRemoteTechPlanner
====================

A satellite network planner for multiple Kerbal Space Program communication mods:
[RemoteTech](https://forum.kerbalspaceprogram.com/topic/139167-remote-tech),
[RealAntennas](https://github.com/DRVeyl/RealAntennas),
[Near Future Exploration](https://forum.kerbalspaceprogram.com/topic/155465-near-future-technologies),
and stock [CommNet](https://wiki.kerbalspaceprogram.com/wiki/CommNet).
Also supports [Real Solar System](https://forum.kerbalspaceprogram.com/topic/177216-real-solar-system).

This is a modified fork of [ryohpops/kspRemoteTechPlanner](https://github.com/ryohpops/kspRemoteTechPlanner).

Give it a body, an orbit and a set of antennas, and it tells you what that constellation can and cannot do: whether the ring closes, how much of the orbit is spent in the body's shadow, and how far a new satellite's transfer node has to be slid to land it on the next free spot.

It is a static site. Open `index.html` from a web server, or publish the repository as-is with GitHub Pages. There is no build step, no bundler and no dependency to install: the browser loads the ES modules straight from disk.

**Live demo: https://ryans1230.github.io/kspRemoteTechPlanner**

Supported comm systems
----------------------

| System | Features |
|--------|----------|
| Stock CommNet | Raw cfg data, DSN levels L1–L3, geometric mean range, packet-based EC |
| RemoteTech | Mission Control tech tiers (4/30/75 Mm), min-range clamping, direct EC/s |
| RealAntennas | Link budget (gain, path loss, pointing loss), target tech level TL0–9 |
| RSS | 20× antenna power, custom DSN levels, corrected celestial bodies |
| NearFutureExploration | 22 antennas from NFE cfg, shared Stock settings |

The tabs
--------

| Tab | What it is for |
| --- | --- |
| Planner | Data input on the right, four figures on the left: entire view (full-width), then night, single launch and multiple launch (2×2). |
| Body Edit | Stock body table and editor for custom bodies. |
| Antenna Edit | Stock antenna table and editor for custom antennas. |
| Craft | Save/load/rename/delete antenna configuration presets. |
| Description | How to read the plots, and how to carry a figure over into MechJeb. |
| Settings | Comm system selector, part-group toggles, system-specific settings, range display mode, MAM, export/import/clear data. |

Antenna ranges and other figures are what the mod would report with the multipliers in settings applied, not measurements from the game.

Where your data is kept
-----------------------

Everything is kept in this browser's local storage under `kspRemoteTechPlanner.*`, and nowhere else. Nothing is sent anywhere. Clearing site data in the browser clears everything the planner knows, and the same is true of *Clear all data* on the settings tab; neither can be undone.

Saved chains from the 1.6.x versions are read as they were written, including the older single-antenna chains and the versions that stored a whole body or antenna record in the chain.

Running the tests
-----------------

The tests cover the reactive layer, the template layer, the calculator and the store, and run on Node with no dependencies:

    npm test

Additional harnesses: `npm run smoke` (mount all views), `npm run drive` (simulate interactions), `npm run check-imports` (verify ES module resolution).

Contributing
------------

Browser code is 4-space indented, uses double quotes and semicolons, and is plain ES modules with JSDoc types rather than TypeScript. Keep it that way: the point of the rewrite was that a file in the browser can be read and edited without anything else installed.

Licence
-------

MIT. See [LICENSE.md](LICENSE.md). Copyright (c) 2014 ryohpops (original author), 2026–present current maintainers.
