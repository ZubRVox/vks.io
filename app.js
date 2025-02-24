// Инициализация приложения ВК
if (typeof vkBridge !== 'undefined') {
  vkBridge.send('VKWebAppInit');
}

let currentUser = null;

// Загрузка данных
function loadData() {
  return JSON.parse(localStorage.getItem('schedule') || {};
}

// Сохранение данных
function saveData(time, userName) {
  const data = loadData();
  
  // Удаляем предыдущий выбор пользователя
  Object.keys(data).forEach(t => {
    if (data[t] === userName) {
      delete data[t];
    }
  });
  
  // Если time не null, добавляем новый выбор
  if (time) {
    data[time] = userName;
  }
  
  localStorage.setItem('schedule', JSON.stringify(data));
}

// Обработчик выбора времени
async function selectTime(time) {
  try {
    if (!currentUser) {
      currentUser = await vkBridge.send('VKWebAppGetUserInfo');
    }
    
    const userName = `${currentUser.first_name} ${currentUser.last_name}`;
    const data = loadData();
    const currentSelection = Object.keys(data).find(t => data[t] === userName);
    
    // Если кликнули на уже выбранное время - отмена
    if (currentSelection === time) {
      saveData(null, userName);
      document.querySelectorAll('.time-slot').forEach(el => el.classList.remove('selected'));
      document.getElementById(`user-${time}`).textContent = '';
    } 
    // Если есть другое выбранное время - заменяем
    else if (currentSelection) {
      saveData(time, userName);
      document.getElementById(`user-${currentSelection}`).textContent = '';
      document.getElementById(`user-${time}`).textContent = userName;
      document.querySelectorAll('.time-slot').forEach(el => el.classList.remove('selected'));
      document.querySelector(`[onclick="selectTime('${time}')"]`).classList.add('selected');
    }
    // Новый выбор
    else {
      saveData(time, userName);
      document.getElementById(`user-${time}`).textContent = userName;
      document.querySelector(`[onclick="selectTime('${time}')"]`).classList.add('selected');
    }
    
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

// Инициализация при загрузке
window.onload = () => {
  const data = loadData();
  Object.entries(data).forEach(([time, name]) => {
    document.getElementById(`user-${time}`).textContent = name;
    document.querySelector(`[onclick="selectTime('${time}')"]`).classList.add('selected');
  });
  
  // Первоначальный рендер
  const timeSlots = ['15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'];
  const container = document.getElementById('timeSlots');
  container.innerHTML = timeSlots.map(time => `
    <div class="time-slot" onclick="selectTime('${time}')">
      ${time}
      <span class="user-name" id="user-${time}"></span>
    </div>
  `).join('');
};
