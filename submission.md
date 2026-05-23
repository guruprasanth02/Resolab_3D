# ResoLab 3D — Immersive Series LCR Circuit Resonance Simulator

---

### Problem Statement Fit

**Selected Problem Statement:** Series LCR Circuits — Electric Circuits Lab (Physics and Physical Sciences)

ResoLab 3D directly addresses every requirement of this problem statement. The core challenge defined in the brief is the **"transparency of resonance"** — the conceptual difficulty students face when trying to visualize the point where inductive reactance (X_L) and capacitive reactance (X_C) cancel each other out. Traditional labs hide this phenomenon behind oscilloscope menus and static 2D phasor diagrams; ResoLab 3D makes it impossible to miss.

Our simulation addresses the gap specifically by:

- **Making resonance visible in 3D space** — a live rotating Three.js phasor diagram shows V_L and V_C vectors shrinking toward each other as the user sweeps frequency. At the exact resonant frequency, they collapse to the same magnitude and only V_R remains — a visceral, spatial confirmation of X_L = X_C.
- **Providing a multi-modal resonance trigger** — when the user finds the resonant frequency, a large animated "⚡ RESONANCE DETECTED" banner fires, an audio bell chime plays, a glowing 3D sphere appears in phasor space, and all component bodies illuminate in emerald — making the event unmissable.
- **Bridging the math and the physics** — every slider adjustment recalculates Z, X_L, X_C, I_rms, φ, and f_r in real-time using exact SI formulae, so students immediately see the consequence of changing L or C on the resonance peak.
- **Simulating the full lab workflow** — from component placement → wiring → powering on → frequency sweep → probe measurement → data logging → lab report export, the user journey mirrors a real physical laboratory session end-to-end.

---

### Target Users

**Primary Users:**
- **Undergraduate physics and electrical engineering students** who are preparing for or supplementing a physical LCR circuit lab session. The simulation lets them build intuition about phase relationships, resonance, and impedance before they ever touch real equipment.
- **High school students** in advanced physics courses encountering AC circuits for the first time who struggle with the abstract mathematics of phasors and reactance.

**Secondary Users:**
- **Lab instructors and educators** who need a shareable, zero-setup demonstration tool for classroom explanations of resonance — no physical equipment required, runs in any browser.
- **Hobbyist engineers and makers** exploring RF tuning, filter design, or power factor correction concepts who want an interactive sandbox.

**Core Pain Points Addressed:**
1. Students cannot *see* AC oscillations or phase relationships with the naked eye in a physical lab — ResoLab 3D renders them as animated 3D vectors.
2. Students struggle to connect the formula `f_r = 1/(2π√LC)` to observable circuit behavior — our simulation lets them change L or C and watch the resonance peak shift on a live I vs. f curve.
3. Physical lab oscilloscopes are complex to operate — our built-in CRT-style oscilloscope shows voltage and current waveforms with labeled phase offsets at beginner-friendly zoom levels.
4. Lab access is constrained by time slots and equipment availability — ResoLab 3D works in any browser, at any time, with no installation.

---

### What We Built

During this event, we built **ResoLab 3D** — a fully browser-based, physics-accurate 3D simulation of a series LCR circuit laboratory.

The team implemented the complete system from scratch:

- A **real-time physics engine** (`physics.ts`) that calculates all 7 LCR metrics (X_L, X_C, Z, I_rms, φ, f_r, Q-factor) on every state change using exact SI formulae referenced from the VLabs theory pages.
- A **3D phasor visualization** (`Phasor3D.tsx`) built with Three.js, featuring rotating voltage vectors (V_R, V_L, V_C, V_S), a helix trace showing voltage history along the time axis, orbit controls, axis labels, and a resonance indicator sphere.
- An **interactive 2D workbench** (`LabBench3D.tsx`) rendered with Canvas 2D API, featuring a component inventory tray, drag-to-place components, terminal-to-terminal wiring with curved wire rendering, animated current-flow particles, a draggable digital multimeter with two probes, and double-click-to-edit component values directly on the canvas.
- A **dual-channel oscilloscope** (`Oscilloscope.tsx`) with a CRT green-phosphor aesthetic, showing source voltage and current waveforms with phase offset labels, adjustable time/volt/amp divisions.
- A **resonance curve plotter** (`Plotter.tsx`) showing the characteristic bell-shaped I vs. f curve with gradient fill, the theoretical f_r dashed line, and a clickable surface to jump to any frequency instantly.
- A **gamification system** (`Gamification.tsx`) with three timed challenges, a precision accuracy scoring system, a badge award system with confetti, and a virtual lab notebook that exports a downloadable HTML lab report.
- An **AI Lab Mentor** (`AIMentor.tsx`) with a real-time diagnostics panel that narrates the circuit state (capacitive / inductive / resonant) and a chat interface powered by a local physics knowledge base — optionally upgradeable with a Gemini API key for open-ended Q&A.
- A **Web Audio API synthesizer** (`audio.ts`) producing a continuous electrical hum that changes in pitch and brightness with circuit frequency, plus a synthetic bell chime that fires at resonance.
- A **BroadcastChannel-based peer sync** system allowing two browser tabs to mirror each other's circuit state in real-time for collaborative observation.

