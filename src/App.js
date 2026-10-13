// App.js
import React, { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { WiDaySunny, WiCloudy, WiRain, WiSnow, WiThunderstorm, WiFog } from 'react-icons/wi';
import Nav from './Nav';
import { DEFAULT_CITY } from './cities';
import './App.css';

const fetcher = (url) => fetch(url).then((res) => res.json());

const REFRESH_INTERVAL_MS = 60000;
const MAX_LOG_ENTRIES = 10;

const buildWeatherUrl = ({ latitude, longitude }) =>
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,apparent_temperature,uv_index,wind_speed_10m,weather_code,precipitation_probability,is_day`;

const getCondition = (code) => {
    if (code === 0) return { label: 'Clear', Icon: WiDaySunny };
    if ([1, 2, 3].includes(code)) return { label: 'Cloudy', Icon: WiCloudy };
    if ([45, 48].includes(code)) return { label: 'Foggy', Icon: WiFog };
    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
        return { label: 'Rain', Icon: WiRain };
    }
    if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: 'Snow', Icon: WiSnow };
    if ([95, 96, 99].includes(code)) return { label: 'Storm', Icon: WiThunderstorm };
    return { label: 'Unknown', Icon: WiFog };
};

// [dayStart, dayEnd, nightStart, nightEnd] per condition family
const GRADIENTS = {
    clear: ['#4FA8E0', '#8FD0F0', '#0B1E3D', '#1B2A4A'],
    cloudy: ['#7B94AC', '#B3C4D6', '#232B3B', '#3A4356'],
    fog: ['#9AA9B8', '#C6D0DA', '#232830', '#3B4048'],
    rain: ['#5C7089', '#8A9CB0', '#161D2B', '#293347'],
    snow: ['#A9C6DE', '#DCEAF3', '#2B3A4D', '#44566B'],
    storm: ['#3E4653', '#5C6572', '#0D0F14', '#1D2027'],
};

const getGradientKey = (code) => {
    if (code === 0) return 'clear';
    if ([1, 2, 3].includes(code)) return 'cloudy';
    if ([45, 48].includes(code)) return 'fog';
    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'rain';
    if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
    if ([95, 96, 99].includes(code)) return 'storm';
    return 'cloudy';
};

const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const FIELD_LABELS = { temperature_2m: 'temperature', wind_speed_10m: 'wind speed', weather_code: 'condition' };
let nextLogId = 0;

const App = () => {
    const [city, setCity] = useState(DEFAULT_CITY);
    const { data, error } = useSWR(buildWeatherUrl(city), fetcher, { refreshInterval: REFRESH_INTERVAL_MS });

    const [secondsLeft, setSecondsLeft] = useState(REFRESH_INTERVAL_MS / 1000);
    const [log, setLog] = useState([]);
    const prevCurrentRef = useRef(null);

    // Reset the log when the city changes so readings from different places don't get compared
    const handleCityChange = (newCity) => {
        prevCurrentRef.current = null;
        setLog([]);
        setCity(newCity);
    };

    // Update the log + reset the countdown whenever fresh data arrives
    useEffect(() => {
        if (!data) return;
        setSecondsLeft(REFRESH_INTERVAL_MS / 1000);

        const prev = prevCurrentRef.current;
        const current = data.current;
        prevCurrentRef.current = current;

        const changedFieldKeys = prev
            ? Object.keys(FIELD_LABELS).filter((key) => prev[key] !== current[key])
            : [];
        const status = !prev ? 'initial' : changedFieldKeys.length > 0 ? 'changed' : 'unchanged';

        const entry = {
            id: nextLogId++,
            time: new Date().toLocaleTimeString(),
            temperature_2m: current.temperature_2m,
            wind_speed_10m: current.wind_speed_10m,
            uv_index: current.uv_index,
            precipitation_probability: current.precipitation_probability,
            condition: getCondition(current.weather_code).label,
            status,
            changedFields: changedFieldKeys.map((key) => FIELD_LABELS[key]),
        };
        setLog((prevLog) => [entry, ...prevLog].slice(0, MAX_LOG_ENTRIES));
    }, [data]);

    useEffect(() => {
        if (!data) return;
        const { weather_code, is_day } = data.current;
        const [dayStart, dayEnd, nightStart, nightEnd] = GRADIENTS[getGradientKey(weather_code)];
        const gradient = is_day
            ? `linear-gradient(160deg, ${dayStart}, ${dayEnd})`
            : `linear-gradient(160deg, ${nightStart}, ${nightEnd})`;
        document.documentElement.style.setProperty('--app-gradient', gradient);
    }, [data]);

    // Tick the countdown down every second
    useEffect(() => {
        const tick = setInterval(() => setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
        return () => clearInterval(tick);
    }, []);

    if (error) {
        return (
            <>
                <Nav city={city} onCityChange={handleCityChange} />
                <div className="app-shell app-shell--error">
                    <p>Couldn't load the weather. Trying again shortly.</p>
                </div>
            </>
        );
    }

    if (!data) {
        return (
            <>
                <Nav city={city} onCityChange={handleCityChange} />
                <div className="app-shell app-shell--loading">
                    <div className="skeleton-circle" />
                    <div className="skeleton-line skeleton-line--wide" />
                    <div className="skeleton-line" />
                </div>
            </>
        );
    }

    const { temperature_2m, apparent_temperature, uv_index, wind_speed_10m, weather_code, precipitation_probability } = data.current;
    const condition = getCondition(weather_code);

    const statusLabel = (entry) => {
        if (entry.status === 'initial') return 'Initial load';
        if (entry.status === 'changed') return `Updated · ${entry.changedFields.join(', ')}`;
        return 'No change';
    };

    return (
        <>
            <Nav city={city} onCityChange={handleCityChange} />
            <div className="app-shell">
                <div className="ambient-shape ambient-shape--one" />
                <div className="ambient-shape ambient-shape--two" />

                <div className="weather-card">

                    <div key={data.current.time} className="hero fade-in">
                        {/* Weather icon, temperature, and condition label */}
                        <condition.Icon className="hero-icon" />
                        <div className="hero-temp">{Math.round(temperature_2m)}°</div>
                        <p className="hero-condition">{condition.label}</p>
                    </div>

                    <div className="stats-row">
                        {/* Wind speed and next update countdown */}
                        <div className="glass-tile">
                            <span className="glass-tile-label">Wind</span>
                            <span className="glass-tile-value">{wind_speed_10m} km/h</span>
                        </div>
                        {/* Next update countdown */}
                        <div className="glass-tile">
                            <span className="glass-tile-label">Next update</span>
                            <span className="glass-tile-value">{formatTime(secondsLeft)}</span>
                        </div>
                    </div>

                    <div className="stats-row">
                        {/* Feels like temperature */}
                        <div className="glass-tile">
                            <span className="glass-tile-label">UV Index</span>
                            <span className="glass-tile-value">{uv_index}</span>
                        </div>
                        {/* Feels like temperature */}
                        <div className="glass-tile">
                            <span className="glass-tile-label">Feels like</span>
                            <span className="glass-tile-value">{Math.round(apparent_temperature)}°</span>
                        </div>
                    </div>
                    
                    <div className="stats-col">
                        {/* Precipitation */}
                        <div className="glass-tile">
                            <span className="glass-tile-label">Precipitation</span>
                            <span className="glass-tile-value">{precipitation_probability} mm</span>
                        </div>
                    </div>
                    <div/>

                    <div className="glass-panel log-panel">
                        {/* Update log */ }
                        <p className="glass-panel-title">Update log</p>
                        <ul className="log-list">
                            {log.map((entry) => (
                                <li key={entry.id} className={`log-entry log-entry--${entry.status}`}>
                                    <span className="log-time">{entry.time}</span>
                                    <span className="log-detail">
                                        {Math.round(entry.temperature_2m)}° · {entry.wind_speed_10m} km/h · {entry.condition}
                                    </span>
                                    <span className="log-status">{statusLabel(entry)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </>
    );
};

export default App;