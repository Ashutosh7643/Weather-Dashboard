const API_KEY = "2ab4371fd9ddecbf617c5455216cce6c";

let weatherChart;
let lastWeatherData = null; // Store globally to re-render on unit toggle
let lastForecastData = null; // Store globally to redraw chart on theme/unit toggle
let currentTempUnit = localStorage.getItem("tempUnit") || "C";

// Initialize dashboard components and render history on page load
window.onload = () => {
    displayHistory();
    
    const unitToggleBtn = document.getElementById("unitToggle");
    if (unitToggleBtn) {
        unitToggleBtn.innerText = `°${currentTempUnit}`;
    }

    const searches = JSON.parse(localStorage.getItem("searches")) || [];
    if (searches.length > 0) {
        document.getElementById("cityInput").value = searches[0];
        getWeather();
    } else {
        // Fallback default city for premium first-time experience
        document.getElementById("cityInput").value = "New York";
        getWeather();
    }
    
    if (window.lucide) {
        window.lucide.createIcons();
    }
};

// Weather Icon Caching & Mapping
function getWeatherIconName(iconCode) {
    const map = {
        "01d": "sun",
        "01n": "moon",
        "02d": "cloud-sun",
        "02n": "cloud-moon",
        "03d": "cloud",
        "03n": "cloud",
        "04d": "cloudy",
        "04n": "cloudy",
        "09d": "cloud-drizzle",
        "09n": "cloud-drizzle",
        "10d": "cloud-rain",
        "10n": "cloud-rain",
        "11d": "cloud-lightning",
        "11n": "cloud-lightning",
        "13d": "snowflake",
        "13n": "snowflake",
        "50d": "cloud-fog",
        "50n": "cloud-fog"
    };
    return map[iconCode] || "cloud";
}

// Convert wind direction degrees to compass heading
function getWindDirection(deg) {
    if (deg === undefined || deg === null) return "";
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const index = Math.round(deg / 45) % 8;
    return directions[index];
}

// Toggle loading state on Search button
function setLoadingState(isLoading) {
    const searchBtn = document.querySelector(".btn-search");
    const cityInput = document.getElementById("cityInput");
    if (searchBtn) {
        searchBtn.disabled = isLoading;
        searchBtn.innerText = isLoading ? "Searching..." : "Search";
    }
    if (cityInput) {
        cityInput.disabled = isLoading;
    }
}