---

### Core Features

- **🧩 Component Inventory Tray with Drag-to-Place** — An AC source, resistor, inductor, and capacitor sit in an inventory tray above the breadboard. Users click or drag each component onto the board before they can wire the circuit — mirroring the physical act of component placement described in the problem statement.

- **🔌 Procedural Series Wiring with Loop Validation** — Users connect component terminals one by one using a click-drag wire tool. The simulation validates that a complete series loop (Source → R → L → C → Source) is formed before allowing power to be switched on — enforcing the correct circuit topology.

- **⚡ Real-Time Frequency Sweep with Instant Physics Response** — A frequency slider from 10 Hz to 2 kHz triggers recalculation of all circuit metrics on every frame, displayed across the 3D phasor, oscilloscope, plotter, and live metrics panel simultaneously with no perceptible lag.

- **🌀 Rotating 3D Phasor Diagram** — A Three.js scene renders V_R (cyan), V_L (violet), V_C (gold), and V_S (magenta) as live rotating Arrow Helpers in 3D space. Users can orbit, pan, and zoom the scene. At resonance, V_L and V_C visibly equalize and oppose each other 180° apart, while a helix trace shows the voltage history propagating along the time axis.

- **🔭 Draggable Digital Multimeter (DMM)** — A virtual DMM with red and black probes can be dragged onto any terminal pair on the workbench. It correctly measures V_R, V_L, V_C, V_Source, or the combined V_LC depending on probe placement, with readings displayed to two decimal places.

- **📈 Interactive I vs. f Resonance Curve Plotter** — A live-rendered bell-shaped current vs. frequency graph shows the full resonance curve for the current component values, a dashed vertical line at f_r, and a glowing dot at the current operating point. Clicking or dragging on the graph directly controls the frequency slider.

- **🚨 Multi-Modal Resonance Detection Event** — When the frequency reaches within ±1 Hz of f_r: a large animated banner slides in from the top of the screen displaying f_r, Z_min, I_max, and φ = 0°; a bell chime plays via Web Audio API; a pulsing 3D sphere glows in the phasor arena; all three component bodies on the workbench illuminate in emerald.

- **🤖 AI Lab Mentor with Real-Time Diagnostics** — A sidebar panel continuously narrates the circuit state: "Capacitive State — XC > XL, current leads by 34.2°" or "Resonance Lock Achieved! XL = XC = 188.5Ω". A chat interface answers physics questions about resonance, impedance, Q-factor, and phase relationships from a built-in knowledge base, with optional Gemini API upgrade.

- **🎮 Gamification System with Precision Scoring** — Three tuning challenges of increasing difficulty (Basic Resonance → High-Q Tuning → RF Match) require users to find f_r for specified L, C, R values. A precision score (0–100%) measures closeness to the theoretical peak. Badges, confetti, and a downloadable HTML lab report reward successful resonance capture.

- **👥 Multi-Tab Peer Observer Collaboration** — A BroadcastChannel API implementation lets a second user open the simulation in another browser tab and observe all circuit state changes in real-time — fulfilling the Peer Observation Mode requirement without requiring a backend server.

- **📡 CRT-Style Dual-Channel Oscilloscope** — A Canvas 2D oscilloscope with green phosphor aesthetics displays the source voltage wave and current wave simultaneously with neon glow effects, adjustable time/voltage/current divisions, and on-screen phase offset annotation.

- **📓 Virtual Lab Notebook with Export** — Users can log data points (frequency, I_rms, V_R, V_L, V_C, phase angle) into a sortable table. The recorded dataset exports as a formatted HTML document with parameter summary, data table, earned badges, and a theoretical conclusion — ready to submit as a lab report.

---

### Technical Architecture

ResoLab 3D is a **single-page application (SPA)** built entirely on client-side technologies — no backend, no server-side rendering, no network requests required for core functionality.

**State Management Architecture:**
All circuit parameters (R, L, C, frequency, V_rms) live as React `useState` in the root `App.tsx` component. On every parameter change, `calculateLCR()` in `physics.ts` derives all downstream metrics (X_L, X_C, Z, I_rms, φ, f_r, Q) synchronously. These derived metrics are passed down as props to all child components, ensuring a single source of truth. This avoids any desynchronization between the phasor, oscilloscope, plotter, and DMM displays.

