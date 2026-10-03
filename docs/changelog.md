- 2.0
  * Rewrite as a dependency-free static site: no build step, no bundler, no
    dependencies to install. Chains saved by 1.6.x still load.
  * Real Solar System (RSS) support: select "Real Solar System" in Stock Data
    to use real-world body sizes, SOI, and 20× antenna/DSN ranges.
  * Three comm systems selectable from Settings:
    - Stock (CommNet) — original KSP range formula
    - RemoteTech — clamp-based ranges, Mission Control tech level 1–3
    - RealAntennas — physics link budget, tech level 0–9, duty-cycle EC
  * Each comm system has its own Part Groups section to enable/disable antenna
    sets (Stock, RemoteTech, RealAntennas).
  * Range Display Mode: choose "Antenna-to-Antenna" (relay-to-relay) or
    "DSN Level 1/2/3" (ground station) for range readouts.
  * New Craft tab: save, load, rename, and delete complete antenna
    configurations (presets).
  * Export/Import buttons in Settings: full JSON backup of settings, chain,
    custom bodies, antennas, and crafts.
  * Stable-altitude figure uses the original circleCross formula (depends on
    orbit + antenna range, not just satellite count).
  * Multiple Antenna Multiplier (MAM) updates instantly when changed — no
    page reload required.
  * MAM electricity (EC/s) is no longer incorrectly scaled by range multipliers.
  * Stock data dropdown no longer leaves the chain on a body the other list
    doesn't have; falls back to first available body.
  * Reset button fully clears localStorage and restores defaults without
    rewriting old version numbers.
  * Tabs mount correctly on first click (no empty panel).
  * Transfer plot no longer keeps the shape of the previous orbit.
  * "Clear All" no longer leaves user-created bodies/antennas behind.
  * Restored the original five-tab layout: Planner (Entire + 2×2 small + Data
    Input), Body Edit, Antenna Edit, Description, Settings.
  * Restored the original fixed-geometry schematics for Night, Single Launch,
    and Multiple Launch views (with moving figures).
  * Antenna ranges, night time, and power figures are now covered by automated
    tests.

- 1.6.6 : 2015/08/01
  * Fix calculation of Multiple Antenna Multiplier again. (westamastaflash)

- 1.6.5 : 2015/07/31
  * Fix calculation of Multiple Antenna Multiplier. (westamastaflash)

- 1.6.4 : 2015/07/19
  * Implement Range Multiplier.
  * Implement Multiple Antenna Multiplier.

- 1.6.3 : 2015/07/18
  * Fix unit of Slide time.

- 1.6.2 : 2015/07/07
  * Fix Delta-V unit of Multiple Launch View.

- 1.6.1 : 2015/07/06
  * Fix settings page.
  * Fix reset feature.

- 1.6 : 2015/07/06
  * Add Multiple Launch View.
  * Borderlines are drawn clearer.
  * Improved units used in Views.

- 1.5.6 : 2015/06/05
  * Fix calculation of night time. (Aerospace)

- 1.5.5 : 2015/05/08
  * Fix display of Slide time.

- 1.5.4 : 2015/05/07
  * Fix calculation of Delta-V.

- 1.5.3 : 2015/04/22
  * Views are now rendered by SVG.

- 1.5.2 : 2015/03/26
  * Add data for Real Solar System. (dirtcrusher)
  * Views shrink on small window.

- 1.5.1 : 2015/03/03
  * Fix some problems.

- 1.5 : 2015/03/03
  * Support multiple pair of antenna and quantity.
  * Fix autosave feature with local storage. Last input and user's bodies/antennas will be saved and restored automatically. (westamastaflash)

- 1.4 : 2015/01/29
  * Add remaining four dishes.

- 1.3.1 : 2015/01/03
  * Fix file reference.

- 1.3 : 2015/01/03
  * Move user-data management for body and antenna to tab pages.
  * Views are now rendered on any change within Data Input.

- 1.2.1 : 2014/11/03
  * Fix label of the second distance.

- 1.2 : 2014/11/01
  * Faster loading of the page.
  * Fix position of labels in Night view.
  * Autosave last calculation.

- 1.1 : 2014/10/16
  * Show the distance between a satellite and the one after the next.

- 1.0 : 2014/08/27
  * Implement Delta-V view about the delta-v to deploy satellites.

- beta2.4.1 : 2014/08/23
  * Fix indication of sphere of influence.

- beta2.4 : 2014/08/17
  * Implement manual input mode for antenna (sorry for my wrong history).  
  * User-created antenna data is stored in cookie.

- beta2.3.1 : 2014/08/16
  * Fix calculation of stable range, the result was too high.

- beta2.3 : 2014/08/15
  * Draw sphere of influence.  
  * Overhaul input validation.  
  * Better display method for numbers.

- beta2.2 : 2014/08/13
  * Filled all data except extra-long range dishes.  
  * Implement dynamic canvas resizing.  
  * User-created body data is stored in cookie.

- beta2.1 : 2014/08/12
  * Manual input mode is now available for body.

- beta2 : 2014/08/10
  * Implement Night view calculate about electricity.
   
- beta1 : 2014/08/09
  * Implement Entire view for satellites network planning.