// Search Weather by City
async function getWeather() {
    const city = document.getElementById("cityInput").value.trim();

    if (city === "") {
        alert("Please enter a city name");
        return;
    }

    setLoadingState(true);

    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric`;

    try {
        const currentResponse = await fetch(currentUrl);
        const currentData = await currentResponse.json();

        if (Number(currentData.cod) !== 200) {
            alert(currentData.message);
            setLoadingState(false);
            return;
        }

        saveSearch(city);
        lastWeatherData = currentData; // Cache current weather data
        displayCurrentWeather(currentData);

        // Fetch AQI using coords from current weather API
        const lat = currentData.coord.lat;
        const lon = currentData.coord.lon;
        const aqiUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;

        try {
            const aqiResponse = await fetch(aqiUrl);
            const aqiData = await aqiResponse.json();
            const indAqi = calculateIndianAQI(aqiData.list[0].components);
            displayAQI(indAqi);
        } catch (aqiErr) {
            console.error("AQI fetch failed:", aqiErr);
            document.getElementById("aqi").innerText = "--";
            document.getElementById("aqiBadge").innerText = "Unavailable";
            document.getElementById("aqiBadge").className = "aqi-badge";
            const aqiBar = document.getElementById("aqiBar");
            if (aqiBar) aqiBar.style.width = "0%";
        }

        const forecastResponse = await fetch(forecastUrl);
        const forecastData = await forecastResponse.json();

        lastForecastData = forecastData; // cache for chart redraw
        displayForecast(forecastData);
        createChart(forecastData);

    } catch (error) {
        console.error(error);
        alert("An error occurred while fetching weather data. Please try again.");
    } finally {
        setLoadingState(false);
    }
}

// Current Weather Display
function displayCurrentWeather(data) {
    // 1. City Name
    document.getElementById("cityName").innerText = `${data.name}, ${data.sys.country}`;

    // 2. Date & Time (Adjusted for city timezone offset)
    const localTimeMs = new Date().getTime() + (new Date().getTimezoneOffset() * 60000) + (data.timezone * 1000);
    const cityLocalTime = new Date(localTimeMs);
    const options = { weekday: 'long', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC' };
    document.getElementById("dateTime").innerText = cityLocalTime.toLocaleString('en-US', options);

    // 3. Hero Temperature
    document.getElementById("temperature").innerText = formatTemp(data.main.temp);

    // 4. Icon mapping (standard OpenWeatherMap fallback + custom Lucide layout)
    const iconCode = data.weather[0].icon;
    const iconName = getWeatherIconName(iconCode);
    const iconFallback = document.getElementById("iconFallback");
    if (iconFallback) {
        iconFallback.innerHTML = `<i data-lucide="${iconName}" class="large-weather-icon" style="width: 56px; height: 56px; stroke: var(--primary-accent);"></i>`;
    }

    const weatherIcon = document.getElementById("weatherIcon");
    if (weatherIcon) {
        weatherIcon.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
        weatherIcon.style.display = "block";
        if (iconFallback) iconFallback.style.display = "none";
    }

    // 5. Description
    document.getElementById("description").innerText = data.weather[0].description;

    // 6. Feels Like Card
    document.getElementById("feelsLike").innerText = formatTemp(data.main.feels_like);
    const feelsLikeBar = document.getElementById("feelsLikeBar");
    if (feelsLikeBar) {
        // Map feels_like (cap between -10 and 45) to 0-100%
        const percentage = Math.min(Math.max(((data.main.feels_like + 10) / 55) * 100, 0), 100);
        feelsLikeBar.style.width = `${percentage}%`;
    }

    // 7. Wind Status Card
    document.getElementById("wind").innerText = `${data.wind.speed} m/s`;
    const windDirEl = document.getElementById("windDir");
    if (windDirEl) {
        const dir = getWindDirection(data.wind.deg);
        let speedText = "Calm breeze";
        if (data.wind.speed < 1.5) speedText = "Calm";
        else if (data.wind.speed < 3.3) speedText = "Light breeze";
        else if (data.wind.speed < 8.0) speedText = "Moderate breeze";
        else if (data.wind.speed < 13.9) speedText = "Strong wind";
        else speedText = "Gale warning";
        windDirEl.innerText = dir ? `Dir: ${dir} · ${speedText}` : speedText;
    }

    // 8. Humidity Card
    document.getElementById("humidity").innerText = `${data.main.humidity}%`;
    const humidityBar = document.getElementById("humidityBar");
    if (humidityBar) {
        humidityBar.style.width = `${data.main.humidity}%`;
    }

    // 9. Sunrise & Sunset Card (Adjusted for city timezone offset)
    const formatTimeOptions = { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC' };
    const sunriseLocal = new Date((data.sys.sunrise + data.timezone) * 1000);
    const sunsetLocal = new Date((data.sys.sunset + data.timezone) * 1000);
    document.getElementById("sunrise").innerText = sunriseLocal.toLocaleTimeString('en-US', formatTimeOptions);
    document.getElementById("sunset").innerText = sunsetLocal.toLocaleTimeString('en-US', formatTimeOptions);

    // 10. Visibility & Pressure Card
    const visibilityKm = (data.visibility / 1000).toFixed(1);
    document.getElementById("visibility").innerText = `${visibilityKm} km`;
    document.getElementById("pressure").innerText = `${data.main.pressure} hPa`;

    if (window.lucide) {
        window.lucide.createIcons();
    }
}

// 5-Day Forecast Display
function displayForecast(data) {
    const forecastContainer = document.getElementById("forecastContainer");
    forecastContainer.innerHTML = "";

    // Group forecast items by local day of the city to handle timezone offsets correctly
    const daysGroup = {};
    data.list.forEach(item => {
        const localDate = new Date((item.dt + data.city.timezone) * 1000);
        const dateKey = `${localDate.getUTCFullYear()}-${localDate.getUTCMonth() + 1}-${localDate.getUTCDate()}`;
        if (!daysGroup[dateKey]) {
            daysGroup[dateKey] = [];
        }
        daysGroup[dateKey].push({
            item: item,
            localHour: localDate.getUTCHours()
        });
    });

    // Select the best representative item for each day (closest to local 12:00 PM, i.e., localHour = 12)
    const dailyForecast = [];
    Object.keys(daysGroup).forEach(dateKey => {
        const items = daysGroup[dateKey];
        items.sort((a, b) => Math.abs(a.localHour - 12) - Math.abs(b.localHour - 12));
        dailyForecast.push(items[0].item);
    });

    // Slice at most 5 days
    const finalForecast = dailyForecast.slice(0, 5);

    finalForecast.forEach(day => {
        const date = new Date((day.dt + data.city.timezone) * 1000);
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        const dayName = days[date.getUTCDay()];
        const dateStr = `${months[date.getUTCMonth()]} ${date.getUTCDate()}`;
        const iconCode = day.weather[0].icon;
        const iconName = getWeatherIconName(iconCode);
        const tempStr = formatTemp(day.main.temp);
        const desc = day.weather[0].description;

        forecastContainer.innerHTML += `
            <div class="forecast-card">
                <h4>${dayName}</h4>
                <p style="font-size: 11px; color: var(--text-muted); margin-top: -4px;">${dateStr}</p>
                <div class="forecast-icon-container" style="margin: 5px 0;">
                    <i data-lucide="${iconName}" style="width: 32px; height: 32px; stroke: var(--secondary-accent);"></i>
                </div>
                <p class="forecast-temp">${tempStr}</p>
                <p class="forecast-desc">${desc}</p>
            </div>
        `;
    });

    if (window.lucide) {
        window.lucide.createIcons();
    }
}

// Air Quality Index Display
function displayAQI(aqi) {
    const aqiEl = document.getElementById("aqi");
    const badgeEl = document.getElementById("aqiBadge");
    const aqiBar = document.getElementById("aqiBar");

    if (!aqiEl || !badgeEl) return;

    aqiEl.innerText = aqi;
    badgeEl.className = "aqi-badge"; // Reset class names

    // Update progress bar (0 to 500 scale)
    if (aqiBar) {
        const percentage = Math.min((aqi / 500) * 100, 100);
        aqiBar.style.width = `${percentage}%`;
    }

    let aqiText = "";
    let aqiClass = "";

    if (aqi <= 50) {
        aqiText = "Good";
        aqiClass = "aqi-good";
    } else if (aqi <= 100) {
        aqiText = "Satisfactory";
        aqiClass = "aqi-fair";
    } else if (aqi <= 200) {
        aqiText = "Moderate";
        aqiClass = "aqi-mod";
    } else if (aqi <= 300) {
        aqiText = "Poor";
        aqiClass = "aqi-poor";
    } else if (aqi <= 400) {
        aqiText = "Very Poor";
        aqiClass = "aqi-verypoor";
    } else {
        aqiText = "Severe";
        aqiClass = "aqi-verypoor";
    }

    badgeEl.innerText = aqiText;
    if (aqiClass) {
        badgeEl.classList.add(aqiClass);
    }
}

// Interpolate value linearly between breakpoints and clamp it
function interpolate(c, cLow, cHigh, iLow, iHigh) {
    const res = ((iHigh - iLow) / (cHigh - cLow)) * (c - cLow) + iLow;
    return Math.max(iLow, Math.min(iHigh, Math.round(res)));
}

// Calculate CPCB Indian National AQI (0 to 500 scale) from pollutant components
function calculateIndianAQI(components) {
    if (!components) return 0;

    const subAqis = [];

    // PM2.5 AQI
    if (components.pm2_5 !== undefined) {
        const val = components.pm2_5;
        let aqi;
        if (val <= 30) aqi = interpolate(val, 0, 30, 0, 50);
        else if (val <= 60) aqi = interpolate(val, 30, 60, 50, 100);
        else if (val <= 90) aqi = interpolate(val, 60, 90, 100, 200);
        else if (val <= 120) aqi = interpolate(val, 90, 120, 200, 300);
        else if (val <= 250) aqi = interpolate(val, 120, 250, 300, 400);
        else aqi = interpolate(val, 250, 500, 400, 500);
        subAqis.push(aqi);
    }

    // PM10 AQI
    if (components.pm10 !== undefined) {
        const val = components.pm10;
        let aqi;
        if (val <= 50) aqi = interpolate(val, 0, 50, 0, 50);
        else if (val <= 100) aqi = interpolate(val, 50, 100, 50, 100);
        else if (val <= 250) aqi = interpolate(val, 100, 250, 100, 200);
        else if (val <= 350) aqi = interpolate(val, 250, 350, 200, 300);
        else if (val <= 430) aqi = interpolate(val, 350, 430, 300, 400);
        else aqi = interpolate(val, 430, 600, 400, 500);
        subAqis.push(aqi);
    }

    // NO2 AQI (µg/m³)
    if (components.no2 !== undefined) {
        const val = components.no2;
        let aqi;
        if (val <= 40) aqi = interpolate(val, 0, 40, 0, 50);
        else if (val <= 80) aqi = interpolate(val, 40, 80, 50, 100);
        else if (val <= 180) aqi = interpolate(val, 80, 180, 100, 200);
        else if (val <= 280) aqi = interpolate(val, 180, 280, 200, 300);
        else if (val <= 400) aqi = interpolate(val, 280, 400, 300, 400);
        else aqi = interpolate(val, 400, 600, 400, 500);
        subAqis.push(aqi);
    }

    // SO2 AQI (µg/m³)
    if (components.so2 !== undefined) {
        const val = components.so2;
        let aqi;
        if (val <= 40) aqi = interpolate(val, 0, 40, 0, 50);
        else if (val <= 80) aqi = interpolate(val, 40, 80, 50, 100);
        else if (val <= 380) aqi = interpolate(val, 80, 380, 100, 200);
        else if (val <= 800) aqi = interpolate(val, 380, 800, 200, 300);
        else if (val <= 1600) aqi = interpolate(val, 800, 1600, 300, 400);
        else aqi = interpolate(val, 1600, 2000, 400, 500);
        subAqis.push(aqi);
    }

    // O3 AQI (µg/m³)
    if (components.o3 !== undefined) {
        const val = components.o3;
        let aqi;
        if (val <= 50) aqi = interpolate(val, 0, 50, 0, 50);
        else if (val <= 100) aqi = interpolate(val, 50, 100, 50, 100);
        else if (val <= 168) aqi = interpolate(val, 100, 168, 100, 200);
        else if (val <= 208) aqi = interpolate(val, 168, 208, 200, 300);
        else if (val <= 748) aqi = interpolate(val, 208, 748, 300, 400);
        else aqi = interpolate(val, 748, 1000, 400, 500);
        subAqis.push(aqi);
    }

    // CO AQI (µg/m³ to mg/m³)
    if (components.co !== undefined) {
        const val = components.co / 1000;
        let aqi;
        if (val <= 1.0) aqi = interpolate(val, 0, 1.0, 0, 50);
        else if (val <= 2.0) aqi = interpolate(val, 1.0, 2.0, 50, 100);
        else if (val <= 10.0) aqi = interpolate(val, 2.0, 10.0, 100, 200);
        else if (val <= 17.0) aqi = interpolate(val, 10.0, 17.0, 200, 300);
        else if (val <= 34.0) aqi = interpolate(val, 17.0, 34.0, 300, 400);
        else aqi = interpolate(val, 34.0, 50.0, 400, 500);
        subAqis.push(aqi);
    }

    // NH3 AQI (µg/m³)
    if (components.nh3 !== undefined) {
        const val = components.nh3;
        let aqi;
        if (val <= 200) aqi = interpolate(val, 0, 200, 0, 50);
        else if (val <= 400) aqi = interpolate(val, 200, 400, 50, 100);
        else if (val <= 800) aqi = interpolate(val, 400, 800, 100, 200);
        else if (val <= 1200) aqi = interpolate(val, 800, 1200, 200, 300);
        else if (val <= 1800) aqi = interpolate(val, 1200, 1800, 300, 400);
        else aqi = interpolate(val, 1800, 2400, 400, 500);
        subAqis.push(aqi);
    }

    if (subAqis.length === 0) return 0;
    return Math.max(...subAqis);
}

// Temperature Chart Creator (re-designed with modern gradient fills)
function createChart(data) {
    const labels = [];
    const temperatures = [];

    // Take the next 8 points (approx. 24 hours of 3-hourly intervals)
    data.list.slice(0, 8).forEach(item => {
        // Adjust for city local timezone
        const localTime = new Date((item.dt + data.city.timezone) * 1000);
        const hours = localTime.getUTCHours();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const hour12 = hours % 12 || 12;
        const timeStr = `${hour12} ${ampm}`;
        labels.push(timeStr);
        
        let tempVal = item.main.temp;
        if (currentTempUnit === "F") {
            tempVal = (tempVal * 9) / 5 + 32;
        }
        temperatures.push(Math.round(tempVal));
    });

    const ctx = document.getElementById("tempChart").getContext("2d");

    if (weatherChart) {
        weatherChart.destroy();
    }

    const isLight = document.body.classList.contains("light-theme");
    const textColor = isLight ? "#475569" : "#9ca3af";
    const gridColor = isLight ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.05)";
    const lineColor = isLight ? "#2563eb" : "#60a5fa";
    const lineFillStart = isLight ? "rgba(37, 99, 235, 0.25)" : "rgba(96, 165, 250, 0.25)";

    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, lineFillStart);
    gradient.addColorStop(1, "rgba(0,0,0,0)");

    weatherChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "Temperature °C",
                data: temperatures,
                borderWidth: 3,
                borderColor: lineColor,
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: lineColor,
                pointBorderColor: "transparent",
                pointHoverRadius: 6,
                pointRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: isLight ? "rgba(255, 255, 255, 0.95)" : "rgba(17, 24, 39, 0.95)",
                    titleColor: isLight ? "#0f172a" : "#f3f4f6",
                    bodyColor: isLight ? "#334155" : "#d1d5db",
                    borderColor: isLight ? "rgba(0,0,0,0.1)" : "rgba(255, 255, 255, 0.1)",
                    borderWidth: 1,
                    titleFont: {
                        family: "Outfit",
                        weight: "600"
                    },
                    bodyFont: {
                        family: "Outfit"
                    },
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return `Temp: ${context.parsed.y}°${currentTempUnit}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            family: "Outfit",
                            size: 11
                        }
                    }
                },
                y: {
                    grid: {
                        color: gridColor
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            family: "Outfit",
                            size: 11
                        },
                        callback: function(value) {
                            return value + "°";
                        }
                    }
                }
            }
        }
    });
}

