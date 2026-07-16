// --- Эмуляция Telegram для браузера ---
let tg;
if (window.Telegram && window.Telegram.WebApp) {
  tg = window.Telegram.WebApp;
  tg.ready();
} else {
  console.warn('⚠️ Режим тестирования вне Telegram.');
  tg = {
    ready: () => console.log('Telegram SDK не загружен, эмуляция'),
    showAlert: (text) => alert(text),
    close: () => window.close() || console.log('Закрыть недоступно')
  };
}
// --------------------------------------

const cropsConfig = {
  dill: {
    name: 'Укроп',
    price: 5,
    reward: 8,
    emoji: '🌿',
    growTime: 30,
    minLevel: 1,
    xpReward: 2
  },
  carrot: {
    name: 'Морковь',
    price: 15,
    reward: 25,
    emoji: '🥕',
    growTime: 60,
    minLevel: 1,
    xpReward: 5
  },
  potato: {
    name: 'Картофель',
    price: 30,
    reward: 55,
    emoji: '🥔',
    growTime: 120,
    minLevel: 2,
    xpReward: 10
  },
  wheat: {
    name: 'Пшеница',
    price: 50,
    reward: 95,
    emoji: '🌾',
    growTime: 300,
    minLevel: 2,
    xpReward: 15
  },
  cucumber: {
    name: 'Огурец',
    price: 80,
    reward: 160,
    emoji: '🥒',
    growTime: 600,
    minLevel: 3,
    xpReward: 30
  },
  strawberry: {
    name: 'Клубника',
    price: 120,
    reward: 250,
    emoji: '🍓',
    growTime: 900,
    minLevel: 3,
    xpReward: 45
  },
  tomato: {
    name: 'Томат',
    price: 200,
    reward: 430,
    emoji: '🍅',
    growTime: 1800,
    minLevel: 4,
    xpReward: 80
  },
  corn: {
    name: 'Кукуруза',
    price: 350,
    reward: 780,
    emoji: '🌽',
    growTime: 3600,
    minLevel: 4,
    xpReward: 150
  },
  eggplant: {
    name: 'Баклажан',
    price: 600,
    reward: 1400,
    emoji: '🍆',
    growTime: 7200,
    minLevel: 5,
    xpReward: 300
  },
  watermelon: {
    name: 'Арбуз',
    price: 1000,
    reward: 2500,
    emoji: '🍉',
    growTime: 14400,
    minLevel: 5,
    xpReward: 600
  }
};
const farmerLevelThresholds = [0, 300, 700, 1500, 3000];
const PLOTS_COUNT = 8;

// Сброс данных при смене версии
const currentVersion = 'v2.6';
const storedVersion = localStorage.getItem('farm_version');
if (storedVersion !== currentVersion) {
  localStorage.removeItem('farm_coins');
  localStorage.removeItem('farm_plots');
  localStorage.removeItem('farm_guild_name');
  localStorage.removeItem('farm_guild_leader');
  localStorage.removeItem('farm_guild_members');
  localStorage.removeItem('farm_guild_level');
  localStorage.removeItem('farm_guild_points');
  localStorage.removeItem('farm_inventory');
  localStorage.removeItem('farm_farmer_points');
  localStorage.setItem('farm_version', currentVersion);
  console.log('🧹 Данные сброшены под новую версию игры.');
}

let coins = localStorage.getItem('farm_coins') ? parseInt(localStorage.getItem('farm_coins')) : 100;
let plots = JSON.parse(localStorage.getItem('farm_plots')) || Array(PLOTS_COUNT).fill(null);
let selectedCropKey = 'dill';
// Инвентарь семян (по умолчанию у игрока 0 семян каждого типа)
let inventory = JSON.parse(localStorage.getItem('farm_inventory')) || {};
for (const key in cropsConfig) {
  if (typeof inventory[key] !== 'number') {
    inventory[key] = 0;
  }
}
let farmerPoints = parseInt(localStorage.getItem('farm_farmer_points')) || 0;
let activePlantAnimations = 0;

