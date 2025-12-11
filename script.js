// --- Link Rendering ---
/**
 * Convert URLs in text to clickable hyperlinks
 * @param {string} text - The text that may contain URLs
 * @returns {string} - HTML string with URLs converted to anchor tags
 */
function linkify(text) {
    // URL regex pattern matching http:// or https:// URLs
    const urlPattern = /(https?:\/\/[^\s<>"']+)/g;
    return text.replace(urlPattern, '<a href="$1" target="_blank" rel="noopener noreferrer" class="detail-link">$1</a>');
}

// --- Data Source Configuration ---
const DATA_SOURCES = {
    qh_api: {
        id: 'qh_api',
        name: '启航 AI 系统',
        file: 'data-qh_api.json'
    },
    easy_ai: {
        id: 'easy_ai',
        name: 'Easy AI APP',
        file: 'data-easy_ai.json'
    }
};

// --- Data Source Manager ---
const DataSourceManager = {
    currentSource: 'qh_api',
    cache: new Map(),

    /**
     * Check if a data source is already loaded in cache
     * @param {string} sourceId - The data source identifier
     * @returns {boolean} - True if data is cached
     */
    isLoaded(sourceId) {
        return this.cache.has(sourceId);
    },

    /**
     * Get the file path for a data source
     * @param {string} sourceId - The data source identifier
     * @returns {string|null} - The file path or null if source doesn't exist
     */
    getFilePath(sourceId) {
        const source = DATA_SOURCES[sourceId];
        return source ? source.file : null;
    },

    /**
     * Load data for a given source with lazy loading and caching
     * @param {string} sourceId - The data source identifier
     * @returns {Promise<Array>} - Promise resolving to the data array
     */
    async loadData(sourceId) {
        // Check cache first - return cached data if available
        if (this.cache.has(sourceId)) {
            return this.cache.get(sourceId);
        }

        // Get file path for the source
        const filePath = this.getFilePath(sourceId);
        if (!filePath) {
            throw new Error(`Unknown data source: ${sourceId}`);
        }

        // Fetch data from the file
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.status}`);
        }

        const data = await response.json();

        // Store in cache for future use
        this.cache.set(sourceId, data);

        return data;
    }
};

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

    // --- URL Parameter Handling ---
    /**
     * Get data source from URL query parameter
     * @returns {string} - Valid source ID or default 'qh_api'
     */
    function getSourceFromURL() {
        const params = new URLSearchParams(window.location.search);
        const source = params.get('source');
        // Validate parameter against DATA_SOURCES, return default if invalid
        return DATA_SOURCES[source] ? source : 'qh_api';
    }

    /**
     * Update URL query parameter without page refresh
     * @param {string} sourceId - The data source identifier
     */
    function updateURLSource(sourceId) {
        const url = new URL(window.location);
        url.searchParams.set('source', sourceId);
        window.history.replaceState({}, '', url);
    }

    // --- Data Source Switching ---
    const dropdownTrigger = document.getElementById('data-source-trigger');
    const dropdownMenu = document.getElementById('data-source-menu');
    const dropdownText = dropdownTrigger.querySelector('.dropdown-text');
    const dropdownItems = dropdownMenu.querySelectorAll('.dropdown-item');

    // Toggle dropdown open/close
    function toggleDropdown() {
        const isOpen = dropdownMenu.classList.contains('open');
        if (isOpen) {
            closeDropdown();
        } else {
            openDropdown();
        }
    }

    function openDropdown() {
        dropdownMenu.classList.add('open');
        dropdownTrigger.setAttribute('aria-expanded', 'true');
    }

    function closeDropdown() {
        dropdownMenu.classList.remove('open');
        dropdownTrigger.setAttribute('aria-expanded', 'false');
    }

    // Handle dropdown trigger click
    dropdownTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown();
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!dropdownTrigger.contains(e.target) && !dropdownMenu.contains(e.target)) {
            closeDropdown();
        }
    });

    // Handle dropdown item selection
    dropdownItems.forEach(item => {
        item.addEventListener('click', () => {
            const value = item.dataset.value;
            const text = item.textContent;

            // Update selected state
            dropdownItems.forEach(i => {
                i.classList.remove('selected');
                i.setAttribute('aria-selected', 'false');
            });
            item.classList.add('selected');
            item.setAttribute('aria-selected', 'true');

            // Update trigger text
            dropdownText.textContent = text;

            // Close dropdown
            closeDropdown();

            // Switch data source
            switchSource(value);
        });
    });

    /**
     * Show loading indicator in the timeline container
     */
    function showLoading() {
        timelineContainer.innerHTML = '<p style="text-align:center; color: var(--text-secondary);">加载中...</p>';
    }

    /**
     * Show error message in the timeline container
     * @param {string} message - Error message to display
     */
    function showError(message) {
        timelineContainer.innerHTML = `<p class="error-message" style="text-align:center; color: var(--text-secondary);">${message}</p>`;
    }

    /**
     * Switch to a different data source
     * @param {string} sourceId - The data source identifier to switch to
     */
    async function switchSource(sourceId) {
        // Store current content to restore on error
        const previousContent = timelineContainer.innerHTML;
        const previousSource = DataSourceManager.currentSource;
        
        // Clear timeline container and show loading indicator
        timelineContainer.innerHTML = '';
        showLoading();

        try {
            // Load data for selected source
            const data = await DataSourceManager.loadData(sourceId);
            
            // Update current source
            DataSourceManager.currentSource = sourceId;
            
            // Update URL to reflect current selection
            updateURLSource(sourceId);
            
            // Render timeline with new data
            renderTimeline(data);
            initIntersectionObserver();
        } catch (error) {
            console.error('Error switching data source:', error);
            
            // Restore previous view state on error
            timelineContainer.innerHTML = previousContent;
            DataSourceManager.currentSource = previousSource;
            
            // Reset the dropdown to the previous source
            const previousItem = dropdownMenu.querySelector(`[data-value="${previousSource}"]`);
            if (previousItem) {
                dropdownItems.forEach(i => {
                    i.classList.remove('selected');
                    i.setAttribute('aria-selected', 'false');
                });
                previousItem.classList.add('selected');
                previousItem.setAttribute('aria-selected', 'true');
                dropdownText.textContent = previousItem.textContent;
            }
            
            // Show error message as an overlay/toast instead of replacing content
            showErrorToast('加载更新日志失败，请稍后重试。');
        }
    }
    
    /**
     * Show error message as a toast notification
     * @param {string} message - Error message to display
     */
    function showErrorToast(message) {
        // Remove any existing toast
        const existingToast = document.querySelector('.error-toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'error-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('visible');
        });
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }



    // --- Initial Data Loading ---
    // Get initial source from URL parameter or use default
    const initialSource = getSourceFromURL();
    DataSourceManager.currentSource = initialSource;

    // Update dropdown to match initial source
    const initialItem = dropdownMenu.querySelector(`[data-value="${initialSource}"]`);
    if (initialItem) {
        dropdownItems.forEach(i => {
            i.classList.remove('selected');
            i.setAttribute('aria-selected', 'false');
        });
        initialItem.classList.add('selected');
        initialItem.setAttribute('aria-selected', 'true');
        dropdownText.textContent = initialItem.textContent;
    }

    // Load initial data source
    switchSource(initialSource);

    function renderTimeline(data) {
        let html = '';

        data.forEach((item, index) => {
            const typeClass = getTypeClass(item.type);
            const typeLabel = item.type.toUpperCase();
            
            let detailsHtml = '';
            if (item.details && item.details.length > 0) {
                detailsHtml = '<ul class="card-details">';
                item.details.forEach(detail => {
                    detailsHtml += `<li>${linkify(detail)}</li>`;
                });
                detailsHtml += '</ul>';
            }

            const versionHtml = item.version ? `<span class="card-version">${item.version}</span>` : '';

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
                        ${versionHtml}
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
