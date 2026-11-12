/* Watten Tracker – Darstellung (Skins und Zahlen-Schrift)
 * Läuft im <head>, bevor etwas gezeichnet wird, damit beim Start nicht kurz der
 * Standard-Skin aufblitzt. Eigene Datei, weil die Content-Security-Policy keine
 * Inline-Skripte erlaubt. Die Wahl gilt nur für dieses Gerät (localStorage) und
 * ist weder Teil von Backups noch der gemeinsamen Liste.
 */
(function () {
  "use strict";
  var KEY = "watten_skin", FONT_KEY = "watten_numfont";
  var FONTS = ["system", "kreide", "tafel", "digital", "klassisch", "schreibmaschine"];
  var SKINS = ["filz", "nacht", "hell", "zirbe", "wirtshaus", "kontrast"];
  var LIGHT = { hell: true, zirbe: true };
  var AUTO = { dark: "filz", light: "hell" };       // „Automatisch“ folgt Hell/Dunkel des Geräts
  var mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: light)") : null;

  function valid(v) { return v === "auto" || SKINS.indexOf(v) >= 0; }
  var choice = "filz";
  try { var saved = localStorage.getItem(KEY); if (valid(saved)) choice = saved; } catch (e) { /* kein Speicher */ }

  var font = "system";
  try { var f = localStorage.getItem(FONT_KEY); if (FONTS.indexOf(f) >= 0) font = f; } catch (e) { /* kein Speicher */ }
  function applyFont() {
    if (font === "system") document.documentElement.removeAttribute("data-numfont");
    else document.documentElement.setAttribute("data-numfont", font);
  }
  applyFont();

  function effective() { return choice === "auto" ? (mq && mq.matches ? AUTO.light : AUTO.dark) : choice; }
  function meta(name, content) {
    var m = document.querySelector('meta[name="' + name + '"]');
    if (m) m.setAttribute("content", content);
  }
  function apply() {
    var s = effective(), root = document.documentElement, light = !!LIGHT[s];
    root.setAttribute("data-skin", s);
    meta("color-scheme", light ? "light" : "dark");
    meta("theme-color", getComputedStyle(root).getPropertyValue("--bg").trim() || "#1A2B1A");
    // Statusleiste der installierten iPhone-App: helle Skins brauchen dunkle Schrift.
    // iOS liest das nur beim Start der App – ein Wechsel greift ab dem nächsten Öffnen.
    meta("apple-mobile-web-app-status-bar-style", light ? "default" : "black-translucent");
  }
  apply();
  if (mq) {
    var onChange = function () { if (choice === "auto") apply(); };
    if (mq.addEventListener) mq.addEventListener("change", onChange); else if (mq.addListener) mq.addListener(onChange);
  }

  window.Skin = {
    list: SKINS.slice(),
    fonts: FONTS.slice(),
    getFont: function () { return font; },
    setFont: function (v) {
      if (FONTS.indexOf(v) < 0) return;
      font = v;
      try { localStorage.setItem(FONT_KEY, v); } catch (e) { /* Speicher voll */ }
      applyFont();
    },
    get: function () { return choice; },
    effective: effective,
    set: function (v) {
      if (!valid(v)) return;
      choice = v;
      try { localStorage.setItem(KEY, v); } catch (e) { /* Speicher voll – gilt dann bis zum Neuladen */ }
      apply();
    },
  };
}());
