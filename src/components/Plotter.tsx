import { useRef, useEffect } from 'react';
import type { CircuitState, CalculatedMetrics } from '../utils/physics';

interface PlotterProps {
  circuitState: CircuitState;
  metrics: CalculatedMetrics;
  onFrequencyChange: (f: number) => void;
}

export const Plotter: React.FC<PlotterProps> = ({
  circuitState,
  metrics,
  onFrequencyChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Math equations for generating the curve on the fly
  const getIforF = (f: number) => {
    const { R, L, C, Vrms } = circuitState;
    if (f <= 0) return 0;
    const w = 2 * Math.PI * f;
    const XL = w * L;
    const XC = C > 0 ? 1 / (w * C) : Infinity;
    const Z = Math.sqrt(R * R + (XL - XC) * (XL - XC));
    return Z > 0 ? Vrms / Z : 0;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    
    // Margins for axes
    const margin = { top: 20, right: 20, bottom: 35, left: 45 };
    const graphWidth = width - margin.left - margin.right;
    const graphHeight = height - margin.top - margin.bottom;

    // Clear background
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.fillRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.2)'; // slate-600
    ctx.lineWidth = 1;

    const xMin = 10;
    const xMax = 2000;
    // Map log/linear scale. Standard linear scale fits this easily:
    const getXPixel = (f: number) => {
      const ratio = (f - xMin) / (xMax - xMin);
      return margin.left + ratio * graphWidth;
    };

    // Calculate Y scale based on max current I_max = Vrms / R
    const iMax = circuitState.Vrms / circuitState.R;
    const yMax = iMax * 1.15; // Give 15% headroom
    const getYPixel = (i: number) => {
      const ratio = i / yMax;
      return margin.top + graphHeight - ratio * graphHeight;
    };

    // Draw grid horizontal
    const numTicksY = 5;
    for (let i = 0; i <= numTicksY; i++) {
      const val = (yMax / numTicksY) * i;
      const y = getYPixel(val);
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(width - margin.right, y);
      ctx.stroke();

      // Label Y
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(val.toFixed(2) + ' A', margin.left - 8, y + 3);
    }

    // Draw grid vertical
    const numTicksX = 8;
    for (let i = 0; i <= numTicksX; i++) {
      const val = xMin + ((xMax - xMin) / numTicksX) * i;
      const x = getXPixel(val);
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, margin.top + graphHeight);
      ctx.stroke();

      // Label X
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(Math.round(val) + 'Hz', x, margin.top + graphHeight + 16);
    }

    // Generate resonance curve points
    const points: { x: number; y: number }[] = [];
    const step = (xMax - xMin) / 150;
    for (let f = xMin; f <= xMax; f += step) {
      const current = getIforF(f);
      points.push({ x: getXPixel(f), y: getYPixel(current) });
    }

    // Draw gradient area under the curve
    const areaGrd = ctx.createLinearGradient(0, margin.top, 0, margin.top + graphHeight);
    areaGrd.addColorStop(0, 'rgba(99, 102, 241, 0.4)');  // indigo-500
    areaGrd.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

    ctx.fillStyle = areaGrd;
    ctx.beginPath();
    ctx.moveTo(getXPixel(xMin), getYPixel(0));
    points.forEach((pt) => ctx.lineTo(pt.x, pt.y));
    ctx.lineTo(getXPixel(xMax), getYPixel(0));
    ctx.closePath();
    ctx.fill();

    // Draw resonance curve line
    ctx.strokeStyle = '#6366f1'; // indigo-500
    ctx.lineWidth = 3;
    ctx.beginPath();
    points.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();

    // Draw peak resonance frequency vertical line
    const fr = metrics.f_r;
    if (fr >= xMin && fr <= xMax) {
      const frX = getXPixel(fr);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)'; // red-500
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(frX, margin.top);
      ctx.lineTo(frX, margin.top + graphHeight);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label f_r
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`f_r = ${fr.toFixed(1)}Hz`, frX, margin.top - 5);
    }

    // Draw current operating point
    const currentX = getXPixel(circuitState.frequency);
    const currentI = metrics.Irms;
    const currentY = getYPixel(currentI);

    if (currentX >= margin.left && currentX <= width - margin.right) {
      // Glow rings around the point
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#10b981'; // emerald-500
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(currentX, currentY, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.shadowBlur = 0; // reset

      // White center dot
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(currentX, currentY, 3, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Draw X and Y axis borders
    ctx.strokeStyle = '#475569'; // slate-600
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + graphHeight);
    ctx.lineTo(width - margin.right, margin.top + graphHeight);
    ctx.stroke();

  }, [circuitState, metrics]);

  // Click on plot to change frequency
  const handleCanvasInteraction = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    
    // Margins mapping
    const margin = { left: 45, right: 20 };
    const graphWidth = canvas.width - margin.left - margin.right;
    
    if (clickX >= margin.left && clickX <= canvas.width - margin.right) {
      // Convert pixelX to frequency
      const xMin = 10;
      const xMax = 2000;
      const ratio = (clickX - margin.left) / graphWidth;
      const rawF = xMin + ratio * (xMax - xMin);
      
      // Clamp values
      const targetF = Math.max(10, Math.min(2000, Math.round(rawF)));
      onFrequencyChange(targetF);
    }
  };

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-700/80 rounded-xl p-4 shadow-2xl h-full backdrop-blur-md">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-md font-semibold text-slate-100 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
          Resonance Curve Plotter
        </h3>
        <div className="text-[11px] text-slate-400 font-mono">
          Click graph to sweep frequency
        </div>
      </div>

      <div className="relative flex-grow min-h-[220px] rounded-lg overflow-hidden border border-slate-800 shadow-inner">
        <canvas
          ref={canvasRef}
          width={480}
          height={260}
          className="w-full h-full block cursor-pointer"
          onClick={handleCanvasInteraction}
          onMouseMove={(e) => {
            // Sweep frequency on mouse drag (left click held down)
            if (e.buttons === 1) {
              handleCanvasInteraction(e);
            }
          }}
        />
      </div>

      {/* Stats display */}
      <div className="grid grid-cols-2 gap-4 mt-4 pt-3 border-t border-slate-800 text-xs">
        <div className="flex justify-between items-center text-slate-300">
          <span>Peak Resonance:</span>
          <span className="font-mono text-emerald-400 font-semibold">
            {metrics.f_r.toFixed(1)} Hz
          </span>
        </div>
        <div className="flex justify-between items-center text-slate-300">
          <span>Peak Current (I_max):</span>
          <span className="font-mono text-indigo-400 font-semibold">
            {(circuitState.Vrms / circuitState.R).toFixed(2)} A
          </span>
        </div>
      </div>
    </div>
  );
};
export default Plotter;
