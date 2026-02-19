// app.js

// ========================================
// DATA LAYER
// ========================================

const STORAGE_KEY = 'workouts';

function loadWorkouts() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

function saveWorkouts(workouts) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts));
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getStableKey(workout) {
    const cats = (workout.categories || []).sort().join('|');
    const gymSubs = (workout.gymSubs || []).sort().join('|');
    const cardioSubs = (workout.cardioSubs || []).sort().join('|');
    const notes = workout.notes || '';
    return workout.date + '::' + cats + '::' + gymSubs + '::' + cardioSubs + '::' + notes;
}

// ========================================
// DATE UTILITIES
// ========================================

function parseDate(dateStr) {
    const parts = dateStr.split('-');
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function getYear(dateStr) {
    return parseInt(dateStr.split('-')[0]);
}

function getMonth(dateStr) {
    return parseInt(dateStr.split('-')[1]) - 1;
}

function getDayOfWeek(dateStr) {
    const date = parseDate(dateStr);
    let day = date.getDay();
    return day === 0 ? 6 : day - 1;
}

function getQuarter(dateStr) {
    return Math.floor(getMonth(dateStr) / 3) + 1;
}

function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

// ========================================
// STATISTICS
// ========================================

function calculateStats(workouts) {
    const stats = {
        total: workouts.length,
        categories: { Gym: 0, Cardio: 0, HIIT: 0, Yoga: 0, Pilates: 0, Other: 0 },
        gymSubs: { Chest: 0, Back: 0, Legs: 0, Arms: 0, Abs: 0 },
        cardioSubs: { Run: 0, Stairs: 0, Bike: 0, Walk: 0 },
        dayOfWeek: { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0, Sunday: 0 },
        months: { Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0, Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0 },
        quarters: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 }
    };

    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    workouts.forEach(function(w) {
        w.categories.forEach(function(cat) {
            if (stats.categories[cat] !== undefined) {
                stats.categories[cat]++;
            }
        });

        (w.gymSubs || []).forEach(function(sub) {
            if (stats.gymSubs[sub] !== undefined) {
                stats.gymSubs[sub]++;
            }
        });

        (w.cardioSubs || []).forEach(function(sub) {
            if (stats.cardioSubs[sub] !== undefined) {
                stats.cardioSubs[sub]++;
            }
        });

        stats.dayOfWeek[dayNames[getDayOfWeek(w.date)]]++;
        stats.months[monthNames[getMonth(w.date)]]++;
        stats.quarters['Q' + getQuarter(w.date)]++;
    });

    return stats;
}

function calculateAvgPerWeek(workouts) {
    if (workouts.length === 0) return 0;
    
    const dates = workouts.map(function(w) { return parseDate(w.date).getTime(); });
    const minDate = new Date(Math.min.apply(null, dates));
    const maxDate = new Date(Math.max.apply(null, dates));
    const weeks = Math.ceil((maxDate - minDate) / (7 * 24 * 60 * 60 * 1000)) || 1;
    
    return (workouts.length / weeks).toFixed(1);
}

// ========================================
// UI STATE
// ========================================

let calendarMonth = new Date().getMonth();
let calendarYear = new Date().getFullYear();
let selectedDate = null;
let dashboardYear = new Date().getFullYear();

// ========================================
// RENDERING
// ========================================

function renderAllTabs() {
    renderRecentWorkouts();
    renderDashboard();
    renderCompare();
    renderCalendar();
    renderHistory();
}

function renderApp() {
    renderAllTabs();
}

