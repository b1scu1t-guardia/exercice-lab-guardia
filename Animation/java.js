const input = document.getElementById("searchInput");
const cards = document.querySelectorAll(".PokeTemplate");

// Ignore les accents et la casse : "salameche" trouve "Salamèche"
const normalize = (s) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

input.addEventListener("input", () => {
  const query = normalize(input.value);

  cards.forEach((card) => {
    // Le nom est le premier <h1> de la carte
    const name = normalize(card.querySelector(".PokeTitre h1").textContent);
    card.style.display = name.includes(query) ? "" : "none";
  });
});


// ZOOM ET PARALAXE 

// ===== Carte en grand au clic =====
const overlay = document.createElement("div");
overlay.className = "PokeOverlay";
document.body.appendChild(overlay);

let big = null;

function openCard(card) {
  big = card.cloneNode(true);       // copie de la carte cliquée
  big.classList.add("PokeBig");
  big.style.display = "";

  // Taille adaptée à l'écran (1.8x max)
  const s = Math.min(1.8, (innerHeight * 0.9) / 400, (innerWidth * 0.9) / 280);
  big.style.setProperty("--s", s);

  const sweep = document.createElement("span");
  sweep.className = "PokeSweep";
  big.appendChild(sweep);

  overlay.innerHTML = "";
  overlay.appendChild(big);
  overlay.classList.add("open");
}

function closeCard() {
  overlay.classList.remove("open");
  big = null;
}

cards.forEach((card) => card.addEventListener("click", () => openCard(card)));

// Inclinaison selon la position de la souris (ou du doigt)
// Inclinaison + reflet qui suivent la souris (ou le doigt)
overlay.addEventListener("pointermove", (e) => {
  if (!big) return;

  // Inclinaison selon la position sur l'écran (de -0.5 à 0.5)
  const tx = e.clientX / innerWidth - 0.5;
  const ty = e.clientY / innerHeight - 0.5;
  big.style.setProperty("--ry", `${tx * 20}deg`);
  big.style.setProperty("--rx", `${-ty * 20}deg`);

  // Reflet selon la position sur la carte
  const r = big.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * 100;
  const y = ((e.clientY - r.top) / r.height) * 100;
  big.style.setProperty("--mx", `${x}%`);
  big.style.setProperty("--my", `${y}%`);
});

// Fermer : clic n'importe où, ou touche Échap
overlay.addEventListener("click", closeCard);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeCard();
});

console . log ( " Pokémon préféré est Pikachu " ) ;


const utilisateurs = [
  { nom: "Groudon"},
  { nom: "Amphinobi"},
  { nom: "Pikachu"},
  { nom: "Bulbizarre"}
];

console.table(utilisateurs);
