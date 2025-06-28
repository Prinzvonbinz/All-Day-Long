// ---- Helper Data ----
const countrySelect = document.getElementById('countrySelect');
const dateDisplay = document.getElementById('dateDisplay');
const clock = document.getElementById('clock');
const trophyBtn = document.getElementById('trophyBtn');
const achievementModal = document.getElementById('achievementModal');
const closeAchievements = document.getElementById('closeAchievements');
const achievementTree = document.getElementById('achievementTree');
const achievementCountry = document.getElementById('achievementCountry');

const countryList = Intl.supportedValuesOf?.('region') || [
  "DE", "US", "FR", "ES", "IT", "GB", "CN", "JP", "BR", "IN", "RU", "CA", "AU", "ZA"
];

function getCountryName(code) {
  try {
    return new Intl.DisplayNames([navigator.language || 'de'], {type: 'region'}).of(code) || code;
  } catch {
    return code;
  }
}

// ---- State ----
let state = {
  country: localStorage.getItem('adl-country') || countryList[0],
  startDate: null, // ISO String
  loginTimes: {}, // hour: true
  unlocked: {}, // achievementKey: true
  countryStats: {}, // countryCode: {startDate, loginTimes, unlocked}
  visitedCountries: []
};

// ---- Achievements Definition ----
const dayAchievements = [1,5,10,50,100,500,1000].map(d => ({
  key: `days_${d}`,
  label: `${d} Tag${d===1?'':'e'} vergangen`,
  emoji: '⏰'
}));
const hourAchievements = Array.from({length:24},(_,i)=>({
  key: `hour_${i+1}`,
  label: `Einmal um ${String(i+1).padStart(2,"0")}:00 online`,
  emoji: '🕒'
}));
const countryAchievements = [
  {key:'countries_10', label:'In 10 Ländern gewesen', emoji:'🌍'},
  {key:'countries_20', label:'In 20 Ländern gewesen', emoji:'🌎'},
  {key:'countries_50', label:'In 50 Ländern gewesen', emoji:'🌏'},
];
const multiCountryAchievements = [
  {key:'countries_3in10', label:'In 10 Ländern mind. 3 Erfolge', emoji:'🏆'},
  {key:'countries_3in20', label:'In 20 Ländern mind. 3 Erfolge', emoji:'🏆'},
  {key:'countries_3in50', label:'In 50 Ländern mind. 3 Erfolge', emoji:'🏆'},
];

const achievementTreeStructure = [
  {key: 'start', label: 'Starte das Spiel', emoji: '🎮', unlocks: ['days_1']},
  ...dayAchievements.map((a,i,arr)=>({
    ...a, unlocks: arr[i+1] ? [arr[i+1].key] : ['hour_1']
  })),
  ...hourAchievements.map((a,i,arr)=>({
    ...a, unlocks: arr[i+1] ? [arr[i+1].key] : []
  }))
];

// ---- LocalStorage ----
function saveState() {
  localStorage.setItem('adl-country', state.country);
  const stats = {...state.countryStats};
  stats[state.country] = {
    startDate: state.startDate,
    loginTimes: state.loginTimes,
    unlocked: state.unlocked
  };
  localStorage.setItem('adl-countryStats', JSON.stringify(stats));
  localStorage.setItem('adl-visited', JSON.stringify(state.visitedCountries));
}
function loadState() {
  state.country = localStorage.getItem('adl-country') || countryList[0];
  state.countryStats = JSON.parse(localStorage.getItem('adl-countryStats')||'{}');
  state.visitedCountries = JSON.parse(localStorage.getItem('adl-visited')||'[]');
  const cs = state.countryStats[state.country]||{};
  state.startDate = cs.startDate || (new Date().toISOString().slice(0,10));
  state.loginTimes = cs.loginTimes||{};
  state.unlocked = cs.unlocked||{};
  if (!state.visitedCountries.includes(state.country)) {
    state.visitedCountries.push(state.country);
  }
  saveState();
}

// ---- UI Setup ----
function fillCountries() {
  countrySelect.innerHTML = '';
  countryList.forEach(c=>{
    const o = document.createElement('option');
    o.value = c;
    o.textContent = getCountryName(c);
    if (c===state.country) o.selected = true;
    countrySelect.appendChild(o);
  });
}
function updateDateDisplay() {
  const now = new Date();
  const tz = getCountryTimeZone(state.country);
  const locale = navigator.language || 'de-DE';
  const countryNow = new Date(now.toLocaleString('en-US', {timeZone: tz}));
  dateDisplay.textContent = countryNow.toLocaleDateString(locale, {day:'2-digit',month:'2-digit',year:'numeric'});
}