function renderRecentWorkouts() {
    const workouts = loadWorkouts();
    const container = document.getElementById('recentWorkouts');
    
    if (!container) return;
    
    if (workouts.length === 0) {
        container.innerHTML = '<div class="empty-state">No workouts yet. Log your first workout!</div>';
        return;
    }
    
    const recent = workouts.sort(function(a, b) { return b.date.localeCompare(a.date); }).slice(0, 5);
    
    container.innerHTML = recent.map(function(w) {
        const tags = [].concat(
            w.categories.map(function(c) { return '<span class="tag">' + c + '</span>'; }),
            (w.gymSubs || []).map(function(s) { return '<span class="tag sub">' + s + '</span>'; }),
            (w.cardioSubs || []).map(function(s) { return '<span class="tag sub">' + s + '</span>'; })
        ).join('');
        
        return '<div class="workout-item"><div class="workout-content"><div class="workout-date">' + formatDate(parseDate(w.date)) + '</div><div class="workout-tags">' + tags + '</div></div><button class="btn-delete" onclick="deleteWorkout(\'' + w.id + '\')">Delete</button></div>';
    }).join('');
}

function renderDashboard() {
    const allWorkouts = loadWorkouts();
    
    const yearsSet = new Set(allWorkouts.map(function(w) { return getYear(w.date); }));
    const years = Array.from(yearsSet).sort(function(a, b) { return b - a; });
    
    const yearSelect = document.getElementById('dashboardYearSelect');
    if (yearSelect) {
        const currentSelection = yearSelect.value;
        yearSelect.innerHTML = years.map(function(y) { return '<option value="' + y + '">' + y + '</option>'; }).join('');
        
        if (currentSelection && years.includes(parseInt(currentSelection))) {
            yearSelect.value = currentSelection;
            dashboardYear = parseInt(currentSelection);
        } else if (years.length > 0) {
            const currentYear = new Date().getFullYear();
            dashboardYear = years.includes(currentYear) ? currentYear : years[0];
            yearSelect.value = dashboardYear;
        }
    }
    
    const yearWorkouts = allWorkouts.filter(function(w) { return getYear(w.date) === dashboardYear; });
    
    const currentYear = new Date().getFullYear();
    const isCurrentYear = dashboardYear === currentYear;
    
    const now = new Date();
    const startOfWeek = getStartOfWeek(now);
    const startOfMonth = new Date(dashboardYear, now.getMonth(), 1);
    
    let weekWorkouts = [];
    let monthWorkouts = [];
    
    if (isCurrentYear) {
        weekWorkouts = yearWorkouts.filter(function(w) { return parseDate(w.date) >= startOfWeek; });
        monthWorkouts = yearWorkouts.filter(function(w) { return parseDate(w.date) >= startOfMonth; });
    }
    
    const summaryStats = document.getElementById('summaryStats');
    if (summaryStats) {
        if (isCurrentYear) {
            summaryStats.innerHTML = '<div class="stat-box"><div class="stat-value">' + yearWorkouts.length + '</div><div class="stat-label">Total (YTD)</div></div><div class="stat-box"><div class="stat-value">' + calculateAvgPerWeek(yearWorkouts) + '</div><div class="stat-label">Avg Per Week (YTD)</div></div><div class="stat-box"><div class="stat-value">' + weekWorkouts.length + '</div><div class="stat-label">This Week</div></div><div class="stat-box"><div class="stat-value">' + monthWorkouts.length + '</div><div class="stat-label">This Month</div></div>';
        } else {
            summaryStats.innerHTML = '<div class="stat-box"><div class="stat-value">' + yearWorkouts.length + '</div><div class="stat-label">Total</div></div><div class="stat-box"><div class="stat-value">' + calculateAvgPerWeek(yearWorkouts) + '</div><div class="stat-label">Avg Per Week</div></div>';
        }
    }
    
    const stats = calculateStats(yearWorkouts);
    const charts = document.getElementById('dashboardCharts');
    
    if (charts) {
        charts.innerHTML = renderChart('Top-Level Categories', stats.categories) + renderChart('Gym Subcategories', stats.gymSubs) + renderChart('Cardio Subcategories', stats.cardioSubs) + renderChart('By Day of Week', stats.dayOfWeek) + renderChart('By Month', stats.months) + renderChart('By Quarter', stats.quarters);
    }
}

