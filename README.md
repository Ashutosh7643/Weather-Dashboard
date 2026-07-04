# 🌤 SkyFlow | Premium Weather Dashboard

SkyFlow is a modern, responsive, and visually stunning weather dashboard built with native HTML, CSS, and Vanilla JavaScript. It leverages the OpenWeatherMap API to display real-time weather details, air quality indexes, temperature trends, and 5-day forecasts within a sleek glassmorphic user interface.

## ✨ Features

- **Glassmorphic UI Design**: Frosted glass panels (`backdrop-filter`) with vibrant, shifting backdrop gradients for an immersive desktop and mobile experience.
- **Dynamic Theme System**: Switch between a deep obsidian Dark Theme (default) and a soft sky-blue Light Theme. The Temperature Trends chart automatically adapts its colors to fit the chosen theme.
- **Air Quality Index (AQI)**: Unified search that retrieves AQI values (levels 1-5) and displays them with a corresponding colored safety badge.
- **24-Hour Temperature Trends**: A beautiful line graph powered by Chart.js featuring custom tooltips, scales, and a smooth linear gradient fill.
- **Today's Weather Highlights**:
  - **Feels Like**: Interactive comfort gauge indicator bar.
  - **Humidity**: Progress percentage level bar.
  - **Wind Status**: Active Beaufort scale reading (e.g. "Light breeze") accompanied by compass direction.
  - **Sunrise & Sunset**: Local sunrise and sunset timings.
  - **Visibility & Pressure**: Unified metrics displayed together.
- **5-Day Weather Forecast**: Clean daily summaries mapping weather codes to vector iconography from the **Lucide Icons** library.
- **Smart History Cache**: Recent search entries are cached in LocalStorage, formatted automatically, and presented as quick-access chips.
- **Geolocation Support**: Click the location pin button to load local weather details instantly.

## 🛠 Tech Stack

- **Markup**: HTML5 (Semantic Structure)
- **Styling**: Vanilla CSS3 (Custom Variables, Flexbox, CSS Grid, Glassmorphic filters, and Keyframe Animations)
- **Logic & API**: Vanilla JavaScript (ES6+ async/await, Geolocation API, LocalStorage)
- **Libraries**: 
  - [Chart.js](https://www.chartjs.org/) (Data Visualizations)
  - [Lucide Icons](https://lucide.dev/) (Modern UI Icons)
  - [Google Fonts](https://fonts.google.com/) (Outfit & Plus Jakarta Sans)

## 🚀 Getting Started

### Prerequisites

To query weather details, the project uses the OpenWeatherMap API. A pre-configured API key is already integrated in `script.js`.

### Installation & Run

1. Clone this repository to your local machine:
   ```bash
   git clone https://github.com/Ashutosh7643/Weather-Dashboard.git
   ```
2. Open the project folder:
   ```bash
   cd Weather-Dashboard
   ```
3. Open `index.html` directly in any browser:
   - On Windows: Double-click `index.html` or open via terminal:
     ```powershell
     Start-Process index.html
     ```
   - Alternatively, serve it via VS Code's **Live Server** extension or any basic HTTP server (e.g., `npx serve`).

## 🖥 Screenshots

### Dark Theme (Obsidian Glass)
*Premium dark backdrop, custom styled Chart.js, and multi-metric highlights grid.*

### Light Theme (Sky Glass)
*Soft light theme variables preserving clear text readability and chart contrast.*

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
