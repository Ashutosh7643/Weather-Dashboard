const API_KEY = "2ab4371fd9ddecbf617c5455216cce6c";

let weatherChart;
let lastForecastData = null; // Store globally to redraw chart on theme toggle

// Initialize dashboard components and render history on page load
window.onload = () => {
    displayHistory();
    // Default search for a capital city or let it be clean
    // If they want, we can load a default city like "London" to show off the visual dashboard immediately!
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
        displayCurrentWeather(currentData);

        // Fetch AQI using coords from current weather API
        const lat = currentData.coord.lat;
        const lon = currentData.coord.lon;
        const aqiUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;

        try {
            const aqiResponse = await fetch(aqiUrl);
            const aqiData = await aqiResponse.json();
            const aqi = aqiData.list[0].main.aqi;
            displayAQI(aqi);
        } catch (aqiErr) {
            console.error("AQI fetch failed:", aqiErr);
            document.getElementById("aqi").innerText = "--";
            document.getElementById("aqiBadge").innerText = "Unavailable";
            document.getElementById("aqiBadge").className = "aqi-badge";
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

    // 2. Date & Time
    const options = { weekday: 'long', hour: '2-digit', minute: '2-digit', hour12: true };
    document.getElementById("dateTime").innerText = new Date().toLocaleString('en-US', options);

    // 3. Hero Temperature
    document.getElementById("temperature").innerText = `${Math.round(data.main.temp)}°C`;

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
    document.getElementById("feelsLike").innerText = `${data.main.feels_like} °C`;
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

    // 9. Sunrise & Sunset Card
    const formatTimeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
    document.getElementById("sunrise").innerText = new Date(data.sys.sunrise * 1000)
        .toLocaleTimeString([], formatTimeOptions);
    document.getElementById("sunset").innerText = new Date(data.sys.sunset * 1000)
        .toLocaleTimeString([], formatTimeOptions);

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

    // OpenWeatherMap 5-day forecast contains 3-hour intervals. Filter for 12:00:00 to represent daily forecast.
    const dailyForecast = data.list.filter(item => item.dt_txt.includes("12:00:00"));

    dailyForecast.forEach(day => {
        const date = new Date(day.dt * 1000);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const iconCode = day.weather[0].icon;
        const iconName = getWeatherIconName(iconCode);
        const temp = Math.round(day.main.temp);
        const desc = day.weather[0].description;

        forecastContainer.innerHTML += `
            <div class="forecast-card">
                <h4>${dayName}</h4>
                <p style="font-size: 11px; color: var(--text-muted); margin-top: -4px;">${dateStr}</p>
                <div class="forecast-icon-container" style="margin: 5px 0;">
                    <i data-lucide="${iconName}" style="width: 32px; height: 32px; stroke: var(--secondary-accent);"></i>
                </div>
                <p class="forecast-temp">${temp}°C</p>
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

    if (!aqiEl || !badgeEl) return;

    aqiEl.innerText = aqi;
    badgeEl.className = "aqi-badge"; // Reset class names

    let aqiText = "";
    let aqiClass = "";

    switch (aqi) {
        case 1:
            aqiText = "Good";
            aqiClass = "aqi-good";
            break;
        case 2:
            aqiText = "Fair";
            aqiClass = "aqi-fair";
            break;
        case 3:
            aqiText = "Moderate";
            aqiClass = "aqi-mod";
            break;
        case 4:
            aqiText = "Poor";
            aqiClass = "aqi-poor";
            break;
        case 5:
            aqiText = "Very Poor";
            aqiClass = "aqi-verypoor";
            break;
        default:
            aqiText = "Unknown";
            aqiClass = "";
    }

    badgeEl.innerText = aqiText;
    if (aqiClass) {
        badgeEl.classList.add(aqiClass);
    }
}

// Temperature Chart Creator (re-designed with modern gradient fills)
function createChart(data) {
    const labels = [];
    const temperatures = [];

    // Take the next 8 points (approx. 24 hours of 3-hourly intervals)
    data.list.slice(0, 8).forEach(item => {
        const timeStr = item.dt_txt.split(" ")[1].slice(0, 5);
        labels.push(timeStr);
        temperatures.push(Math.round(item.main.temp));
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
                            return `Temp: ${context.parsed.y}°C`;
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
            const aqi = aqiData.list[0].main.aqi;
            displayAQI(aqi);
        } catch (aqiErr) {
            console.error("AQI fetch failed:", aqiErr);
            document.getElementById("aqi").innerText = "--";
            document.getElementById("aqiBadge").innerText = "Unavailable";
            document.getElementById("aqiBadge").className = "aqi-badge";
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