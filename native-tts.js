/* Reconnaissance vocale native pour l'APK (Capacitor).
   Remplace SpeechRecognition (absent des WebView Android) par le
   micro et le moteur de reconnaissance du téléphone.
   Sans effet sur la version web. */
(function () {
  var C = window.Capacitor;
  if (!C || typeof C.isNativePlatform !== 'function' || !C.isNativePlatform()) return;

  function plugin() {
    return C.Plugins && C.Plugins.SpeechRecognition;
  }

  function Recognition() {
    this.lang = 'en-US';
    this.continuous = false;
    this.interimResults = false;
    this.maxAlternatives = 1;
    this.onstart = null;
    this.onresult = null;
    this.onerror = null;
    this.onend = null;
    this._running = false;
  }

  Recognition.prototype._fail = function (code) {
    if (this.onerror) this.onerror({ error: code });
    this._finish();
  };

  Recognition.prototype._finish = function () {
    if (!this._running) return;
    this._running = false;
    if (this.onend) this.onend();
  };

  Recognition.prototype.start = function () {
    var self = this;
    var p = plugin();
    if (!p) { self._running = true; self._fail('service-not-allowed'); return; }
    if (self._running) return;
    self._running = true;

    p.checkPermissions()
      .then(function (s) {
        if (s && s.speechRecognition === 'granted') return s;
        return p.requestPermissions();
      })
      .then(function (s) {
        if (!s || s.speechRecognition !== 'granted') throw { denied: true };
        if (self.onstart) self.onstart();
        return p.start({
          language: self.lang || 'en-US',
          maxResults: Math.max(1, self.maxAlternatives || 1),
          prompt: '',
          partialResults: false,
          popup: false
        });
      })
      .then(function (r) {
        var matches = (r && r.matches) || [];
        if (!matches.length) { self._fail('no-speech'); return; }
        var alts = matches.map(function (t) { return { transcript: t, confidence: 1 }; });
        alts.isFinal = true;
        if (self.onresult) self.onresult({ resultIndex: 0, results: [alts] });
        self._finish();
      })
      .catch(function (err) {
        self._fail(err && err.denied ? 'not-allowed' : 'no-speech');
      });
  };

  Recognition.prototype.stop = function () {
    var p = plugin();
    if (p) { try { p.stop(); } catch (e) {} }
  };
  Recognition.prototype.abort = Recognition.prototype.stop;

  window.SpeechRecognition = Recognition;
  window.webkitSpeechRecognition = Recognition;
})();
