// Базовый URL для API
const apiUrl = 'http://localhost:3000/api/clients';

// Функция валидации номера телефона РФ
function validatePhoneNumber(phone) {
  const phoneRegex =
    /^(\+7|7|8)?[\s\-]?\(?[489][0-9]{2}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/;
  return phoneRegex.test(phone);
}

// Создание модального окна с формой
function createModalForm(title, submitText, initialData = {}) {
  const modal = document.createElement('div');
  modal.classList.add('modal');
  modal.innerHTML = `
    <div class="modal__content">
        <h2>${title}</h2>
        <input type="text" placeholder="Имя" id="modal-name" value="${
          initialData.name || ''
        }" required>
        <input type="text" placeholder="Фамилия" id="modal-surname" value="${
          initialData.surname || ''
        }" required>
        <input type="text" placeholder="Отчество" id="modal-lastName" value="${
          initialData.lastName || ''
        }">
        <input type="tel" placeholder="Телефон в формате +7 (XXX) XXX-XX-XX" id="modal-phone" value="${
          initialData.contacts?.[0]?.value || ''
        }" required>
        <div class="modal__buttons">
            <button id="modal-submit">${submitText}</button>
            <button id="modal-cancel">Отмена</button>
        </div>
    </div>
`;

  document.body.appendChild(modal);
  return {
    modal,
    getFormData: () => ({
      name: document.getElementById('modal-name').value,
      surname: document.getElementById('modal-surname').value,
      lastName: document.getElementById('modal-lastName').value,
      phone: document.getElementById('modal-phone').value,
    }),
  };
}

// Удаление клиента
async function deleteClient(id) {
  await fetch(`${apiUrl}/${id}`, { method: 'DELETE' });
  location.reload();
}

// Редактирование клиента
async function editClient(id) {
  const { modal, getFormData } = createModalForm('Изменить данные', 'Сохранить');
  document.getElementById('modal-cancel').addEventListener('click', () => modal.remove());
  document.getElementById('modal-submit').addEventListener('click', async () => {
    const formData = getFormData();
    if (formData.name && formData.surname && validatePhoneNumber(formData.phone)) {
      const updatedData = {
        name: formData.name,
        surname: formData.surname,
        lastName: formData.lastName,
        contacts: [{ type: 'Phone', value: formData.phone }],
      };

      await fetch(`${apiUrl}/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });
      modal.remove();
      location.reload();
    } else {
      alert('Заполните все обязательные поля корректно');
    }
  });
}

// Основной код после загрузки DOM
document.addEventListener('DOMContentLoaded', async () => {
  // Получение списка клиентов
  let clients = [];
  try {
    const response = await fetch(apiUrl);
    clients = await response.json();
  } catch (error) {
    console.error('Ошибка при получении клиентов:', error);
    clients = [];
  }

  // Сортировка клиентов
  function sortClients(clients, field, direction) {
    return [...clients].sort((a, b) => {
      let valueA = field === 'fullName' ? `${a.surname} ${a.name} ${a.lastName}` : a[field];
      let valueB = field === 'fullName' ? `${b.surname} ${b.name} ${b.lastName}` : b[field];

      return direction === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
    });
  }

  // Отрисовка строк таблицы клиентов
  function renderClientRows(clients, table) {
    const existingRows = table.querySelectorAll('tr:not(:first-child)');
    existingRows.forEach((row) => row.remove());

    clients.forEach((client) => {
      const row = document.createElement('tr');
      row.innerHTML = `
              <td>${client.id}</td>
              <td>${client.surname} ${client.name} ${client.lastName}</td>
              <td>${client.createdAt}</td>
              <td>${client.updatedAt}</td>
              <td>${client.contacts
                .map((contact) => `${contact.type}: ${contact.value}`)
                .join(', ')}</td>
              <td>
                  <button onclick="deleteClient('${client.id}')">Удалить</button>
                  <button onclick="editClient('${client.id}')">Редактировать</button>
              </td>
          `;
      table.appendChild(row);
    });
  }

  // Основная функция отрисовки таблицы с сортировкой
  function renderClients() {
    const table = document.querySelector('.main__table');
    let currentSort = { field: null, direction: 'asc' };

    table.innerHTML = `
          <tr class="main__row">
              <th class="main__hcol" data-sort="id">ID ↕</th>
              <th class="main__hcol" data-sort="fullName">Фамилия, имя, отчество ↕</th>
              <th class="main__hcol" data-sort="createdAt">Дата и время создания ↕</th>
              <th class="main__hcol" data-sort="updatedAt">Последнее изменение ↕</th>
              <th class="main__hcol">Контакты</th>
              <th class="main__hcol">Действия</th>
          </tr>
      `;

    const headers = table.querySelectorAll('th[data-sort]');
    headers.forEach((header) => {
      header.style.cursor = 'pointer';
      header.addEventListener('click', () => {
        const field = header.dataset.sort;
        currentSort.direction =
          currentSort.field === field && currentSort.direction === 'asc' ? 'desc' : 'asc';
        currentSort.field = field;

        const sortedClients = sortClients(clients, field, currentSort.direction);
        renderClientRows(sortedClients, table);

        headers.forEach((h) => (h.textContent = h.textContent.replace(' ↑', '').replace(' ↓', '')));
        header.textContent += currentSort.direction === 'asc' ? ' ↑' : ' ↓';
      });
    });
    renderClientRows(clients, table);
  }

  // Обработчик поиска клиентов
  document.querySelector('.header__search').addEventListener('input', async (event) => {
    const response = await fetch(`${apiUrl}?search=${encodeURIComponent(event.target.value)}`);
    const filteredClients = await response.json();
    clients.length = 0;
    clients.push(...filteredClients);
    renderClients();
  });

  // Обработчик добавления нового клиента
  document.querySelector('.main__btn').addEventListener('click', async () => {
    const { modal, getFormData } = createModalForm('Добавить клиента', 'Добавить');

    document.getElementById('modal-cancel').addEventListener('click', () => modal.remove());
    document.getElementById('modal-submit').addEventListener('click', async () => {
      const formData = getFormData();
      if (formData.name && formData.surname && validatePhoneNumber(formData.phone)) {
        const newClient = {
          name: formData.name,
          surname: formData.surname,
          lastName: formData.lastName,
          contacts: [{ type: 'Phone', value: formData.phone }],
        };

        await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newClient),
        });
        modal.remove();
        location.reload();
      } else {
        alert('Заполните все обязательные поля корректно');
      }
    });
  });

  // Первичная отрисовка таблицы
  renderClients();
});

// Экспорт функций в глобальную область видимости
window.deleteClient = deleteClient;
window.editClient = editClient;
