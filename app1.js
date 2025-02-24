// Инициализация VK Bridge
if (typeof vkBridge !== 'undefined') {
    try {
        vkBridge.send('VKWebAppInit').then(() => {
            console.log('VK Bridge initialized');
        });
    } catch (error) {
        console.error('Ошибка инициализации VK Bridge:', error);
    }
}

let currentUser = null;
const isTestMode = typeof vkBridge === 'undefined';

// Конфигурация расписания (исправленные дни недели)
const SCHEDULE_CONFIG = {
    2: { start: 11, end: 15 }, // Вторник
    4: { start: 15, end: 20 }, // Четверг
    6: { start: 15, end: 20 }  // Суббота
};

// Инициализация календаря
const datePicker = flatpickr("#datePicker", {
    locale: "ru",
    minDate: "today",
    dateFormat: "d.m.Y",
    disableMobile: true,
    maxDate: new Date().fp_incr(365),
    onChange: function(selectedDates) {
        if (selectedDates[0]) {
            updateSchedule(selectedDates[0]);
        }
    }
});

// Генерация временных слотов
function generateTimeSlots(date) {
    try {
        if (!(date instanceof Date)) return [];
        
        const dayOfWeek = date.getDay();
        const config = SCHEDULE_CONFIG[dayOfWeek];
        if (!config) return [];
        
        const slots = [];
        for (let hour = config.start; hour < config.end; hour++) {
            slots.push(
                `${hour.toString().padStart(2, '0')}:00`,
                `${hour.toString().padStart(2, '0')}:30`
            );
        }
        return slots;
    } catch (error) {
        console.error('Ошибка генерации слотов:', error);
        return [];
    }
}

// Обновление интерфейса
function updateSchedule(date) {
    try {
        if (!(date instanceof Date)) {
            console.error('Некорректная дата');
            return;
        }

        const titleElement = document.getElementById('scheduleTitle');
        const slotsElement = document.getElementById('timeSlots');
        
        if (!titleElement || !slotsElement) return;

        titleElement.textContent = `Расписание на ${date.toLocaleDateString('ru-RU', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        })}`;

        const timeSlots = generateTimeSlots(date);
        slotsElement.innerHTML = timeSlots.map(time => `
            <div class="time-slot" data-time="${time}" onclick="handleTimeSelection('${time}')">
                <span>${time}</span>
                <span class="user-name" id="user-${time}"></span>
            </div>
        `).join('');

        loadSavedData(date);
    } catch (error) {
        console.error('Ошибка обновления интерфейса:', error);
    }
}

// Обработка выбора времени
async function handleTimeSelection(time) {
    try {
        const date = datePicker.selectedDates[0];
        if (!date) return;

        const userName = await getUsername();
        const dateKey = date.toISOString().split('T')[0];
        const storedData = localStorage.getItem(dateKey) || '{}';
        const data = JSON.parse(storedData);

        const userElement = document.getElementById(`user-${time}`);
        const slotElement = document.querySelector(`[data-time="${time}"]`);

        if (!userElement || !slotElement) {
            throw new Error('Элементы интерфейса не найдены');
        }

        // Логика выбора/отмены
        if (data[time] === userName) {
            delete data[time];
            userElement.textContent = '';
            slotElement.classList.remove('selected');
        } else {
            // Удаляем предыдущий выбор
            Object.keys(data).forEach(t => {
                if (data[t] === userName) {
                    delete data[t];
                    const oldElement = document.querySelector(`[data-time="${t}"]`);
                    if (oldElement) {
                        oldElement.classList.remove('selected');
                        document.getElementById(`user-${t}`).textContent = '';
                    }
                }
            });
            
            data[time] = userName;
            userElement.textContent = userName;
            slotElement.classList.add('selected');
        }

        localStorage.setItem(dateKey, JSON.stringify(data));

    } catch (error) {
        console.error('Ошибка выбора времени:', error);
        alert(`Ошибка: ${error.message}`);
    }
}

// Получение имени пользователя
async function getUsername() {
    try {
        if (!currentUser) {
            if (isTestMode) {
                currentUser = { 
                    first_name: 'Тест', 
                    last_name: 'Пользователь' 
                };
            } else {
                currentUser = await vkBridge.send('VKWebAppGetUserInfo');
            }
        }
        return `${currentUser.first_name} ${currentUser.last_name}`;
    } catch (error) {
        console.error('Ошибка получения пользователя:', error);
        return 'Неизвестный Пользователь';
    }
}

// Загрузка сохраненных данных
function loadSavedData(date) {
    try {
        const dateKey = date.toISOString().split('T')[0];
        const storedData = localStorage.getItem(dateKey) || '{}';
        const data = JSON.parse(storedData);
        
        Object.entries(data).forEach(([time, name]) => {
            const element = document.getElementById(`user-${time}`);
            const slot = document.querySelector(`[data-time="${time}"]`);
            
            if (element && slot) {
                element.textContent = name;
                slot.classList.add('selected');
            }
        });
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
    }
}

// Инициализация при загрузке
window.onload = () => {
    try {
        datePicker.setDate(new Date());
        if (!isTestMode) {
            vkBridge.send('VKWebAppGetUserInfo')
                .then(user => {
                    currentUser = user;
                    updateSchedule(datePicker.selectedDates[0]);
                })
                .catch(console.error);
        }
    } catch (error) {
        console.error('Ошибка инициализации:', error);
    }
};
