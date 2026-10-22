/* Lecture vocale native pour l'APK (Capacitor).
   Remplace speechSynthesis (absent des WebView Android) par le moteur
   de synthèse vocale du téléphone. Sans effet sur la version web. */
(function () {
  var C = window.Capacitor;
  if (!C || typeof C.isNativePlatform !== 'function' || !C.isNativePlatform()) return;

  function tts() {
    return C.Plugins && C.Plugins.TextToSpeech;
  }

  function Utterance(text) {
    this.text = text || '';
    this.lang = 'en-US';
    this.rate = 1;
    this.pitch = 1;
    this.volume = 1;
    this.voice = null;
    this.onstart = null;
    this.onend = null;
    this.onerror = null;
    this.onboundary = null;
  }

  var token = 0;
  var active = null;
  var last = null;

  var synth = {
    speaking: false,
    pending: false,
    paused: false,
    onvoiceschanged: null,
    getVoices: function () { return []; },
    speak: function (u) {
      var plugin = tts();
      last = u;
      var my = ++token;
      active = u;
      synth.speaking = true;
      if (!plugin) {
        synth.speaking = false;
        if (u.onerror) u.onerror({ error: 'plugin-absent' });
        return;
      }
      if (u.onstart) u.onstart();
      plugin.speak({
        text: u.text,
        lang: u.lang || 'en-US',
        rate: u.rate || 1,
        pitch: u.pitch || 1,
        volume: 1,
        category: 'ambient',
        queueStrategy: 0
      }).then(function () {
        if (my !== token) return;
        synth.speaking = false;
        active = null;
        if (u.onend) u.onend();
      }).catch(function (err) {
        if (my !== token) return;
        synth.speaking = false;
        active = null;
        if (u.onerror) u.onerror(err);
      });
    },
    cancel: function () {
      token++;
      active = null;
      synth.speaking = false;
      synth.paused = false;
      var plugin = tts();
      if (plugin) { try { plugin.stop(); } catch (e) {} }
    },
    pause: function () {
      if (!synth.speaking) return;
      var u = last;
      synth.cancel();
      synth.paused = true;
      last = u;
    },
    resume: function () {
      if (!synth.paused || !last) return;
      synth.paused = false;
      synth.speak(last);
    }
  };

  try {
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
  } catch (e) {
    window.speechSynthesis = synth;
  }
  window.SpeechSynthesisUtterance = Utterance;

  // Surlignage mot à mot (si le moteur le permet)
  try {
    var plugin = tts();
    if (plugin && plugin.addListener) {
      plugin.addListener('onRangeStart', function (ev) {
        if (active && active.onboundary && ev && typeof ev.start === 'number') {
          active.onboundary({ name: 'word', charIndex: ev.start });
        }
      });
    }
  } catch (e) {}
})();
