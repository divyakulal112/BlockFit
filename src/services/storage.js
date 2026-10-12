const DEFAULT_PROFILE = {
  name: 'Player',
  coins: 60,
  lifetimePoints: 0,
  highestLevel: 1,
  completedLevels: [],
  levelStars: {},
  levelBest: {},
  equipped: { theme: 'classic', avatar: 'default', music: 'chill', particle: 'free' },
  powerups: { shuffle: 0, bomb: 0, hint: 0 },
  adFree: false,
};

const DEFAULT_SETTINGS = {
  sound: true,
  music: true,
  haptics: true,
};

export function getStoredItem(key, def) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v === null || v === undefined ? def : v;
  } catch {
    return def;
  }
}

export function setStoredItem(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // ignore quota errors
  }
}

export function loadProfile() {
  const loaded = getStoredItem('bf_profile', DEFAULT_PROFILE);
  const equipped = {
    ...DEFAULT_PROFILE.equipped,
    ...(loaded.equipped || {}),
  };

  // Normalize legacy 'classic' particle key to 'free'
  if (equipped.particle === 'classic') {
    equipped.particle = 'free';
  }

  return {
    ...DEFAULT_PROFILE,
    ...loaded,
    levelStars: loaded.levelStars || {},
    levelBest: loaded.levelBest || {},
    equipped,
    powerups: { ...DEFAULT_PROFILE.powerups, ...(loaded.powerups || {}) },
  };
}

export function saveProfile(profile) {
  setStoredItem('bf_profile', profile);
}

export function loadBestScore() {
  return getStoredItem('bf_best', 0);
}

export function saveBestScore(best) {
  setStoredItem('bf_best', best);
}

export function loadSettings() {
  return getStoredItem('bf_settings', DEFAULT_SETTINGS);
}

export function saveSettings(settings) {
  setStoredItem('bf_settings', settings);
}

export function getOwnedList(cat) {
  const defaultOwned = ['classic', 'default', 'chill', 'free'].filter(x =>
    (cat === 'theme' && x === 'classic') ||
    (cat === 'avatar' && x === 'default') ||
    (cat === 'music' && x === 'chill') ||
    (cat === 'particle' && x === 'free')
  );
  return getStoredItem('bf_owned_' + cat, defaultOwned);
}

export function saveOwnedList(cat, list) {
  setStoredItem('bf_owned_' + cat, list);
}