function renderChart(title, data) {
    const values = [];
    for (const key in data) {
        values.push(data[key]);
    }
    const max = Math.max.apply(null, values.concat([1]));
    
    const bars = Object.keys(data).map(function(label) {
        const count = data[label];
        const width = (count / max) * 100;
        return '<div class="chart-bar"><div class="chart-bar-label"><span>' + label + '</span><span>' + count + '</span></div><div class="chart-bar-container"><div class="chart-bar-fill" style="width: ' + width + '%"></div></div></div>';
    }).join('');
    
    return '<div class="chart-section"><div class="chart-title">' + title + '</div>' + bars + '</div>';
}function renderCompare() {
    const workouts = loadWorkouts();
    const yearsSet = new Set(workouts.map(function(w) { return getYear(w.date); }));
    const years = Array.from(yearsSet).sort(function(a, b) { return b - a; });
    
    const year1Select = document.getElementById('year1Select');
    const year2Select = document.getElementById('year2Select');
    
    if (!year1Select || !year2Select) return;
    
    const options = years.map(function(y) { return '<option value="' + y + '">' + y + '</option>'; }).join('');
    
    const currentYear1 = year1Select.value;
    const currentYear2 = year2Select.value;
    
    year1Select.innerHTML = options;
    year2Select.innerHTML = options;
    
    if (years.length === 0) {
        const comparisonResults = document.getElementById('comparisonResults');
        if (comparisonResults) {
            comparisonResults.innerHTML = '<div class="empty-state">No data to compare</div>';
        }
        return;
    }
    
    const currentYear = new Date().getFullYear();
    if (currentYear1 && years.includes(parseInt(currentYear1))) {
        year1Select.value = currentYear1;
    } else {
        year1Select.value = years.includes(currentYear) ? currentYear : years[0];
    }
    
    if (currentYear2 && years.includes(parseInt(currentYear2))) {
        year2Select.value = currentYear2;
    } else {
        year2Select.value = years.includes(currentYear - 1) ? currentYear - 1 : (years[1] || years[0]);
    }
    
    compareYears();
}

function compareYears() {
    const year1Select = document.getElementById('year1Select');
    const year2Select = document.getElementById('year2Select');
    
    if (!year1Select || !year2Select) return;
    
    const year1 = parseInt(year1Select.value);
    const year2 = parseInt(year2Select.value);
    
    if (!year1 || !year2) return;
    
    const allWorkouts = loadWorkouts();
    const currentYear = new Date().getFullYear();
    const today = new Date();
    
    let year1Workouts = allWorkouts.filter(function(w) { return getYear(w.date) === year1; });
    let year2Workouts = allWorkouts.filter(function(w) { return getYear(w.date) === year2; });
    
    if (year1 === currentYear) {
        year1Workouts = year1Workouts.filter(function(w) { return parseDate(w.date) <= today; });
    }
    if (year2 === currentYear) {
        year2Workouts = year2Workouts.filter(function(w) { return parseDate(w.date) <= today; });
    }
    if (year1 === currentYear && year2 !== currentYear) {
        const ytdDate = new Date(year2, today.getMonth(), today.getDate());
        year2Workouts = year2Workouts.filter(function(w) { return parseDate(w.date) <= ytdDate; });
    }
    if (year2 === currentYear && year1 !== currentYear) {
        const ytdDate = new Date(year1, today.getMonth(), today.getDate());
        year1Workouts = year1Workouts.filter(function(w) { return parseDate(w.date) <= ytdDate; });
    }
    
    const stats1 = calculateStats(year1Workouts);
    const stats2 = calculateStats(year2Workouts);
    
    const note = (year1 === currentYear || year2 === currentYear) ? '<div class="empty-state">Comparing year-to-date (YTD)</div>' : '';
    
    const results = document.getElementById('comparisonResults');
    if (results) {
        results.innerHTML = note + renderComparisonTable('Total Workouts', [{ label: 'Total', y1: year1Workouts.length, y2: year2Workouts.length }], year1, year2) + renderComparisonTable('Top-Level Categories', Object.keys(stats1.categories).map(function(k) { return { label: k, y1: stats1.categories[k], y2: stats2.categories[k] }; }), year1, year2) + renderComparisonTable('Gym Subcategories', Object.keys(stats1.gymSubs).map(function(k) { return { label: k, y1: stats1.gymSubs[k], y2: stats2.gymSubs[k] }; }), year1, year2) + renderComparisonTable('Cardio Subcategories', Object.keys(stats1.cardioSubs).map(function(k) { return { label: k, y1: stats1.cardioSubs[k], y2: stats2.cardioSubs[k] }; }), year1, year2) + renderComparisonTable('By Day of Week', Object.keys(stats1.dayOfWeek).map(function(k) { return { label: k, y1: stats1.dayOfWeek[k], y2: stats2.dayOfWeek[k] }; }), year1, year2) + renderComparisonTable('By Month', Object.keys(stats1.months).map(function(k) { return { label: k, y1: stats1.months[k], y2: stats2.months[k] }; }), year1, year2) + renderComparisonTable('By Quarter', Object.keys(stats1.quarters).map(function(k) { return { label: k, y1: stats1.quarters[k], y2: stats2.quarters[k] }; }), year1, year2);
    }
}