// Geolocation Weather
function getLocationWeather() {
    if (navigator.geolocation) {
        setLoadingState(true);
        navigator.geolocation.getCurrentPosition(
            success,
            locationError
        );
    } else {
        alert("Geolocation is not supported by your browser");
    }
}

async function success(position) {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;

    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
    const aqiUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;

    try {
        const currentResponse = await fetch(currentUrl);
        const currentData = await currentResponse.json();

        lastWeatherData = currentData; // Cache current weather data
        displayCurrentWeather(currentData);

        // Geolocation search saves as city name returned by the response
        if (currentData.name) {
            saveSearch(currentData.name);
            document.getElementById("cityInput").value = currentData.name;
        }

        const forecastResponse = await fetch(forecastUrl);
        const forecastData = await forecastResponse.json();

        lastForecastData = forecastData;
        displayForecast(forecastData);
        createChart(forecastData);

        try {
            const aqiResponse = await fetch(aqiUrl);
            const aqiData = await aqiResponse.json();
            const indAqi = calculateIndianAQI(aqiData.list[0].components);
            displayAQI(indAqi);
        } catch (aqiErr) {
            console.error("AQI fetch failed:", aqiErr);
            document.getElementById("aqi").innerText = "--";
            document.getElementById("aqiBadge").innerText = "Unavailable";
            document.getElementById("aqiBadge").className = "aqi-badge";
            const aqiBar = document.getElementById("aqiBar");
            if (aqiBar) aqiBar.style.width = "0%";
        }

    } catch (error) {
        console.error(error);
        alert("Unable to fetch location weather data");
    } finally {
        setLoadingState(false);
    }
}

