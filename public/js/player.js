// What plays on the room's screens: an episode's video from archive.org, through the archive proxy
// (config.js videoProxy, tools/archive-proxy/), which lets the page draw it in 3D (archive.org's own
// servers send no CORS headers, and a video without them cannot become a WebGL texture). Its
// captions are the catalogue's (public/catalogue/captions/), read by catalogue.js and drawn on the
// screen by main.js. If the proxy cannot be reached, or there is none (?videoproxy=none), the
// episode plays straight from archive.org on the page instead, in a box with the browser's own
// controls and the captions as a track: that works on a screen, not in a headset.
import * as THREE from 'three';
import { cueAt, detailsUrl, episodeName, parseVtt, videoUrl } from './catalogue.js';

/** @typedef {import('./catalogue.js').Episode} Episode */

export class Player {
  /**
   * @param {object} o
   * @param {Episode[]} o.episodes the catalogue
   * @param {string | null} o.proxy the archive proxy's address (catalogue.js proxyOf), or null
   * @param {HTMLElement} o.host where the page's own player goes when it is needed
   * @param {string} [o.base] what the catalogue's paths are relative to
   */
  constructor({ episodes, proxy, host, base = document.baseURI }) {
    this.episodes = episodes;
    this.proxy = proxy;
    this.host = host;
    this.base = base;
    /** The 3D screens' video: through the proxy, never shown on the page. */
    this.video = this._video(true);
    this.texture = new THREE.VideoTexture(this.video);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    /** The page's player, made when first needed. @type {HTMLVideoElement | null} */
    this.pageVideo = null;
    this.box = null;
    /** The episode chosen (its index), or -1. */
    this.episode = -1;
    /** It plays on the page, not in 3D. */
    this.onPage = false;
    /** Its video could not be played at all. */
    this.failed = false;
    /** It should be playing: the browser would not start it without a click (another visitor's Play, in a shared session). */
    this.blocked = false;
    this.captions = false;
    this.cues = [];
    this._cue = -1;
    this._load = 0;
    /** Something to tell the visitor (a toast). @type {(text: string) => void} */
    this.onNotice = () => {};
    /** What it shows changed: playing, paused, loading, another episode, its captions. */
    this.onChange = () => {};
    /** In a headset, where the page's player cannot be seen. */
    this.inVR = () => false;
  }

  _video(threeD) {
    const v = document.createElement('video');
    if (threeD) v.crossOrigin = 'anonymous';
    v.playsInline = true;
    v.preload = 'auto';
    for (const type of ['playing', 'pause', 'waiting', 'canplay', 'loadedmetadata', 'seeked']) v.addEventListener(type, () => this.onChange());
    v.addEventListener('ended', () => {
      if (v === this.el) this.stop();
    });
    v.addEventListener('error', () => {
      if (v === this.el && this.episode >= 0) this._failed(threeD);
    });
    return v;
  }

  /** The video playing now: the 3D one, or the page's. */
  get el() {
    return this.onPage ? this.pageVideo : this.video;
  }

  /** @returns {Episode | null} */
  get current() {
    return this.episodes[this.episode] ?? null;
  }

  get playing() {
    const v = this.el;
    return this.episode >= 0 && !!v && !v.paused && !v.ended;
  }

  /** Whether it is still loading what it needs to play. */
  get loading() {
    const v = this.el;
    return this.episode >= 0 && !this.failed && !!v && v.readyState < 3 && (!v.paused || this.blocked);
  }

  get time() {
    return this.el?.currentTime ?? 0;
  }

  get duration() {
    const d = this.el?.duration;
    return Number.isFinite(d) ? d : (this.current?.minutes ?? 0) * 60;
  }

  /** Whether the 3D screen shows the video now (it has a frame, and it plays in 3D). */
  get showing() {
    return this.episode >= 0 && !this.onPage && !this.failed && this.video.readyState >= 2;
  }

  /**
   * Plays episode i from `at` seconds (or, `play` false, holds it there). The same episode again
   * goes to `at` if it is far from it.
   */
  load(i, { at = 0, play = true } = {}) {
    const e = this.episodes[i];
    if (!e) return;
    if (i === this.episode && !this.failed) {
      if (Math.abs(this.time - at) > 2) this.el.currentTime = at;
      if (play) this.play();
      else this.pause();
      return;
    }
    this._stopVideos();
    this.episode = i;
    this.failed = false;
    this.cues = [];
    this._cue = -1;
    const ticket = ++this._load;
    if (e.captions) {
      fetch(new URL(e.captions, this.base))
        .then((r) => (r.ok ? r.text() : ''))
        .then((text) => {
          if (ticket === this._load) this.cues = parseVtt(text);
        }, () => {});
    }
    this.onPage = !this.proxy;
    this._start(at, play);
    this.onChange();
  }