function renderComparisonTable(title, data, year1, year2) {
    const rows = data.map(function(row) {
        const delta = row.y1 - row.y2;
        const deltaClass = delta > 0 ? 'delta-positive' : delta < 0 ? 'delta-negative' : 'delta-neutral';
        const deltaSymbol = delta > 0 ? '+' : '';
        
        return '<tr><td><strong>' + row.label + '</strong></td><td>' + row.y1 + '</td><td>' + row.y2 + '</td><td class="' + deltaClass + '">' + deltaSymbol + delta + '</td></tr>';
    }).join('');
    
    return '<div class="comparison-section"><div class="comparison-title">' + title + '</div><table class="comparison-table"><thead><tr><th></th><th>' + year1 + '</th><th>' + year2 + '</th><th>Δ</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
}

function renderCalendar() {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    const currentMonthLabel = document.getElementById('currentMonthLabel');
    if (currentMonthLabel) {
        currentMonthLabel.textContent = monthNames[calendarMonth] + ' ' + calendarYear;
    }
    
    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
    let firstDayOfWeek = firstDay.getDay();
    firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    
    const daysInMonth = lastDay.getDate();
    const today = new Date();
    
    const workouts = loadWorkouts();
    
    const workoutsByDate = {};
    workouts.forEach(function(w) {
        if (!workoutsByDate[w.date]) {
            workoutsByDate[w.date] = [];
        }
        workoutsByDate[w.date].push(w);
    });
    
    const grid = document.getElementById('calendarGrid');
    if (!grid) return;
    
    let html = dayNames.map(function(d) { return '<div class="calendar-day-header">' + d + '</div>'; }).join('');
    
    for (let i = 0; i < firstDayOfWeek; i++) {
        html += '<div class="calendar-day other-month"></div>';
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = calendarYear + '-' + String(calendarMonth + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
    const currentDate = parseDate(dateStr);
    
    let classes = 'calendar-day';
    if (currentDate.toDateString() === today.toDateString()) classes += ' today';
    if (selectedDate === dateStr) classes += ' selected';
    
    const dayWorkouts = workoutsByDate[dateStr] || [];
    if (dayWorkouts.length > 0) {
        classes += ' has-workouts';
    }
    
    html += '<div class="' + classes + '" onclick="showDayDetails(\'' + dateStr + '\')"><div class="day-number">' + day + '</div></div>';
}
    
    grid.innerHTML = html;
}

function showDayDetails(dateStr) {
    selectedDate = dateStr;
    renderCalendar();
    
    const workouts = loadWorkouts().filter(function(w) { return w.date === dateStr; });
    const container = document.getElementById('dayDetails');
    
    if (!container) return;
    
    if (workouts.length === 0) {
        container.innerHTML = '<h3>' + formatDate(parseDate(dateStr)) + '</h3><div class="empty-state">No workouts on this day</div>';
    } else {
        const items = workouts.map(function(w) {
            const tags = [].concat(
                w.categories.map(function(c) { return '<span class="tag">' + c + '</span>'; }),
                (w.gymSubs || []).map(function(s) { return '<span class="tag sub">' + s + '</span>'; }),
                (w.cardioSubs || []).map(function(s) { return '<span class="tag sub">' + s + '</span>'; })
            ).join('');
            
            return '<div class="workout-item"><div class="workout-content"><div class="workout-tags">' + tags + '</div></div><button class="btn-delete" onclick="deleteWorkout(\'' + w.id + '\')">Delete</button></div>';
        }).join('');
        
        container.innerHTML = '<h3>' + formatDate(parseDate(dateStr)) + '</h3>' + items;
    }
    
    container.style.display = 'block';
}

function renderHistory() {
    const workouts = loadWorkouts().sort(function(a, b) { return b.date.localeCompare(a.date); });
    const container = document.getElementById('historyList');
    
    if (!container) return;
    
    if (workouts.length === 0) {
        container.innerHTML = '<div class="empty-state">No workouts yet</div>';
        return;
    }
    
    container.innerHTML = workouts.map(function(w) {
        const tags = [].concat(
            w.categories.map(function(c) { return '<span class="tag">' + c + '</span>'; }),
            (w.gymSubs || []).map(function(s) { return '<span class="tag sub">' + s + '</span>'; }),
            (w.cardioSubs || []).map(function(s) { return '<span class="tag sub">' + s + '</span>'; })
        ).join('');
        
        return '<div class="history-item"><div class="history-content"><div class="history-date">' + formatDate(parseDate(w.date)) + '</div><div class="history-tags">' + tags + '</div></div><button class="btn-delete" onclick="deleteWorkout(\'' + w.id + '\')">Delete</button></div>';
    }).join('');
}

// ========================================
// EVENT HANDLERS
// ========================================

function deleteWorkout(id) {
    if (!confirm('Delete this workout?')) return;
    
    const workouts = loadWorkouts().filter(function(w) { return w.id !== id; });
    saveWorkouts(workouts);
    renderApp();
}

function setToday() {
    const dateInput = document.getElementById('workoutDate');
    if (dateInput) {
        dateInput.valueAsDate = new Date();
    }
}

function changeDashboardYear() {
    const yearSelect = document.getElementById('dashboardYearSelect');
    if (yearSelect) {
        dashboardYear = parseInt(yearSelect.value);
        renderDashboard();
    }
}

function setupFormHandlers() {
    const form = document.getElementById('workoutForm');
    if (!form) return;
    
    const categoryInputs = document.querySelectorAll('input[name="category"]');
    
    categoryInputs.forEach(function(input) {
        input.addEventListener('change', function() {
            if (this.value === 'Gym') {
                const section = document.getElementById('gymSubSection');
                if (section) {
                    section.style.display = this.checked ? 'block' : 'none';
                    if (!this.checked) {
                        document.querySelectorAll('input[name="gymSub"]').forEach(function(s) { s.checked = false; });
                    }
                }
            } else if (this.value === 'Cardio') {
                const section = document.getElementById('cardioSubSection');
                if (section) {
                    section.style.display = this.checked ? 'block' : 'none';
                    if (!this.checked) {
                        document.querySelectorAll('input[name="cardioSub"]').forEach(function(s) { s.checked = false; });
                    }
                }
            }
        });
    });
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const date = document.getElementById('workoutDate').value;
        const categories = Array.from(document.querySelectorAll('input[name="category"]:checked')).map(function(c) { return c.value; });
        
        if (categories.length === 0) {
            alert('Select at least one category');
            return;
        }
        
        const gymSubs = categories.includes('Gym') ? Array.from(document.querySelectorAll('input[name="gymSub"]:checked')).map(function(c) { return c.value; }) : [];
        
        const cardioSubs = categories.includes('Cardio') ? Array.from(document.querySelectorAll('input[name="cardioSub"]:checked')).map(function(c) { return c.value; }) : [];
        
        const workout = {
            id: generateId(),
            date: date,
            categories: categories,
            gymSubs: gymSubs,
            cardioSubs: cardioSubs,
            timestamp: Date.now()
        };
        
        const workouts = loadWorkouts();
        workouts.push(workout);
        saveWorkouts(workouts);
        
        form.reset();
        const gymSection = document.getElementById('gymSubSection');
        const cardioSection = document.getElementById('cardioSubSection');
        if (gymSection) gymSection.style.display = 'none';
        if (cardioSection) cardioSection.style.display = 'none';
        
        const dateInput = document.getElementById('workoutDate');
        if (dateInput) dateInput.valueAsDate = new Date();
        
        renderApp();
        alert('Workout saved!');
    });
}

