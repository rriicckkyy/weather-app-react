// Nav.js
import React from 'react';
import { CITIES } from './cities';
import './Nav.css';

const Nav = ({ city, onCityChange }) => {
    return (
        <nav className="navbar">
            <span className="navbar-title">Weather</span>
            <select
                className="navbar-location"
                aria-label="Location"
                value={city.name}
                onChange={(e) => onCityChange(CITIES.find((c) => c.name === e.target.value))}
            >
                {CITIES.map((c) => (
                    <option key={c.name} value={c.name}>
                        {c.name}, {c.country}
                    </option>
                ))}
            </select>
        </nav>
    );
};

export default Nav;
