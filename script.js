// use your API key here (kept as in your code)
const apiKey = '9dadc56d3f2d4ce8872160259251706';

// helpers
function safeIconUrl(icon) {
  if (!icon) return '';
  return icon.startsWith('//') ? 'https:' + icon : icon;
}

function to12Hour(epoch) {
  const d = new Date(epoch * 1000);
  let h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = ((h + 11) % 12 + 1);
  return `${hour12} ${ampm}`;
}

function updateVisibleCountVar() {
  // responsive visible counts
  let count = 6; // default large
  const w = window.innerWidth;
  if (w < 420) count = 2;
  else if (w < 600) count = 3;
  else if (w < 900) count = 4;
  else if (w < 1200) count = 5;
  else count = 6;
  document.documentElement.style.setProperty('--visible-count', count);
  return count;
}

// scroll a page (container width) left or right
function pageScrollHourly(direction = 1) {
  const container = document.getElementById('hourlyScroll');
  if (!container) return;
  const pageWidth = container.clientWidth; // page size corresponds to visible area
  container.scrollBy({ left: pageWidth * direction, behavior: 'smooth' });
}

// attach arrow handlers
document.addEventListener('DOMContentLoaded', () => {
  updateVisibleCountVar();
  window.addEventListener('resize', () => updateVisibleCountVar());

  document.getElementById('hourLeft').addEventListener('click', () => pageScrollHourly(-1));
  document.getElementById('hourRight').addEventListener('click', () => pageScrollHourly(1));

  // search trigger (Enter or click)
  document.getElementById('searchBtn').addEventListener('click', getWeather);
  document.getElementById('cityInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') getWeather();
  });

  // mode toggle
  const toggle = document.getElementById('modeSwitch');
  toggle.addEventListener('change', function () {
    document.body.classList.toggle('dark-mode');
    document.body.classList.toggle('light-mode');
  });
});

// main function
async function getWeather() {
  const cityInput = document.getElementById('cityInput');
  const city = (cityInput.value || '').trim();
  if (!city) {
    alert('Please enter a city name (e.g., "Delhi" or "London")');
    cityInput.focus();
    return;
  }

  const url = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${encodeURIComponent(city)}&days=2&aqi=no&alerts=no`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('City not found or API error');
    const data = await res.json();

    // header info
    document.getElementById('temperature').innerText = `${data.current.temp_c} °C`;
    document.getElementById('description').innerText = data.current.condition.text;
    document.getElementById('location').innerText = `${data.location.name}, ${data.location.country}`;
    // use location.localtime to show correct local date
    document.getElementById('date').innerText = data.location.localtime.split(' ')[0];

    document.getElementById('wind').innerText = `Wind: ${data.current.wind_kph} kph`;
    document.getElementById('humidity').innerText = `Humidity: ${data.current.humidity}%`;
    document.getElementById('visibility').innerText = `Visibility: ${data.current.vis_km} km`;
    document.getElementById('pressure').innerText = `Air Pressure: ${data.current.pressure_mb} mb`;

    // DAILY FORECAST (days available in data.forecast.forecastday)
    const forecastDiv = document.getElementById('forecast');
    forecastDiv.innerHTML = '';
    data.forecast.forecastday.forEach(day => {
      const dayCard = document.createElement('div');
      dayCard.className = 'forecast-day';
      dayCard.innerHTML = `
        <p style="font-weight:700">${day.date}</p>
        <img src="${safeIconUrl(day.day.condition.icon)}" alt="icon" />
        <p style="margin-top:6px;font-weight:700">${day.day.avgtemp_c} °C</p>
        <p style="font-size:13px;color:#bcd3f9;margin-top:6px">${day.day.condition.text}</p>
      `;
      forecastDiv.appendChild(dayCard);
    });

    // HOURLY FORECAST: next 12 hours from localtime
    const hourlyContainer = document.getElementById('hourlyScroll');
    hourlyContainer.innerHTML = '';
    // flatten hours of day0 and day1 (so we can pick hours across midnight)
    const hoursAll = [];
    data.forecast.forecastday.forEach(fd => {
      if (fd.hour && fd.hour.length) hoursAll.push(...fd.hour);
    });

    // find index that corresponds to localtime hour
    const localEpoch = data.location.localtime_epoch; // seconds
    const localIndex = hoursAll.findIndex(h => h.time_epoch === localEpoch || Math.abs(h.time_epoch - localEpoch) < 3600);
    const startIndex = localIndex >= 0 ? localIndex : hoursAll.findIndex(h => h.time.includes(data.location.localtime.split(' ')[1])) || 0;

    const next12 = hoursAll.slice(startIndex, startIndex + 12);
    // if less than 12 (edge), pad with earlier/later by wrapping
    if (next12.length < 12) {
      let i = (startIndex + next12.length) % hoursAll.length;
      while (next12.length < 12 && hoursAll[i]) {
        next12.push(hoursAll[i]);
        i = (i + 1) % hoursAll.length;
      }
    }

    next12.forEach((hourObj, idx) => {
      const timeLabel = (idx === 0) ? 'Now' : to12Hour(hourObj.time_epoch);
      const chance = (hourObj.chance_of_rain !== undefined) ? `${hourObj.chance_of_rain}%` : (hourObj.chance_of_snow ? `${hourObj.chance_of_snow}%` : '--');
      const card = document.createElement('div');
      card.className = 'hour';
      card.setAttribute('role', 'listitem');
      card.innerHTML = `
        <div class="time">${timeLabel}</div>
        <div class="chance">${chance}</div>
        <img src="${safeIconUrl(hourObj.condition.icon)}" alt="${hourObj.condition.text}" />
        <div class="temp">${hourObj.temp_c}°</div>
      `;
      hourlyContainer.appendChild(card);
    });

    // ensure visible count var updated after DOM changes
    updateVisibleCountVar();

    // init map
    initMap(data.location.lat, data.location.lon);

    // after rendering, scroll to start (in case previously scrolled)
    hourlyContainer.scrollLeft = 0;
  } catch (err) {
    console.error(err);
    alert('Could not fetch weather. Make sure the city is valid and try again.');
  }
}

// MAP (uses google maps script in HTML)
function initMap(lat, lon) {
  if (!window.google || !google.maps) return;
  const mapEl = document.getElementById('map');
  const map = new google.maps.Map(mapEl, {
    center: { lat: Number(lat), lng: Number(lon) },
    zoom: 10,
  });
  new google.maps.Marker({ position: { lat: Number(lat), lng: Number(lon) }, map });
}
