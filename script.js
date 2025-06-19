const apiKey = '9dadc56d3f2d4ce8872160259251706';

async function getWeather() {
  const city = document.getElementById('cityInput').value;
  const url = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${city}&days=7&aqi=no&alerts=no`;

  const response = await fetch(url);
  const data = await response.json();

  document.getElementById('temperature').innerText = `${data.current.temp_c} °C`;
  document.getElementById('description').innerText = data.current.condition.text;
  document.getElementById('location').innerText = `${data.location.name}, ${data.location.country}`;
  document.getElementById('date').innerText = new Date().toDateString();

  document.getElementById('wind').innerText = `Wind: ${data.current.wind_kph} kph`;
  document.getElementById('humidity').innerText = `Humidity: ${data.current.humidity}%`;
  document.getElementById('visibility').innerText = `Visibility: ${data.current.vis_km} km`;
  document.getElementById('pressure').innerText = `Air Pressure: ${data.current.pressure_mb} mb`;

  const forecastDiv = document.getElementById('forecast');
  forecastDiv.innerHTML = '';
  data.forecast.forecastday.forEach(day => {
    forecastDiv.innerHTML += `
      <div class="forecast-day">
        <p>${day.date}</p>
        <img src="${day.day.condition.icon}" alt="icon" />
        <p>${day.day.avgtemp_c} °C</p>
      </div>`;
  });

  initMap(data.location.lat, data.location.lon);
}

function initMap(lat, lon) {
  const map = new google.maps.Map(document.getElementById('map'), {
    center: { lat, lng: lon },
    zoom: 10
  });
  new google.maps.Marker({ position: { lat, lng: lon }, map });
}

// Dark/Light Mode Toggle
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('modeSwitch');
  toggle.addEventListener('change', function () {
    document.body.classList.toggle('dark-mode');
    document.body.classList.toggle('light-mode');
  });
});
