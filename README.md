<div align="center">

# ⚡ ResoLab 3D

### *Immersive 3D Series LCR Circuit Resonance Simulator*

[![Built with React](https://img.shields.io/badge/React-18.2-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Powered by Three.js](https://img.shields.io/badge/Three.js-r177-black?style=flat-square&logo=three.js)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=flat-square&logo=vite)](https://vite.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.x-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![License: CC BY 4.0](https://img.shields.io/badge/License-CC%20BY%204.0-lightgrey?style=flat-square)](https://creativecommons.org/licenses/by/4.0/)

> **An immersive, physics-accurate virtual laboratory that makes the invisible dynamics of LCR circuit resonance visible, tangible, and explorable in 3D.**

</div>

---

## 🌟 Overview

**ResoLab 3D** is an interactive 3D simulation designed for students, educators, and engineers to explore the fascinating world of **Series LCR (Inductor-Capacitor-Resistor) circuits**. Instead of relying on static textbook diagrams, ResoLab 3D brings electromagnetic phenomena to life through real-time 3D phasor visualization, live physics calculations, and a fully interactive virtual lab bench.

The core challenge it solves is the **"transparency of resonance"** — making the precise moment where inductive reactance cancels capacitive reactance (X_L = X_C) visually and procedurally undeniable.

> 🏆 *Built for the VLabs Hackathon — Problem Statement: Series LCR Circuits (CC BY 4.0, inspired by vlabs.ac.in, an MoE Govt. of India initiative)*

---

## ✨ Features

### 🔬 Core Simulation
| Feature | Description |
|---|---|
| 🧩 **Component Inventory Tray** | Drag & place AC Source, Resistor, Inductor, and Capacitor onto a virtual breadboard |
| 🔌 **Procedural Wiring** | Manually connect component terminals in series; circuit validates the closed loop |
| ⚡ **Real-Time Physics** | Impedance Z, reactances X_L & X_C, current I, and phase angle φ computed at 60 FPS |
| 🎚️ **Frequency Sweep** | Slide from 10 Hz to 2 kHz and watch all vectors respond instantaneously |
| 🔋 **Source Voltage Control** | Adjustable V_rms from 1 V to 10 V for amplitude experiments |

### 📊 Visualization & Instruments
| Feature | Description |
|---|---|
| 🌀 **Rotating 3D Phasor Arena** | Live Three.js phasor diagram — V_R, V_L, V_C, and V_S rotate in 3D with orbit controls |
| 📡 **Digital Oscilloscope** | Dual-channel CRT-style scope displaying source voltage and current waveforms |
| 📈 **Resonance Curve Plotter** | Interactive I vs. f bell-curve — click anywhere to jump to that frequency |
| 🔭 **Virtual Multimeter (DMM)** | Draggable red/black probes snap to component terminals for V_R, V_L, V_C measurements |

### 🎯 Resonance Detection
| Feature | Description |
|---|---|
| 🚨 **Resonance Toast Banner** | Animated full-width banner slides in showing f_r, Z_min, I_max, and φ = 0° |
| 🔔 **Audio Bell Chime** | Web Audio API plays a synthetic bell tone when resonance is locked in |
| 🌊 **Electrical Hum Synth** | Continuous hum that changes pitch and brightness with circuit frequency |
| 💎 **3D Glowing Sphere** | Pulsing emerald sphere appears at origin in phasor space at resonance |

### 🎮 Gamification & Learning
| Feature | Description |
|---|---|
| 🏆 **Tuning Challenges** | Three timed quests with increasing difficulty and point rewards |
| 🎯 **Precision Score** | Accuracy percentage based on distance from theoretical f_r |
| 🏅 **Badge System** | Earn badges like *Resonance Pioneer* and *Master Tuner* |
| 🤖 **AI Lab Mentor** | Real-time diagnostics panel + chat with local physics knowledge base (optional Gemini API) |
| 📓 **Virtual Lab Notebook** | Log data points (f, I, V_R, V_L, V_C, φ) and export as an HTML lab report |
| 👥 **Peer Observer Mode** | Multi-tab collaboration via BroadcastChannel API — sync circuit state live |

---

## 🧮 Physics Engine

All calculations are performed in real-time using exact SI formulae:

| Formula | Description |
|---|---|
| `X_L = 2πfL` | Inductive Reactance |
| `X_C = 1 / (2πfC)` | Capacitive Reactance |
| `Z = √(R² + (X_L − X_C)²)` | Total Impedance |
| `I_rms = V_rms / Z` | RMS Current |
| `φ = arctan((X_L − X_C) / R)` | Phase Angle |
| `f_r = 1 / (2π√(LC))` | Resonant Frequency |
| `Q = X_L / R` | Quality Factor |

---

## 🛠️ Tech Stack

| Technology | Role |
|---|---|
| ⚛️ **React 18** | UI Component architecture |
| 🎨 **TailwindCSS v4** | Utility-first styling via `@tailwindcss/vite` |
| 🌐 **Three.js** | 3D Phasor rendering, orbit controls, arrow helpers |
| ⚡ **Vite 6** | Build tooling and dev server |
| 🔷 **TypeScript 5.9** | Type-safe physics engine and component props |
| 🎵 **Web Audio API** | Resonance hum synthesizer and bell chime |
| 📡 **BroadcastChannel API** | Multi-tab peer observation sync |
| 🎊 **canvas-confetti** | Celebration animation on resonance lock |
| 🎨 **Canvas 2D API** | Interactive workbench, oscilloscope, and plotter |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **npm** v9 or higher

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/Resolab_3D.git
cd Resolab_3D

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Open **http://localhost:3000** in your browser.

### Build for Production

```bash
npm run build
```

The output will be in the `dist/` folder, ready for static hosting on GitHub Pages, Vercel, Netlify, etc.

---

## 🎓 How to Use the Lab

### Step-by-Step Workflow

```
1. 🧩  Drag components from the Inventory Tray → AC Source, R, L, C onto the breadboard
2. 🔌  Connect terminals in series: Source(+) → R → L → C → Source(-)
        OR click "Auto-Wire Loop" for a quick shortcut
3. ⚡  Click "Power On" — watch cyan current particles flow through the wires
4. 🎚️  Sweep the Frequency slider (or click the Plotter curve) to search for resonance
5. 🌀  Observe the 3D Phasor vectors rotating — VL grows at high f, VC grows at low f
6. 🚨  At resonance, the "RESONANCE DETECTED" banner fires with full metrics
7. 🔭  Drag the DMM probes onto R/L/C terminals to measure individual voltage drops
8. 📓  Click "Log Data" to record each data point into the Virtual Lab Notebook
9. 📥  Click "Report" to download a formatted HTML lab report
```

### Editing Component Values

- Use the **left-panel sliders** for R, L, C, and frequency
- **Double-click** any component body on the canvas workbench to open an inline value editor

### Multi-Tab Collaboration

1. Open ResoLab 3D in two browser tabs
2. Enable **"Observer Sync"** in both tabs
3. Adjustments in Tab 1 will mirror instantly in Tab 2

---

## 📁 Project Structure

```
Resolab_3D/
├── src/
│   ├── components/
│   │   ├── 🔬 LabBench3D.tsx      — Interactive workbench, wiring, DMM probes
│   │   ├── 🌀 Phasor3D.tsx        — Three.js 3D phasor diagram + orbit controls
│   │   ├── 📡 Oscilloscope.tsx    — Dual-channel CRT-style waveform display
│   │   ├── 📈 Plotter.tsx         — I vs. f resonance curve plotter
│   │   ├── 🤖 AIMentor.tsx        — AI diagnostics + Gemini-powered chat
│   │   └── 🎮 Gamification.tsx    — Challenges, lab notebook, badges, export
│   ├── utils/
│   │   ├── ⚛️  physics.ts          — LCR calculation engine (all SI formulae)
│   │   └── 🎵 audio.ts            — Web Audio API synthesizer engine
│   ├── App.tsx                    — Root layout, state management, resonance banner
│   ├── main.tsx                   — React DOM entry point
│   └── index.css                  — Global styles + Tailwind v4 import
├── public/                        — Static assets
├── index.html                     — HTML entry point with SEO meta tags
├── vite.config.ts                 — Vite + Tailwind + React configuration
├── tsconfig.json                  — TypeScript configuration
└── package.json                   — Dependencies and scripts
```

---

## 🧑‍🔬 AI Lab Mentor

The built-in **AI Lab Mentor** provides:

- 🟢 **Real-time diagnostics** — live status: capacitive / inductive / resonant state with exact XL/XC values
- 💬 **Chat Q&A** — ask about resonance, impedance, Q-factor, phase angles, formulas
- 🔑 **Gemini API integration** — optionally connect a Google Gemini API key for full open-ended AI chat

**Local knowledge base covers:**
> Resonance, Impedance, Phase Angle, Q-Factor, Reactance formulas, Voltage Magnification, and more

---

## 📜 Attributions

This project was inspired by the **Virtual Labs** simulation on [vlabs.ac.in](https://ec-amrt.vlabs.ac.in/exp/series-lcr-circuits/theory.html), an initiative of the **Ministry of Education, Government of India**.

Physics formulae sourced from:
- [Series LCR Theory — VLabs](https://ec-amrt.vlabs.ac.in/exp/series-lcr-circuits/theory.html)
- [Series LCR Procedure — VLabs](https://ec-amrt.vlabs.ac.in/exp/series-lcr-circuits/procedure.html)

> Licensed under **CC BY 4.0 International**

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

<div align="center">

**Made with ❤️ for the VLabs Hackathon**

*Bringing invisible electromagnetic phenomena to life — one phasor at a time.*

⭐ **Star this repo if ResoLab 3D helped you understand LCR circuits!**

</div>
