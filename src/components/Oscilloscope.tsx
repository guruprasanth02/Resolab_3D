import React, { useRef, useEffect, useState } from 'react';
import { getInstantaneousValues } from '../utils/physics';
import type { CircuitState, CalculatedMetrics } from '../utils/physics';

interface OscilloscopeProps {
  circuitState: CircuitState;
  metrics: CalculatedMetrics;
  isPowerOn: boolean;
}

export const Oscilloscope: React.FC<OscilloscopeProps> = ({
  circuitState,
  metrics,
  isPowerOn,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Oscilloscope parameters
  const [timeDiv, setTimeDiv] = useState(0.5); // ms per division (0.1 to 5)
  const [voltDiv, setVoltDiv] = useState(5);   // Volts per division (1 to 20)
  const [currDiv, setCurrDiv] = useState(0.5); // Amps per division (0.1 to 2)
  const [showCurrent, setShowCurrent] = useState(true);
  const [showVoltage, setShowVoltage] = useState(true);

  // Animation frame loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let startTime = performance.now();

    const draw = (now: number) => {
      const elapsed = (now - startTime) / 1000.0; // Time in seconds
      
      const width = canvas.width;
      const height = canvas.height;

      // Clear with CRT-style dark green backdrop
      ctx.fillStyle = '#07160d';
      ctx.fillRect(0, 0, width, height);

      // Draw oscilloscope grid lines
      ctx.strokeStyle = 'rgba(16, 75, 41, 0.4)';
      ctx.lineWidth = 1;
      
      const numGridX = 10;
      const numGridY = 8;
      const cellWidth = width / numGridX;
      const cellHeight = height / numGridY;

      // Vertical grid lines
      for (let i = 1; i < numGridX; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cellWidth, 0);
        ctx.lineTo(i * cellWidth, height);
        ctx.stroke();
      }

      // Horizontal grid lines
      for (let j = 1; j < numGridY; j++) {
        ctx.beginPath();
        ctx.moveTo(0, j * cellHeight);
        ctx.lineTo(width, j * cellHeight);
        ctx.stroke();
      }

      // Axis lines (thick center lines)
      ctx.strokeStyle = 'rgba(30, 115, 65, 0.7)';
      ctx.lineWidth = 1.5;
      
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Tick marks on axes
      ctx.fillStyle = 'rgba(40, 150, 85, 0.6)';
      const tickSize = 4;
      for (let x = 0; x < width; x += cellWidth / 5) {
        ctx.fillRect(x, height / 2 - tickSize / 2, 1, tickSize);
      }
      for (let y = 0; y < height; y += cellHeight / 5) {
        ctx.fillRect(width / 2 - tickSize / 2, y, tickSize, 1);
      }

      if (isPowerOn) {
        // Draw the waves
        // The display width represents a total time range:
        // Total time in seconds = numGridX * (timeDiv / 1000)
        const totalTime = numGridX * (timeDiv / 1000);
        
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 8;

        const points: { x: number; vs: number; current: number }[] = [];
        
        for (let x = 0; x < width; x++) {
          // Map x pixel to time t
          const t_offset = (x / width) * totalTime;
          const t = elapsed + t_offset;
          
          const vals = getInstantaneousValues(circuitState, metrics, t);
          points.push({ x, vs: vals.v_s, current: vals.current });
        }

        // Draw Source Voltage Wave (Neon Cyan)
        if (showVoltage) {
          ctx.strokeStyle = '#00f3ff';
          ctx.shadowColor = '#00f3ff';
          ctx.beginPath();
          points.forEach((pt, idx) => {
            // Map voltage to Y pixel: centered, scaled by voltDiv
            // Y = Center - (Volts * cellHeight / voltDiv)
            const y = height / 2 - (pt.vs * cellHeight) / voltDiv;
            if (idx === 0) ctx.moveTo(pt.x, y);
            else ctx.lineTo(pt.x, y);
          });
          ctx.stroke();
        }

        // Draw Current Wave (Neon Orange)
        if (showCurrent) {
          ctx.strokeStyle = '#ff9d00';
          ctx.shadowColor = '#ff9d00';
          ctx.beginPath();
          points.forEach((pt, idx) => {
            // Map current to Y pixel: scaled by currDiv
            const y = height / 2 - (pt.current * cellHeight) / currDiv;
            if (idx === 0) ctx.moveTo(pt.x, y);
            else ctx.lineTo(pt.x, y);
          });
          ctx.stroke();
        }

        // Reset shadow
        ctx.shadowBlur = 0;

        // Display current phase indicator text
        ctx.fillStyle = '#10b981';
        ctx.font = '11px Courier New';
        const phiDeg = metrics.phaseAngleDeg;
        let phaseText = '';
        if (Math.abs(phiDeg) < 0.1) {
          phaseText = 'IN PHASE (Resonance)';
        } else if (phiDeg > 0) {
          phaseText = `LEADS BY ${phiDeg.toFixed(1)}° (Inductive)`;
        } else {
          phaseText = `LAGS BY ${Math.abs(phiDeg).toFixed(1)}° (Capacitive)`;
        }
        ctx.fillText(`PHASE: ${phaseText}`, 15, 25);
        ctx.fillText(`F: ${circuitState.frequency.toFixed(1)}Hz`, 15, 42);
        ctx.fillText(`I_rms: ${metrics.Irms.toFixed(2)}A`, 15, 59);
      } else {
        // Flatline
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#1e7341';
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(34, 197, 94, 0.4)';
        ctx.font = '14px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('NO POWER', width / 2, height / 2 - 15);
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    animationFrameId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [circuitState, metrics, isPowerOn, timeDiv, voltDiv, currDiv, showCurrent, showVoltage]);

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-700/80 rounded-xl p-4 shadow-2xl h-full backdrop-blur-md">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-md font-semibold text-slate-100 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Interactive Digital Oscilloscope
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowVoltage(!showVoltage)}
            className={`px-2 py-0.5 text-xs font-semibold rounded border ${
              showVoltage
                ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-400'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            Ch A (V_s)
          </button>
          <button
            onClick={() => setShowCurrent(!showCurrent)}
            className={`px-2 py-0.5 text-xs font-semibold rounded border ${
              showCurrent
                ? 'bg-amber-950/80 border-amber-500/50 text-amber-400'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            Ch B (I)
          </button>
        </div>
      </div>

      {/* Screen */}
      <div className="relative flex-grow min-h-[220px] rounded-lg overflow-hidden border border-emerald-950/50 shadow-inner">
        <canvas
          ref={canvasRef}
          width={480}
          height={260}
          className="w-full h-full block"
        />
        {/* Glow bezel */}
        <div className="absolute inset-0 pointer-events-none border border-emerald-500/10 shadow-[inset_0_0_20px_rgba(16,185,129,0.15)]"></div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-800">
        <div>
          <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
            Time / Div
          </label>
          <select
            value={timeDiv}
            onChange={(e) => setTimeDiv(parseFloat(e.target.value))}
            className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-emerald-500 font-mono"
          >
            <option value="0.1">0.1 ms</option>
            <option value="0.2">0.2 ms</option>
            <option value="0.5">0.5 ms</option>
            <option value="1.0">1.0 ms</option>
            <option value="2.0">2.0 ms</option>
            <option value="5.0">5.0 ms</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
            Volts / Div
          </label>
          <select
            value={voltDiv}
            onChange={(e) => setVoltDiv(parseFloat(e.target.value))}
            className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-emerald-500 font-mono"
          >
            <option value="1">1.0 V</option>
            <option value="2">2.0 V</option>
            <option value="5">5.0 V</option>
            <option value="10">10 V</option>
            <option value="20">20 V</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
            Amps / Div
          </label>
          <select
            value={currDiv}
            onChange={(e) => setCurrDiv(parseFloat(e.target.value))}
            className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-emerald-500 font-mono"
          >
            <option value="0.1">0.1 A</option>
            <option value="0.2">0.2 A</option>
            <option value="0.5">0.5 A</option>
            <option value="1.0">1.0 A</option>
            <option value="2.0">2.0 A</option>
          </select>
        </div>
      </div>
    </div>
  );
};
export default Oscilloscope;
