var ICONS = {
  polo: '<path d="M30 20 L42 14 Q50 22 58 14 L70 20 L84 34 L74 44 L68 38 L68 84 L32 84 L32 38 L26 44 L16 34 Z" fill="currentColor"/>',
  zapatilla: '<path d="M8 62 L8 48 Q30 50 40 34 L52 42 Q62 50 74 50 Q92 50 94 62 L94 72 L8 72 Z" fill="currentColor"/><path d="M8 72 H94" stroke="var(--bg)" stroke-width="3"/>',
  gorra: '<path d="M18 60 Q18 28 50 28 Q82 28 82 60 Z" fill="currentColor"/><path d="M14 64 H94 V71 H14 Z" fill="currentColor"/>',
  cartera: '<path d="M26 40 H74 L80 84 H20 Z" fill="currentColor"/><path d="M38 40 V30 Q38 18 50 18 Q62 18 62 30 V40" fill="none" stroke="currentColor" stroke-width="5"/>',
  vestido: '<path d="M40 14 H60 L58 36 L76 88 H24 L42 36 Z" fill="currentColor"/>',
  lentes: '<circle cx="30" cy="52" r="17" fill="currentColor"/><circle cx="70" cy="52" r="17" fill="currentColor"/><path d="M47 50 H53" stroke="currentColor" stroke-width="5"/>',
  casaca: '<path d="M32 14 L44 12 L50 22 L56 12 L68 14 L88 34 L80 52 L72 46 L72 88 H28 V46 L20 52 L12 34 Z" fill="currentColor"/>',
  reloj: '<rect x="36" y="30" width="28" height="40" rx="8" fill="currentColor"/><path d="M40 8 H60 V30 H40 Z M40 70 H60 V92 H40 Z" fill="currentColor" opacity="0.6"/>'
};
var DATA = window.CATALOG;
var PRODUCTS = DATA.products, PIN = DATA.pin, admin = false, dirty = false, editing = null;
var CATS = ["All", "Zapatillas", "Ropa", "Accesorios", "Sunglasses"];
var WHO = ["All", "Men's", "Women's", "Kid's"];
var WHO_KEY = { "Men's": "men", "Women's": "women", "Kid's": "kids" };
var CAT_ICON = { Zapatillas: "zapatilla", Ropa: "polo", Accesorios: "gorra", Sunglasses: "lentes" };
var state = { who: "All", cat: "All", q: "" };
var who = document.getElementById("who"), chips = document.getElementById("chips"), grid = document.getElementById("grid"), count = document.getElementById("count"), q = document.getElementById("q");