**Rendering Pipeline:**
- **3D Phasor (Three.js):** Uses a `requestAnimationFrame` loop inside a React `useEffect`. Arrow Helpers are updated each frame with new lengths and directions derived from props. `ResizeObserver` handles canvas resizing. `OrbitControls` provides interactive camera.
- **Workbench (Canvas 2D):** A separate `requestAnimationFrame` loop renders the entire workbench each frame — components, wires, current particles, probes, and the DMM — using imperative Canvas 2D API calls. Mouse events are handled inside the same `useEffect` via `addEventListener` with canvas coordinate scaling.
- **Oscilloscope (Canvas 2D):** Uses `getInstantaneousValues()` from the physics engine, mapping the simulated time offset to `performance.now()`, so the waveform scrolls in real-time.
- **Plotter (Canvas 2D):** Statically re-renders on every prop change (not animated), computing 150 sample points across 10–2000 Hz using the same physics formulae.

**Audio Architecture:**
`audio.ts` wraps a `Web Audio API` `AudioContext` with a triangle-wave oscillator → Biquad filter → Gain node chain. The oscillator frequency maps logarithmically to the circuit frequency. Volume scales with current ratio (I / I_max). At resonance, the Biquad Q value spikes to create a bright, ringing quality. The resonance chime creates a separate dual-oscillator gain envelope with exponential decay.

**Peer Sync Architecture:**
Uses the browser's native `BroadcastChannel` API (same-origin, no server needed). Two channels run: one in `App.tsx` broadcasting all circuit parameters, one in `Gamification.tsx` broadcasting lab notebook data points. Both use the `isPeerMode` flag as a gate.

**Key Technical Decisions:**
1. **Canvas 2D for workbench, Three.js only for phasors** — Canvas 2D provides the fastest path to a rich, interactive lab bench without the overhead of managing a full 3D scene for 2D UI elements.
2. **Physics computed synchronously on every render** — avoids async state lag that would cause visible desynchronization between the phasor and oscilloscope.
3. **Resonance tolerance of ±1 Hz** — chosen to be detectable at the slider's 1 Hz step resolution while being tight enough to require deliberate tuning.
4. **BroadcastChannel for peer sync** — zero-backend solution that works in any modern browser without WebSocket infrastructure.

---

### Tech Stack

| Category | Technology |
|---|---|
| **Framework** | React 18.2 |
| **Build Tool** | Vite 6.x |
| **Language** | TypeScript 5.9 |
| **3D Rendering** | Three.js r177 + OrbitControls |
| **Styling** | TailwindCSS v4 (via `@tailwindcss/vite`) |
| **2D Rendering** | Canvas 2D API (native browser) |
| **Audio** | Web Audio API (native browser) |
| **Peer Sync** | BroadcastChannel API (native browser) |
| **Icons** | Lucide React |
| **Celebration** | canvas-confetti |
| **AI (optional)** | Google Gemini 1.5 Flash API |
| **Hosting** | Static — deployable to GitHub Pages / Vercel / Netlify |

---

### Innovation / Uniqueness

**1. Multi-Sensory Resonance Event**
Most LCR simulations show a graph and a number. ResoLab 3D triggers resonance detection across five simultaneous modalities: a sliding visual banner, an audio bell chime, a 3D animated sphere, glowing component bodies, and a live-updating metrics display. This multi-modal approach is designed to create a *memorable* learning moment rather than a subtle data readout.

**2. True 3D Rotating Phasor with Time-Axis Helix**
The phasor diagram goes beyond the typical 2D circle diagram. By rendering the voltage resultant V_S as a helix propagating along the Z-axis (time axis), the simulation makes the connection between the rotating phasor and the sinusoidal waveform spatially explicit — a visualization technique rarely seen in educational LCR tools.

**3. Physics-Driven Audio Synthesis**
The Web Audio API synthesizer doesn't just play a sound effect — it continuously maps circuit state to audio parameters. The hum changes pitch logarithmically with frequency, brightens as current increases, and sharpens its resonance quality (filter Q) at resonance. This means a student can *hear* when they're approaching resonance before they can read the numbers.

**4. Component Inventory Tray with Procedural Placement**
Rather than a pre-wired circuit the user simply plays with, ResoLab 3D requires the student to drag each component from a tray onto the breadboard and connect them manually. This procedural workflow reinforces the circuit assembly process described in the problem statement's user journey, making the simulation a genuine laboratory procedure rather than a passive demonstration.

**5. In-Canvas Double-Click Value Editing**
Users can double-click directly on the Resistor, Inductor, or Capacitor bodies drawn on the canvas to open an inline value editor. This provides a direct connection between the visual component and its physical value — more intuitive than a detached sidebar slider.

