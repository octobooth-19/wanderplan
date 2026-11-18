const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { DESTINATIONS } = require('./planner.js');

const source = fs.readFileSync(require.resolve('./video-background.js'), 'utf8');

function setup({ reducedMotion = false, playError = null, random = () => 0 } = {}) {
  class Element extends EventTarget {
    constructor() {
      super();
      this.attributes = new Map();
      this.classes = new Set();
      this.classList = {
        add: (name) => this.classes.add(name),
        remove: (name) => this.classes.delete(name),
        toggle: (name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name)
      };
      this.style = {};
      this.children = [];
      this.paused = true;
      this.playCalls = 0;
      this.loadCalls = 0;
      this.playError = playError;
    }
    setAttribute(name, value) { this.attributes.set(name, value); }
    hasAttribute(name) { return this.attributes.has(name); }
    removeAttribute(name) { this.attributes.delete(name); }
    set src(value) { this.setAttribute('src', value); }
    get src() { return this.attributes.get('src'); }
    append(element) { this.children.push(element); }
    replaceChildren() { this.children = []; }
    pause() { this.paused = true; }
    load() { this.loadCalls++; }
    play() {
      this.playCalls++;
      if (this.playError) return Promise.reject(this.playError);
      this.paused = false;
      this.dispatchEvent(new Event('playing'));
      return Promise.resolve();
    }
    click() { this.dispatchEvent(new Event('click')); }
  }
  const ids = ['travel-background', 'background-video-host', 'background-controls',
    'background-toggle', 'background-status', 'background-title', 'background-credit'];
  const elements = Object.fromEntries(ids.map((id) => [id, new Element()]));
  const document = Object.assign(new EventTarget(), {
    body: new Element(), hidden: false,
    querySelector: (selector) => elements[selector.slice(1)],
    createElement: () => new Element()
  });
  const motion = Object.assign(new EventTarget(), { matches: reducedMotion });
  const window = { Planner: { DESTINATIONS }, matchMedia: () => motion };
  vm.runInNewContext(source, { window, document, Math: Object.assign(Object.create(Math), { random: () => random() }) });
  return {
    select: window.TravelBackground.setDestination,
    get video() { return elements['background-video-host'].children[0]; },
    get status() { return elements['background-status'].textContent; },
    toggle: elements['background-toggle'],
    backdrop: elements['travel-background'],
    title: elements['background-title'],
    document, motion
  };
}

test('all six destinations play distinct, muted loops; generation can reselect without restarting', () => {
  const ui = setup();
  const sources = new Set();
  for (const [key, destination] of Object.entries(DESTINATIONS)) {
    const previous = ui.video;
    ui.select(key);
    if (previous) {
      assert.equal(previous.paused, true);
      assert.equal(previous.hasAttribute('src'), false);
      assert.equal(previous.loadCalls, 1);
    }
    const video = ui.video;
    sources.add(video.src);
    assert.equal(video.paused, false);
    assert.equal(video.muted && video.defaultMuted && video.loop && video.playsInline, true);
    assert.equal(ui.title.textContent, `Experience ${destination.name}`);
    ui.select(key);
    assert.equal(ui.video, video);
    assert.equal(video.playCalls, 1);
  }
  assert.equal(sources.size, 6);
  ui.select('');
  assert.match(ui.title.textContent, /^Discover /);
  assert.equal(ui.video.paused, false);
  assert.equal(ui.backdrop.hidden, false);
});

test('home screen plays a random world clip that changes after each trip without repeating', () => {
  let n = 0.99;
  const ui = setup({ random: () => n });
  const seen = [ui.video.src];
  assert.match(ui.title.textContent, /^Discover /);
  assert.equal(ui.video.paused, false);
  assert.equal(ui.backdrop.hidden, false);
  assert.equal(ui.document.body.classes.has('has-video-background'), true);
  ui.select('');
  assert.equal(ui.video.src, seen[0], 'staying on the home screen keeps the current clip');
  for (const value of [0.99, 0, 0.5, 0.5, 0.5]) {
    n = value;
    ui.select('japan');
    ui.select('');
    assert.notEqual(ui.video.src, seen.at(-1));
    assert.match(ui.video.src, /^https:\/\//);
    seen.push(ui.video.src);
  }
  assert.ok(new Set(seen).size >= 4);
});

test('pause is preserved across destination changes and hidden-tab round trips', () => {
  const ui = setup();
  ui.select('japan');
  ui.toggle.click();
  ui.select('italy');
  assert.equal(ui.video.hasAttribute('src'), false);
  assert.equal(ui.toggle.textContent, 'Play video');
  ui.document.hidden = true;
  ui.document.dispatchEvent(new Event('visibilitychange'));
  ui.document.hidden = false;
  ui.document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(ui.video.playCalls, 0);
  ui.toggle.click();
  assert.equal(ui.video.paused, false);
  ui.document.hidden = true;
  ui.document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(ui.video.paused, true);
  ui.document.hidden = false;
  ui.document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(ui.video.paused, false);
});

test('reduced motion defers video loading until an explicit play and respects live preference changes', () => {
  const ui = setup({ reducedMotion: true });
  ui.select('france');
  assert.equal(ui.video.hasAttribute('src'), false);
  assert.match(ui.status, /Reduced motion/);
  assert.ok(ui.backdrop.style.backgroundImage);
  ui.toggle.click();
  assert.equal(ui.video.paused, false);
  ui.motion.dispatchEvent(new Event('change'));
  assert.equal(ui.video.paused, true);
  ui.motion.matches = false;
  ui.motion.dispatchEvent(new Event('change'));
  assert.equal(ui.video.paused, true);
  assert.doesNotMatch(ui.status, /Reduced motion is on/);
});

test('blocked autoplay and media failures expose a fallback without preventing another destination', async () => {
  const ui = setup({ playError: { name: 'NotAllowedError' } });
  ui.select('greece');
  await Promise.resolve();
  assert.match(ui.status, /Autoplay is blocked/);
  assert.equal(ui.toggle.textContent, 'Play video');
  ui.video.playError = null;
  ui.toggle.click();
  assert.equal(ui.video.paused, false);
  ui.video.dispatchEvent(new Event('error'));
  assert.match(ui.status, /unavailable.*keep planning/);
  assert.equal(ui.toggle.disabled, true);
  assert.equal(ui.backdrop.classes.has('is-playing'), false);
  ui.select('indonesia');
  await Promise.resolve();
  assert.equal(ui.toggle.disabled, false);
  ui.video.playError = null;
  ui.toggle.click();
  assert.equal(ui.video.paused, false);
});

test('late media events and rejected play requests from old destinations cannot replace the current scene', async () => {
  const ui = setup();
  ui.select('japan');
  const old = ui.video;
  old.playError = { name: 'NotAllowedError' };
  ui.document.dispatchEvent(new Event('visibilitychange'));
  ui.select('thailand');
  old.dispatchEvent(new Event('error'));
  old.dispatchEvent(new Event('playing'));
  await Promise.resolve();
  assert.equal(ui.title.textContent, 'Experience Thailand');
  assert.equal(ui.toggle.disabled, false);
  assert.equal(ui.backdrop.classes.has('is-playing'), true);
  assert.equal(ui.video.paused, false);
  assert.match(ui.status, /playing on a loop/);
});
