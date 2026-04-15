// Playwright helpers — stabiele wacht-condities die races elimineren (#79).
// Gebruik deze in plaats van losse waitForFunction/waitForTimeout hacks.

/**
 * Wacht tot polygonTypes[type] zijn featureData geladen heeft en buildPolygonLayer
 * minstens één keer is uitgevoerd voor de huidige set. Optioneel wacht op een
 * specifieke layer-naam (bijv. 'Luxemburg') zodat de test weet dat het item
 * daadwerkelijk in de actieve pool zit.
 */
async function waitForPolygonLayer(page, type, layerName = null) {
  await page.waitForFunction(
    ({ type, layerName }) => {
      // `polygonTypes` is een const op top-level → bereikbaar als global identifier,
      // niet als window-property. Gebruik `typeof`-check i.p.v. window-lookup.
      if (typeof polygonTypes === 'undefined') return false;
      const t = polygonTypes[type];
      if (!t || !t.featureData) return false;
      if (!t.layersBuilt) return false;
      if (layerName && !t.layers[layerName]) return false;
      return true;
    },
    { type, layerName },
    { timeout: 15000 }
  );
}

/**
 * Wacht tot de map-klik-handler is aangesloten voor de huidige vraag.
 * Voorkomt de set57-flake waarbij de test al klikt voordat handleMapClick
 * op de map is gebonden.
 */
async function waitForMapClickReady(page) {
  await page.waitForFunction(
    () => {
      if (typeof gameMode === 'undefined' || gameMode !== 'map') return false;
      if (typeof map === 'undefined' || !map) return false;
      const listeners = map._events?.click;
      return Array.isArray(listeners) && listeners.length > 0;
    },
    { timeout: 10000 }
  );
}

module.exports = { waitForPolygonLayer, waitForMapClickReady };
