// Menunggu DOM dimuat
document.addEventListener('DOMContentLoaded', () => {

    // --- Pemilihan Elemen DOM ---
    const todoForm = document.getElementById('todo-form');
    const todoInput = document.getElementById('todo-input');
    const todoDate = document.getElementById('todo-date');
    const todoListBody = document.getElementById('todo-list-body');
    const filterSelect = document.getElementById('filter-select');
    const deleteAllBtn = document.getElementById('delete-all-btn');

    // Elemen DOM Baru
    const searchInput = document.getElementById('search-input');
    const tableHead = document.querySelector('#todo-table thead');
    const totalTasksVal = document.getElementById('total-tasks-val');
    const completedTasksVal = document.getElementById('completed-tasks-val');
    const pendingTasksVal = document.getElementById('pending-tasks-val');
    const progressVal = document.getElementById('progress-val');
    const themeToggleBtn = document.getElementById('theme-toggle');

    // --- State Aplikasi ---
    let todos = JSON.parse(localStorage.getItem('todos')) || [];
    let searchQuery = '';
    let currentSort = {
        column: 'date', // Kolom default untuk sort
        order: 'asc'    // Urutan default
    };
    const THEME_STORAGE_KEY = 'taskmaster-theme';

    // --- Event Listeners ---
    todoForm.addEventListener('submit', addTodo);
    todoListBody.addEventListener('click', handleTodoClick);
    filterSelect.addEventListener('change', renderTodos);
    deleteAllBtn.addEventListener('click', deleteAllTodos);

    // Listener Baru
    searchInput.addEventListener('input', handleSearch);
    tableHead.addEventListener('click', handleSort);
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleThemeMode);
    }

    // Render awal saat load
    initializeTheme();
    renderTodos();

    // --- Fungsi-Fungsi ---

    // Menambah tugas baru
    function addTodo(e) {
        e.preventDefault();
        const taskText = todoInput.value.trim();
        const taskDate = todoDate.value; // Sekarang berisi tanggal dan waktu

        // Validasi
        if (taskText === '' || taskDate === '') {
            alert('Nama tugas dan waktu tidak boleh kosong!');
            return;
        }

        const newTodo = {
            id: Date.now(),
            text: taskText,
            date: taskDate,
            completed: false
        };

        todos.push(newTodo);
        saveTodos();
        renderTodos();

        todoInput.value = '';
        todoDate.value = '';
    }

    // Fungsi utama untuk me-render list tugas
    function renderTodos() {
        todoListBody.innerHTML = '';

        // --- Logika Pemrosesan (Filter -> Search -> Sort) ---

        // 1. Filter (Pending/Completed/All)
        const filterValue = filterSelect.value;
        let processedTodos = todos.filter(todo => {
            if (filterValue === 'pending') return !todo.completed;
            if (filterValue === 'completed') return todo.completed;
            return true; // 'all'
        });

        // 2. Search (Berdasarkan keyword)
        const normalizedSearchQuery = searchQuery.toLowerCase();
        if (normalizedSearchQuery) {
            processedTodos = processedTodos.filter(todo => 
                todo.text.toLowerCase().includes(normalizedSearchQuery)
            );
        }

        // 3. Sort (Berdasarkan state currentSort)
        processedTodos.sort((a, b) => {
            let valA, valB;

            if (currentSort.column === 'task') {
                valA = a.text.toLowerCase();
                valB = b.text.toLowerCase();
            } else { // Default ke 'date'
                valA = new Date(a.date);
                valB = new Date(b.date);
            }

            if (valA < valB) {
                return currentSort.order === 'asc' ? -1 : 1;
            }
            if (valA > valB) {
                return currentSort.order === 'asc' ? 1 : -1;
            }
            return 0; // Sama
        });
        
        // --- Logika Menampilkan ke Tabel ---

        if (processedTodos.length === 0) {
            const emptyRow = todoListBody.insertRow();
            emptyRow.classList.add('empty-row');
            const cell = emptyRow.insertCell();
            cell.colSpan = 4;
            cell.textContent = 'Tidak ada tugas ditemukan.';
        } else {
            processedTodos.forEach(todo => {
                const row = todoListBody.insertRow();
                row.setAttribute('data-id', todo.id);
                if (todo.completed) {
                    row.classList.add('completed');
                }

                // Format DateTime
                const formattedDate = new Date(todo.date).toLocaleString('id-ID', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                }).replace('.', ':'); // Mengganti format 15.30 -> 15:30

                // Status
                const statusText = todo.completed ? 'Selesai' : 'Belum Selesai';
                const statusClass = todo.completed ? 'status-completed' : 'status-pending';
                const completeBtnText = todo.completed ? 'Batal' : 'Selesai';

                // Render sel
                row.innerHTML = `
                    <td>${todo.text}</td>
                    <td>${formattedDate}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td class="text-right">
                        <div class="cell-action-buttons">
                            <button class="btn btn-action btn-complete">${completeBtnText}</button>
                            <button class="btn btn-action btn-delete">Hapus</button>
                        </div>
                    </td>
                `;
            });
        }
        
        // Perbarui UI tambahan
        updateDashboard();
        updateSortIndicators();
    }

    // Menangani klik pada tombol Aksi (Selesai/Hapus)
    function handleTodoClick(e) {
        const target = e.target;
        const todoRow = target.closest('tr[data-id]');
        if (!todoRow) return;

        const todoId = Number(todoRow.dataset.id);

        if (target.classList.contains('btn-complete')) {
            toggleTodoComplete(todoId);
        }
        if (target.classList.contains('btn-delete')) {
            deleteTodo(todoId);
        }
    }

    // Mengubah status selesai
    function toggleTodoComplete(id) {
        todos = todos.map(todo => 
            todo.id === id ? { ...todo, completed: !todo.completed } : todo
        );
        saveTodos();
        renderTodos();
    }

    // Menghapus satu tugas
    function deleteTodo(id) {
        if (confirm('Apakah Anda yakin ingin menghapus tugas ini?')) {
            todos = todos.filter(todo => todo.id !== id);
            saveTodos();
            renderTodos();
        }
    }

    // Menghapus semua tugas
    function deleteAllTodos() {
        if (todos.length === 0) {
            alert('Tidak ada tugas untuk dihapus.');
            return;
        }
        if (confirm('Apakah Anda yakin ingin MENGHAPUS SEMUA tugas?')) {
            todos = [];
            saveTodos();
            renderTodos();
        }
    }

    // Menyimpan ke Local Storage
    function saveTodos() {
        localStorage.setItem('todos', JSON.stringify(todos));
    }

    // --- Fungsi Baru ---

    // (BARU) Inisialisasi tema berdasarkan preferensi terakhir
    function initializeTheme() {
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme === 'light') {
            document.body.classList.add('light-theme');
        } else if (savedTheme === 'dark') {
            document.body.classList.remove('light-theme');
        }
        updateThemeToggleLabel();
    }

    // (BARU) Mengubah tema aplikasi
    function toggleThemeMode() {
        document.body.classList.toggle('light-theme');
        const isLight = document.body.classList.contains('light-theme');
        localStorage.setItem(THEME_STORAGE_KEY, isLight ? 'light' : 'dark');
        updateThemeToggleLabel();
    }

    // (BARU) Memperbarui label tombol tema
    function updateThemeToggleLabel() {
        if (!themeToggleBtn) return;
        const isLight = document.body.classList.contains('light-theme');
        themeToggleBtn.innerHTML = isLight ? '🌙 Mode Gelap' : '☀️ Mode Terang';
        themeToggleBtn.setAttribute('aria-label', isLight ? 'Beralih ke mode gelap' : 'Beralih ke mode terang');
    }

    // (BARU) Menangani input search
    function handleSearch(e) {
        searchQuery = e.target.value;
        renderTodos();
    }

    // (BARU) Menangani klik sort di header tabel
    function handleSort(e) {
        const th = e.target.closest('th[data-sort]');
        if (!th) return;

        const column = th.dataset.sort;

        // Logika membalik urutan
        if (currentSort.column === column) {
            currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.column = column;
            currentSort.order = 'asc'; // Default ke asc saat ganti kolom
        }

        renderTodos();
    }

    // (BARU) Memperbarui indikator panah sort
    function updateSortIndicators() {
        // Hapus semua kelas sort
        tableHead.querySelectorAll('th[data-sort]').forEach(th => {
            th.classList.remove('active-sort', 'sort-asc', 'sort-desc');
        });

        // Tambahkan kelas ke kolom yang aktif
        const activeTh = tableHead.querySelector(`th[data-sort="${currentSort.column}"]`);
        if (activeTh) {
            activeTh.classList.add('active-sort', `sort-${currentSort.order}`);
        }
    }

    // (BARU) Memperbarui data di dashboard
    function updateDashboard() {
        const total = todos.length;
        const completed = todos.filter(todo => todo.completed).length;
        const pending = total - completed;
        const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

        totalTasksVal.textContent = total;
        completedTasksVal.textContent = completed;
        pendingTasksVal.textContent = pending;
        progressVal.textContent = `${progress}%`;
    }
});