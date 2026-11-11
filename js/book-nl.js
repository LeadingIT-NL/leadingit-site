(function(){
  // Bestelmodule voor de Nederlandse boekpagina (/nl/boek/).
  // Data: voorverkoop vanaf PRESALE, boekpresentatie en verschijning op LAUNCH,
  // introductieprijs t/m de dag voor PROMO_END (3 maanden na verschijning).
  var REGULAR = 34.95;                       // vaste boekenprijs, incl. btw
  var PROMO = 29.95;                         // introductieprijs
  var PRESALE = new Date(2026, 10, 15);      // 15 november 2026 (maanden tellen vanaf 0)
  var LAUNCH = new Date(2027, 1, 10);        // 10 februari 2027
  var PROMO_END = new Date(2027, 4, 11);     // introductieprijs t/m 10 mei 2027
  var SHIP = { NL: 0, BE: 5.00, LU: 5.00 };  // verzendkosten per bestelling
  var COUNTRY = { NL: "Nederland", BE: "België", LU: "Luxemburg" };
  var MAX_QTY = 99;
  var TIERS = [ { min: 30, pct: 10 }, { min: 10, pct: 5 } ];  // binnen de Wet op de vaste boekenprijs
  var ENDPOINT = "https://formsubmit.co/ajax/info@leadingit.nl";

  // Testen: ?datum=2027-02-11 op de pagina simuleert een andere dag.
  var today = new Date(), m = /[?&]datum=(\d{4})-(\d{2})-(\d{2})/.exec(location.search);
  if (m) today = new Date(+m[1], +m[2] - 1, +m[3], 12);
  var open = today >= PRESALE, prelaunch = today < LAUNCH, promo = today < PROMO_END;
  var PRICE = promo ? PROMO : REGULAR;

  var $ = function(id){ return document.getElementById(id); };
  var each = function(sel, fn){ Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  var euro = function(n){ var p = n.toFixed(2).split("."); return "€" + p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + p[1]; };
  var round2 = function(x){ return Math.round(x * 100) / 100; };

  // Teksten op de pagina afstemmen op de datum
  each("[data-price-now]", function(el){ el.textContent = euro(PRICE); });
  each("[data-price-was], [data-promo-note]", function(el){ el.hidden = !promo; });
  each("[data-prelaunch]", function(el){ el.hidden = !prelaunch; });
  each("[data-postlaunch]", function(el){ el.hidden = prelaunch; });
  each("[data-badge]", function(el){
    el.textContent = prelaunch ? "Boekpresentatie 10 februari 2027 · Nu voorbestellen"
      : (promo ? "Nu verkrijgbaar · Introductieprijs t/m 10 mei 2027" : "Nu verkrijgbaar");
  });
  each("[data-cta]", function(el){ el.textContent = prelaunch ? "Bestel nu voor" : "Bestel het boek"; });
  each("[data-order-eyebrow]", function(el){ el.textContent = prelaunch ? "Voorverkoop" : "Bestellen"; });
  each("[data-price-box]", function(el){
    el.setAttribute("aria-label", "Prijs: " + euro(PRICE).replace("€", "") + " euro" +
      (promo ? ", introductieprijs tot en met 10 mei 2027, daarna 34,95 euro" : "") + ", inclusief verzendkosten binnen Nederland");
  });

  var form = $("order-form");
  if (!form) return;
  if (!open) { form.hidden = true; $("presale-wait").hidden = false; return; }

  var qty = $("f-aantal"), land = $("f-land"), lev = $("f-levering"), ev = $("f-event");
  var BTN_TEXT = prelaunch ? "Voorbestelling plaatsen" : "Bestelling plaatsen";
  var btn = $("submit-btn"), msg = $("form-msg");
  btn.textContent = BTN_TEXT;
  if (!prelaunch) {
    ev.checked = false;
    $("f-levering").querySelector('[value="verzenden"]').textContent = "Verzenden";
    each("[data-delivery-label]", function(el){ el.textContent = "Levering"; });
  }

  function clampQty(){ var n = parseInt(qty.value, 10); if (isNaN(n) || n < 1) n = 1; if (n > MAX_QTY) n = MAX_QTY; return n; }
  function shipping(){ return lev.value === "verzenden"; }
  function calc(){
    var n = clampQty(), pct = 0;
    for (var i = 0; i < TIERS.length; i++) if (n >= TIERS[i].min) { pct = TIERS[i].pct; break; }
    var cc = SHIP.hasOwnProperty(land.value) ? land.value : "NL";
    var ship = shipping() ? SHIP[cc] : 0;
    var books = round2(n * PRICE), disc = round2(books * pct / 100);
    return { n: n, pct: pct, books: books, disc: disc, ship: ship, total: round2(books - disc + ship), cc: cc, country: COUNTRY[cc] };
  }
  function update(){
    var c = calc();
    // Adresvelden alleen nodig bij verzenden
    var addr = $("address-fields"), need = shipping();
    addr.hidden = !need;
    each("#address-fields input", function(el){ el.required = need; });
    $("persons-field").hidden = !ev.checked;
    $("c-books-label").textContent = c.n + " × " + euro(PRICE);
    $("c-books").textContent = euro(c.books);
    $("c-disc-row").hidden = c.pct === 0;
    $("c-disc-label").textContent = "Staffelkorting " + c.pct + "%";
    $("c-disc").textContent = "− " + euro(c.disc);
    $("c-ship-label").textContent = need ? "Verzendkosten " + c.country : "Persoonlijk overhandigen";
    $("c-ship").textContent = c.ship ? euro(c.ship) : (need ? "inbegrepen" : "geen kosten");
    $("f-total").textContent = euro(c.total);
    var hint = $("qty-hint");
    if (c.n >= 6 && c.n < 10) hint.innerHTML = "Nog <b>" + (10 - c.n) + "</b> " + (10 - c.n === 1 ? "boek" : "boeken") + " tot 5% staffelkorting.";
    else if (c.n >= 20 && c.n < 30) hint.innerHTML = "Nog <b>" + (30 - c.n) + "</b> " + (30 - c.n === 1 ? "boek" : "boeken") + " tot 10% staffelkorting.";
    else if (c.n === MAX_QTY) hint.innerHTML = "100 of meer? <a href=\"#contact\">Neem contact op</a> voor een offerte.";
    else hint.textContent = "Staffelkorting: 5% vanaf 10 boeken, 10% vanaf 30 boeken.";
  }
  $("qty-min").addEventListener("click", function(){ qty.value = Math.max(1, clampQty() - 1); update(); });
  $("qty-plus").addEventListener("click", function(){ qty.value = Math.min(MAX_QTY, clampQty() + 1); update(); });
  qty.addEventListener("input", update);
  qty.addEventListener("blur", function(){ qty.value = clampQty(); update(); });
  [land, lev, ev].forEach(function(el){ el.addEventListener("change", update); });
  update();

  // Mobiel nummer: internationaal formaat en een mobiel nummer (libphonenumber indien geladen)
  var tel = $("f-tel");
  function isMobile(raw){
    var d = raw.replace(/[\s\-().]/g, "");
    if (/^06\d{8}$/.test(d)) d = "+31" + d.slice(1);
    if (!/^\+\d{8,15}$/.test(d)) return false;
    var L = window.libphonenumber;
    if (L && L.parsePhoneNumberFromString) {
      var pn = L.parsePhoneNumberFromString(d);
      if (!pn || !pn.isValid()) return false;
      var t = pn.getType();
      return t === "MOBILE" || t === "FIXED_LINE_OR_MOBILE";
    }
    if (d.indexOf("+31") === 0) return /^\+31(6\d{8}|97\d{9})$/.test(d);
    return true;
  }
  function checkTel(){ var raw = tel.value.trim(); tel.setCustomValidity(raw && !isMobile(raw) ? "Ongeldig mobiel nummer" : ""); }
  tel.addEventListener("input", checkTel);

  function val(id){ return $(id).value.trim(); }
  function eventText(){ return prelaunch ? (ev.checked ? "ja, " + val("f-persons") + " pers." : "nee") : "-"; }
  function deliveryText(){
    var d = shipping() ? "verzenden naar " + val("f-adres") + ", " + val("f-postcode") + " " + val("f-plaats") + ", " + calc().country : "persoonlijk overhandigen (in overleg)";
    return prelaunch ? (ev.checked ? "uitreiking op de presentatie; anders " + d : d + " (direct na 10-02-2027)") : d;
  }
  function orderText(){
    var c = calc();
    return [
      "Bestelling: Beter navigeren zonder strakker te sturen (luxe hardcover)" + (prelaunch ? " – VOORBESTELLING" : ""),
      "Aantal: " + c.n + " × " + euro(PRICE) + " = " + euro(c.books),
      c.pct ? "Staffelkorting " + c.pct + "%: − " + euro(c.disc) : "Staffelkorting: geen",
      "Verzendkosten: " + (shipping() ? (c.ship ? euro(c.ship) + " (" + c.country + ")" : "inbegrepen (Nederland)") : "geen (persoonlijk overhandigen)"),
      "Totaal: " + euro(c.total),
      "Boekpresentatie 10-02-2027: " + eventText(),
      "Levering: " + deliveryText(),
      "",
      "Naam: " + val("f-naam"),
      "E-mail: " + val("f-email"),
      "Mobiel: " + val("f-tel"),
      "Organisatie: " + (val("f-org") || "-"),
      "Opmerking: " + (val("f-opm") || "-")
    ].join("\n");
  }

  function showError(text){
    msg.className = "form-msg err"; msg.hidden = false; msg.innerHTML = "";
    var p = document.createElement("p");
    p.textContent = "Je bestelling kon niet automatisch worden verstuurd. Stuur onderstaande gegevens naar info@leadingit.nl, dan wordt je bestelling alsnog verwerkt.";
    var pre = document.createElement("pre"); pre.textContent = text;
    var actions = document.createElement("div"); actions.className = "actions";
    var mail = document.createElement("a"); mail.className = "btn btn-navy";
    mail.href = "mailto:info@leadingit.nl?subject=" + encodeURIComponent("Boekbestelling – " + val("f-naam")) + "&body=" + encodeURIComponent(text);
    mail.textContent = "Open in e-mailprogramma";
    var copy = document.createElement("button"); copy.type = "button"; copy.className = "btn btn-gold"; copy.textContent = "Kopieer bestelling";
    copy.addEventListener("click", function(){
      try { navigator.clipboard.writeText(text).then(function(){ copy.textContent = "Gekopieerd"; }, selectPre); } catch(e){ selectPre(); }
    });
    function selectPre(){ var r = document.createRange(); r.selectNodeContents(pre); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); copy.textContent = "Tekst geselecteerd – kopieer met Ctrl/Cmd+C"; }
    actions.appendChild(mail); actions.appendChild(copy);
    msg.appendChild(p); msg.appendChild(pre); msg.appendChild(actions);
  }

  form.addEventListener("submit", function(e){
    e.preventDefault();
    msg.hidden = true;
    checkTel(); update();
    if (!form.checkValidity()) {
      var first = form.querySelector(":invalid");
      msg.className = "form-msg err"; msg.hidden = false;
      msg.textContent = first && first.id === "f-akkoord" ? "Vink aan dat je akkoord gaat met de bestelling."
        : (first && first.id === "f-tel" ? "Vul een mobiel nummer in, bijvoorbeeld +31 6 12345678. Vaste nummers werken niet, omdat je op dit nummer het betaalverzoek ontvangt."
        : "Vul de verplichte velden in: naam, een geldig e-mailadres, je mobiele nummer" + (shipping() ? " en je adres." : "."));
      if (first) first.focus();
      return;
    }
    if (form._honey.value) return; // spam
    var c = calc(), n = c.n, text = orderText();
    var payload = {
      _subject: (prelaunch ? "Voorbestelling boek – " : "Boekbestelling – ") + n + "x – " + (prelaunch && ev.checked ? "WIL NAAR PRESENTATIE – " : "") + val("f-naam"),
      _template: "table",
      _replyto: val("f-email"),
      _autoresponse: "Bedankt voor je " + (prelaunch ? "voorbestelling" : "bestelling") + " van Beter navigeren zonder strakker te sturen (" + n + "x, totaal " + euro(c.total) + "). Je ontvangt binnenkort een betaalverzoek op je mobiele nummer." + (prelaunch ? " Het boek verschijnt op 10 februari 2027." + (ev.checked ? " In januari laten we je weten of er een plek voor je is bij de boekpresentatie in Rotterdam." : "") : "") + " Vragen? Mail naar info@leadingit.nl. Met vriendelijke groet, Raymond Koppe",
      boek: "Beter navigeren zonder strakker te sturen (luxe hardcover, ISBN 9789083392240)",
      soort: prelaunch ? "Voorbestelling" : "Bestelling",
      aantal: n, prijs_per_stuk: euro(PRICE) + (promo ? " (introductieprijs)" : ""), subtotaal: euro(c.books),
      staffelkorting: c.pct ? c.pct + "% (− " + euro(c.disc) + ")" : "geen",
      verzendkosten: shipping() ? (c.ship ? euro(c.ship) + " (" + c.country + ")" : "inbegrepen (Nederland)") : "geen (persoonlijk overhandigen)",
      totaal: euro(c.total),
      boekpresentatie: eventText(),
      levering: deliveryText(),
      naam: val("f-naam"), email: val("f-email"), mobiel: val("f-tel"), organisatie: val("f-org"), opmerking: val("f-opm")
    };
    btn.disabled = true; btn.textContent = "Bezig met versturen…";
    fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(payload) })
      .then(function(r){ return r.json().then(function(j){ if (!r.ok || String(j.success) !== "true") throw new Error(j.message || "fout"); }); })
      .then(function(){
        msg.className = "form-msg ok"; msg.hidden = false;
        msg.textContent = "Bedankt, " + val("f-naam") + "! Je " + (prelaunch ? "voorbestelling" : "bestelling") + " van " + n + " " + (n === 1 ? "boek" : "boeken") + " (" + euro(c.total) + ") is ontvangen. Je krijgt een betaalverzoek op " + val("f-tel") + "." +
          (prelaunch && ev.checked ? " In januari laten we je weten of er een plek voor je is bij de boekpresentatie." : "");
        form.reset(); update();
      })
      .catch(function(){ showError(text); })
      .finally(function(){ btn.disabled = false; btn.textContent = BTN_TEXT; });
  });
})();
