// Инициализация VK Bridge
if (typeof vkBridge !== 'undefined') {
    vkBridge.send('VKWebAppInit');
}

let currentUser = null;
const timeSlots = ['15:00', '15:30', '16:00', '16:30'];

// Загрузка данных из LocalStorage
function loadData() {
    return JSON.parse(localStorage.getItem('schedule') || '{}');
}

// Сохранение данных с учетом одного выбора
function saveData(time, userName) {
    const data = loadData();
    
    // Удаляем предыдущий выбор пользователя
    Object.keys(data).forEach(t => {
        if (data[t] === userName) {
            delete data[t];
        }
    });
    
    // Добавляем новый выбор (если время указано)
    if (time) {
        data[time] = userName;
    }
    
    localStorage.setItem('schedule', JSON.stringify(data));
}

// Основная функция выбора времени
async function selectTime(selectedTime) {
    try {
        if (!currentUser) {
            currentUser = await vkBridge.send('VKWebAppGetUserInfo');
        }
        
        const userName = `${currentUser.first_name} ${currentUser.last_name}`;
        const data = loadData();
        const currentSelection = Object.keys(data).find(t => data[t] === userName);
        
        // Отмена выбора
        if (currentSelection === selectedTime) {
            saveData(null, userName);
            document.getElementById(`user-${selectedTime}`).textContent = '';
            document.querySelector(`[onclick="selectTime('${selectedTime}')"]`).classList.remove('selected');
            return;
        }
        
        // Замена выбора
        if (currentSelection) {
            saveData(selectedTime, userName);
            document.getElementById(`user-${currentSelection}`).textContent = '';
            document.querySelector(`[onclick="selectTime('${currentSelection}')"]`).classList.remove('selected');
        }
        
        // Новый выбор
        saveData(selectedTime, userName);
        document.getElementById(`user-${selectedTime}`).textContent = userName;
        document.querySelector(`[onclick="selectTime('${selectedTime}')"]`).classList.add('selected');
        
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Не удалось сохранить выбор');
    }
}

// Инициализация при загрузке страницы
window.onload = () => {
    // Рендер списка времени
    const container = document.getElementById('timeSlots');
    container.innerHTML = timeSlots.map(time => `
        <div class="time-slot" onclick="selectTime('${time}')">
            ${time}
            <span class="user-name" id="user-${time}"></span>
        </div>
    `).join('');
    
    // Загрузка сохраненных данных
    const data = loadData();
    Object.entries(data).forEach(([time, name]) => {
        document.getElementById(`user-${time}`).textContent = name;
        document.querySelector(`[onclick="selectTime('${time}')"]`).classList.add('selected');
    });
};
