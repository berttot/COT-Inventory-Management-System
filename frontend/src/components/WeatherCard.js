import React, { useEffect, useState } from "react";

const WeatherCard = () => {
  const API_KEY = "ab63cdde255709a5b7758b6543442cf8";
  const CITY = "Malaybalay";

  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchWeather = async () => {
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${CITY}&appid=${API_KEY}&units=metric`
      );
      const data = await res.json();
      setWeather(data);
    } catch (err) {
      console.error("Weather API error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
    const interval = setInterval(fetchWeather, 600000);
    return () => clearInterval(interval);
  }, []);

  if (loading)
    return (
      <div className="bg-white p-5 rounded-2xl shadow-md animate-pulse">
        <p className="text-gray-500">Loading weather...</p>
      </div>
    );

  if (!weather || weather.cod !== 200)
    return (
      <div className="bg-white p-5 rounded-2xl shadow-md">
        <p className="text-red-500">Unable to load weather data</p>
      </div>
    );

  const temp = Math.round(weather.main.temp);
  const feelsLike = Math.round(weather.main.feels_like);
  const humidity = weather.main.humidity;
  const wind = weather.wind.speed;
  const desc = weather.weather[0].description;
  const icon = weather.weather[0].icon;

  const sunrise = new Date(weather.sys.sunrise * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const sunset = new Date(weather.sys.sunset * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="bg-white rounded-2xl shadow-md p-5 border-l-4 border-blue-600 flex items-center gap-6 hover:shadow-lg transition col-span-2">

      {/* Left: Icon + Temp */}
      <div className="flex items-center gap-4">
        <img
          src={`https://openweathermap.org/img/wn/${icon}@2x.png`}
          alt="Weather Icon"
          className="w-16 h-16"
        />

        <div>
          <h2 className="text-3xl font-bold text-[#0a2a66]">{temp}°C</h2>
          <p className="capitalize text-gray-600">{desc}</p>
          <p className="text-sm text-gray-400">Malaybalay City</p>
        </div>
      </div>

      {/* Right: Extra details (horizontal mini-cards) */}
        <div className="flex-1 grid grid-cols-5 gap-3">

            <div className="bg-gray-50 rounded-xl p-2 text-center shadow-sm">
                <p className="text-[10px] text-gray-500">Feels Like</p>
                <p className="font-semibold text-sm text-gray-800">{feelsLike}°C</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-2 text-center shadow-sm">
                <p className="text-[10px] text-gray-500">Humidity</p>
                <p className="font-semibold text-sm text-gray-800">{humidity}%</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-2 text-center shadow-sm">
                <p className="text-[10px] text-gray-500">Wind</p>
                <p className="font-semibold text-sm text-gray-800">{wind} m/s</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-2 text-center shadow-sm">
                <p className="text-[10px] text-gray-500">Sunrise</p>
                <p className="font-semibold text-sm text-gray-800">{sunrise}</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-2 text-center shadow-sm">
                <p className="text-[10px] text-gray-500">Sunset</p>
                <p className="font-semibold text-sm text-gray-800">{sunset}</p>
            </div>

        </div>

    </div>
  );
};

export default WeatherCard;
