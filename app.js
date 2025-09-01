/* =========================
   Datos de campos precargados
   ========================= */
const COURSES = [
  {
    alias: "troon",
    name: "Royal Troon",
    par: [4,4,4,5,3,5,4,3,4, 4,4,4,4,3,4,5,3,4],
    si:  [16,7,11,4,14,2,9,18,5, 10,1,6,12,15,3,8,13,17]
  },
  {
    alias: "western",
    name: "Western Gailes",
    par: [4,4,4,4,4,5,3,4,4, 4,4,4,3,5,3,4,4,4],
    si:  [13,3,11,9,1,5,15,7,17, 14,2,8,18,6,16,10,4,12]
  },
  {
    alias: "turnberry",
    name: "Trump Turnberry",
    par: [4,4,4,3,5,3,5,4,3, 5,3,4,4,5,3,4,4,4],
    si:  [6,10,4,16,8,18,12,2,14, 9,15,3,13,11,17,1,5,7]
  }
];

/* =========================
   Utilidades
   ========================= */
const $ = (id) => document.getElementById(id);

function setStatus(msg, type = "warn") {
  const el = $("statusMsg");
  el.style.color = type === "ok" ? "#93ffb9" : (type === "err" ? "#ff9c9c" : "#ffd38c");
  el.textContent = msg || "";
}

function allowanceValue() {
  const v = Number($("allowance").value || 90);
  return Math.min(100, Math.max(50, v)); // clamp 50..100
}

function playingHandicap(hcp) {
  // Redondeo al entero más próximo (ajústalo si tu club usa otro criterio de redondeo)
  return Math.round(hcp * allowanceValue() / 100);
}

function buildEmptyTable() {
  const tbody = $("tbody");
  tbody.innerHTML = "";
  for (let i = 1; i <= 18; i++) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="hole">${i}</td>
      <td class="par" data-hole="${i}">–</td>
      <td class="si" data-hole="${i}">–</td>
      <td class="strokes j1" data-hole="${i}">0</td>
      <td class="strokes j2" data-hole="${i}">0</td>
      <td class="strokes j3" data-hole="${i}">0</td>
      <td class="strokes j4" data-hole="${i}">0</td>
    `;
    tbody.appendChild(tr);
  }
}

function fillCourseSelect() {
  const sel = $("courseSelect");
  sel.innerHTML = "";
  COURSES.forEach((c, idx) => {
    const opt = document.createElement("option");
    opt.value = c.alias;
    opt.textContent = `${c.name} (${c.alias})`;
    if (idx === 0) opt.selected = true;
    sel.appendChild(opt);
  });
}

function getSelectedCourse() {
  const alias = $("courseSelect").value;
  return COURSES.find(c => c.alias === alias);
}

function applyCourseToTable(course) {
  if (!course || !Array.isArray(course.par) || !Array.isArray(course.si) ||
      course.par.length !== 18 || course.si.length !== 18) {
    setStatus("El campo seleccionado no tiene PAR/SI válidos (deben ser 18 valores).", "err");
    return false;
  }

  // Validar SI: debe contener exactamente 1..18
  const siSet = new Set(course.si);
  const siOk = course.si.every(n => Number.isInteger(n) && n >= 1 && n <= 18) && siSet.size === 18;
  if (!siOk) {
    setStatus("SI inválido: deben ser los 18 índices únicos del 1 al 18.", "err");
    return false;
  }

  // Pintar PAR y SI
  for (let i = 1; i <= 18; i++) {
    const parCell = document.querySelector(`td.par[data-hole="${i}"]`);
    const siCell  = document.querySelector(`td.si[data-hole="${i}"]`);
    parCell.textContent = course.par[i - 1];
    siCell.textContent  = course.si[i - 1];
  }

  setStatus(`Campo cargado: ${course.name}`, "ok");
  return true;
}

/* =========================
   Cálculo de golpes por hoyo
   ========================= */
function computeStrokes() {
  const course = getSelectedCourse();
  if (!applyCourseToTable(course)) {
    return;
  }

  // Nombres en cabecera (opcional, solo visual)
  $("hJ1").textContent = $("p1name").value || "Jugador 1";
  $("hJ2").textContent = $("p2name").value || "Jugador 2";
  $("hJ3").textContent = $("p3name").value || "Jugador 3";
  $("hJ4").textContent = $("p4name").value || "Jugador 4";

  // HCP y Playing Handicap (PH)
  const rawHcp = [
    Number($("p1hcp").value || 0),
    Number($("p2hcp").value || 0),
    Number($("p3hcp").value || 0),
    Number($("p4hcp").value || 0),
  ];
  const ph = rawHcp.map(playingHandicap);

  // Scratch = menor PH
  const scratch = Math.min(...ph);
  const diffs = ph.map(v => v - scratch); // contra scratch

  // Orden de hoyos por SI ascendente (para repartir golpes)
  const si = course.si;
  const order = si.map((v, idx) => ({ si: v, idx })).sort((a, b) => a.si - b.si); // [{si, idx}...]

  // Inicializar matriz 18x4 con 0
  const strokes = Array.from({ length: 18 }, () => [0, 0, 0, 0]);

  // Reparto de golpes: 1 golpe por hoyo siguiendo SI 1..18 (cíclico si diff > 18)
  diffs.forEach((d, j) => {
    for (let k = 0; k < d; k++) {
      const holeIndex = order[k % 18].idx; // 0..17
      strokes[holeIndex][j] += 1;
    }
  });

  // Pintar resultados como +n (o 0)
  for (let i = 1; i <= 18; i++) {
    const row = strokes[i - 1];
    document.querySelector(`td.j1[data-hole="${i}"]`).textContent = row[0] > 0 ? `+${row[0]}` : "0";
    document.querySelector(`td.j2[data-hole="${i}"]`).textContent = row[1] > 0 ? `+${row[1]}` : "0";
    document.querySelector(`td.j3[data-hole="${i}"]`).textContent = row[2] > 0 ? `+${row[2]}` : "0";
    document.querySelector(`td.j4[data-hole="${i}"]`).textContent = row[3] > 0 ? `+${row[3]}` : "0";
  }

  // Mensaje final con PH y scratch
  const prettyPH = ph.map((v, i) => `${($(["p1name","p2name","p3name","p4name"][i]).value || `J${i+1}`)}: ${v}`).join(" · ");
  setStatus(`Playing Handicap (Allowance ${allowanceValue()}%): ${prettyPH}. Scratch = ${scratch}.`, "ok");
}

/* =========================
   Init
   ========================= */
function init() {
  buildEmptyTable();
  fillCourseSelect();
  applyCourseToTable(getSelectedCourse());

  $("courseSelect").addEventListener("change", () => {
    buildEmptyTable();
    applyCourseToTable(getSelectedCourse());
  });

  $("btnCompute").addEventListener("click", computeStrokes);
}

document.addEventListener("DOMContentLoaded", init);