  /** Starts the episode's video where it should be: in 3D through the proxy, else on the page. */
  _start(at, play) {
    const e = this.current;
    const v = this.onPage ? this._pageVideo(e) : this.video;
    v.src = videoUrl(e, this.onPage ? null : this.proxy);
    if (at > 0) v.currentTime = at;
    if (play) this.play();
  }

  play() {
    if (this.episode < 0 || this.failed) return;
    const v = this.el;
    this.blocked = false;
    v.play().catch((err) => {
      if (err?.name !== 'NotAllowedError') return;
      // Not started by the visitor (another's Play, in a shared session): they press Play to join in.
      this.blocked = true;
      this.onNotice('Press Play to watch with the others');
      this.onChange();
    });
  }

  pause() {
    this.blocked = false;
    this.el?.pause();
    this.onChange();
  }

  toggle() {
    if (this.episode < 0) this.load(0);
    else if (this.playing) this.pause();
    else this.play();
  }

  /** The next episode (in the catalogue's order, round to the first), or from `among` when given (a set's decade). */
  next(among = null) {
    const list = among ?? this.episodes.map((_, i) => i);
    if (!list.length) return;
    const k = list.indexOf(this.episode);
    this.load(list[(k + 1) % list.length]);
  }

  /** Stops, and lets go of the video. */
  stop() {
    if (this.episode < 0) return;
    this._load++;
    this._stopVideos();
    this.episode = -1;
    this.failed = this.blocked = false;
    this.cues = [];
    this._cue = -1;
    this.onChange();
  }

  _stopVideos() {
    for (const v of [this.video, this.pageVideo]) {
      if (!v || !v.getAttribute('src')) continue;
      v.pause();
      v.removeAttribute('src');
      v.load();
    }
    if (this.box) this.box.hidden = true;
    this.onPage = false;
  }

  setCaptions(on) {
    this.captions = on;
    const track = this.pageVideo?.textTracks?.[0];
    if (track) track.mode = on ? 'showing' : 'hidden';
    this.onChange();
  }

  /** The caption showing now, or '' (asked every frame: it allocates nothing). */
  caption() {
    if (!this.captions || !this.cues.length || this.onPage) return '';
    this._cue = cueAt(this.cues, this.time, this._cue);
    return this._cue >= 0 ? this.cues[this._cue].text : '';
  }

  /** The proxy failed: the page plays it straight from archive.org (on a screen), or it cannot be played. */
  _failed(threeD) {
    const e = this.current;
    if (threeD && !this.inVR()) {
      console.info(`video: ${e.id} could not play through the archive proxy; playing it on the page instead`);
      const at = this.video.currentTime || 0;
      this._stopVideos();
      this.onPage = true;
      this._start(at, true);
      this.onNotice('Playing on the page: the room’s screens could not reach archive.org');
    } else {
      this.failed = true;
      this.onNotice(threeD ? 'This episode could not be shown in VR just now. Try again outside VR.' : `${episodeName(e)} could not be played`);
    }
    this.onChange();
  }

  /** The page's own player, a box over the view with the browser's controls and the captions as a track. */
  _pageVideo(e) {
    if (!this.pageVideo) {
      const v = this._video(false);
      v.controls = true;
      const title = document.createElement('p');
      title.className = 'player-title';
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'chip';
      close.textContent = 'Stop';
      close.addEventListener('click', () => this.stop());
      const head = document.createElement('div');
      head.className = 'player-head';
      head.append(title, close);
      this.box = document.createElement('section');
      this.box.className = 'player';
      this.box.setAttribute('aria-label', 'Playing on the page');
      this.box.append(head, v);
      this.host.append(this.box);
      this.pageVideo = v;
      this._title = title;
    }
    const v = this.pageVideo;
    for (const t of [...v.querySelectorAll('track')]) t.remove();
    if (e.captions) {
      const track = document.createElement('track');
      track.kind = 'captions';
      track.label = 'English (speech to text)';
      track.srclang = 'en';
      track.src = new URL(e.captions, this.base).href;
      track.addEventListener('load', () => this.setCaptions(this.captions));
      v.append(track);
    }
    const link = document.createElement('a');
    link.href = detailsUrl(e);
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = episodeName(e);
    this._title.replaceChildren(link);
    this.box.hidden = false;
    return v;
  }

  /** What is showing, for the panels and the card: the words for how it is going. */
  status() {
    if (this.episode < 0) return 'Stopped';
    if (this.failed) return 'Could not be played';
    if (this.blocked) return 'Press Play to watch';
    if (this.loading) return 'Loading…';
    if (this.onPage) return this.playing ? 'Playing on the page' : 'Paused, on the page';
    return this.playing ? 'Playing' : 'Paused';
  }
}