if (!Array.isArray(plots)) {
  plots = Array(PLOTS_COUNT).fill(null);
}
plots = plots.slice(0, PLOTS_COUNT);
while (plots.length < PLOTS_COUNT) {
  plots.push(null);
}
plots = plots.map((plot) => {
  if (!plot) return null;
  const hasValidCrop = typeof plot.cropKey === 'string' && !!cropsConfig[plot.cropKey];
  const hasValidTime = typeof plot.plantedAt === 'number' && Number.isFinite(plot.plantedAt);
  return hasValidCrop && hasValidTime ? plot : null;
});

function saveInventory() {
  localStorage.setItem('farm_inventory', JSON.stringify(inventory));
}

// Данные гильдии
let guildName = localStorage.getItem('farm_guild_name') || null;
let guildLeader = localStorage.getItem('farm_guild_leader') || null;
let guildMembers = JSON.parse(localStorage.getItem('farm_guild_members')) || [];
let guildLevel = parseInt(localStorage.getItem('farm_guild_level')) || 0;
let guildPoints = parseInt(localStorage.getItem('farm_guild_points')) || 0;
// --- ОБЩАЯ БАЗА ВСЕХ ГИЛЬДИЙ (пока храним локально для тестов) ---
let allGuilds = JSON.parse(localStorage.getItem('farm_all_guilds')) || [];

function saveAllGuilds() {
  localStorage.setItem('farm_all_guilds', JSON.stringify(allGuilds));
}
// ------------------------------------------------------------------

// Никнейм игрока (автоматически берем из Telegram, если он доступен)
let currentNick = localStorage.getItem('farm_current_nick');
if (!currentNick) {
  if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe?.user) {
    const user = window.Telegram.WebApp.initDataUnsafe.user;
    // Если у человека есть юзернейм (например, @alex), берем его. Если нет — берем Имя.
    currentNick = user.username ? `@${user.username}` : user.first_name;
  } else {
    currentNick = 'Игрок'; // Оставляем для тестов в обычном браузере
  }
  localStorage.setItem('farm_current_nick', currentNick);
}

function saveCurrentNick() {
  localStorage.setItem('farm_current_nick', currentNick);
}

function saveProgress() {
  localStorage.setItem('farm_coins', coins.toString());
  localStorage.setItem('farm_plots', JSON.stringify(plots));
  localStorage.setItem('farm_farmer_points', farmerPoints.toString());
}

function saveGuild() {
  localStorage.setItem('farm_guild_name', guildName);
  localStorage.setItem('farm_guild_leader', guildLeader);
  localStorage.setItem('farm_guild_members', JSON.stringify(guildMembers));
  localStorage.setItem('farm_guild_level', guildLevel.toString());
  localStorage.setItem('farm_guild_points', guildPoints.toString());
}

// Элементы DOM
const coinsEl = document.getElementById('coins');
const field = document.getElementById('field');
const farmerLevelEl = document.getElementById('farmerLevel');
const farmerPointsEl = document.getElementById('farmerPoints');
const openFieldFromMapBtn = document.getElementById('openFieldFromMapBtn');
const openGardenFromMapBtn = document.getElementById('openGardenFromMapBtn');
const openPenFromMapBtn = document.getElementById('openPenFromMapBtn');
const openGreenhouseFromMapBtn = document.getElementById('openGreenhouseFromMapBtn');

// Элементы КАРТЫ и выпадающего списка
const mapBtn = document.getElementById('mapBtn');

const shopBtn = document.getElementById('shopBtn');
const guildBtn = document.getElementById('guildBtn');
const harvestBtn = document.getElementById('harvestBtn'); // кнопка сбора

const shopContainer = document.getElementById('shop');
const inventoryBtn = document.getElementById('inventoryBtn');
const inventoryContainer = document.getElementById('inventory');

// Элементы гильдии
const guildStatsContainer = document.getElementById('guild-stats'); 
const guildNameEl = document.getElementById('guild-name');
const guildLeaderEl = document.getElementById('guild-leader');
const guildMembersCountEl = document.getElementById('guild-members-count');
const guildLevelEl = document.getElementById('guild-level');
const guildPointsEl = document.getElementById('guild-points');
const guildActions = document.getElementById('guild-actions');