function locationError() {
    alert("Location access denied. Please type a city name manually.");
    setLoadingState(false);
}

// Dark/Light Theme Switch
function toggleTheme() {
    document.body.classList.toggle("light-theme");
    // Redraw chart if active to match new theme guidelines
    if (weatherChart && lastForecastData) {
        createChart(lastForecastData);
    }
}

// Search History Management
function saveSearch(city) {
    if (!city) return;
    let searches = JSON.parse(localStorage.getItem("searches")) || [];
    
    // Capitalize properly
    const capitalizedCity = city.trim().split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");

    if (!searches.includes(capitalizedCity)) {
        searches.unshift(capitalizedCity);
        if (searches.length > 5) {
            searches.pop();
        }
        localStorage.setItem("searches", JSON.stringify(searches));
    }
    displayHistory();
}

function displayHistory() {
    const historyList = document.getElementById("historyList");
    if (!historyList) return;
    historyList.innerHTML = "";

    const searches = JSON.parse(localStorage.getItem("searches")) || [];

    searches.forEach(city => {
        historyList.innerHTML += `
            <li onclick="searchFromHistory('${city}')">
                <i data-lucide="history" style="width: 12px; height: 12px;"></i>
                <span>${city}</span>
            </li>
        `;
    });

    if (window.lucide) {
        window.lucide.createIcons();
    }
}

function searchFromHistory(city) {
    document.getElementById("cityInput").value = city;
    getWeather();
}

// Enter Key Event Support
document.getElementById("cityInput").addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
        getWeather();
    }
});

// Auto-refresh weather information every 5 minutes if city is search active
setInterval(() => {
    const city = document.getElementById("cityInput").value;
    if (city) {
        getWeather();
    }
}, 300000);

// Toggle Temperature Unit (°C <-> °F)
function toggleUnit() {
    currentTempUnit = currentTempUnit === "C" ? "F" : "C";
    localStorage.setItem("tempUnit", currentTempUnit);
    
    const unitToggleBtn = document.getElementById("unitToggle");
    if (unitToggleBtn) {
        unitToggleBtn.innerText = `°${currentTempUnit}`;
    }

    // Re-render cached data instantly
    if (lastWeatherData) {
        displayCurrentWeather(lastWeatherData);
    }
    if (lastForecastData) {
        displayForecast(lastForecastData);
        createChart(lastForecastData);
    }
}

// Format temperature value based on selected unit
function formatTemp(celsius) {
    if (currentTempUnit === "F") {
        return `${Math.round((celsius * 9) / 5 + 32)}°F`;
    }
    return `${Math.round(celsius)}°C`;
}