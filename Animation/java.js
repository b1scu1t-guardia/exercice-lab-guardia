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

// ===== Cat Facts =====
const catBtn = document.getElementById("catFactBtn");
const catText = document.getElementById("catFactText");

catBtn.addEventListener("click", async () => {
  catBtn.disabled = true;
  catText.textContent = "Chargement…";

  try {
    const res = await fetch("https://catfact.ninja/fact");
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    catText.textContent = data.fact;
  } catch (err) {
    catText.textContent = "Impossible de récupérer un fait sur les chats 😿";
    console.error(err);
  } finally {
    catBtn.disabled = false;
  }
});

console.log(" Mon pokémon préféré c'est amphynobi ")  

const pokemons = [
  { nom: "Draco" },
  { nom: "Amphi" },
  { nom: "Pikachu" },
  { nom: "Bulbizard" },
  { nom: "Groudon" },
];

console.log(pokemons[0].nom);
console.log(pokemons[1].nom);
console.log(pokemons[2].nom);
console.log(pokemons[3].nom);
console.log(pokemons[4].nom);

const pokebouton = document.getElementById("pokeFactBtn");   
const pokebouton2 = document.getElementById("pokeFactBtn2"); 

// j'isole amphinobi
pokebouton.addEventListener("click", () => {
  cards.forEach((card) => {
    const name = normalize(card.querySelector(".PokeTitre h1").textContent);
    card.style.display = name.includes("amphinobi") ? "" : "none";
  });
});


pokebouton2.addEventListener("click", () => {
  input.value = "";
  cards.forEach((card) => (card.style.display = ""));
});