**6. AI Lab Mentor with Contextual Physics Diagnostics**
The AI mentor panel continuously computes and narrates the circuit state in plain English: "The circuit is in a capacitive state at 120 Hz. XC (60.3 Ω) is greater than XL (9.4 Ω), so current leads the voltage by -34.2°." This real-time contextual commentary is something no static simulation can provide and significantly accelerates conceptual understanding.

---

### Demo Instructions

**The simulation runs entirely in the browser — no installation required for judges using the live link.**

**Live Demo:** *(URL auto-pulled from linked CreatorEngine project)*

**To run locally:**
```bash
git clone https://github.com/your-username/Resolab_3D.git
cd Resolab_3D
npm install
npm run dev
# Open http://localhost:3000
```

**Quick 90-Second Judge Walkthrough:**

1. **On load** — dismiss the welcome tutorial modal by clicking "Enter Virtual Lab"
2. **Place components** — click all 4 buttons in the **Inventory Tray** ("Place All" for speed), or drag each one to the board
3. **Wire the circuit** — click **"Auto-Wire Loop"** button to connect R → L → C in series instantly
4. **Power on** — click the green **"Power On"** button (it activates once the loop is closed). Watch cyan particles flow through the wires.
5. **Observe the phasor** — the left-panel **3D Phasor Arena** shows rotating V_R, V_L, V_C vectors. Drag to orbit.
6. **Find resonance** — drag the **Frequency slider** upward, or click anywhere on the **Resonance Curve Plotter** (right side, bottom row). Watch the **"⚡ RESONANCE DETECTED"** banner fire at the peak.
7. **Probe voltage drops** — drag the **red/black multimeter probes** onto component terminals (the nodes on the breadboard) to read V_R, V_L, V_C
8. **Log data** — click **"Log Data"** in the lab notebook panel at any frequency, then click **"Report"** to download the HTML lab report
9. **Bonus** — open a second browser tab to the same URL, enable **"Observer Sync"** in both, and adjust the slider in Tab 1 — Tab 2 mirrors it live

---

### Known Limitations

- **Peer sync is same-machine only** — The BroadcastChannel API works between tabs/windows on the same browser and device. It does not work across different physical machines or networks. A true networked peer mode would require a WebSocket server or WebRTC.
- **Frequency range is 10 Hz – 2 kHz** — This covers the most pedagogically relevant range for typical component values (L: 10–500 mH, C: 1–100 μF). Very high-frequency RF circuits (MHz range) are outside scope.
- **No component tolerance simulation** — Real components have manufacturing tolerances (e.g., ±5% on capacitors). The simulation uses exact specified values, which is appropriate for a learning tool but diverges from real lab conditions.
- **2D workbench canvas** — The interactive lab bench (wiring, DMM probes, components) is rendered in Canvas 2D rather than a true 3D scene. This was a deliberate performance choice but means the bench does not have a 3D perspective view.
- **Vrms slider range** — Source voltage is adjustable from 1–10 V. Very high-voltage or very low-voltage scenarios outside this range are not modeled.
- **Audio requires user interaction** — Due to browser autoplay policies, the Web Audio synthesizer only activates after the user first clicks on the page (handled by the tutorial modal dismiss button).
- **No component damage simulation** — Applying very high voltages or currents in a real circuit risks component failure. The simulation does not model component burn-out or non-linear behavior.

---

### Future Work

- **True 3D workbench in Three.js** — Replace the Canvas 2D lab bench with a full Three.js 3D scene featuring perspective-rendered component models (a coil, a cylindrical capacitor, a resistor with color bands) on a 3D breadboard with isometric camera controls.
- **Networked peer collaboration** — Implement a lightweight WebSocket server (or use a service like Liveblocks / Ably) to enable cross-device, cross-network peer observation — supporting genuine classroom collaboration across student devices.
- **Parallel RLC circuit mode** — Extend the physics engine to support parallel resonance configurations, where the behavior inverts (impedance peaks at resonance instead of current peaking).
- **Bandwidth and selectivity visualization** — Overlay the half-power points (f_1 and f_2 at I_max/√2) on the resonance curve, and display the bandwidth BW = f_r/Q — connecting the simulation to practical filter design concepts.
- **Component tolerance sliders** — Allow users to add ±% uncertainty to each component, showing a spread on the resonance curve to model real-world measurement uncertainty.
- **Export to SPICE netlist** — Let users download the current circuit configuration as a standard SPICE netlist so they can import it into LTspice or KiCad for further simulation.
- **Mobile touch support** — Optimize the wiring tool and probe dragging for touchscreen devices to make the lab accessible on tablets used in classroom settings.
- **Guided assessment mode** — Add a formal quiz mode where the system sets an unknown f_r and grades students on how precisely they identify it, integrating with LMS gradebook APIs.
