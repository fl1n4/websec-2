let cities = [];
let map;
let markers = L.markerClusterGroup ? L.markerClusterGroup() : L.layerGroup();
let weatherChart = null;

$(document).ready(() => {
    initMap();
    setupEventListeners();
    loadCitiesData();
});

function initMap() {
    map = L.map('map', {
        zoomControl: false
    }).setView([55.7558, 37.6173], 4);

    L.control.zoom({
        position: 'topright'
    }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    markers.addTo(map);
}

function setupEventListeners() {
    $('.close-btn').on('click', closeModal);
    $('#weather-modal').on('click', (e) => {
        if (e.target.id === 'weather-modal') closeModal();
    });

    $('#search-input').on('input', handleSearch);

    $(document).on('click', (e) => {
        if (!$(e.target).closest('.search-container').length) {
            $('#search-results').hide();
        }
    });
}

let markersMap = new Map();

function handleSearch(e) {
    const query = $(e.target).val().toLowerCase().trim();
    const $resultsContainer = $('#search-results');

    if (query.length < 2) {
        $resultsContainer.hide();
        return;
    }

    const filtered = cities.filter(c =>
        (c.name && c.name.toLowerCase().includes(query))
    ).slice(0, 10);

    $resultsContainer.empty();
    if (filtered.length > 0) {
        filtered.forEach(city => {
            const cityName = city.name;
            const $li = $('<li>').text(`${cityName} ${city.region ? `(${city.region})` : ''}`);
            $li.on('click', () => {
                map.setView([city.lat, city.lon], 11);

                const marker = markersMap.get(cityName);
                if (marker) {
                    marker.openTooltip();
                }

                openWeatherModal(city);
                $resultsContainer.hide();
                $('#search-input').val(cityName);
            });
            $resultsContainer.append($li);
        });
        $resultsContainer.show();
    } else {
        const $li = $('<li>').text('Ничего не найдено').css('color', '#94a3b8');
        $resultsContainer.append($li).show();
    }
}

async function loadCitiesData() {
    console.log("Загрузка предварительно обработанного cities.json через $.getJSON...");
    try {
        cities = await $.getJSON('cities.json');
        console.log(`Загружено ${cities.length} городов мгновенно!`);
        renderMarkers();
    } catch (err) {
        console.error("Ошибка при загрузке cities.json:", err);
    }
}

function renderMarkers() {
    markers.clearLayers();
    markersMap.clear();

    cities.forEach(city => {
        const cityName = city.name;
        const marker = L.marker([city.lat, city.lon]);
        marker.bindTooltip(cityName);
        marker.on('click', () => {
            openWeatherModal(city);
        });
        markers.addLayer(marker);
        markersMap.set(cityName, marker);
    });
}

function closeModal() {
    $('#weather-modal').addClass('hidden').hide();
}

async function openWeatherModal(city) {
    const cityName = city.name || city.city;
    $('#modal-city-name').text(`Прогноз погоды: ${cityName}`);
    $('#weather-modal').removeClass('hidden').css('display', 'flex');

    try {
        const forecastData = await fetchWeatherData(city.lat, city.lon);
        renderChart(forecastData);
    } catch (e) {
        console.error("Failed to load weather", e);
        $('#modal-city-name').text(`Ошибка загрузки: ${cityName}`);
    }
}

async function fetchWeatherData(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${document.documentElement.lang === 'ru' ? lat.toString().replace(',', '.') : lat}&longitude=${document.documentElement.lang === 'ru' ? lon.toString().replace(',', '.') : lon}&hourly=temperature_2m,precipitation,windspeed_10m&timezone=auto&forecast_days=3`;

    return $.ajax({
        url: url,
        method: 'GET',
        dataType: 'json'
    });
}

function renderChart(data) {
    const ctx = document.getElementById('weather-chart').getContext('2d');

    if (weatherChart) {
        weatherChart.destroy();
    }

    const times = data.hourly.time.map(t => {
        const d = new Date(t);
        return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:00`;
    });

    weatherChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: times,
            datasets: [
                {
                    label: 'Температура (°C)',
                    data: data.hourly.temperature_2m,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    yAxisID: 'y',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Осадки (мм)',
                    data: data.hourly.precipitation,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.6)',
                    yAxisID: 'y1',
                    type: 'bar',
                    borderRadius: 4
                },
                {
                    label: 'Ветер (км/ч)',
                    data: data.hourly.windspeed_10m,
                    borderColor: '#10b981',
                    yAxisID: 'y2',
                    tension: 0.4,
                    borderDash: [5, 5],
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: { family: 'Inter' }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleFont: { family: 'Inter', size: 14 },
                    bodyFont: { family: 'Inter', size: 13 },
                    padding: 12,
                    cornerRadius: 8
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { maxTicksLimit: 12, font: { family: 'Inter' } }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: 'Температура (°C)', font: { family: 'Inter' } },
                    grid: { color: '#f1f5f9' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: 'Осадки (мм)', font: { family: 'Inter' } },
                    grid: { drawOnChartArea: false },
                    min: 0,
                    suggestedMax: 10
                },
                y2: {
                    type: 'linear',
                    display: false,
                    position: 'right',
                    min: 0,
                    suggestedMax: 30
                }
            }
        }
    });
}