function setupTabHandlers() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetTab = this.dataset.tab;
            
            tabButtons.forEach(function(b) { b.classList.remove('active'); });
            this.classList.add('active');
            
            const allContent = document.querySelectorAll('.tab-content');
            allContent.forEach(function(c) { c.classList.remove('active'); });
            
            const targetContent = document.getElementById(targetTab + '-tab');
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
}

function setupCalendarHandlers() {
    const prevBtn = document.getElementById('prevMonth');
    const nextBtn = document.getElementById('nextMonth');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            calendarMonth--;
            if (calendarMonth < 0) {
                calendarMonth = 11;
                calendarYear--;
            }
            renderCalendar();
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            calendarMonth++;
            if (calendarMonth > 11) {
                calendarMonth = 0;
                calendarYear++;
            }
            renderCalendar();
        });
    }
}

function setupDataHandlers() {
    const importCsvBtn = document.getElementById('importCsvBtn');
    const importJsonBtn = document.getElementById('importJsonBtn');
    const exportBtn = document.getElementById('exportJsonBtn');
    const compareBtn = document.getElementById('compareBtn');
    const csvFileInput = document.getElementById('csvFileInput');
    const jsonFileInput = document.getElementById('jsonFileInput');
    const dashboardYearSelect = document.getElementById('dashboardYearSelect');
    
    if (importCsvBtn && csvFileInput) {
        importCsvBtn.addEventListener('click', function() {
            csvFileInput.click();
        });
        
        csvFileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(event) {
                importCSV(event.target.result);
            };
            reader.readAsText(file);
            e.target.value = '';
        });
    }
    
    if (importJsonBtn && jsonFileInput) {
        importJsonBtn.addEventListener('click', function() {
            jsonFileInput.click();
        });
        
        jsonFileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(event) {
                importJSON(event.target.result);
            };
            reader.readAsText(file);
            e.target.value = '';
        });
    }
    
    if (exportBtn) {
        exportBtn.addEventListener('click', exportJSON);
    }
    
    if (compareBtn) {
        compareBtn.addEventListener('click', compareYears);
    }
    
    if (dashboardYearSelect) {
        dashboardYearSelect.addEventListener('change', changeDashboardYear);
    }
}

