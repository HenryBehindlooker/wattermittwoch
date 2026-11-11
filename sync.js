/* ------------------------------------------------------------------
 * Watten Tracker – gemeinsame Liste über Supabase (optional)
 *
 * Alle Geräte teilen die Liste der Spiele in einer Supabase-Tabelle, die nur
 * über zwei Funktionen (wt_get, wt_save) mit einem geheimen Raumcode
 * erreichbar ist (siehe supabase.sql). Jedes Gerät merkt sich den zuletzt
 * gemeinsamen Stand („Basis“) und führt per Core.mergeDoc zusammen: Spiele,
 * Runden und gewonnene Spiele werden nach ID vereinigt, Punkte dadurch addiert.
 * Gespeichert wird nur, wenn die Version in der Cloud unverändert ist
 * (optimistisches Sperren) – sonst wird neu geladen und erneut gemischt.
 *
 * Ohne Verbindung läuft die App unverändert weiter; abgeglichen wird, sobald
 * das Gerät wieder online ist.
 * ------------------------------------------------------------------ */
(function () {
  "use strict";

  const CFG_KEY = "watten_shared_cfg";      // { url, key, code } – nur auf diesem Gerät
  const BASE_KEY = "watten_shared_base";    // zuletzt gemeinsamer Stand
  const MAX_BYTES = 4500000;                // der Server lehnt ab 5 MB ab
  const CODE_RE = /^[A-Za-z0-9]{24,64}$/;

  const read = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const write = (k, v) => {
    try {
      if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v));
    } catch (e) { /* Speicher voll – der Abgleich läuft trotzdem weiter */ }
  };
  const b64url = (text) => btoa(String.fromCharCode(...new TextEncoder().encode(text)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const unb64url = (s) => new TextDecoder().decode(
    Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)));

  const Sync = {
    cfg: null,
    status: "idle",            // idle | busy | ok | error | offline
    lastSync: 0,
    lastError: "",
    hooks: { getState: null, setState: null, onStatus: null },
    running: null,
    again: false,
    timer: null,

    /** Gespeicherte Verbindung laden – nur, wenn sie der Prüfung standhält. */
    load() {
      const c = read(CFG_KEY);
      const url = c && this.cleanUrl(c.url);
      this.cfg = (url && this.validKey(c.key) && CODE_RE.test(c.code)) ? { url, key: c.key, code: c.code } : null;
    },

    configured() {
      return !!(this.cfg && this.cfg.url && this.cfg.key && this.cfg.code);
    },

    configure(cfg) {
      this.cfg = cfg;
      write(CFG_KEY, cfg);
      write(BASE_KEY, null);
      clearTimeout(this.timer);
      this.lastSync = 0;
      this.lastError = "";
      this.setStatus("idle");
    },

    setStatus(s, err) {
      this.status = s;
      if (s === "error") this.lastError = err || "";
      if (s === "ok") {
        this.lastError = "";
        this.lastSync = Date.now();
      }
      if (this.hooks.onStatus) this.hooks.onStatus(s);
    },

    /** Geheimer Raumcode: 32 Zeichen aus 57 gut lesbaren, gleichverteilt (rund 186 Bit). */
    newCode() {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
      const limit = 256 - (256 % chars.length);
      let out = "";
      while (out.length < 32) {
        for (const b of crypto.getRandomValues(new Uint8Array(48))) {
          if (b < limit && out.length < 32) out += chars[b % chars.length];
        }
      }
      return out;
    },

    inviteLink() {
      const payload = b64url(JSON.stringify({ u: this.cfg.url, k: this.cfg.key, c: this.cfg.code }));
      return `${location.origin}${location.pathname}#join=${payload}`;
    },

    /** Einladung aus der Adresszeile oder aus eingefügtem Text lesen; null, wenn ungültig. */
    parseInvite(text) {
      const m = /#join=([A-Za-z0-9_-]{1,4000})(?![A-Za-z0-9_-])/.exec(String(text || ""));
      if (!m) return null;
      try {
        const o = JSON.parse(unb64url(m[1]));
        if (!o || typeof o !== "object") return null;
        const cfg = { url: this.cleanUrl(o.u), key: o.k, code: o.c };
        return cfg.url && this.validKey(cfg.key) && typeof cfg.code === "string" && CODE_RE.test(cfg.code) ? cfg : null;
      } catch (e) {
        return null;
      }
    },

    /** Nur verschlüsselte Verbindungen (https); http ist allein für lokale Tests erlaubt. */
    cleanUrl(u) {
      try {
        if (typeof u !== "string") return null;
        const url = new URL(u.trim());
        const local = ["localhost", "127.0.0.1"].includes(url.hostname);
        if (url.protocol !== "https:" && !(url.protocol === "http:" && local)) return null;
        if (url.username || url.password) return null;
        return url.origin;
      } catch (e) {
        return null;
      }
    },

    validKey(k) {
      return typeof k === "string" && /^[A-Za-z0-9._-]{8,2000}$/.test(k);
    },

    host() {
      try { return new URL(this.cfg.url).host; } catch (e) { return ""; }
    },

    async rpc(fn, body) {
      const res = await fetch(`${this.cfg.url}/rest/v1/rpc/${fn}`, {
        method: "POST",
        credentials: "omit",
        referrerPolicy: "no-referrer",
        cache: "no-store",
        headers: {
          apikey: this.cfg.key,
          // Alte Anon-Keys sind JWTs und gehören zusätzlich in den Authorization-Header,
          // neue „Publishable Keys“ (sb_publishable_…) nur in den apikey-Header.
          ...(this.cfg.key.startsWith("eyJ") ? { Authorization: `Bearer ${this.cfg.key}` } : {}),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Server antwortet ${res.status}${text ? `: ${text.slice(0, 160)}` : ""}`);
      }
      return res.json();
    },

    /** Nach lokalen Änderungen gebündelt abgleichen. */
    schedule(delay) {
      if (!this.configured()) return;
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.run().catch(() => {}), delay == null ? 1200 : delay);
    },

    /** Abgleich starten; läuft schon einer, wird danach erneut abgeglichen. */
    run(opts) {
      if (!this.configured()) return Promise.resolve(false);
      if (this.running) {
        this.again = true;
        return this.running;
      }
      this.running = this.syncOnce(opts || {})
        .then((ok) => {
          this.setStatus("ok");
          return ok;
        })
        .catch((e) => {
          if (!navigator.onLine) this.setStatus("offline");
          else this.setStatus("error", (e && e.message) || String(e));
          throw e;
        })
        .finally(() => {
          this.running = null;
          if (this.again) {
            this.again = false;
            this.schedule(300);
          }
        });
      return this.running;
    },

    async syncOnce({ join }) {
      if (!navigator.onLine) throw new Error("offline");
      this.setStatus("busy");
      const cfg = this.cfg;
      for (let attempt = 0; attempt < 5; attempt++) {
        const rows = await this.rpc("wt_get", { p_code: cfg.code });
        if (this.cfg !== cfg) return false;                 // inzwischen getrennt oder neu verbunden
        const remote = Array.isArray(rows) && rows.length ? rows[0] : null;
        if (remote && !(Number.isSafeInteger(remote.version) && remote.version > 0)) throw new Error("Unerwartete Antwort vom Server.");
        const base = join ? null : read(BASE_KEY);
        const local = this.hooks.getState();
        let merged;
        let expected;
        if (!remote) {
          if (join) throw new Error("Diese gemeinsame Liste gibt es nicht (mehr). Einladungslink prüfen.");
          merged = local;
          expected = 0;
        } else {
          // Core.mergeDoc prüft die eingehenden Daten und wirft, wenn sie unlesbar sind –
          // dann bleibt dieses Gerät unverändert.
          merged = Core.mergeDoc(base ? base.data : null, local, remote.data, { prefer: join ? "remote" : "local" });
          expected = remote.version;
          if (Core.same(merged, remote.data)) {
            this.commit(local, merged, remote.version);
            return true;
          }
        }
        if (JSON.stringify(merged).length > MAX_BYTES) throw new Error("Die gemeinsame Liste ist zu groß geworden. Bitte alte Spiele löschen.");
        const v = await this.rpc("wt_save", { p_code: cfg.code, p_data: merged, p_version: expected });
        if (this.cfg !== cfg) return false;
        if (typeof v === "number" && v > 0) {
          this.commit(local, merged, v);
          return true;
        }
        // jemand anderes war schneller → neu laden und erneut mischen
      }
      throw new Error("Zu viele gleichzeitige Änderungen – bitte gleich nochmal versuchen.");
    },

    /** Ergebnis übernehmen, ohne Änderungen zu verlieren, die während des Abgleichs passiert sind. */
    commit(snapshot, merged, version) {
      write(BASE_KEY, { data: merged, version });
      const now = this.hooks.getState();
      if (Core.same(now, snapshot)) {
        if (!Core.same(now, merged)) this.hooks.setState(merged);
      } else {
        // während des Abgleichs wurde weitergezählt: diese Änderungen obendrauf legen
        this.hooks.setState(Core.mergeDoc(snapshot, now, merged));
        this.again = true;
      }
    },
  };

  Sync.load();
  window.Sync = Sync;
}());
