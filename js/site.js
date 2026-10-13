(function(){
  // Prijzen en data. De actieprijs geldt van verschijning t/m PROMO_END (max. 3 maanden, gemeld bij CvdM).
  var REGULAR = 34.95;                      // vaste boekenprijs, incl. btw
  var PROMO = 29.95;                        // actieprijs (introductieprijs)
  var RELEASE = new Date(2026, 10, 16);     // 16 november 2026 (maanden tellen vanaf 0)
  var PROMO_END = new Date(2027, 1, 16);    // actieprijs geldt t/m 15 februari 2027
  var today = new Date();
  var promo = today < PROMO_END, prelaunch = today < RELEASE;
  var PRICE = promo ? PROMO : REGULAR;
  var SHIP = { NL: 0, BE: 5.00, LU: 5.00 };   // verzendkosten per bestelling; buiten de Benelux in overleg
  var COUNTRY = { NL: "Nederland", BE: "België", LU: "Luxemburg" };
  var MAX_QTY = 99;           // 100+ via offerte
  // Staffelkorting binnen de Wet op de vaste boekenprijs: 10–29 st. max 5%, 30–99 st. max 10%
  var TIERS = [ { min: 30, pct: 10 }, { min: 10, pct: 5 } ];
  var ENDPOINT = "https://formsubmit.co/ajax/info@leadingit.nl";
  var euro = function(n){ var p = n.toFixed(2).split("."); return "€" + p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + p[1]; };

  // Mobile menu
  var toggle = document.getElementById("menu-toggle"), nav = document.getElementById("nav");
  toggle.addEventListener("click", function(){
    var open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  nav.addEventListener("click", function(e){ if (e.target.closest("a")) { nav.classList.remove("open"); toggle.setAttribute("aria-expanded","false"); } });

  document.getElementById("year").textContent = new Date().getFullYear();

  // Prijzen, badge en voorbestel-teksten op de pagina bijwerken op basis van de datum
  var each = function(sel, fn){ Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  each("[data-price-now]", function(el){ el.textContent = euro(PRICE); });
  each("[data-price-was], [data-promo-note]", function(el){ el.hidden = !promo; });
  each("[data-prelaunch]", function(el){ el.hidden = !prelaunch; });
  each("[data-badge]", function(el){
    el.textContent = prelaunch ? "Verschijnt 16 november 2026 · Nu voorbestellen" : (promo ? "Nieuw boek · Introductieprijs t/m 15 februari 2027" : "Nieuw boek");
  });
  each("[data-price-box]", function(el){
    el.setAttribute("aria-label", "Prijs: " + euro(PRICE).replace("€", "") + " euro" + (promo ? ", introductieprijs tot en met 15 februari 2027, daarna 34,95 euro" : "") + ", inclusief verzendkosten binnen Nederland; naar België en Luxemburg 5 euro verzendkosten per bestelling");
  });

  // Everything below is for the order form (only on /nl/boek/)
  if (!document.getElementById("order-form")) return;

  // Quantity + total
  var qty = document.getElementById("f-aantal"), land = document.getElementById("f-land"), total = document.getElementById("f-total");
  var $ = function(id){ return document.getElementById(id); };
  function clampQty(){ var n = parseInt(qty.value, 10); if (isNaN(n) || n < 1) n = 1; if (n > MAX_QTY) n = MAX_QTY; return n; }
  function round2(x){ return Math.round(x * 100) / 100; }
  function calc(){
    var n = clampQty(), pct = 0;
    for (var i = 0; i < TIERS.length; i++) if (n >= TIERS[i].min) { pct = TIERS[i].pct; break; }
    var cc = SHIP.hasOwnProperty(land.value) ? land.value : "NL";
    var books = round2(n * PRICE), disc = round2(books * pct / 100), ship = SHIP[cc];
    return { n: n, pct: pct, books: books, disc: disc, ship: ship, total: round2(books - disc + ship), cc: cc, country: COUNTRY[cc], abroad: cc !== "NL" };
  }
  function update(){
    var c = calc();
    $("c-books-label").textContent = c.n + " × " + euro(PRICE);
    $("c-books").textContent = euro(c.books);
    $("c-disc-row").hidden = c.pct === 0;
    $("c-disc-label").textContent = "Staffelkorting " + c.pct + "%";
    $("c-disc").textContent = "− " + euro(c.disc);
    $("c-ship-label").textContent = "Verzendkosten " + c.country;
    $("c-ship").textContent = c.abroad ? euro(c.ship) : "inbegrepen";
    total.textContent = euro(c.total);
    var hint = $("qty-hint");
    if (c.n >= 6 && c.n < 10) hint.innerHTML = "Nog <b>" + (10 - c.n) + "</b> " + (10 - c.n === 1 ? "boek" : "boeken") + " tot 5% staffelkorting.";
    else if (c.n >= 20 && c.n < 30) hint.innerHTML = "Nog <b>" + (30 - c.n) + "</b> " + (30 - c.n === 1 ? "boek" : "boeken") + " tot 10% staffelkorting.";
    else if (c.n === MAX_QTY) hint.innerHTML = "100 of meer? <a href=\"#contact\">Neem contact op</a> voor een offerte.";
    else hint.textContent = "Staffelkorting: 5% vanaf 10 boeken, 10% vanaf 30 boeken.";
  }
  document.getElementById("qty-min").addEventListener("click", function(){ qty.value = Math.max(1, clampQty() - 1); update(); });
  document.getElementById("qty-plus").addEventListener("click", function(){ qty.value = Math.min(MAX_QTY, clampQty() + 1); update(); });
  qty.addEventListener("input", update);
  land.addEventListener("change", update);
  update();
  qty.addEventListener("blur", function(){ qty.value = clampQty(); update(); });

  // Mobile number check: international format (+31 6 …, +32 4 …, +352 6 …) and a mobile number, no landlines.
  // Uses libphonenumber (number type per country); without it, falls back to a strict Dutch check.
  var tel = document.getElementById("f-tel");
  function isMobile(raw){
    var d = raw.replace(/[\s\-().]/g, "");
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
  function checkTel(){
    var raw = tel.value.trim();
    tel.setCustomValidity(raw && !isMobile(raw) ? "Ongeldig mobiel nummer" : "");
  }
  tel.addEventListener("input", checkTel);

  // Submit
  var form = document.getElementById("order-form"), msg = document.getElementById("form-msg"), btn = document.getElementById("submit-btn");
  var BTN_TEXT = prelaunch ? "Voorbestelling plaatsen" : "Bestelling plaatsen";
  btn.textContent = BTN_TEXT;
  function val(id){ return document.getElementById(id).value.trim(); }

  function orderText(){
    var c = calc();
    return [
      "Bestelling: Beter navigeren zonder strakker te sturen (luxe hardcover)" + (prelaunch ? " – VOORBESTELLING, verzending vanaf 16-11-2026" : ""),
      "Aantal: " + c.n + " × " + euro(PRICE) + " = " + euro(c.books),
      c.pct ? "Staffelkorting " + c.pct + "%: − " + euro(c.disc) : "Staffelkorting: geen",
      "Verzendkosten: " + (c.abroad ? euro(c.ship) + " (" + c.country + ")" : "inbegrepen (Nederland)"),
      "Totaal: " + euro(c.total),
      "",
      "Naam: " + val("f-naam"),
      "E-mail: " + val("f-email"),
      "Mobiel: " + val("f-tel"),
      "Organisatie: " + (val("f-org") || "-"),
      "Adres: " + val("f-adres") + ", " + val("f-postcode") + " " + val("f-plaats") + ", " + calc().country,
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
      var done = function(){ copy.textContent = "Gekopieerd"; };
      try { navigator.clipboard.writeText(text).then(done, function(){ selectPre(); }); } catch(e){ selectPre(); }
    });
    function selectPre(){ var r = document.createRange(); r.selectNodeContents(pre); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); copy.textContent = "Tekst geselecteerd – kopieer met Ctrl/Cmd+C"; }
    actions.appendChild(mail); actions.appendChild(copy);
    msg.appendChild(p); msg.appendChild(pre); msg.appendChild(actions);
  }

  form.addEventListener("submit", function(e){
    e.preventDefault();
    msg.hidden = true;
    checkTel();
    if (!form.checkValidity()) {
      var first = form.querySelector(":invalid");
      msg.className = "form-msg err"; msg.hidden = false;
      msg.textContent = first && first.id === "f-akkoord" ? "Vink aan dat je akkoord gaat met de bestelling." : (first && first.id === "f-tel" ? "Vul een mobiel nummer in met landcode, bijvoorbeeld +31 6 12345678. Vaste nummers worden niet geaccepteerd, omdat je op dit nummer het betaalverzoek ontvangt." : "Vul de verplichte velden in: naam, een geldig e-mailadres, je mobiele nummer en je adres.");
      if (first) first.focus();
      return;
    }
    if (form._honey.value) return; // spam
    var c = calc(), n = c.n, text = orderText();
    var payload = {
      _subject: (prelaunch ? "Voorbestelling boek – " : "Boekbestelling – ") + n + "x – " + val("f-naam"),
      _template: "table",
      _replyto: val("f-email"),
      boek: "Beter navigeren zonder strakker te sturen (luxe hardcover, ISBN 9789083392240)",
      soort: prelaunch ? "Voorbestelling (verzending vanaf 16-11-2026)" : "Bestelling", aantal: n, prijs_per_stuk: euro(PRICE) + (promo ? " (introductieprijs)" : ""), subtotaal: euro(c.books), staffelkorting: c.pct ? c.pct + "% (− " + euro(c.disc) + ")" : "geen", verzendkosten: c.abroad ? euro(c.ship) + " (" + c.country + ")" : "inbegrepen (Nederland)", totaal: euro(c.total),
      naam: val("f-naam"), email: val("f-email"), mobiel: val("f-tel"), organisatie: val("f-org"),
      adres: val("f-adres"), postcode: val("f-postcode"), plaats: val("f-plaats"), land: c.country, opmerking: val("f-opm")
    };
    btn.disabled = true; btn.textContent = "Bezig met versturen…";
    fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(payload) })
      .then(function(r){ return r.json().then(function(j){ if (!r.ok || String(j.success) !== "true") throw new Error(j.message || "fout"); }); })
      .then(function(){
        msg.className = "form-msg ok"; msg.hidden = false;
        msg.textContent = "Bedankt, " + val("f-naam") + "! Je bestelling van " + n + " " + (n === 1 ? "boek" : "boeken") + " (" + euro(c.total) + ") is ontvangen. Je krijgt een bevestiging op " + val("f-email") + " en een betaalverzoek op " + val("f-tel") + ".";
        form.reset(); update();
      })
      .catch(function(){ showError(text); })
      .finally(function(){ btn.disabled = false; btn.textContent = BTN_TEXT; });
  });
})();