function importCSV(csvText) {
    const lines = csvText.split('\n').filter(function(l) { return l.trim(); });
    if (lines.length === 0) {
        showImportStatus('Empty CSV', 'error');
        return;
    }
    
    const workouts = loadWorkouts();
    const existingKeys = new Set(workouts.map(getStableKey));
    
    let imported = 0;
    let duplicates = 0;
    let errors = 0;
    
    const startIdx = lines[0].toLowerCase().includes('date') ? 1 : 0;
    
    for (let i = startIdx; i < lines.length; i++) {
        try {
            const parts = lines[i].split(',').map(function(p) { return p.trim(); });
            if (parts.length < 2) {
                errors++;
                continue;
            }
            
            const date = parts[0];
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                errors++;
                continue;
            }
            
            const categories = parts[1] ? parts[1].split('|').map(function(c) { return c.trim(); }).filter(function(c) { return c; }) : [];
            const gymSubs = parts[2] ? parts[2].split('|').map(function(c) { return c.trim(); }).filter(function(c) { return c; }) : [];
            const cardioSubs = parts[3] ? parts[3].split('|').map(function(c) { return c.trim(); }).filter(function(c) { return c; }) : [];
            const notes = parts[4] || '';
            
            const workout = {
                id: generateId(),
                date: date,
                categories: categories,
                gymSubs: gymSubs,
                cardioSubs: cardioSubs,
                notes: notes,
                timestamp: Date.now()
            };
            
            const key = getStableKey(workout);
            
            if (existingKeys.has(key)) {
                duplicates++;
            } else {
                workouts.push(workout);
                existingKeys.add(key);
                imported++;
            }
        } catch (err) {
            errors++;
        }
    }
    
    saveWorkouts(workouts);
    
    let msg = 'Imported ' + imported + ' workout(s)';
    if (duplicates > 0) msg += ', ' + duplicates + ' duplicate(s) skipped';
    if (errors > 0) msg += ', ' + errors + ' error(s)';
    
    showImportStatus(msg, imported > 0 ? 'success' : 'error');
    renderApp();
}
function importJSON(jsonText) {
    try {
        const importedWorkouts = JSON.parse(jsonText);
        
        if (!Array.isArray(importedWorkouts)) {
            showImportStatus('Invalid JSON format', 'error');
            return;
        }
        
        const currentWorkouts = loadWorkouts();
        const existingKeys = new Set(currentWorkouts.map(getStableKey));
        
        let imported = 0;
        let duplicates = 0;
        let errors = 0;
        
        importedWorkouts.forEach(function(workout) {
            try {
                // Validate workout has required fields
                if (!workout.date || !workout.categories) {
                    errors++;
                    return;
                }
                
                // Create workout with new ID and timestamp
                const newWorkout = {
                    id: generateId(),
                    date: workout.date,
                    categories: workout.categories || [],
                    gymSubs: workout.gymSubs || [],
                    cardioSubs: workout.cardioSubs || [],
                    notes: workout.notes || '',
                    timestamp: Date.now()
                };
                
                const key = getStableKey(newWorkout);
                
                if (existingKeys.has(key)) {
                    duplicates++;
                } else {
                    currentWorkouts.push(newWorkout);
                    existingKeys.add(key);
                    imported++;
                }
            } catch (err) {
                errors++;
            }
        });
        
        saveWorkouts(currentWorkouts);
        
        let msg = 'Imported ' + imported + ' workout(s)';
        if (duplicates > 0) msg += ', ' + duplicates + ' duplicate(s) skipped';
        if (errors > 0) msg += ', ' + errors + ' error(s)';
        
        showImportStatus(msg, imported > 0 ? 'success' : 'error');
        renderApp();
        
    } catch (err) {
        showImportStatus('Invalid JSON file: ' + err.message, 'error');
    }
}
function exportJSON() {
    const workouts = loadWorkouts();
    const json = JSON.stringify(workouts, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workouts-' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
    URL.revokeObjectURL(url);
}

function showImportStatus(message, type) {
    const statusDiv = document.getElementById('importStatus');
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className = type;
        setTimeout(function() {
            statusDiv.textContent = '';
            statusDiv.className = '';
        }, 5000);
    }
}

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    const dateInput = document.getElementById('workoutDate');
    if (dateInput) {
        dateInput.valueAsDate = new Date();
    }
    
    setupFormHandlers();
    setupTabHandlers();
    setupCalendarHandlers();
    setupDataHandlers();
    
    renderApp();
});

// ========================================
// PWA SERVICE WORKER REGISTRATION
// ========================================

if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/workout-tracker/service-worker.js')
            .then(function(registration) {
                console.log('ServiceWorker registered successfully');
            })
            .catch(function(error) {
                console.log('ServiceWorker registration failed:', error);
            });
    });
}
