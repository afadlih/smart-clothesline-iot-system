# Smart Clothesline IoT Dashboard

A modern IoT dashboard simulation for an automated clothesline system. It monitors environmental conditions and determines whether the clothesline should be open or closed based on rain and light intensity.

## Project Overview

The system tracks:
- Temperature
- Humidity
- Light intensity
- Rain detection

Decision rule:
- If rain is detected OR light is low -> clothesline closes (TERTUTUP)
- Otherwise -> clothesline opens (TERBUKA)

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- OOP-based architecture (Model, Service, Hook, UI)

## Architecture

The project follows a clean, layered flow from data modeling to UI rendering:

- SensorData (Model)
  Encapsulates sensor readings and behavior, such as rain detection and low-light checks.
- DecisionEngine (Business logic)
  Central decision rules for clothesline state.
- SensorService (Data provider)
  Provides sensor data (currently mocked).
- useSensor (Hook)
  Polls data periodically and delivers it to the UI.
- UI Components
  - StatusPanel: shows system decision and reason
  - SensorCard: displays each sensor metric

## Features Implemented

- Real-time dashboard simulation (auto update every few seconds)
- Smart decision system for clothesline status
- Clean modular architecture (OOP + separation of concerns)
- Modern SaaS-style UI dashboard
- Status indicator (OPEN / CLOSED)
- Sensor monitoring cards
- System status badge (ONLINE)
- Animated UI feedback

## Current Status

- Simulation phase with mock data
- UI fully functional and polished
- Architecture ready for real IoT integration

## Next Development

- MQTT integration
- ESP32 connection
- Real sensor data streaming
- Historical data visualization (charts)
- Alert and notification system

## How to Run

1. Install dependencies:
   - npm install
2. Start the development server:
   - npm run dev

Then open http://localhost:3000 in your browser.

## Project Goal

This project aims to:
- Demonstrate IoT system design
- Apply clean architecture in a frontend application
- Simulate a real-world automated clothesline system
