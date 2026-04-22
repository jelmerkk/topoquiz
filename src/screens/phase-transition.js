// Topografie Quiz — fase-overgangsscherm (#96 increment 3).
//
// Fullscreen flash tussen twee fases van een phasedSet (bv. "Landen af!
// Volgende fase: Hoofdsteden"). Toont 1.8s, roept dan onDone() aan zodat
// finishAnswer() de quiz-state kan resetten voor de nieuwe fase.
//
// Pure view-functie: geen state, alleen DOM-lookup + setTimeout.

export function showPhaseTransition(fromPhase, toPhase, onDone) {
  const el   = document.getElementById('phase-transition');
  const text = document.getElementById('phase-transition-text');
  // #102: nieuwe Routekaart-tekst. <strong> krijgt grass-accent, .pt-next
  // is de body-regel onder de kop.
  text.innerHTML = `<strong>${fromPhase.label}</strong> af!<span class="pt-next">Volgende fase: ${toPhase.label}</span>`;
  el.style.display = 'flex';
  setTimeout(() => {
    el.style.display = 'none';
    onDone();
  }, 1800);
}
