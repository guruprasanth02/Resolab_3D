import { useState, useEffect } from 'react';
import { Sparkles, Sliders, Volume2, VolumeX, BookOpen, Info, HelpCircle } from 'lucide-react';
import { calculateLCR } from './utils/physics';
import type { CircuitState } from './utils/physics';
import { audioEngine } from './utils/audio';
import LabBench3D from './components/LabBench3D';
import Phasor3D from './components/Phasor3D';
import Oscilloscope from './components/Oscilloscope';
import Plotter from './components/Plotter';
import AIMentor from './components/AIMentor';
import Gamification from './components/Gamification';

export default function App() {
  // LCR State Variables
  const [R, setR] = useState(50); // ohms (10 - 200)
  const [L, setL] = useState(0.1); // Henrys (0.01 - 0.5) (10mH to 500mH)
  const [C, setC] = useState(0.000022); // Farads (0.000001 - 0.0001) (1uF to 100uF)
  const [frequency, setFrequency] = useState(120); // Hz (10 - 2000)
  const [Vrms, setVrms] = useState(5.0); // V RMS (1 - 10)

  // Simulation controls
  const [isPowerOn, setIsPowerOn] = useState(false);
  const [isLoopClosed, setIsLoopClosed] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // Digital Multimeter measured value and label
  const [dmmVoltage, setDmmVoltage] = useState(0.0);
  const [dmmLabel, setDmmLabel] = useState('DMM INACTIVE');

  // Peer Synchronization Mode
  const [isPeerMode, setIsPeerMode] = useState(false);

  // Show Tutorial overlay
  const [showTutorial, setShowTutorial] = useState(true);

  // Combine state for calculations
  const circuitState: CircuitState = { R, L, C, frequency, Vrms };
  const metrics = calculateLCR(circuitState);

  // Initialize and update Audio Hum Synth
  useEffect(() => {
    if (isPowerOn && !isMuted) {
      audioEngine.start();
      
      // Calculate max current at resonance: I_max = V_rms / R
      const maxIrms = Vrms / R;
      audioEngine.update(frequency, metrics.Irms, maxIrms, metrics.isResonant);
    } else {
      audioEngine.stop();
    }
  }, [isPowerOn, isMuted, frequency, metrics.Irms, Vrms, R, metrics.isResonant]);

  // Audio Toggle
  const handleToggleMute = () => {
    const nextMuted = audioEngine.toggleMute();
    setIsMuted(nextMuted);
    
    // Start audio engine if power on and unmuting
    if (isPowerOn && !nextMuted) {
      audioEngine.start();
      const maxIrms = Vrms / R;
      audioEngine.update(frequency, metrics.Irms, maxIrms, metrics.isResonant);
    }
  };

  // Select Challenge Setup
  const handleSelectChallenge = (newL: number, newC: number, newR: number) => {
    setL(newL);
    setC(newC);
    setR(newR);
    setFrequency(10); // reset to low end so they have to sweep
    setIsPowerOn(false);
  };

  // Peer Sync - Broadcast channel listener
  useEffect(() => {
    const channel = new BroadcastChannel('resolab-sync');

    channel.onmessage = (event) => {
      if (isPeerMode && event.data.type === 'SYNC_STATE') {
        const { R: pR, L: pL, C: pC, frequency: pF, Vrms: pV, isPowerOn: pPower } = event.data.payload;
        setR(pR);
        setL(pL);
        setC(pC);
        setFrequency(pF);
        setVrms(pV);
        setIsPowerOn(pPower);
      }
    };

    return () => {
      channel.close();
    };
  }, [isPeerMode]);

  // Peer Sync - Broadcast state changes
  useEffect(() => {
    if (!isPeerMode) return;
    const channel = new BroadcastChannel('resolab-sync');
    channel.postMessage({
      type: 'SYNC_STATE',
      payload: { R, L, C, frequency, Vrms, isPowerOn },
    });
    return () => {
      channel.close();
    };
  }, [R, L, C, frequency, Vrms, isPowerOn, isPeerMode]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* Header Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-white via-indigo-200 to-fuchsia-300 bg-clip-text text-transparent">
              ResoLab 3D
            </h1>
            <p className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase">
              Immersive LCR Physics Simulation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Loop Connection status */}
          <div className="flex items-center gap-2 text-xs bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-850">
            <span className="text-slate-400">Circuit Loop:</span>
            <span className={`flex items-center gap-1.5 font-bold ${isLoopClosed ? 'text-emerald-400' : 'text-amber-500'}`}>
              <span className={`w-2 h-2 rounded-full ${isLoopClosed ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
              {isLoopClosed ? 'CONNECTED' : 'OPEN'}
            </span>
          </div>

          {/* Sound Synthesizer Controls */}
          <button
            onClick={handleToggleMute}
            className={`p-2 rounded-lg border transition ${
              isMuted
                ? 'bg-slate-800 border-slate-750 text-slate-400 hover:text-slate-200'
                : 'bg-emerald-950/80 border-emerald-800 text-emerald-400'
            }`}
            title={isMuted ? 'Unmute Audio hum' : 'Mute Audio hum'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setShowTutorial(true)}
            className="p-2 rounded-lg bg-slate-800 border border-slate-750 text-slate-400 hover:text-slate-200 transition"
            title="Show Tutorial Overlay"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Workbench Grid Dashboard */}
      <main className="flex-grow p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 max-w-[1600px] w-full mx-auto">
        {/* Left Column: Parameter controls + Rotating Phasor */}
        <section className="lg:col-span-4 flex flex-col gap-5">
          {/* Component Parameter Sliders */}
          <article className="bg-slate-900 border border-slate-700/80 rounded-xl p-4 shadow-2xl backdrop-blur-md">
            <h3 className="text-md font-semibold text-slate-100 flex items-center gap-2 border-b border-slate-850 pb-2 mb-3">
              <Sliders className="w-5 h-5 text-indigo-400" />
              Circuit Component Controls
            </h3>

            <div className="space-y-4">
              {/* Frequency slider */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400 font-medium">Source Frequency (f)</span>
                  <span className="font-mono text-indigo-400 font-semibold">{frequency} Hz</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="2000"
                  value={frequency}
                  onChange={(e) => setFrequency(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-0.5">
                  <span>10 Hz</span>
                  <span>1 kHz</span>
                  <span>2 kHz</span>
                </div>
              </div>

              {/* Resistor (R) */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400 font-medium">Resistance (R)</span>
                  <span className="font-mono text-cyan-400 font-semibold">{R} Ω</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="200"
                  value={R}
                  onChange={(e) => setR(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>

              {/* Inductance (L) */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400 font-medium">Inductance (L)</span>
                  <span className="font-mono text-violet-450 text-violet-400 font-semibold">
                    {(L * 1000).toFixed(1)} mH
                  </span>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="0.5"
                  step="0.01"
                  value={L}
                  onChange={(e) => setL(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
                />
              </div>

              {/* Capacitance (C) */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400 font-medium">Capacitance (C)</span>
                  <span className="font-mono text-yellow-500 font-semibold">
                    {(C * 1000000).toFixed(1)} μF
                  </span>
                </div>
                <input
                  type="range"
                  min="0.000001"
                  max="0.0001"
                  step="0.000001"
                  value={C}
                  onChange={(e) => setC(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                />
              </div>
            </div>
          </article>

          {/* rotating 3D phasor */}
          <article className="flex-grow">
            <Phasor3D
              circuitState={circuitState}
              metrics={metrics}
              isPowerOn={isPowerOn}
            />
          </article>
        </section>

        {/* Right Column: LabBench3D (wide top) + Oscilloscope / Plotter (row grid) + Gamification / AIMentor */}
        <section className="lg:col-span-8 flex flex-col gap-5">
          {/* 3D Workbench */}
          <article>
            <LabBench3D
              circuitState={circuitState}
              metrics={metrics}
              isPowerOn={isPowerOn}
              setIsPowerOn={setIsPowerOn}
              isLoopClosed={isLoopClosed}
              setIsLoopClosed={setIsLoopClosed}
              onStateChange={(diff) => {
                if (diff.R !== undefined) setR(diff.R);
                if (diff.L !== undefined) setL(diff.L);
                if (diff.C !== undefined) setC(diff.C);
                if (diff.frequency !== undefined) setFrequency(diff.frequency);
              }}
              dmmVoltage={dmmVoltage}
              setDmmVoltage={setDmmVoltage}
              dmmLabel={dmmLabel}
              setDmmLabel={setDmmLabel}
            />
          </article>

          {/* Oscilloscope and Plotter */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <article>
              <Oscilloscope
                circuitState={circuitState}
                metrics={metrics}
                isPowerOn={isPowerOn}
              />
            </article>
            <article>
              <Plotter
                circuitState={circuitState}
                metrics={metrics}
                onFrequencyChange={(f) => setFrequency(f)}
              />
            </article>
          </div>

          {/* AI Mentor and Gamification details */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <article className="xl:col-span-2">
              <Gamification
                circuitState={circuitState}
                metrics={metrics}
                isPowerOn={isPowerOn}
                isLoopClosed={isLoopClosed}
                onSelectChallenge={handleSelectChallenge}
                isPeerMode={isPeerMode}
                setIsPeerMode={setIsPeerMode}
              />
            </article>
            <article className="xl:col-span-1">
              <AIMentor
                circuitState={circuitState}
                metrics={metrics}
                isPowerOn={isPowerOn}
                isLoopClosed={isLoopClosed}
              />
            </article>
          </div>
        </section>
      </main>

      {/* Floating Tutorial Overlay Modal */}
      {showTutorial && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-lg font-bold text-slate-100">Welcome to ResoLab 3D!</h2>
            </div>
            
            <div className="text-xs text-slate-350 space-y-3 leading-relaxed">
              <p>This virtual laboratory models a series <strong>LCR Circuit</strong> (Resistor, Inductor, Capacitor). You will explore how changing the frequency of the AC source changes the impedance, current amplitude, and phase relationships of the system.</p>
              
              <div className="border-y border-slate-800 py-3 space-y-2">
                <div className="flex gap-2">
                  <span className="text-indigo-400 font-bold font-mono">STEP 1:</span>
                  <span>Connect the circuit! Click <strong>"Auto-Wire Loop"</strong> on the workbench to close the series path, or drag wires manually between nodes.</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-indigo-400 font-bold font-mono">STEP 2:</span>
                  <span>Turn <strong>"Power On"</strong>. You'll see current flow particles begin to animate through the wires.</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-indigo-400 font-bold font-mono">STEP 3:</span>
                  <span>Drag the <strong>Frequency slider</strong> or click the <strong>Plotter curve</strong> to search for the resonant frequency. Observe the 3D Phasor vectors align at resonance.</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-indigo-400 font-bold font-mono">STEP 4:</span>
                  <span>Drag the <strong>Multimeter Probes</strong> onto the resistor, inductor, or capacitor sockets to measure their respective RMS voltages drops.</span>
                </div>
              </div>
              
              <p className="text-[11px] text-indigo-400/80 bg-indigo-950/20 border border-indigo-900/50 p-2.5 rounded-lg flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span><strong>Multi-Tab Collaboration:</strong> Turn on <strong>"Observer Sync"</strong> in two different browser tabs to mirror adjustments in real-time, matching standard Peer Observation lab standards!</span>
              </p>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => {
                  setShowTutorial(false);
                  // Trigger browser AudioContext initialization safely
                  audioEngine.start();
                  audioEngine.stop();
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-5 rounded-lg transition shadow-lg shadow-indigo-600/20"
              >
                Enter Virtual Lab
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
