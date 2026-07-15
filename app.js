(() => {
  'use strict';

  const STORAGE_KEY = 'taskflow.tasks';
  const STATUS_LABELS = { todo: '대기', doing: '진행중', done: '완료' };

  const addForm = document.getElementById('add-form');
  const taskInput = document.getElementById('task-input');
  const taskList = document.getElementById('task-list');
  const emptyMessage = document.getElementById('empty-message');
  const filterBtns = document.querySelectorAll('.filter-btn');

  let tasks = loadTasks();
  let currentFilter = 'all';

  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  function addTask(title) {
    tasks.unshift({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
      title,
      status: 'todo',
      createdAt: Date.now(),
    });
    saveTasks();
    render();
  }

  function deleteTask(id) {
    tasks = tasks.filter((t) => t.id !== id);
    saveTasks();
    render();
  }

  function updateStatus(id, status) {
    const task = tasks.find((t) => t.id === id);
    if (task) {
      task.status = status;
      saveTasks();
      render();
    }
  }

  function render() {
    const filtered = currentFilter === 'all'
      ? tasks
      : tasks.filter((t) => t.status === currentFilter);

    taskList.innerHTML = '';
    emptyMessage.classList.toggle('hidden', filtered.length > 0);

    for (const task of filtered) {
      const li = document.createElement('li');
      li.className = `task-item ${task.status}`;

      const title = document.createElement('span');
      title.className = 'task-title';
      title.textContent = task.title;

      const select = document.createElement('select');
      select.className = `status-select ${task.status}`;
      for (const [value, label] of Object.entries(STATUS_LABELS)) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        option.selected = task.status === value;
        select.appendChild(option);
      }
      select.addEventListener('change', () => updateStatus(task.id, select.value));

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.textContent = '✕';
      deleteBtn.setAttribute('aria-label', '삭제');
      deleteBtn.addEventListener('click', () => deleteTask(task.id));

      li.appendChild(title);
      li.appendChild(select);
      li.appendChild(deleteBtn);
      taskList.appendChild(li);
    }
  }

  addForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = taskInput.value.trim();
    if (!title) return;
    addTask(title);
    taskInput.value = '';
    taskInput.focus();
  });

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      render();
    });
  });

  render();
})();
