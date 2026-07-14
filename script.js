const tg = window.Telegram.WebApp;
tg.ready();

// Настройки культур: цена покупки и доход при сборе
const cropsConfig = {
  carrot: { name: 'Морковь', price: 20, reward: 30, emoji: '🥕' },
  wheat: { name: 'Пшеница', price: 30, reward: 50, emoji: '🌾' },
  strawberry: { name: 'Клубника', price: 50, reward: 80, emoji: '🍓' }
};

// Загрузка прогресса
let coins = parseInt(localStorage.getItem('farm_coins')) || 0;
let plots = JSON.parse(localStorage.getItem('farm_plots')) || Array(6).fill(null);
let selectedCropKey = 'carrot'; // по умолчанию

const coinsEl = document.getElementById('coins');
const field = document.getElementById('field');
const harvestBtn = document.getElementById('harvestBtn');
const closeBtn = document.getElementById('closeBtn');
const shopContainer = document.getElementById('shop');

function saveProgress() {
  localStorage.setItem('farm_coins', coins.toString());
  localStorage.setItem('farm_plots', JSON.stringify(plots));
}

function renderShop() {
  shopContainer.innerHTML = '';
  for (const key in cropsConfig) {
    const crop = cropsConfig[key];
    const item = document.createElement('div');
    item.className = 'shop-item';
    item.innerHTML = `
      <span>${crop.name}</span>
      <span class="shop-price">${crop.price} монет</span>
    `;
    item.onclick = () => {
      selectedCropKey = key;
      tg.showAlert(`Выбран: ${crop.name}`);
    };
    shopContainer.appendChild(item);
  }
}

function renderField() {
  field.innerHTML = '';
  plots.forEach((cropKey, i) => {
    const plot = document.createElement('div');
    plot.className = 'plot';
    if (cropKey) {
      const crop = cropsConfig[cropKey];
      plot.textContent = crop.emoji;
      // Цвет фона для наглядности
      if (cropKey === 'carrot') plot.style.background = '#ffca28';
      if (cropKey === 'wheat') plot.style.background = '#c5e1a5';
      if (cropKey === 'strawberry') plot.style.background = '#ffcdd2';
    }
    field.appendChild(plot);
  });
  coinsEl.textContent = coins;
}

// Если вдруг количество грядок не совпадает, исправляем
if (plots.length !== 6) {
  plots = Array(6).fill(null);
  saveProgress();
}
renderShop();
renderField();

harvestBtn.onclick = () => {
  let harvested = false;
  plots.forEach((cropKey, i) => {
    if (cropKey) {
      const crop = cropsConfig[cropKey];
      coins += crop.reward;
      plots[i] = null; // убираем растение
      harvested = true;
    }
  });
  if (harvested) {
    saveProgress();
    renderField();
  } else {
    tg.showAlert('Нечего собирать!');
  }
};

closeBtn.onclick = () => {
  tg.close();
};
