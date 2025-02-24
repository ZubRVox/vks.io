// Инициализация приложения ВК
if (typeof vkBridge !== 'undefined') {
  vkBridge.send('VKWebAppInit');
} else {
  console.log("Режим тестирования вне VK");
}

// Пример данных (временные слоты)
let timeSlots = ['15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'];

// Функция для отображения слотов
function renderTimeSlots() {
    const container = document.getElementById('timeSlots');
    container.innerHTML = timeSlots.map(time => `
        <div class="time-slot" onclick="selectTime('${time}')">
            ${time}
            <span class="user-name" id="user-${time}"></span>
        </div>
    `).join('');
}

// Обработчик выбора времени
async function selectTime(time) {
    try {
        // Получаем данные пользователя
        const user = await vkBridge.send('VKWebAppGetUserInfo');

        // Обновляем интерфейс
        const userElement = document.getElementById(`user-${time}`);
        userElement.textContent = user.first_name + ' ' + user.last_name;

        // Здесь можно добавить сохранение данных (см. шаг 6)
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
}
// Сохранить данные
function saveData(time, userName) {
    const data = JSON.parse(localStorage.getItem('schedule') || '{}');
    data[time] = userName;
    localStorage.setItem('schedule', JSON.stringify(data));
}

// Загрузить данные
function loadData() {
    return JSON.parse(localStorage.getItem('schedule') || '{}');
}

// Обновите функцию selectTime:
async function selectTime(time) {
    const user = await vkBridge.send('VKWebAppGetUserInfo');
    const userName = user.first_name + ' ' + user.last_name;

    saveData(time, userName);
    document.getElementById(`user-${time}`).textContent = userName;
}

// При загрузке страницы показываем сохраненные данные
window.onload = () => {
    const savedData = loadData();
    timeSlots.forEach(time => {
        const userName = savedData[time];
        if (userName) {
            document.getElementById(`user-${time}`).textContent = userName;
        }
    });
};
// Запуск при загрузке страницы
renderTimeSlots();
