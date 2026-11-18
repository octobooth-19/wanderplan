(function () {
  'use strict';

  const clips = {
    japan: {
      src: 'https://assets.mixkit.co/videos/4231/4231-720.mp4',
      poster: 'https://assets.mixkit.co/videos/4231/4231-thumb-720-0.jpg',
      scene: 'A night walk through Tokyo',
      credit: 'Mixkit',
      page: 'https://mixkit.co/free-stock-video/pedestrian-walk-in-tokyo-4231/'
    },
    italy: {
      src: 'https://assets.mixkit.co/videos/4691/4691-720.mp4',
      poster: 'https://assets.mixkit.co/videos/4691/4691-thumb-720-0.jpg',
      scene: 'Cruising the canals of Venice',
      credit: 'Mixkit',
      page: 'https://mixkit.co/free-stock-video/navigating-the-central-canal-of-venice-4691/'
    },
    france: {
      src: 'https://assets.mixkit.co/videos/4145/4145-720.mp4',
      poster: 'https://assets.mixkit.co/videos/4145/4145-thumb-720-0.jpg',
      scene: 'Paris beneath the Eiffel Tower',
      credit: 'Mixkit',
      page: 'https://mixkit.co/free-stock-video/the-eiffel-tower-and-the-buildings-near-it-4145/'
    },
    thailand: {
      src: 'https://videos.pexels.com/video-files/29799083/12803220_1280_720_25fps.mp4',
      poster: 'https://images.pexels.com/videos/29799083/asian-food-bangkok-chinatown-chinese-food-29799083.jpeg?auto=compress&fit=crop&w=1280',
      scene: 'A tuk-tuk ride through Bangkok',
      credit: 'Pexels',
      page: 'https://www.pexels.com/video/vibrant-tuk-tuk-ride-in-bangkok-chinatown-at-night-29799083/'
    },
    greece: {
      src: 'https://videos.pexels.com/video-files/20398401/20398401-hd_1280_720_30fps.mp4',
      poster: 'https://images.pexels.com/videos/20398401/fira-santorini-20398401.jpeg?auto=compress&fit=crop&w=1280',
      scene: 'Above the cliffs of Santorini',
      credit: 'Pexels',
      page: 'https://www.pexels.com/video/fira-drone-flight-20398401/'
    },
    indonesia: {
      src: 'https://videos.pexels.com/video-files/10907981/10907981-hd_1280_720_25fps.mp4',
      poster: 'https://images.pexels.com/videos/10907981/bali-drone-10907981.jpeg?auto=compress&fit=crop&w=1280',
      scene: 'Exploring the green landscapes of Bali',
      credit: 'Pexels',
      page: 'https://www.pexels.com/video/lush-green-landscape-of-bali-10907981/'
    }
  };
  // Home-screen pool: one is picked at random before a destination is chosen.
  const pexels = (id, file, slug, country, scene) => ({
    country, scene, credit: 'Pexels',
    src: `https://videos.pexels.com/video-files/${id}/${file}`,
    poster: `https://images.pexels.com/videos/${id}/${slug}.jpeg?auto=compress&fit=crop&w=1280`,
    page: `https://www.pexels.com/video/${id}/`
  });
  const mixkit = (id, slug, country, scene) => ({
    country, scene, credit: 'Mixkit',
    src: `https://assets.mixkit.co/videos/${id}/${id}-720.mp4`,
    poster: `https://assets.mixkit.co/videos/${id}/${id}-thumb-720-0.jpg`,
    page: `https://mixkit.co/free-stock-video/${slug}-${id}/`
  });
  const world = [
    mixkit(4442, 'times-square-during-a-sunny-day', 'the United States', 'Times Square, New York'),
    mixkit(4457, 'tower-bridge-in-london-during-sunset', 'the United Kingdom', 'Tower Bridge at sunset, London'),
    mixkit(4106, 'chichen-itza-pyramid', 'Mexico', 'The pyramid of Chichén Itzá'),
    pexels(10719817, '10719817-hd_1280_720_24fps.mp4', 'pexels-photo-10719817', 'Egypt', 'Above the pyramids of Giza'),
    pexels(11652280, '11652280-hd_1280_720_30fps.mp4', 'at-the-beach-ipanema-rio-de-janeiro-11652280', 'Brazil', 'Ipanema Beach, Rio de Janeiro'),
    pexels(26846271, '12021148_1280_720_30fps.mp4', 'aerial-aerial-footage-aerial-video-big-city-26846271', 'South Africa', "Cape Town beneath Lion's Head"),
    pexels(39822629, '16985503_1280_720_50fps.mp4', 'bosphorus-39822629', 'Türkiye', 'The Bosphorus, Istanbul'),
    pexels(20600550, '20600550-hd_1280_720_30fps.mp4', '4k-alberta-banff-blue-20600550', 'Canada', 'Banff, Alberta'),
    pexels(7499056, '7499056-hd_1280_720_60fps.mp4', 'african-elephant-amboseli-elephant-tusks-elephants-7499056', 'Kenya', 'Elephants in Amboseli'),
    pexels(18092659, '18092659-hd_1280_720_25fps.mp4', 'sydney-harbour-at-night-slow-mo-18092659', 'Australia', 'Sydney Harbour at night'),
    pexels(29203997, '12608527_1280_720_25fps.mp4', 'breiddalsvik-drone-29203997', 'Iceland', 'Flying over Breiðdalsvík'),
    pexels(30443160, '13046412_1280_720_24fps.mp4', 'beauty-calm-fjord-fjord-landscape-30443160', 'Norway', 'Gliding through a fjord'),
    pexels(14026551, '14026551-hd_1280_720_60fps.mp4', 'pexels-photo-14026551', 'Vietnam', 'Cruising Ha Long Bay'),
    ...Object.keys(clips).map((key) => ({ ...clips[key], key }))
  ];
  const $ = (selector) => document.querySelector(selector);
  const backdrop = $('#travel-background');
  const host = $('#background-video-host');
  const controls = $('#background-controls');
  const toggle = $('#background-toggle');
  const status = $('#background-status');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let destination = null;
  let clip = null;
  let worldIndex = -1;
  let video = null;
  let paused = motion.matches;
  let failed = false;

  function syncPlayback() {
    if (!video || failed) return;
    toggle.textContent = paused ? 'Play video' : 'Pause video';
    toggle.setAttribute('aria-pressed', String(paused));
    if (paused || document.hidden) {
      video.pause();
      status.textContent = paused
        ? (motion.matches ? 'Reduced motion is on. Still preview shown.' : 'Background video paused.')
        : 'Background video paused while this tab is hidden.';
      return;
    }
    const playingVideo = video;
    if (!video.hasAttribute('src')) video.src = clip.src;
    status.textContent = 'Loading travel video...';
    video.play().catch((error) => {
      // Replaced sources and visibility changes can cancel a pending play request.
      if (video !== playingVideo || paused || failed || document.hidden || error.name === 'AbortError') return;
      paused = true;
      syncPlayback();
      status.textContent = error.name === 'NotAllowedError'
        ? 'Autoplay is blocked. Press Play video to watch.'
        : 'Video could not play. Still preview shown; press Play video to retry.';
    });
  }

  function pickWorldClip() {
    // Avoid showing the same place twice in a row.
    let index = Math.floor(Math.random() * (worldIndex < 0 ? world.length : world.length - 1));
    if (worldIndex >= 0 && index >= worldIndex) index++;
    worldIndex = index;
    return world[index];
  }

  function setDestination(key) {
    const next = Object.hasOwn(clips, key) ? key : '';
    if (next === destination) return;
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
    video = null;
    host.replaceChildren();
    backdrop.classList.remove('is-playing');
    destination = next;
    clip = destination ? clips[destination] : pickWorldClip();
    document.body.classList.add('has-video-background');
    backdrop.hidden = controls.hidden = false;
    backdrop.style.backgroundImage = `url("${clip.poster}")`;
    const places = window.Planner.DESTINATIONS;
    $('#background-title').textContent = destination
      ? `Experience ${places[destination].name}`
      : `Discover ${clip.key ? places[clip.key].name : clip.country}`;
    const credit = $('#background-credit');
    credit.textContent = `${clip.scene} - footage: ${clip.credit}`;
    credit.href = clip.page;
    failed = false;
    toggle.disabled = false;
    video = document.createElement('video');
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'none';
    video.setAttribute('aria-hidden', 'true');
    const selectedVideo = video;
    video.addEventListener('playing', () => {
      if (video !== selectedVideo) return;
      if (paused || document.hidden) { syncPlayback(); return; }
      backdrop.classList.add('is-playing');
      status.textContent = 'Travel video playing on a loop. Sound is off.';
    });
    video.addEventListener('error', () => {
      if (video !== selectedVideo) return;
      failed = true;
      video.pause();
      backdrop.classList.remove('is-playing');
      toggle.disabled = true;
      toggle.textContent = 'Video unavailable';
      status.textContent = 'Travel video unavailable. Still preview shown; you can keep planning.';
    });
    host.append(video);
    syncPlayback();
  }

  toggle.addEventListener('click', () => { paused = !paused; syncPlayback(); });
  document.addEventListener('visibilitychange', syncPlayback);
  motion.addEventListener('change', () => {
    if (motion.matches) paused = true;
    syncPlayback();
  });
  window.TravelBackground = { setDestination };
  setDestination('');
})();
