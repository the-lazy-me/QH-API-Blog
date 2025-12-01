document.addEventListener('DOMContentLoaded', () => {
    const timelineContainer = document.getElementById('timeline-container');
    const themeToggle = document.getElementById('theme-toggle');

    // --- Theme Handling ---
    function initTheme() {
        const savedTheme = localStorage.getItem('theme');
        // 默认为 system (savedTheme 为 null)
        updateThemeState(savedTheme || 'system');
        
        // 监听系统主题变化
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            const currentMode = document.documentElement.getAttribute('data-theme-mode');
            if (currentMode === 'system') {
                applySystemTheme();
            }
        });
    }

    function updateThemeState(mode) {
        // mode: 'system' | 'light' | 'dark'
        document.documentElement.setAttribute('data-theme-mode', mode);
        
        if (mode === 'system') {
            localStorage.removeItem('theme');
            applySystemTheme();
        } else {
            localStorage.setItem('theme', mode);
            document.documentElement.setAttribute('data-theme', mode);
        }
    }

    function applySystemTheme() {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }

    function toggleTheme() {
        const currentMode = document.documentElement.getAttribute('data-theme-mode') || 'system';
        let newMode;
        
        // Cycle: system -> light -> dark -> system
        if (currentMode === 'system') {
            newMode = 'light';
        } else if (currentMode === 'light') {
            newMode = 'dark';
        } else {
            newMode = 'system';
        }
        
        updateThemeState(newMode);
    }

    themeToggle.addEventListener('click', toggleTheme);
    initTheme();

    // --- Data Loading ---
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            renderTimeline(data);
            initIntersectionObserver();
        })
        .catch(error => {
            console.error('Error loading data:', error);
            timelineContainer.innerHTML = '<p style="text-align:center; color: var(--text-secondary);">加载更新日志失败，请检查 data.json 是否存在。</p>';
        });

    function renderTimeline(data) {
        let html = '';

        data.forEach((item, index) => {
            const typeClass = getTypeClass(item.type);
            const typeLabel = item.type.toUpperCase();
            
            let detailsHtml = '';
            if (item.details && item.details.length > 0) {
                detailsHtml = '<ul class="card-details">';
                item.details.forEach(detail => {
                    detailsHtml += `<li>${detail}</li>`;
                });
                detailsHtml += '</ul>';
            }

            html += `
                <div class="timeline-item" style="--dot-color: var(${getTypeColorVar(item.type)})">
                    <div class="timeline-dot ${typeClass}"></div>
                    <div class="timeline-date">${item.date}</div>
                    <div class="timeline-content">
                        <div class="content-header">
                            <span class="tag ${typeClass}">${typeLabel}</span>
                            <h2 class="card-title">${item.title}</h2>
                        </div>
                        ${detailsHtml}
                    </div>
                </div>
            `;
        });

        timelineContainer.innerHTML = html;
    }

    function getTypeClass(type) {
        switch (type) {
            case 'feature': return 'type-feature';
            case 'announcement': return 'type-announcement';
            case 'hot': return 'type-hot';
            default: return 'type-default';
        }
    }

    function getTypeColorVar(type) {
        // 更新为新的 CSS 变量名
        switch (type) {
            case 'feature': return '--accent-feature-text';
            case 'announcement': return '--accent-announcement-text';
            case 'hot': return '--accent-hot-text';
            default: return '--text-secondary';
        }
    }


    function initIntersectionObserver() {
        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target); // 动画只播放一次
                }
            });
        }, observerOptions);

        const items = document.querySelectorAll('.timeline-item');
        items.forEach(item => {
            observer.observe(item);
        });
    }
});