function esc(s) { return String(s).replace(/[&<>"]/g, function (m) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]; }); }
function norm(s) { return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
function hashPin(s) { var x = 5381, t = "ryadlux:" + s; for (var i = 0; i < t.length; i++) x = ((x << 5) + x + t.charCodeAt(i)) | 0; return String(x >>> 0); }

/* ---- guardado local (IndexedDB) ---- */
function idb(mode, fn) {
  return new Promise(function (res, rej) {
    try {
      var r = indexedDB.open("ryadlux", 1);
      r.onupgradeneeded = function () { r.result.createObjectStore("kv"); };
      r.onerror = function () { rej(r.error); };
      r.onsuccess = function () {
        var tx = r.result.transaction("kv", mode), out = fn(tx.objectStore("kv"));
        tx.oncomplete = function () { res(out && out.result); };
        tx.onerror = function () { rej(tx.error); };
      };
    } catch (e) { rej(e); }
  });
}
function saveDraft() {
  dirty = true;
  return idb("readwrite", function (s) { return s.put({ base: DATA.rev, products: PRODUCTS, pin: PIN }, "draft"); })
    .then(function () { status("Cambios guardados en este navegador · falta publicar"); })
    .catch(function () { status("No se pudo guardar en el navegador. Descarga el data.js ahora."); });
}

/* ---- catálogo ---- */
function drawChips() {
  chips.innerHTML = WHO.map(function (c) {
    return '<button type="button" class="chip" data-who="' + c + '" aria-pressed="' + (state.who === c) + '">' + c + '</button>';
  }).join("");
}
function imgsOf(p) { return p.imgs || (p.img ? [p.img] : []); }
function render() {
  var term = norm(state.q.trim());
  chips.hidden = state.cat === "Sunglasses";
  var list = [];
  PRODUCTS.forEach(function (p, ix) {
    if ((state.who === "All" || state.cat === "Sunglasses" || p.w === WHO_KEY[state.who] || p.w === "unisex") && (state.cat === "All" || p.c === state.cat) && (!term || norm(p.n + " " + (p.d || "") + " " + (p.k || "")).indexOf(term) > -1)) list.push({ p: p, ix: ix });
  });
  count.textContent = list.length + (list.length === 1 ? " producto" : " productos");
  if (!list.length) {
    grid.innerHTML = !term
      ? '<p class="empty">Estamos preparando esta sección. Pronto verás productos aquí.</p>'
      : '<p class="empty">No hay productos con esa búsqueda. Prueba con otra palabra o elige otra categoría.</p>';
    return;
  }
  grid.innerHTML = list.map(function (o) {
    var p = o.p, im = imgsOf(p);
    var pic = im.length ? '<img class="main" src="' + im[0] + '" alt="' + esc(p.n) + '">' : '<svg viewBox="0 0 100 100" aria-hidden="true">' + (ICONS[p.i] || ICONS.polo) + '</svg><span class="pending">Foto por confirmar</span>';
    var thumbs = im.length > 1 ? '<div class="thumbs">' + im.map(function (s, i) {
      return '<button type="button" class="thumb" aria-label="Ver foto ' + (i + 1) + '" aria-pressed="' + (i === 0) + '"><img src="' + s + '" alt=""></button>';
    }).join("") + '</div>' : '';
    var rows = (p.t ? '<div><dt>Tallas</dt><dd>' + esc(p.t) + '</dd></div>' : '') + (p.k ? '<div><dt>Color</dt><dd>' + esc(p.k) + '</dd></div>' : '');
    return '<article class="card">' +
      '<div class="photo' + (im.length ? ' has-img' : '') + '" style="--h:' + (p.h || 120) + '">' + (p.tag ? '<span class="tag">' + esc(p.tag) + '</span>' : '') + pic + '</div>' + thumbs +
      '<div class="meta"><h2 class="name">' + esc(p.n) + '</h2><span class="price">' + (p.p ? 'S/ ' + p.p : 'Consultar precio') + '</span></div>' +
      (p.d ? '<p class="desc">' + esc(p.d) + '</p>' : '') +
      (rows ? '<dl class="opts">' + rows + '</dl>' : '') +
      (admin ? '<div class="adm-actions"><button type="button" class="adm-btn" data-edit="' + o.ix + '">Editar</button><button type="button" class="adm-btn dng" data-del="' + o.ix + '">Eliminar</button></div>' : '') +
      '</article>';
  }).join("");
}
grid.addEventListener("click", function (e) {
  var ed = e.target.closest("[data-edit]"), dl = e.target.closest("[data-del]");
  if (ed) { openForm(+ed.getAttribute("data-edit")); return; }
  if (dl) {
    var ix = +dl.getAttribute("data-del");
    if (confirm('¿Eliminar "' + PRODUCTS[ix].n + '"?')) { PRODUCTS.splice(ix, 1); saveDraft(); render(); }
    return;
  }
  var b = e.target.closest(".thumb");
  if (!b) return;
  var card = b.closest(".card");
  card.querySelector(".main").src = b.querySelector("img").src;
  card.querySelectorAll(".thumb").forEach(function (t) { t.setAttribute("aria-pressed", String(t === b)); });
});
function drawWho() {
  who.innerHTML = CATS.map(function (w) {
    return '<button type="button" data-cat="' + w + '" aria-pressed="' + (state.cat === w) + '">' + w + '</button>';
  }).join("");
}
who.addEventListener("click", function (e) {
  var b = e.target.closest("button[data-cat]");
  if (!b) return;
  state.cat = b.getAttribute("data-cat");
  drawWho(); render();
});
chips.addEventListener("click", function (e) {
  var b = e.target.closest("button[data-who]");
  if (!b) return;
  state.who = b.getAttribute("data-who");
  drawChips(); render();
});
q.addEventListener("input", function () { state.q = q.value; render(); });

/* ---- panel de administrador ---- */
var bar = null, dlg = null;
function status(t) { var s = document.getElementById("admSt"); if (s) s.textContent = t; }
function fileToData(f) {
  return new Promise(function (res, rej) {
    var fr = new FileReader();
    fr.onload = function () {
      var im = new Image();
      im.onload = function () {
        var s = Math.min(1, 900 / Math.max(im.width, im.height)), c = document.createElement("canvas");
        c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
        var x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
        res(c.toDataURL("image/jpeg", 0.84));
      };
      im.onerror = rej; im.src = fr.result;
    };
    fr.onerror = rej; fr.readAsDataURL(f);
  });
}
function enterAdmin() {
  if (admin) return;
  var v = prompt("Clave de administrador");
  if (v === null) return;
  if (hashPin(v) !== PIN) { alert("Clave incorrecta"); return; }
  admin = true;
  document.documentElement.classList.add("is-admin");
  bar = document.createElement("div");
  bar.className = "adm-bar adm-ui";
  bar.innerHTML = '<strong>Modo administrador</strong><span class="st" id="admSt">' + (dirty ? "Hay cambios sin publicar" : "Sin cambios") + '</span>' +
    '<button class="adm-btn pri" data-a="new">+ Nuevo producto</button>' +
    '<button class="adm-btn" data-a="export">Descargar data.js</button>' +
    '<button class="adm-btn" data-a="reset">Descartar cambios</button>' +
    '<button class="adm-btn" data-a="pin">Cambiar clave</button>' +
    '<button class="adm-btn" data-a="exit">Salir</button>';
  document.querySelector(".wrap").insertAdjacentElement("beforebegin", bar);
  bar.addEventListener("click", function (e) {
    var a = e.target.getAttribute("data-a");
    if (a === "new") openForm(-1);
    else if (a === "export") exportData();
    else if (a === "reset") resetDraft();
    else if (a === "pin") changePin();
    else if (a === "exit") exitAdmin();
  });
  render();
}
function exitAdmin() {
  if (dirty && !confirm("Hay cambios sin publicar (siguen guardados en este navegador). ¿Salir?")) return;
  admin = false; document.documentElement.classList.remove("is-admin");
  if (bar) bar.remove(); bar = null; render();
}
function changePin() {
  var a = prompt("Nueva clave (mínimo 4 caracteres)");
  if (a === null) return;
  if (a.length < 4) { alert("Muy corta"); return; }
  PIN = hashPin(a); saveDraft(); alert("Clave cambiada. Descarga e sube el data.js para que quede publicada.");
}
function resetDraft() {
  if (!confirm("¿Descartar todos los cambios y volver a la última versión publicada?")) return;
  idb("readwrite", function (s) { return s.delete("draft"); }).finally(function () { location.reload(); });
}
function exportData() {
  var out = "/* Datos del cat\u00e1logo. Generado desde el panel Admin. */\nwindow.CATALOG = " + JSON.stringify({ rev: new Date().toISOString(), pin: PIN, products: PRODUCTS }, null, 1) + ";\n";
  var blob = new Blob([out], { type: "text/javascript" });
  var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "data.js";
  document.body.appendChild(a); a.click(); a.remove();
  status("data.js descargado \u00b7 s\u00fabelo a la carpeta js de GitHub para publicarlo");
}
function openForm(ix) {
  var p = ix > -1 ? PRODUCTS[ix] : { c: state.cat !== "All" && state.cat !== "Sunglasses" ? state.cat : "Zapatillas", w: WHO_KEY[state.who] || "men" };
  editing = { ix: ix, imgs: imgsOf(p).slice() };
  if (!dlg) { dlg = document.createElement("dialog"); dlg.className = "adm-ui"; document.body.appendChild(dlg); }
  var opt = function (list, cur) { return list.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === cur ? " selected" : "") + ">" + o[1] + "</option>"; }).join(""); };
  dlg.innerHTML = '<form method="dialog" id="admF"><h3>' + (ix > -1 ? "Editar producto" : "Nuevo producto") + '</h3>' +
    '<label class="adm-f">Nombre<input name="n" required value="' + esc(p.n || "") + '"></label>' +
    '<div class="adm-row"><label class="adm-f">Categoría<select name="c">' + opt(CATS.slice(1).map(function (c) { return [c, c]; }), p.c) + '</select></label>' +
    '<label class="adm-f">Público<select name="w">' + opt([["men", "Men's"], ["women", "Women's"], ["kids", "Kid's"], ["unisex", "Unisex"]], p.w) + '</select></label></div>' +
    '<div class="adm-row"><label class="adm-f">Precio (S/) — vacío = Consultar precio<input name="p" type="number" min="0" step="any" value="' + (p.p || "") + '"></label>' +
    '<label class="adm-f">Etiqueta (opcional)<input name="tag" value="' + esc(p.tag || "") + '"></label></div>' +
    '<div class="adm-row"><label class="adm-f">Tallas<input name="t" placeholder="8 al 11.5" value="' + esc(p.t || "") + '"></label>' +
    '<label class="adm-f">Color<input name="k" value="' + esc(p.k || "") + '"></label></div>' +
    '<label class="adm-f">Descripción<textarea name="d" rows="3">' + esc(p.d || "") + '</textarea></label>' +
    '<div class="adm-f">Fotos (la primera es la principal)</div><div class="adm-ph" id="admPh"></div>' +
    '<label class="adm-f"><input type="file" id="admFile" accept="image/*" multiple></label>' +
    '<div class="adm-foot"><button type="button" class="adm-btn" id="admCancel">Cancelar</button><button type="submit" class="adm-btn pri">Guardar</button></div></form>';
  drawPh();
  dlg.showModal();
  document.getElementById("admCancel").onclick = function () { dlg.close(); };
  document.getElementById("admFile").onchange = function (e) {
    var fs = Array.prototype.slice.call(e.target.files);
    Promise.all(fs.map(fileToData)).then(function (r) { editing.imgs = editing.imgs.concat(r); drawPh(); e.target.value = ""; });
  };
  document.getElementById("admPh").onclick = function (e) {
    var x = e.target.getAttribute("data-x"), m = e.target.getAttribute("data-m");
    if (x !== null) editing.imgs.splice(+x, 1);
    else if (m !== null) editing.imgs.unshift(editing.imgs.splice(+m, 1)[0]);
    else return;
    drawPh();
  };
  document.getElementById("admF").onsubmit = function () {
    var f = document.getElementById("admF"), g = function (k) { return f.elements[k].value.trim(); };
    var o = editing.ix > -1 ? PRODUCTS[editing.ix] : { i: "", h: 120 };
    o.n = g("n"); o.c = g("c"); o.w = g("w"); o.p = g("p") ? Number(g("p")) : null;
    if (!o.i || editing.ix < 0) o.i = CAT_ICON[o.c];
    ["t", "k", "d", "tag"].forEach(function (k) { if (g(k)) o[k] = g(k); else delete o[k]; });
    if (editing.imgs.length) o.imgs = editing.imgs; else delete o.imgs;
    delete o.img;
    if (editing.ix < 0) PRODUCTS.push(o);
    saveDraft(); render();
  };
}
function drawPh() {
  document.getElementById("admPh").innerHTML = editing.imgs.map(function (s, i) {
    return '<div class="' + (i ? "" : "first") + '"><img src="' + s + '" alt=""><button type="button" data-x="' + i + '" aria-label="Quitar foto">×</button>' + (i ? '<button type="button" class="mk" data-m="' + i + '">Principal</button>' : "") + '</div>';
  }).join("") || '<span style="font-size:.85rem;color:var(--muted)">Sin fotos</span>';
}
document.getElementById("admLink").addEventListener("click", enterAdmin);

drawWho(); drawChips(); render();
try {
  idb("readonly", function (s) { return s.get("draft"); }).then(function (d) {
    if (d && d.base === DATA.rev) { PRODUCTS = d.products; PIN = d.pin || PIN; dirty = true; render(); }
  }).catch(function () {});
} catch (e) {}
