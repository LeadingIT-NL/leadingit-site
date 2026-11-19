(function(){
  // Reviews op de Nederlandse boekpagina.
  // - Geplaatste reviews staan in nl/boek/reviews.json (door Raymond na controle toegevoegd).
  // - Getoond: gemiddelde over ALLE reviews, 3 reviews (eerst 'uitgelicht', dan nieuwste), rest achter een knop.
  // - Het reviewformulier is zichtbaar vanaf de verschijningsdatum, of direct via de link .../nl/boek/#review
  var LAUNCH = new Date(2027, 1, 10);
  var ENDPOINT = "https://formsubmit.co/ajax/info@leadingit.nl";
  var SHOW = 3;

  var today = new Date(), m = /[?&]datum=(\d{4})-(\d{2})-(\d{2})/.exec(location.search);
  if (m) today = new Date(+m[1], +m[2] - 1, +m[3], 12);
  var $ = function(id){ return document.getElementById(id); };
  var sec = $("reviews");
  if (!sec) return;

  function stars(n){
    var s = "";
    for (var i = 1; i <= 5; i++) s += '<span class="' + (i <= Math.round(n) ? "on" : "off") + '">★</span>';
    return s;
  }
  function esc(t){ var d = document.createElement("div"); d.textContent = t == null ? "" : String(t); return d.innerHTML; }
  function nlDate(iso){
    var p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ""); if (!p) return "";
    var mnd = ["januari","februari","maart","april","mei","juni","juli","augustus","september","oktober","november","december"];
    return (+p[3]) + " " + mnd[+p[2] - 1] + " " + p[1];
  }
  function card(r){
    var who = esc(r.naam) + (r.functie ? '<span class="rv-role">' + esc(r.functie) + "</span>" : "");
    return '<article class="rv-card"><div class="rv-stars" aria-label="' + r.sterren + ' van 5 sterren">' + stars(r.sterren) + "</div>" +
      "<blockquote>" + esc(r.tekst).replace(/\n+/g, "<br>") + "</blockquote>" +
      '<p class="rv-who">' + who + (r.datum ? '<span class="rv-date">' + nlDate(r.datum) + "</span>" : "") + "</p></article>";
  }

  // --- tonen ---
  var formOpenable = today >= LAUNCH || /#review/.test(location.hash);
  fetch("reviews.json", { cache: "no-cache" })
    .then(function(r){ return r.ok ? r.json() : []; })
    .catch(function(){ return []; })
    .then(function(list){
      list = (Array.isArray(list) ? list : []).filter(function(r){ return r && r.tekst && r.sterren >= 1 && r.sterren <= 5; });
      if (!list.length && !formOpenable) return;          // voor de verschijning en zonder reviews: sectie blijft verborgen
      sec.hidden = false;
      $("review-cta").hidden = !formOpenable;
      if (!list.length) { $("rv-empty").hidden = false; return; }
      var avg = list.reduce(function(s, r){ return s + Number(r.sterren); }, 0) / list.length;
      $("rv-avg").innerHTML = '<span class="rv-avg-num">' + avg.toFixed(1).replace(".", ",") + '</span><span class="rv-stars big" aria-hidden="true">' + stars(avg) +
        '</span><span class="rv-count">' + list.length + (list.length === 1 ? " review" : " reviews") + "</span>";
      $("rv-avg").setAttribute("aria-label", "Gemiddeld " + avg.toFixed(1).replace(".", ",") + " van 5 sterren uit " + list.length + " reviews");
      $("rv-avg").hidden = false;
      list.sort(function(a, b){
        if (!!b.uitgelicht !== !!a.uitgelicht) return b.uitgelicht ? 1 : -1;
        return String(b.datum || "").localeCompare(String(a.datum || ""));
      });
      $("rv-list").innerHTML = list.slice(0, SHOW).map(card).join("");
      if (list.length > SHOW) {
        var more = $("rv-more"), btn = $("rv-more-btn");
        more.innerHTML = list.slice(SHOW).map(card).join("");
        btn.textContent = "Alle " + list.length + " reviews lezen"; btn.hidden = false;
        btn.addEventListener("click", function(){
          var open = more.hidden; more.hidden = !open;
          btn.textContent = open ? "Minder reviews tonen" : "Alle " + list.length + " reviews lezen";
          btn.setAttribute("aria-expanded", String(open));
        });
      }
    });

  // --- formulier ---
  var form = $("review-form"), openBtn = $("review-open"), msg = $("rv-msg"), sendBtn = $("rv-submit");
  function openForm(){ form.hidden = false; openBtn.hidden = true; var f = form.querySelector("input[name=sterren]"); if (f) f.focus(); }
  openBtn.addEventListener("click", openForm);
  if (/#review/.test(location.hash)) { sec.hidden = false; $("review-cta").hidden = false; openForm(); setTimeout(function(){ sec.scrollIntoView(); }, 50); }

  var rating = $("rv-rating-text");
  Array.prototype.forEach.call(form.querySelectorAll("input[name=sterren]"), function(r){
    r.addEventListener("change", function(){ rating.textContent = ["", "Slecht", "Matig", "Redelijk", "Goed", "Uitstekend"][+r.value]; });
  });

  function val(n){ var el = form.elements[n]; return el ? String(el.value || "").trim() : ""; }
  form.addEventListener("submit", function(e){
    e.preventDefault(); msg.hidden = true;
    var st = form.querySelector("input[name=sterren]:checked");
    if (!st || !form.checkValidity()) {
      msg.className = "form-msg err"; msg.hidden = false;
      msg.textContent = !st ? "Kies het aantal sterren." : "Vul je naam, e-mailadres en je review in, en geef toestemming voor publicatie.";
      return;
    }
    if (form._honey.value) return;
    var d = new Date(), iso = d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
    var entry = { naam: val("naam"), functie: val("functie"), sterren: +st.value, tekst: val("tekst"), datum: iso, uitgelicht: false };
    var payload = {
      _subject: "Review boek – " + st.value + " sterren – " + entry.naam,
      _template: "table", _replyto: val("email"),
      sterren: st.value, naam: entry.naam, functie: entry.functie || "-", email: val("email"),
      review: entry.tekst, toestemming_publicatie: "ja",
      plak_in_reviews_json: JSON.stringify(entry) + ","
    };
    sendBtn.disabled = true; sendBtn.textContent = "Bezig met versturen…";
    var done = false;
    var slow = setTimeout(function(){ if (done) return; msg.className = "form-msg"; msg.hidden = false; msg.textContent = "Je review wordt verstuurd. Dat duurt soms even; laat deze pagina open."; }, 10000);
    fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(payload) })
      .then(function(r){ return r.json().then(function(j){ if (!r.ok || String(j.success) !== "true") throw new Error(j.message || ("HTTP " + r.status)); }); })
      .then(function(){
        msg.className = "form-msg ok"; msg.hidden = false;
        msg.textContent = "Dank je wel, " + entry.naam + "! Je review is ontvangen. We plaatsen hem na een korte controle op deze pagina.";
        form.reset(); rating.textContent = "";
      })
      .catch(function(err){
        if (window.console) console.warn("Review niet verstuurd:", err && err.message);
        msg.className = "form-msg err"; msg.hidden = false;
        msg.innerHTML = 'Je review kon niet automatisch worden verstuurd. Mail hem naar <a href="mailto:info@leadingit.nl?subject=' +
          encodeURIComponent("Review boek – " + entry.naam) + "&body=" + encodeURIComponent(entry.sterren + " sterren\n\n" + entry.tekst + "\n\n" + entry.naam + (entry.functie ? ", " + entry.functie : "")) +
          '">info@leadingit.nl</a>, dan plaatsen we hem alsnog.';
      })
      .finally(function(){ done = true; clearTimeout(slow); sendBtn.disabled = false; sendBtn.textContent = "Review versturen"; });
  });
})();