const createGuildBtn = document.getElementById('create-guild-btn');
const joinGuildBtn = document.getElementById('join-guild-btn');
const leaveGuildBtn = document.getElementById('leave-guild-btn');
const disbandGuildBtn = document.getElementById('disband-guild-btn');

function setSceneBackground(screenId) {
  const backgroundByScreen = {
    'map-screen': 'img/background.jpg',
    'field-screen': 'img/pole2.jpg',
    'garden-screen': 'img/apple-sad2.jpg',
    'pen-screen': 'img/zagon2.jpg',
    'shop-screen': 'img/background.jpg',
    'inventory-screen': 'img/background.jpg',
    'guild-screen': 'img/background.jpg'
  };
  const bgPath = backgroundByScreen[screenId] || 'img/background.jpg';
  document.body.style.setProperty('--scene-bg', `url('${bgPath}')`);
}

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(screenId);
  if (target) target.classList.add('active');
setSceneBackground(screenId);
  
  // ЕСЛИ ОТКРЫЛИ МАГАЗИН — СБРАСЫВАЕМ ЕГО НА ВЫБОР РАЗДЕЛОВ
  if (screenId === 'shop-screen') {
    selectShopCategory('categories');
  }
}

// === НОВАЯ НАВИГАЦИЯ: КАРТА КАК ОТДЕЛЬНЫЙ ЭКРАН ===
if (mapBtn) {
  mapBtn.onclick = () => {
    showScreen('map-screen');
  };
}
if (shopBtn) {
  shopBtn.onclick = () => {
    renderShop();
    showScreen('shop-screen');
  };
}
if (guildBtn) {
  guildBtn.onclick = () => {
    renderGuildInfo();
    showScreen('guild-screen');
  };
}
if (inventoryBtn) {
  inventoryBtn.onclick = () => {
    renderInventory();
    showScreen('inventory-screen');
  };
}
if (openFieldFromMapBtn) {
  openFieldFromMapBtn.onclick = () => {
    showScreen('field-screen');
  };
}
if (openGardenFromMapBtn) {
  openGardenFromMapBtn.onclick = () => {
    showScreen('garden-screen');
  };
}
if (openPenFromMapBtn) {
  openPenFromMapBtn.onclick = () => {
    showScreen('pen-screen');
  };
}
if (openGreenhouseFromMapBtn) {
  openGreenhouseFromMapBtn.onclick = () => {
    tg.showAlert('Оранжерея пока в разработке 🛠️');
  };
}

