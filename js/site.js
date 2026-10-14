(function(){
  // Gedeeld script voor de hoofdsite en de boekpagina's (NL en EN).
  // Vooraankondiging: geen bestelmodule; wel een aanmeldformulier voor de boeklancering en de pre-sale.
  var EN = (document.documentElement.lang || "").toLowerCase().indexOf("en") === 0;
  var ENDPOINT = "https://formsubmit.co/ajax/info@leadingit.nl";

  // Mobile menu
  var toggle = document.getElementById("menu-toggle"), nav = document.getElementById("nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function(){
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", function(e){ if (e.target.closest("a")) { nav.classList.remove("open"); toggle.setAttribute("aria-expanded","false"); } });
  }
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  // Aanmeldformulier (alleen op de boekpagina's)
  var form = document.getElementById("launch-form");
  if (!form) return;
  var msg = document.getElementById("form-msg"), btn = document.getElementById("submit-btn");
  var BTN_TEXT = btn.textContent;
  var T = EN ? {
    edition: "ENGELSE EDITIE – Loosen the Grip, Hold the Course (premium softcover, ISBN 9789083392295)",
    subject: "Aanmelding boeklancering (Engelse editie) – ",
    needOne: "Please choose at least one option: the launch invitation and/or the pre-sale update.",
    needFields: "Please fill in your name and a valid email address.",
    needConsent: "Please tick the box to agree that we may use your details for this.",
    sending: "Sending…",
    ok: function(n){ return "Thank you, " + n + "! You are on the list. We will be in touch about the pre-sale in December and the book launch in February."; },
    fail: "Your registration could not be sent automatically. Please email the details below to info@leadingit.nl.",
    mailBtn: "Open in email app", copyBtn: "Copy details", copied: "Copied", selected: "Text selected – copy with Ctrl/Cmd+C",
    mailSubject: "Book launch registration – "
  } : {
    edition: "Beter navigeren zonder strakker te sturen (luxe hardcover, ISBN 9789083392240)",
    subject: "Aanmelding boeklancering – ",
    needOne: "Kies minimaal één optie: de uitnodiging voor de lancering en/of bericht over de pre-sale.",
    needFields: "Vul je naam en een geldig e-mailadres in.",
    needConsent: "Vink aan dat we je gegevens hiervoor mogen gebruiken.",
    sending: "Bezig met versturen…",
    ok: function(n){ return "Bedankt, " + n + "! Je staat op de lijst. We laten van ons horen over de pre-sale in december en de boeklancering in februari."; },
    fail: "Je aanmelding kon niet automatisch worden verstuurd. Mail onderstaande gegevens naar info@leadingit.nl.",
    mailBtn: "Open in e-mailprogramma", copyBtn: "Kopieer gegevens", copied: "Gekopieerd", selected: "Tekst geselecteerd – kopieer met Ctrl/Cmd+C",
    mailSubject: "Aanmelding boeklancering – "
  };
  function val(id){ var el = document.getElementById(id); return el ? el.value.trim() : ""; }
  function checked(id){ var el = document.getElementById(id); return !!(el && el.checked); }

  function summaryText(){
    return [
      "Aanmelding: " + T.edition,
      "Uitnodiging boeklancering (februari): " + (checked("f-launch") ? "ja" + (val("f-persons") ? ", " + val("f-persons") + " pers." : "") : "nee"),
      "Bericht over pre-sale (december): " + (checked("f-presale") ? "ja" : "nee"),
      "",
      "Naam: " + val("f-naam"),
      "E-mail: " + val("f-email"),
      "Organisatie: " + (val("f-org") || "-"),
      "Opmerking: " + (val("f-opm") || "-")
    ].join("\n");
  }

  function showError(text){
    msg.className = "form-msg err"; msg.hidden = false; msg.innerHTML = "";
    var p = document.createElement("p"); p.textContent = T.fail;
    var pre = document.createElement("pre"); pre.textContent = text;
    var actions = document.createElement("div"); actions.className = "actions";
    var mail = document.createElement("a"); mail.className = "btn btn-navy";
    mail.href = "mailto:info@leadingit.nl?subject=" + encodeURIComponent(T.mailSubject + val("f-naam")) + "&body=" + encodeURIComponent(text);
    mail.textContent = T.mailBtn;
    var copy = document.createElement("button"); copy.type = "button"; copy.className = "btn btn-gold"; copy.textContent = T.copyBtn;
    copy.addEventListener("click", function(){
      try { navigator.clipboard.writeText(text).then(function(){ copy.textContent = T.copied; }, selectPre); } catch(e){ selectPre(); }
    });
    function selectPre(){ var r = document.createRange(); r.selectNodeContents(pre); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); copy.textContent = T.selected; }
    actions.appendChild(mail); actions.appendChild(copy);
    msg.appendChild(p); msg.appendChild(pre); msg.appendChild(actions);
  }

  // Aantal personen alleen tonen als iemand naar de lancering wil
  var launch = document.getElementById("f-launch"), persons = document.getElementById("persons-field");
  function syncPersons(){ if (persons) persons.hidden = !launch.checked; }
  if (launch) { launch.addEventListener("change", syncPersons); syncPersons(); }

  form.addEventListener("submit", function(e){
    e.preventDefault();
    msg.hidden = true;
    var err = "";
    if (!checked("f-launch") && !checked("f-presale")) err = T.needOne;
    else if (!document.getElementById("f-naam").checkValidity() || !document.getElementById("f-email").checkValidity()) err = T.needFields;
    else if (!checked("f-akkoord")) err = T.needConsent;
    if (err) { msg.className = "form-msg err"; msg.hidden = false; msg.textContent = err; return; }
    if (form._honey.value) return; // spam
    var text = summaryText();
    var payload = {
      _subject: T.subject + val("f-naam"),
      _template: "table",
      _replyto: val("f-email"),
      boek: T.edition,
      uitnodiging_lancering: checked("f-launch") ? "ja" : "nee",
      aantal_personen: checked("f-launch") ? (val("f-persons") || "-") : "-",
      bericht_presale: checked("f-presale") ? "ja" : "nee",
      naam: val("f-naam"), email: val("f-email"), organisatie: val("f-org"), opmerking: val("f-opm"),
      taal: EN ? "Engels" : "Nederlands"
    };
    btn.disabled = true; btn.textContent = T.sending;
    fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(payload) })
      .then(function(r){ return r.json().then(function(j){ if (!r.ok || String(j.success) !== "true") throw new Error(j.message || "error"); }); })
      .then(function(){
        msg.className = "form-msg ok"; msg.hidden = false;
        msg.textContent = T.ok(val("f-naam"));
        form.reset(); syncPersons();
      })
      .catch(function(){ showError(text); })
      .finally(function(){ btn.disabled = false; btn.textContent = BTN_TEXT; });
  });
})();
