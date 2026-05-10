const app = document.getElementById('app');
const navActions = document.getElementById('nav-actions');

const LOADER_HTML = `
    <div class="loader-container">
        <div class="pyramid-loader">
            <div class="wrapper">
                <span class="side side1"></span>
                <span class="side side2"></span>
                <span class="side side3"></span>
                <span class="side side4"></span>
                <span class="shadow"></span>
            </div>
        </div>
    </div>
`;

// --- Xử lý Theme (Sáng/Tối) - Chạy ngay lập tức ---
(function() {
    const themeToggle = document.getElementById('theme-toggle');
    const currentTheme = localStorage.getItem('theme') || 'dark';
    
    // Áp dụng theme ngay
    document.documentElement.setAttribute('data-theme', currentTheme);
    if (themeToggle) {
        themeToggle.innerHTML = currentTheme === 'dark' ? '☀️' : '🌙';
        
        themeToggle.addEventListener('click', () => {
            const theme = document.documentElement.getAttribute('data-theme');
            const newTheme = theme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            themeToggle.innerHTML = newTheme === 'dark' ? '☀️' : '🌙';
        });
    }
})();

// Router cơ bản dựa trên Hash
async function router() {
    const hash = window.location.hash.slice(1) || '/';
    app.innerHTML = LOADER_HTML;
    navActions.innerHTML = '';

    try {
        if (hash === '/') {
            await renderMasterList();
        } else if (hash.startsWith('/truyen/')) {
            const parts = hash.split('/');
            const novelFolder = parts[2];
            const chapterId = parts[3]; // Có thể có hoặc không

            if (!chapterId) {
                await renderNovelIndex(novelFolder);
            } else {
                await renderChapter(novelFolder, chapterId);
            }
        } else {
            app.innerHTML = '<h2>404 - Không tìm thấy trang</h2>';
        }
    } catch (e) {
        console.error(e);
        app.innerHTML = `<h2>❌ Đã xảy ra lỗi</h2><p>${e.message}</p><p>Hãy chắc chắn bạn đã chạy tool cào truyện và đang dùng Live Server.</p>`;
    }
}

// 1. Hiển thị trang chủ (Kệ sách)
async function renderMasterList() {
    let novels = [];
    try {
        const res = await fetch('data/master.json');
        if (res.ok) novels = await res.json();
    } catch (e) {}

    if (novels.length === 0) {
        app.innerHTML = '<h2>Kệ sách trống</h2><p>Chưa có truyện nào được tải về.</p>';
        return;
    }

    let html = '<h2>Kệ Sách Của Bạn</h2><div class="novel-grid">';
    for (const n of novels) {
        html += `
            <a href="#/truyen/${n.folder}" class="novel-card">
                <h3>${n.title}</h3>
                <p>Số chương: ${n.chapterCount}</p>
            </a>
        `;
    }
    html += '</div>';
    app.innerHTML = html;
}

// 2. Hiển thị danh sách chương của 1 truyện
async function renderNovelIndex(folder) {
    const res = await fetch(`data/${folder}/index.json`);
    if (!res.ok) throw new Error("Không tìm thấy dữ liệu truyện này.");
    const data = await res.json();

    navActions.innerHTML = `<a href="#/">🏠 Trang chủ</a>`;

    let html = `<h2>${data.title}</h2><p>Tổng số: ${data.total_chapters} chương</p><div class="chapter-list">`;
    for (const chap of data.chapters) {
        html += `<a href="#/truyen/${folder}/${chap.id}" class="chapter-item">${chap.title}</a>`;
    }
    html += '</div>';
    app.innerHTML = html;
}

// 3. Hiển thị nội dung 1 chương
async function renderChapter(folder, chapterId) {
    // Tải index.json để biết chương này nằm ở chunk nào
    const indexRes = await fetch(`data/${folder}/index.json`);
    if (!indexRes.ok) throw new Error("Không tìm thấy dữ liệu truyện.");
    const novelIndex = await indexRes.json();

    const chapterIdx = novelIndex.chapters.findIndex(c => c.id == chapterId);
    if (chapterIdx === -1) throw new Error("Không tìm thấy chương này.");

    const chapterMeta = novelIndex.chapters[chapterIdx];
    const prevMeta = chapterIdx > 0 ? novelIndex.chapters[chapterIdx - 1] : null;
    const nextMeta = chapterIdx < novelIndex.chapters.length - 1 ? novelIndex.chapters[chapterIdx + 1] : null;

    // Tải chunk JSON tương ứng
    const chunkRes = await fetch(`data/${folder}/${chapterMeta.chunkFile}`);
    if (!chunkRes.ok) throw new Error("Không tải được nội dung chương.");
    const chunkData = await chunkRes.json();

    const chapterData = chunkData.find(c => c.id == chapterId);
    if (!chapterData) throw new Error("Dữ liệu chương bị lỗi.");

    navActions.innerHTML = `<a href="#/truyen/${folder}">📋 Mục lục</a>`;

    const prevBtn = prevMeta ? `<a href="#/truyen/${folder}/${prevMeta.id}" class="btn">⬅ Trước</a>` : `<span class="btn disabled">⬅ Trước</span>`;
    const nextBtn = nextMeta ? `<a href="#/truyen/${folder}/${nextMeta.id}" class="btn">Sau ➡</a>` : `<span class="btn disabled">Sau ➡</span>`;

    app.innerHTML = `
        <div class="reader-container">
            <h1 class="reader-title">${chapterData.title}</h1>
            <div class="reader-content">${chapterData.content}</div>
            <div class="reader-nav">
                ${prevBtn}
                <a href="#/truyen/${folder}" class="btn secondary">Mục lục</a>
                ${nextBtn}
            </div>
        </div>
    `;
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 4. Xử lý hiệu ứng Cuộn (Ẩn/Hiện Navbar & Back to Top)
let lastScrollTop = 0;
const navbar = document.querySelector('.navbar');
const backToTopBtn = document.createElement('button');
backToTopBtn.innerHTML = '↑';
backToTopBtn.className = 'back-to-top';
document.body.appendChild(backToTopBtn);

window.addEventListener('scroll', () => {
    let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // Ẩn/Hiện Navbar
    if (scrollTop > lastScrollTop && scrollTop > 100) {
        navbar.classList.add('nav-hidden');
    } else {
        navbar.classList.remove('nav-hidden');
    }
    lastScrollTop = scrollTop;

    // Hiện/Ẩn nút Back to Top
    if (scrollTop > 500) {
        backToTopBtn.classList.add('visible');
    } else {
        backToTopBtn.classList.remove('visible');
    }
});

backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Lắng nghe sự kiện đổi URL
window.addEventListener('hashchange', router);

// Khởi chạy lần đầu
router();
