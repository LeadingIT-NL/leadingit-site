(function(){
  // English edition: Loosen the Grip, Hold the Course (ISBN 9789083392295)
  // Prices and dates. Change these values here; the page updates itself.
  var REGULAR = 29.95;                      // regular price incl. VAT
  var PROMO = 26.95;                        // introductory price
  var RELEASE = new Date(2026, 11, 18);     // 18 December 2026 (months count from 0)
  var PROMO_END = new Date(2027, 2, 18);    // introductory price valid until 17 March 2027
  var PROMO_END_TEXT = "17 March 2027";
  var today = new Date();
  var promo = today < PROMO_END, prelaunch = today < RELEASE;
  var PRICE = promo ? PROMO : REGULAR;
  var SHIP = { NL: 0, BE: 5.00, LU: 5.00 }; // shipping per order; outside the Benelux by arrangement
  var COUNTRY = { NL: "Netherlands", BE: "Belgium", LU: "Luxembourg" };
  var COUNTRY_NL = { NL: "Nederland", BE: "België", LU: "Luxemburg" };   // for the order e-mail to LeadingIT
  var MAX_QTY = 99;                         // 100+ by quote
  var TIERS = [ { min: 30, pct: 10 }, { min: 10, pct: 5 } ];
  var ENDPOINT = "https://formsubmit.co/ajax/info@leadingit.nl";
  var euro = function(n){ var p = n.toFixed(2).split("."); return "€" + p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + p[1]; };
  var euroNL = function(n){ var p = n.toFixed(2).split("."); return "€" + p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + p[1]; };

  // Mobile menu
  var toggle = document.getElementById("menu-toggle"), nav = document.getElementById("nav");
  toggle.addEventListener("click", function(){
    var open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  nav.addEventListener("click", function(e){ if (e.target.closest("a")) { nav.classList.remove("open"); toggle.setAttribute("aria-expanded","false"); } });

  document.getElementById("year").textContent = new Date().getFullYear();

  // Prices, badge and pre-order texts based on today's date
  var each = function(sel, fn){ Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  each("[data-price-now]", function(el){ el.textContent = euro(PRICE); });
  each("[data-price-was], [data-promo-note]", function(el){ el.hidden = !promo; });
  each("[data-prelaunch]", function(el){ el.hidden = !prelaunch; });
  each("[data-badge]", function(el){
    el.textContent = prelaunch ? "Published 18 December 2026 · Pre-order now" : (promo ? "New book · Introductory price until " + PROMO_END_TEXT : "New book");
  });
  each("[data-price-box]", function(el){
    el.setAttribute("aria-label", "Price: " + euro(PRICE).replace("€", "") + " euros" + (promo ? ", introductory price until " + PROMO_END_TEXT + ", then 29.95 euros" : "") + ", including shipping within the Netherlands; 5 euros shipping per order to Belgium and Luxembourg");
  });

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
    return { n: n, pct: pct, books: books, disc: disc, ship: ship, total: round2(books - disc + ship), cc: cc, abroad: cc !== "NL" };
  }
  function update(){
    var c = calc();
    $("c-books-label").textContent = c.n + " × " + euro(PRICE);
    $("c-books").textContent = euro(c.books);
    $("c-disc-row").hidden = c.pct === 0;
    $("c-disc-label").textContent = "Volume discount " + c.pct + "%";
    $("c-disc").textContent = "− " + euro(c.disc);
    $("c-ship-label").textContent = "Shipping " + COUNTRY[c.cc];
    $("c-ship").textContent = c.abroad ? euro(c.ship) : "included";
    total.textContent = euro(c.total);
    var hint = $("qty-hint");
    if (c.n >= 6 && c.n < 10) hint.innerHTML = "<b>" + (10 - c.n) + "</b> more " + (10 - c.n === 1 ? "book" : "books") + " for a 5% volume discount.";
    else if (c.n >= 20 && c.n < 30) hint.innerHTML = "<b>" + (30 - c.n) + "</b> more " + (30 - c.n === 1 ? "book" : "books") + " for a 10% volume discount.";
    else if (c.n === MAX_QTY) hint.innerHTML = "100 or more? <a href=\"#contact\">Get in touch</a> for a quote.";
    else hint.textContent = "Volume discount: 5% from 10 books, 10% from 30 books.";
  }
  document.getElementById("qty-min").addEventListener("click", function(){ qty.value = Math.max(1, clampQty() - 1); update(); });
  document.getElementById("qty-plus").addEventListener("click", function(){ qty.value = Math.min(MAX_QTY, clampQty() + 1); update(); });
  qty.addEventListener("input", update);
  land.addEventListener("change", update);
  update();
  qty.addEventListener("blur", function(){ qty.value = clampQty(); update(); });

  // Mobile number: international format and a mobile number (no landlines)
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
    tel.setCustomValidity(raw && !isMobile(raw) ? "Invalid mobile number" : "");
  }
  tel.addEventListener("input", checkTel);

  // Submit
  var form = document.getElementById("order-form"), msg = document.getElementById("form-msg"), btn = document.getElementById("submit-btn");
  var BTN_TEXT = prelaunch ? "Place pre-order" : "Place order";
  btn.textContent = BTN_TEXT;
  function val(id){ return document.getElementById(id).value.trim(); }

  // The order e-mail to LeadingIT is in Dutch, clearly marked as the ENGLISH edition.
  function orderText(){
    var c = calc();
    return [
      "Bestelling ENGELSE EDITIE: Loosen the Grip, Hold the Course (luxe softcover, ISBN 9789083392295)" + (prelaunch ? " – VOORBESTELLING, verzending vanaf 18-12-2026" : ""),
      "Aantal: " + c.n + " × " + euroNL(PRICE) + " = " + euroNL(c.books),
      c.pct ? "Staffelkorting " + c.pct + "%: − " + euroNL(c.disc) : "Staffelkorting: geen",
      "Verzendkosten: " + (c.abroad ? euroNL(c.ship) + " (" + COUNTRY_NL[c.cc] + ")" : "inbegrepen (Nederland)"),
      "Totaal: " + euroNL(c.total),
      "",
      "Naam: " + val("f-naam"),
      "E-mail: " + val("f-email"),
      "Mobiel: " + val("f-tel"),
      "Organisatie: " + (val("f-org") || "-"),
      "Adres: " + val("f-adres") + ", " + val("f-postcode") + " " + val("f-plaats") + ", " + COUNTRY_NL[c.cc],
      "Opmerking: " + (val("f-opm") || "-")
    ].join("\n");
  }

  function showError(text){
    msg.className = "form-msg err"; msg.hidden = false; msg.innerHTML = "";
    var p = document.createElement("p");
    p.textContent = "Your order could not be sent automatically. Please send the details below to info@leadingit.nl and your order will still be processed.";
    var pre = document.createElement("pre"); pre.textContent = text;
    var actions = document.createElement("div"); actions.className = "actions";
    var mail = document.createElement("a"); mail.className = "btn btn-navy";
    mail.href = "mailto:info@leadingit.nl?subject=" + encodeURIComponent("Order English edition – " + val("f-naam")) + "&body=" + encodeURIComponent(text);
    mail.textContent = "Open in email app";
    var copy = document.createElement("button"); copy.type = "button"; copy.className = "btn btn-gold"; copy.textContent = "Copy order";
    copy.addEventListener("click", function(){
      var done = function(){ copy.textContent = "Copied"; };
      try { navigator.clipboard.writeText(text).then(done, function(){ selectPre(); }); } catch(e){ selectPre(); }
    });
    function selectPre(){ var r = document.createRange(); r.selectNodeContents(pre); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); copy.textContent = "Text selected – copy with Ctrl/Cmd+C"; }
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
      msg.textContent = first && first.id === "f-akkoord" ? "Please tick the box to confirm your order." : (first && first.id === "f-tel" ? "Please enter a mobile number with country code, for example +31 6 12345678. Landline numbers are not accepted, because the payment request is sent to this number." : "Please fill in the required fields: name, a valid email address, your mobile number and your address.");
      if (first) first.focus();
      return;
    }
    if (form._honey.value) return; // spam
    var c = calc(), n = c.n, text = orderText();
    var payload = {
      _subject: (prelaunch ? "Voorbestelling ENGELSE editie – " : "Bestelling ENGELSE editie – ") + n + "x – " + val("f-naam"),
      _template: "table",
      _replyto: val("f-email"),
      boek: "ENGELSE EDITIE – Loosen the Grip, Hold the Course (luxe softcover, ISBN 9789083392295)",
      soort: prelaunch ? "Voorbestelling (verzending vanaf 18-12-2026)" : "Bestelling", aantal: n, prijs_per_stuk: euroNL(PRICE) + (promo ? " (introductieprijs)" : ""), subtotaal: euroNL(c.books), staffelkorting: c.pct ? c.pct + "% (− " + euroNL(c.disc) + ")" : "geen", verzendkosten: c.abroad ? euroNL(c.ship) + " (" + COUNTRY_NL[c.cc] + ")" : "inbegrepen (Nederland)", totaal: euroNL(c.total),
      naam: val("f-naam"), email: val("f-email"), mobiel: val("f-tel"), organisatie: val("f-org"),
      adres: val("f-adres"), postcode: val("f-postcode"), plaats: val("f-plaats"), land: COUNTRY_NL[c.cc], opmerking: val("f-opm"),
      taal_klant: "Engels"
    };
    btn.disabled = true; btn.textContent = "Sending…";
    fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(payload) })
      .then(function(r){ return r.json().then(function(j){ if (!r.ok || String(j.success) !== "true") throw new Error(j.message || "error"); }); })
      .then(function(){
        msg.className = "form-msg ok"; msg.hidden = false;
        msg.textContent = "Thank you, " + val("f-naam") + "! Your order for " + n + " " + (n === 1 ? "book" : "books") + " (" + euro(c.total) + ") has been received. You will receive a confirmation at " + val("f-email") + " and a payment request on " + val("f-tel") + ".";
        form.reset(); update();
      })
      .catch(function(){ showError(text); })
      .finally(function(){ btn.disabled = false; btn.textContent = BTN_TEXT; });
  });
})();
