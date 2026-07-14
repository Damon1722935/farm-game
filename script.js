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
  carrot: { name: 'Морковь', price: 20, reward: 30, emoji: '🥕', growTime: 120 },
  wheat:  { name: 'Пшеница',  price: 30, reward: 50, emoji: '🌾', growTime: 300 },
  strawberry: { name: 'Клубника', price: 50, reward: 80, emoji: '🍓', growTime: 480 }
};

// Сброс данных при смене версии
const currentVersion = 'v2.1';
const storedVersion = localStorage.getItem('farm_version');
if (storedVersion !== currentVersion) {
  localStorage.removeItem('farm_coins');
  localStorage.removeItem('farm_plots');
  // Убрали всё лишнее: guild, quests и т.п.
  localStorage.setItem('farm_version', currentVersion);
  console.log('🧹 Данные сброшены под новую версию игры (квесты удалены).');
}

let coins = localStorage.getItem('farm_coins') ? parseInt(localStorage.getItem('farm_coins')) : 100;
let plots = JSON.parse(localStorage.getItem('farm_plots')) || Array(6).fill(null);
let selectedCropKey = 'carrot';

// Элементы DOM — оставили только нужные
const coinsEl = document.getElementById('coins');
const field = document.getElementById('field');
const fieldBtn = document.getElementById('fieldBtn');
const shopBtn = document.getElementById('shopBtn');
const shopContainer = document.getElementById('shop');

function saveProgress() {
  localStorage.setItem('farm_coins', coins.toString());
  localStorage.setItem('farm_plots', JSON.stringify(plots));
}

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  const screen = document.getElementById(screenId);
  if (screen) screen.classList.add('active');
}

fieldBtn.onclick = () => showScreen('field-screen');
shopBtn.onclick = () => { renderShop(); showScreen('shop-screen'); };

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
  for (const key in cropsConfig) {
    const crop = cropsConfig[key];
    const item = document.createElement('div');
    item.className = 'shop-item';
    item.innerHTML = `<span class="shop-name">${crop.name}</span><span class="shop-price">${crop.price}💰</span>`;
    item.onclick = () => {
      if (coins >= crop.price) {
        coins -= crop.price;
        selectedCropKey = key;
        tg.showAlert(`Вы выбрали: ${crop.name}. Теперь сажайте на поле.`);
        showScreen('field-screen');
        renderField();
      } else {
        tg.showAlert(`Не хватает монет! Нужно ${crop.price}, у вас ${coins}.`);
      }
    };
    shopContainer.appendChild(item);
  }
}

// --- ГЛАВНАЯ ОТРИСОВКА ПОЛЯ (грядок) ---
function renderField() {
  field.innerHTML = '';

  plots.forEach((plotData, i) => {
    const plot = document.createElement('div');
    plot.className = 'plot'; // класс, к которому привязан background-image в CSS

    if (plotData) {
      const { cropKey, plantedAt } = plotData;
      const crop = cropsConfig[cropKey];

      // Показываем эмодзи культуры
      plot.textContent = crop.emoji;

      const timeLeft = getTimeLeft(plantedAt, crop.growTime);
      const isReady = timeLeft <= 0;

      // Таймер
      const timerEl = document.createElement('span');
      timerEl.className = 'plot-timer';
      timerEl.textContent = isReady ? 'ГОТОВО' : formatTime(timeLeft);
      plot.appendChild(timerEl);

      plot.onclick = () => {
        if (!isReady) {
          tg.showAlert('Ещё рано — растение не выросло!');
          return;
        }
        // Сбор урожая
        plots[i] = null;
        coins += crop.reward;

        saveProgress();
        renderField();

        tg.showAlert(`Ты собрал ${crop.name}! Получено монет: ${crop.reward}.`);
      };

      if (!isReady) {
        plot.style.cursor = 'not-allowed';
        plot.style.opacity = '0.85';
      }
    } else {
      // Пустая грядка
      plot.textContent = '🌱';
      plot.onclick = () => {
        const crop = cropsConfig[selectedCropKey];
        if (coins >= crop.price) {
          coins -= crop.price;
          plots[i] = { cropKey: selectedCropKey, plantedAt: Date.now() };
          saveProgress();
          renderField();
          tg.showAlert(`Ты посадил ${crop.name}!`);
        } else {
          tg.showAlert(`Не хватает монет! Нужно ${crop.price}, у тебя ${coins}.`);
        }
      };
    }

    field.appendChild(plot);
  });

  coinsEl.textContent = coins;
}

// Таймер обновления времени на грядках (каждую секунду)
setInterval(() => {
  const plotsInDom = document.querySelectorAll('.plot');
  plotsInDom.forEach((el, idx) => {
    const data = plots[idx];
    if (data) {
      const crop = cropsConfig[data.cropKey];
      const timeLeft = getTimeLeft(data.plantedAt, crop.growTime);
      const timerEl = el.querySelector('.plot-timer');
      if (timerEl) {
        timerEl.textContent = timeLeft <= 0 ? 'ГОТОВО' : formatTime(timeLeft);
        if (timeLeft <= 0) {
          el.style.opacity = '1';
          el.style.cursor = 'pointer';
        } else {
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