function updateClock() {
  const now = new Date();
  const tz = getCountryTimeZone(state.country);
  const countryNow = new Date(now.toLocaleString('en-US', {timeZone: tz}));
  clock.textContent = countryNow.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'});
}
function getCountryTimeZone(countryCode) {
  // Basic mapping, not fully accurate for all, but okay for app
  const tzMap = {
    DE: 'Europe/Berlin', FR: 'Europe/Paris', IT: 'Europe/Rome', ES: 'Europe/Madrid', 
    GB: 'Europe/London', US: 'America/New_York', CN: 'Asia/Shanghai', JP: 'Asia/Tokyo',
    BR: 'America/Sao_Paulo', IN: 'Asia/Kolkata', RU: 'Europe/Moscow', CA: 'America/Toronto', 
    AU: 'Australia/Sydney', ZA: 'Africa/Johannesburg'
  };
  return tzMap[countryCode] || 'UTC';
}

// ---- Achievement Logic ----
function unlockAchievement(key) {
  if (!state.unlocked[key]) {
    state.unlocked[key] = true;
    saveState();
    setTimeout(()=>alert('Erfolg freigeschaltet: '+achievementLabel(key)), 150);
  }
}
function achievementLabel(key) {
  const find = [...achievementTreeStructure, ...countryAchievements, ...multiCountryAchievements].find(a=>a.key===key);
  return find ? find.label : key;
}
function validToUnlock(key) {
  if (key==='start') return true;
  const node = achievementTreeStructure.find(a=>a.key===key);
  if (!node) return false;
  if (!node.unlocks) return true;
  // Check if all predecessors are unlocked
  const predecessors = achievementTreeStructure.filter(a=>a.unlocks?.includes(key));
  return predecessors.every(pr=>state.unlocked[pr.key]);
}
function updateAchievements() {
  // Day-based unlocks
  const start = new Date(state.startDate);
  const now = new Date(new Date().toLocaleString('en-US', {timeZone:getCountryTimeZone(state.country)}));
  const daysPassed = Math.floor((now-start)/8.64e7)+1;
  dayAchievements.forEach(d=>{
    if (daysPassed>=parseInt(d.key.split('_')[1])) unlockAchievement(d.key);
  });
  // Hour unlocks
  const hour = now.getHours()+1;
  if (!state.loginTimes[hour]) {
    state.loginTimes[hour] = true;
    saveState();
    unlockAchievement('hour_'+hour);
  }
  // Start node always unlocked
  unlockAchievement('start');
}

// ---- Achievement Modal ----
function showAchievements(country) {
  achievementCountry.textContent = getCountryName(country);
  achievementTree.innerHTML = '';
  const stats = state.countryStats[country]||{};
  const unlocked = stats.unlocked||{};
  // Render tree (linear, then hours as branch)
  let nodes = [...achievementTreeStructure];
  nodes.forEach(node=>{
    const div = document.createElement('div');
    div.className = 'achievement-node '+(unlocked[node.key]?'unlocked':'locked');
    div.innerHTML = `<span class="emoji">${node.emoji}</span> ${node.label}`;
    div.onclick = ()=>{
      if (!unlocked[node.key] && validToUnlock(node.key)) {
        unlocked[node.key]=true;
        if (!state.countryStats[country]) state.countryStats[country]={};
        state.countryStats[country].unlocked=unlocked;
        saveState();
        showAchievements(country);
      }
    };
    achievementTree.appendChild(div);
  });
  // Country meta achievements
  function countCountries(minUnlocked=0) {
    return Object.values(state.countryStats).filter(cs=>{
      if (!cs.unlocked) return false;
      const c = Object.values(cs.unlocked).filter(Boolean).length;
      return c>=minUnlocked;
    }).length;
  }
  // Countries visited
  countryAchievements.forEach(ca => {
    const unlockedC = state.visitedCountries.length >= parseInt(ca.key.split('_')[1]);
    const div = document.createElement('div');
    div.className = 'achievement-node '+(unlockedC?'unlocked':'locked');
    div.innerHTML = `<span class="emoji">${ca.emoji}</span> ${ca.label}`;
    achievementTree.appendChild(div);
  });
  // Countries with >=3 unlocked achievements
  multiCountryAchievements.forEach(ca => {
    const needed = parseInt(ca.key.match(/\d+/)[0]);
    const unlockedC = countCountries(3) >= needed;
    const div = document.createElement('div');
    div.className = 'achievement-node '+(unlockedC?'unlocked':'locked');
    div.innerHTML = `<span class="emoji">${ca.emoji}</span> ${ca.label}`;
    achievementTree.appendChild(div);
  });
}

// ---- Event Listeners ----
countrySelect.addEventListener('change', ()=>{
  state.country = countrySelect.value;
  loadState();
  updateDateDisplay();
  updateClock();
  updateAchievements();
});
trophyBtn.addEventListener('click', ()=>{
  showAchievements(state.country);
  achievementModal.classList.remove('hidden');
});
closeAchievements.addEventListener('click', ()=>{
  achievementModal.classList.add('hidden');
});

// ---- App Start ----
function tick() {
  updateClock();
  updateDateDisplay();
  updateAchievements();
}
loadState();
fillCountries();
tick();
setInterval(tick, 1000);

document.addEventListener('visibilitychange', ()=>{
  if (!document.hidden) tick();
});
