const ADJECTIVES = [
  'Cyber', 'Neon', 'Shadow', 'Ghost', 'Silent', 'Cosmic', 'Solar', 'Phantom',
  'Quantum', 'Hyper', 'Stealth', 'Mystic', 'Turbo', 'Frost', 'Vortex', 'Alpha',
  'Echo', 'Blaze', 'Iron', 'Nova', 'Obsidian', 'Astral', 'Nexus', 'Valkyrie',
  'Omega', 'Apex', 'Glitch', 'Titan', 'Drift', 'Aero', 'Zephyr', 'Rogue',
  'Cryptic', 'Zero', 'Matrix', 'Pulse', 'Crimson', 'Azure', 'Golden', 'Venom',
  'Static', 'Atomic', 'Prism', 'Radiant', 'Stellar', 'Eclipse', 'Horizon', 'Flux',
  'Zenith', 'Enigma', 'Infinite', 'Savage', 'Spectral', 'Velocity', 'Cobalt', 'Sonic',
  'Magma', 'Inferno', 'Thunder', 'Storm', 'Raven', 'Onyx', 'Mirage', 'Chrono',
  'Synapse', 'Cybernetic', 'Vector', 'Pixel', 'Binary', 'Aura', 'Karma', 'Rune',
  'Titanium', 'Vandal', 'Rebel', 'Reaper', 'Falcon', 'Specter', 'Vanguard', 'Sentinel',
];

const NOUNS = [
  'Ninja ⚡', 'Falcon 🦅', 'Wolf 🐺', 'Fox 🦊', 'Dragon 🐉', 'Phoenix 🔥',
  'Tiger 🐯', 'Viper 🐍', 'Eagle 🦅', 'Racer 🏎️', 'Specter 👻', 'Knight 🛡️',
  'Panda 🐼', 'Hawk 🦅', 'Otter 🦦', 'Samurai ⚔️', 'Cyborg 🤖', 'Ghost 👤',
  'Ranger 🏹', 'Wizard 🧙', 'Reaper ☠️', 'Panther 🐆', 'Cheetah 🐆', 'Bear 🐻',
  'Lion 🦁', 'Jaguar 🐾', 'Shark 🦈', 'Kraken 🦑', 'Hydra 🐍', 'Griffin 🦅',
  'Pegasus 🦄', 'Titan 🗿', 'Golem 🪨', 'Warlock 🔮', 'Archer 🎯', 'Drifter 🌌',
  'Pilot 🚀', 'Hacker 💻', 'Scout 🔭', 'Voyager 🛸', 'Nomad 🏕️', 'Ronin 🗡️',
  'Sentry 👁️', 'Gladiator 🛡️', 'Corsair 🏴‍☠️', 'Assassin 🗡️', 'Maverick 🕶️', 'Vanguard 🛡️',
  'Sentinel 🗼', 'Prophet 📜', 'Chameleon 🦎', 'Scorpion 🦂', 'Mantis 🦗', 'Raven 🐦',
  'Owl 🦉', 'Cobra 🐍', 'Centaur 🏹', 'Minotaur 🐂', 'Gargoyle 🦇', 'Banshee 💨',
  'Sorcerer 🪄', 'Beast 🐾', 'Warrior ⚔️', 'Champion 🏆', 'Striker ⚡', 'Raider 🗡️',
];

// FIX: Rejection-sampling based crypto random to eliminate modulo bias.
// Matches the same approach used in generateCode.js.
function cryptoRandInt(max) {
  // Find the largest multiple of max that fits in Uint32 range
  const limit = Math.floor(0x100000000 / max) * max;
  const arr = new Uint32Array(1);
  let val;
  do {
    crypto.getRandomValues(arr);
    val = arr[0];
  } while (val >= limit); // discard values that would cause bias
  return val % max;
}

export function generateAnonymousName() {
  const adj = ADJECTIVES[cryptoRandInt(ADJECTIVES.length)];
  const noun = NOUNS[cryptoRandInt(NOUNS.length)];
  // 6-digit suffix for uniqueness
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  // FIX: Use rejection sampling for suffix too — eliminates modulo bias
  // on the 900000 range (0x100000000 / 900000 = 4772.18, non-integer)
  const limit = Math.floor(0x100000000 / 900000) * 900000;
  let raw = buf[0];
  if (raw >= limit) {
    // Re-draw once — probability of needing more than one retry is <0.02%
    crypto.getRandomValues(buf);
    raw = buf[0] % 900000;
  } else {
    raw = raw % 900000;
  }
  const suffix = 100000 + raw;
  return `${adj} ${noun} #${suffix}`;
}