function getTimeLeft(plantedAt, growTimeSeconds) {
  const now = Date.now();
  const elapsed = Math.floor((now - plantedAt) / 1000);
  const left = Math.max(0, growTimeSeconds - elapsed);
  return left;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function renderShop() {
  shopContainer.innerHTML = '';
  const currentLevel = getCurrentFarmerLevel();
  for (const key in cropsConfig) {
    const crop = cropsConfig[key];
    let qty = 1;
    const isUnlocked = currentLevel >= crop.minLevel;
    const item = document.createElement('div');
    item.className = 'shop-item';
    const left = document.createElement('div');
    left.className = 'shop-left';
    const nameEl = document.createElement('span');
    nameEl.className = 'shop-name';
    nameEl.textContent = `${crop.emoji} ${crop.name}`;
    const ownEl = document.createElement('small');
    ownEl.style.opacity = '0.75';
    ownEl.style.fontSize = '11px';
    if (isUnlocked) {
      ownEl.textContent = `У вас: ${inventory[key] || 0} шт. · Ур. ${crop.minLevel}+ · Рост: ${formatTime(crop.growTime)} · XP: +${crop.xpReward}`;
    } else {
      ownEl.textContent = `🔒 Доступно с уровня ${crop.minLevel} · Рост: ${formatTime(crop.growTime)} · XP: +${crop.xpReward}`;
    }
    left.appendChild(nameEl);
    left.appendChild(ownEl);
    const right = document.createElement('div');
    right.className = 'shop-right';
    const qtyControl = document.createElement('div');
    qtyControl.className = 'qty-control';
    const minusBtn = document.createElement('button');
    minusBtn.className = 'qty-btn';
    minusBtn.textContent = '−';
    const qtyValue = document.createElement('span');
    qtyValue.className = 'qty-value';
    qtyValue.textContent = String(qty);
    const plusBtn = document.createElement('button');
    plusBtn.className = 'qty-btn';
    plusBtn.textContent = '+';
    qtyControl.appendChild(minusBtn);
    qtyControl.appendChild(qtyValue);
    qtyControl.appendChild(plusBtn);
    const buyBtn = document.createElement('button');
    buyBtn.className = 'buy-btn';
    const updateControls = () => {
      const totalPrice = qty * crop.price;
      qtyValue.textContent = String(qty);
      buyBtn.textContent = isUnlocked ? `Купить за ${totalPrice}💰` : `Нужен ур. ${crop.minLevel}`;
      minusBtn.disabled = qty <= 1 || !isUnlocked;
      plusBtn.disabled = qty >= 999 || !isUnlocked;
      buyBtn.disabled = !isUnlocked || coins < totalPrice;
    };
    minusBtn.onclick = () => {
      if (qty > 1) {
        qty -= 1;
        updateControls();
      }
    };
    plusBtn.onclick = () => {
      if (qty < 999) {
        qty += 1;
        updateControls();
      }
    };
    buyBtn.onclick = () => {
      if (!isUnlocked) {
        tg.showAlert(`Это семя откроется на уровне ${crop.minLevel}.`);
        return;
      }
      const totalPrice = qty * crop.price;
      if (coins < totalPrice) {
        tg.showAlert(`Не хватает монет! Нужно ${totalPrice}, у вас ${coins}.`);
        return;
      }
      coins -= totalPrice;
      inventory[key] = (inventory[key] || 0) + qty;
      selectedCropKey = key;
      saveProgress();
      saveInventory();
      tg.showAlert(`Вы купили ${qty} шт. семян «${crop.name}». Теперь у вас ${inventory[key]} шт.`);
      renderShop();
    };
    right.appendChild(qtyControl);
    right.appendChild(buyBtn);
    item.appendChild(left);
    item.appendChild(right);
    updateControls();
    shopContainer.appendChild(item);
  }
  coinsEl.textContent = coins;
}

function renderInventory() {
  inventoryContainer.innerHTML = ''; // Очищаем экран перед перерисовкой

  for (const key in cropsConfig) {
    const crop = cropsConfig[key];
    const count = inventory[key] || 0; // Сколько семян этого типа у нас есть
    
    const item = document.createElement('div');
    item.className = 'inventory-item';

    // Если это семечко сейчас активно для посадки — подсветим золотой рамкой
    const isSelected = (selectedCropKey === key);
    if (isSelected) {
      item.style.borderColor = '#f1c40f';
      item.style.boxShadow = '0 0 8px rgba(241, 196, 15, 0.3)';
    }

    // Содержимое карточки семени
    item.innerHTML = `
      <span class="inventory-name">
        ${crop.emoji} ${crop.name} 
        ${isSelected ? '<small style="color: #f1c40f; margin-left: 5px;">(Выбрано)</small>' : ''}
      </span>
      <span class="inventory-count">${count} шт.</span>
    `;

    // При клике на карточку — выбираем семя активным и отправляем игрока на поле
    item.onclick = () => {
      selectedCropKey = key;
      tg.showAlert(`Вы выбрали для посадки: ${crop.name}`);
      renderInventory(); // Перерисовываем инвентарь (чтобы рамка обновилась)
      showScreen('field-screen'); // Перекидываем на поле
      renderField(); // Обновляем поле
    };

    inventoryContainer.appendChild(item);
  }
}
function getFarmerLevelByPoints(points) {
  if (points >= farmerLevelThresholds[4]) return 5;
  if (points >= farmerLevelThresholds[3]) return 4;
  if (points >= farmerLevelThresholds[2]) return 3;
  if (points >= farmerLevelThresholds[1]) return 2;
  return 1;
}
function renderFarmerStats() {
  const level = getFarmerLevelByPoints(farmerPoints);
  if (farmerLevelEl) {
    farmerLevelEl.textContent = `Уровень фермера: ${level}`;
  }
  if (farmerPointsEl) {
    farmerPointsEl.textContent = `Очки развития: ${farmerPoints}`;
  }
}
function getCurrentFarmerLevel() {
  return getFarmerLevelByPoints(farmerPoints);
}
function addFarmerPoints(pointsToAdd) {
  const oldLevel = getCurrentFarmerLevel();
  farmerPoints += pointsToAdd;
  const newLevel = getCurrentFarmerLevel();
  saveProgress();
  renderFarmerStats();
  return {
    oldLevel,
    newLevel,
    leveledUp: newLevel > oldLevel
  };
}

function renderField() {
  field.innerHTML = '';

  plots.forEach((plotData, i) => {
    const plot = document.createElement('div');
    plot.className = 'plot';

    if (plotData) {
const { cropKey, plantedAt } = plotData;
const crop = cropsConfig[cropKey];
if (!crop) {
  plots[i] = null;
  saveProgress();
  return;
}
plot.textContent = crop.emoji;

      const timeLeft = getTimeLeft(plantedAt, crop.growTime);
      const isReady = timeLeft <= 0;

      // Таймер
      const timerEl = document.createElement('span');
      timerEl.className = 'plot-timer';
      timerEl.textContent = isReady ? 'ГОТОВО' : formatTime(timeLeft);
      plot.appendChild(timerEl);

      // Клик по готовой грядке — поштучный сбор
plot.onclick = () => {
  const currentPlot = plots[i];
  if (!currentPlot) return;
  const freshTimeLeft = getTimeLeft(currentPlot.plantedAt, crop.growTime);
  if (freshTimeLeft > 0) {
    tg.showAlert('Ещё рано — растение не выросло!');
    return;
  }
  plots[i] = null;
  coins += crop.reward;
  const levelResult = addFarmerPoints(crop.xpReward);
  saveProgress();
  renderField();
  let msg = `Ты собрал ${crop.name}! Получено монет: ${crop.reward}. Очки развития: +${crop.xpReward}.`;
  if (levelResult.leveledUp) {
    msg += `\n🎉 Новый уровень фермера: ${levelResult.newLevel}!`;
  }
  tg.showAlert(msg);
};

      // Подсветка готовой грядки
      if (isReady) {
        plot.classList.add('ready');
        plot.style.cursor = 'pointer';
        plot.style.opacity = '1';
      } else {
        plot.classList.remove('ready');
        plot.style.cursor = 'not-allowed';
        plot.style.opacity = '0.85';
      }

    } else {
      // --- ПУСТАЯ ГРЯДКА — ПОСАДКА С АНИМАЦИЕЙ ---
     plot.textContent = '';
      plot.classList.remove('ready');
      plot.style.cursor = 'pointer';
      plot.style.opacity = '1';

      // Делаем обработчик клика асинхронным (async)
plot.onclick = async () => {
  const plantingCropKey = selectedCropKey;
  const crop = cropsConfig[plantingCropKey];
  if (!crop) {
    tg.showAlert('Ошибка: выбранная культура не найдена.');
    return;
  }
  const currentLevel = getCurrentFarmerLevel();
  if (currentLevel < crop.minLevel) {
    tg.showAlert(`Для посадки ${crop.name} нужен уровень ${crop.minLevel}.`);
    return;
  }
  if (inventory[plantingCropKey] > 0) {
    // Блокируем повторный клик по этой же грядке
    plot.onclick = null;
    plot.style.cursor = 'wait';
    // Списываем семечко сразу
    inventory[plantingCropKey]--;
    saveInventory();
    // Отмечаем: началась ещё одна анимация
    activePlantAnimations++;
    try {
      // Анимация посадки
      await runPlantingAnimation(plot);
      // Фиксируем посадку после анимации
      plots[i] = { cropKey: plantingCropKey, plantedAt: Date.now() };
      saveProgress();
    } finally {
      // Эта анимация завершилась
      activePlantAnimations--;
      // Перерисовываем поле только когда ВСЕ анимации закончились
      if (activePlantAnimations === 0) {
        renderField();
      }
    }
  } else {
    tg.showAlert(`У вас нет семян ${crop.name}! Купите их сначала в магазине.`);
    showScreen('shop-screen');
    renderShop();
  }
};
    }

    field.appendChild(plot);
  });

  coinsEl.textContent = coins;
  renderFarmerStats();
}

// --- Гильдия ---
function renderGuildInfo() {
  if (guildName) {
    // === СЦЕНАРИЙ 1: ИГРОК В ГИЛЬДИИ ===
    
    // 1. Показываем блок со статистикой
    guildStatsContainer.style.display = 'block';
    
    // Заполняем статистику данными
    guildNameEl.textContent = guildName;
    guildLeaderEl.textContent = guildLeader;
    guildMembersCountEl.textContent = guildMembers.length;
    guildLevelEl.textContent = guildLevel;
    guildPointsEl.textContent = guildPoints;

    // 2. Управляем кнопками действий
    guildActions.style.display = 'block';
    createGuildBtn.style.display = 'none'; // Скрываем "Создать"
    joinGuildBtn.style.display = 'none';   // Скрываем "Вступить"

    // Проверяем: лидер игрок или нет
    if (guildLeader === currentNick) {
      // Если ЛИДЕР: показываем "Распустить", скрываем "Покинуть"
      disbandGuildBtn.style.display = 'inline-block';
      leaveGuildBtn.style.display = 'none';
    } else {
      // Если УЧАСТНИК: скрываем "Распустить", показываем "Покинуть"
      disbandGuildBtn.style.display = 'none';
      leaveGuildBtn.style.display = 'inline-block';
    }

  } else {
    // === СЦЕНАРИЙ 2: У ИГРОКА НЕТ ГИЛЬДИИ ===
    
    // 1. Полностью скрываем блок статистики
    guildStatsContainer.style.display = 'none';
    
    // 2. Показываем только кнопки "Создать" и "Вступить"
    guildActions.style.display = 'block';
    createGuildBtn.style.display = 'inline-block';
    joinGuildBtn.style.display = 'inline-block';
    
    // Скрываем кнопки выхода и роспуска
    leaveGuildBtn.style.display = 'none';
    disbandGuildBtn.style.display = 'none';
  }
}

createGuildBtn.onclick = () => {
  const name = prompt('Придумайте название гильдии (до 20 символов):');
  if (!name || name.trim() === '') return;
  const cleanName = name.trim().substring(0, 20);

  if (guildName) {
    tg.showAlert('Вы уже состоите в гильдии! Сначала покиньте её.');
    return;
  }

  // ПРОВЕРКА: Существует ли уже гильдия с таким именем?
  const existingGuild = allGuilds.find(g => g.name.toLowerCase() === cleanName.toLowerCase());
  if (existingGuild) {
    tg.showAlert('Гильдия с таким названием уже существует! Придумайте другое.');
    return;
  }

  // Задаем данные игроку
  guildName = cleanName;
  guildLeader = currentNick;
  guildMembers = [guildLeader];
  guildLevel = 1;
  guildPoints = 0;

  // Добавляем новую гильдию в общую "базу данных"
  allGuilds.push({
    name: guildName,
    leader: guildLeader,
    members: guildMembers,
    level: guildLevel,
    points: guildPoints
  });

  saveGuild();
  saveAllGuilds(); // Сохраняем общую базу
  renderGuildInfo();
  tg.showAlert(`Гильдия "${guildName}" создана! Вы — её лидер.`);
};

joinGuildBtn.onclick = () => {
  const name = prompt('Введите название гильдии для вступления:');
  if (!name || name.trim() === '') return;
  const cleanName = name.trim().substring(0, 20);

  if (guildName) {
    tg.showAlert('Вы уже состоите в гильдии!');
    return;
  }

  // ИЩЕМ гильдию в нашей "базе данных"
  const foundGuild = allGuilds.find(g => g.name.toLowerCase() === cleanName.toLowerCase());

  if (!foundGuild) {
    tg.showAlert('Такой гильдии не существует! Проверьте правильность названия.');
    return;
  }

  // Если гильдия найдена — копируем её данные игроку
  guildName = foundGuild.name;
  guildLeader = foundGuild.leader;
  
  // Если нашего игрока еще нет в списке участников, добавляем его туда
  if (!foundGuild.members.includes(currentNick)) {
    foundGuild.members.push(currentNick);
  }
  guildMembers = foundGuild.members;
  guildLevel = foundGuild.level;
  guildPoints = foundGuild.points;

  saveGuild();
  saveAllGuilds(); // Сохраняем обновленный состав в базу
  renderGuildInfo();
  tg.showAlert(`Вы успешно вступили в гильдию "${guildName}".`);
};

leaveGuildBtn.onclick = () => {
  if (!guildName) return;

  const isLeader = (guildLeader === currentNick);
  if (isLeader && guildMembers.length > 1) {
    tg.showAlert('Лидер не может покинуть гильдию, пока в ней есть другие участники. Распустите гильдию.');
    return;
  }

  // Удаляем игрока из списка участников в общей "базе данных"
  const guildIndex = allGuilds.findIndex(g => g.name === guildName);
  if (guildIndex !== -1) {
    allGuilds[guildIndex].members = allGuilds[guildIndex].members.filter(m => m !== currentNick);
    saveAllGuilds();
  }

  // Очищаем данные у самого игрока
  guildName = null;
  guildLeader = null;
  guildMembers = [];
  guildLevel = 0;
  guildPoints = 0;

  saveGuild();
  renderGuildInfo();
  tg.showAlert('Вы покинули гильдию.');
};

disbandGuildBtn.onclick = () => {
  if (!guildName) return;
  if (guildLeader !== currentNick) {
    tg.showAlert('Только лидер может распустить гильдию.');
    return;
  }

  if (!confirm('Вы уверены? Guild будет распущена.')) return;

  // Удаляем саму гильдию из общей "базы данных"
  allGuilds = allGuilds.filter(g => g.name !== guildName);
  saveAllGuilds();

  // Очищаем данные у игрока
  guildName = null;
  guildLeader = null;
  guildMembers = [];
  guildLevel = 0;
  guildPoints = 0;

  saveGuild();
  renderGuildInfo();
  tg.showAlert('Гильдия распущена.');
};

// Кнопка «Собрать урожай» — собрать всё готовое
if (harvestBtn) {
  harvestBtn.onclick = () => {
    let harvestedCount = 0;
    let totalReward = 0;
let totalXp = 0;
    
    plots.forEach((plotData, i) => {
      if (plotData) {
        const { cropKey, plantedAt } = plotData;
        const crop = cropsConfig[cropKey];
        if (!crop) {
  plots[i] = null;
  saveProgress();
  return;
}
        const timeLeft = getTimeLeft(plantedAt, crop.growTime);

        if (timeLeft <= 0) {
          plots[i] = null;
          coins += crop.reward;
          totalReward += crop.reward;
          harvestedCount++;
          totalXp += crop.xpReward;
        }
      }
    });

if (harvestedCount > 0) {
  const levelResult = addFarmerPoints(totalXp);
  saveProgress();
  renderField();
  let msg = `Собрано ${harvestedCount} урожая. Получено монет: ${totalReward}. Очки развития: +${totalXp}.`;
  if (levelResult.leveledUp) {
    msg += `\n🎉 Новый уровень фермера: ${levelResult.newLevel}!`;
  }
  tg.showAlert(msg);
} else {
  tg.showAlert('Нет готового урожая для сбора.');
}
  };
}

// Таймер обновления времени на грядках
setInterval(() => {
  const plotsInDom = document.querySelectorAll('.plot');
  plotsInDom.forEach((el, idx) => {
    const data = plots[idx];
    if (data) {
const crop = cropsConfig[data.cropKey];
if (!crop) {
  plots[idx] = null;
  saveProgress();
  return;
}
const timeLeft = getTimeLeft(data.plantedAt, crop.growTime);
      const timerEl = el.querySelector('.plot-timer');
      if (timerEl) {
        timerEl.textContent = timeLeft <= 0 ? 'ГОТОВО' : formatTime(timeLeft);
        if (timeLeft <= 0) {
          el.classList.add('ready');
          el.style.opacity = '1';
          el.style.cursor = 'pointer';
        } else {
          el.classList.remove('ready');
          el.style.opacity = '0.85';
          el.style.cursor = 'not-allowed';
        }
      }
    }
  });
}, 1000);

// Инициализация
renderField();
renderShop();
renderGuildInfo();
renderInventory();
renderFarmerStats();
setSceneBackground('map-screen');

(function initLoadingScreen() {
  const loadingEl = document.getElementById('loadingScreen');
  const progressFillEl = document.getElementById('loadingProgressFill');
  const progressTextEl = document.getElementById('loadingProgressText');
  if (!loadingEl || !progressFillEl || !progressTextEl) return;
  let percent = 0;
  let isPageLoaded = false;
  let hidden = false;
  const renderProgress = () => {
    progressFillEl.style.width = `${percent}%`;
    progressTextEl.textContent = `${percent}%`;
  };
  const hideLoader = () => {
    if (hidden) return;
    hidden = true;
    loadingEl.classList.add('is-hidden');
    setTimeout(() => {
      if (loadingEl.parentNode) {
        loadingEl.parentNode.removeChild(loadingEl);
      }
    }, 450);
  };
  const timer = setInterval(() => {
    if (!isPageLoaded) {
      percent = Math.min(92, percent + 1);
      renderProgress();
      return;
    }
    percent = Math.min(100, percent + 4);
    renderProgress();
    if (percent >= 100) {
      clearInterval(timer);
      setTimeout(hideLoader, 200);
    }
  }, 35);
  window.addEventListener('load', () => {
    isPageLoaded = true;
  });
  setTimeout(() => {
    isPageLoaded = true;
  }, 7000);
})();

// ФУНКЦИЯ ДЛЯ ПЕРЕКЛЮЧЕНИЯ РАЗДЕЛОВ В МАГАЗИНЕ
function selectShopCategory(category) {
  const categoriesEl = document.getElementById('shop-categories');
  const shopEl = document.getElementById('shop');
  const backBtn = document.getElementById('shop-back-btn');
  const titleEl = document.getElementById('shop-title');

  if (!categoriesEl || !shopEl || !backBtn || !titleEl) return;

  if (category === 'categories') {
    // 1. ПОКАЗЫВАЕМ ВЫБОР КАТЕГОРИЙ
    categoriesEl.style.display = 'flex';
    shopEl.style.display = 'none';
    backBtn.style.display = 'none';
    titleEl.textContent = 'Магазин';
  } else {
    // 2. ПОКАЗЫВАЕМ ПРИЛАВОК И КНОПКУ "НАЗАД"
    categoriesEl.style.display = 'none';
    backBtn.style.display = 'block';

    if (category === 'field') {
      titleEl.textContent = 'Магазин: Семена';
      shopEl.style.display = 'grid'; // Оставляем сетку для карточек семян
      
      // Запускаем твой стандартный рендер семян, который уже написан в script.js
      renderShop(); 
    } 
    else if (category === 'garden') {
      titleEl.textContent = 'Магазин: Сад';
      shopEl.style.display = 'block'; // Меняем на block для красивого текста
      
      // Выводим временную заглушку для Сада
      shopEl.innerHTML = `
        <div class="shop-empty-message">
          🌳 <br><br>
          <strong>Раздел «Сад» пока закрыт!</strong><br>
          Здесь будут продаваться саженцы яблонь, груш и других деревьев.
        </div>
      `;
    } 
    else if (category === 'pen') {
      titleEl.textContent = 'Магазин: Загон';
      shopEl.style.display = 'block';
      
      // Выводим временную заглушку для Загона
      shopEl.innerHTML = `
        <div class="shop-empty-message">
          🐄 <br><br>
          <strong>Раздел «Загон» в разработке!</strong><br>
          Здесь вы сможете купить коров, кур и овечек для вашей фермы.
        </div>
      `;
    }
  }
}

// Обязательно делаем функцию глобальной, чтобы HTML-кнопки (onclick) её видели!
window.selectShopCategory = selectShopCategory;
