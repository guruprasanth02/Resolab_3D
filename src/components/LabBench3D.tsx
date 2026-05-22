import React, { useRef, useEffect, useState } from 'react';
import { Power, Settings, RotateCcw } from 'lucide-react';
import type { CircuitState, CalculatedMetrics } from '../utils/physics';

interface LabBench3DProps {
  circuitState: CircuitState;
  metrics: CalculatedMetrics;
  isPowerOn: boolean;
  setIsPowerOn: (on: boolean) => void;
  isLoopClosed: boolean;
  setIsLoopClosed: (closed: boolean) => void;
  onStateChange: (state: Partial<CircuitState>) => void;
  // DMM voltage selection state
  dmmVoltage: number;
  setDmmVoltage: (v: number) => void;
  dmmLabel: string;
  setDmmLabel: (l: string) => void;
}

interface TermNode {
  id: string;
  name: string;
  x: number;
  y: number;
}

export const LabBench3D: React.FC<LabBench3DProps> = ({
  circuitState,
  metrics,
  isPowerOn,
  setIsPowerOn,
  isLoopClosed,
  setIsLoopClosed,
  // Removed unused onStateChange to fix TS lint error
  dmmVoltage,
  setDmmVoltage,
  dmmLabel,
  setDmmLabel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Terminals positions on the workbench
  // Sized for an 800x420 canvas
  const terminals: TermNode[] = [
    { id: 'gen_pos', name: 'Generator (+)', x: 140, y: 155 },
    { id: 'res_in', name: 'Resistor IN', x: 260, y: 200 },
    { id: 'res_out', name: 'Resistor OUT', x: 380, y: 200 },
    { id: 'ind_in', name: 'Inductor IN', x: 420, y: 200 },
    { id: 'ind_out', name: 'Inductor OUT', x: 540, y: 200 },
    { id: 'cap_in', name: 'Capacitor IN', x: 580, y: 200 },
    { id: 'cap_out', name: 'Capacitor OUT', x: 700, y: 200 },
    { id: 'gen_neg', name: 'Generator (-)', x: 140, y: 235 },
  ];

  // Wiring connections
  // Represented as pairs of terminal IDs
  const [wires, setWires] = useState<[string, string][]>([]);
  const [activeWireStart, setActiveWireStart] = useState<string | null>(null);

  // Multimeter probes positions
  // By default, they sit on the multimeter body
  const [redProbePos, setRedProbePos] = useState<{ x: number; y: number }>({ x: 320, y: 350 });
  const [blackProbePos, setBlackProbePos] = useState<{ x: number; y: number }>({ x: 480, y: 350 });

  const [draggingProbe, setDraggingProbe] = useState<'red' | 'black' | null>(null);
  
  // Terminal attachment tracking
  const [redAttachedTo, setRedAttachedTo] = useState<string | null>(null);
  const [blackAttachedTo, setBlackAttachedTo] = useState<string | null>(null);

  // Mouse hover state
  const [hoveredTerm, setHoveredTerm] = useState<string | null>(null);

  // Check if series LCR loop is closed
  useEffect(() => {
    // Standard closed loop connection pattern for series LCR:
    // gen_pos -> res_in
    // res_out -> ind_in
    // ind_out -> cap_in
    // cap_out -> gen_neg
    const hasConnection = (t1: string, t2: string) => {
      return wires.some(
        ([w1, w2]) => 
          (w1 === t1 && w2 === t2) || (w1 === t2 && w2 === w1) ||
          (w1 === t1 && w2 === t2) || (w2 === t1 && w1 === t2)
      );
    };

    const c1 = hasConnection('gen_pos', 'res_in');
    const c2 = hasConnection('res_out', 'ind_in');
    const c3 = hasConnection('ind_out', 'cap_in');
    const c4 = hasConnection('cap_out', 'gen_neg');

    const closed = c1 && c2 && c3 && c4;
    setIsLoopClosed(closed);
    if (!closed) {
      setIsPowerOn(false);
    }
  }, [wires, setIsLoopClosed, setIsPowerOn]);

  // Handle probe measurement calculations
  useEffect(() => {
    if (!isPowerOn || !isLoopClosed) {
      setDmmVoltage(0.00);
      setDmmLabel('OPEN LOOP');
      return;
    }

    // Determine what components are between the probes
    const sortedProbes = [redAttachedTo, blackAttachedTo].sort();
    
    // Resistor
    if (sortedProbes[0] === 'res_in' && sortedProbes[1] === 'res_out') {
      setDmmVoltage(metrics.VR_rms);
      setDmmLabel('V_R (RESISTOR)');
    }
    // Inductor
    else if (sortedProbes[0] === 'ind_in' && sortedProbes[1] === 'ind_out') {
      setDmmVoltage(metrics.VL_rms);
      setDmmLabel('V_L (INDUCTOR)');
    }
    // Capacitor
    else if (sortedProbes[0] === 'cap_in' && sortedProbes[1] === 'cap_out') {
      setDmmVoltage(metrics.VC_rms);
      setDmmLabel('V_C (CAPACITOR)');
    }
    // Entire Source generator
    else if (
      (redAttachedTo === 'gen_pos' && blackAttachedTo === 'gen_neg') ||
      (redAttachedTo === 'gen_neg' && blackAttachedTo === 'gen_pos')
    ) {
      setDmmVoltage(circuitState.Vrms);
      setDmmLabel('V_S (SOURCE)');
    }
    // Across Inductor + Capacitor (reactance cancel test)
    else if (
      (redAttachedTo === 'res_out' && blackAttachedTo === 'cap_out') ||
      (redAttachedTo === 'cap_out' && blackAttachedTo === 'res_out') ||
      (redAttachedTo === 'ind_in' && blackAttachedTo === 'cap_out') ||
      (redAttachedTo === 'cap_out' && blackAttachedTo === 'ind_in')
    ) {
      // V_LC = I * (XL - XC)
      const vLC = metrics.Irms * Math.abs(metrics.XL - metrics.XC);
      setDmmVoltage(vLC);
      setDmmLabel('V_LC (L+C COMBINED)');
    }
    else {
      setDmmVoltage(0.00);
      setDmmLabel('NO DIRECT COMPONENT');
    }
  }, [redAttachedTo, blackAttachedTo, isPowerOn, isLoopClosed, metrics, circuitState.Vrms]);

  // Main Workbench rendering and physics loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameId: number;
    let particleOffset = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Clean screen
      ctx.fillStyle = '#0f172a'; // slate-900
      ctx.fillRect(0, 0, width, height);

      // Draw breadboard / workbench base grid
      ctx.fillStyle = '#1e293b'; // slate-800
      ctx.fillRect(200, 120, 560, 180);
      
      // Breadboard socket pattern
      ctx.fillStyle = '#334155';
      for (let x = 220; x < 750; x += 20) {
        for (let y = 140; y <= 280; y += 20) {
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, 2 * Math.PI);
          ctx.fill();
        }
      }

      // Draw AC Function Generator (left panel)
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(15, 60, 160, 240);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.strokeRect(15, 60, 160, 240);

      // Generator Screen
      ctx.fillStyle = '#020617';
      ctx.fillRect(25, 75, 140, 60);
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(25, 75, 140, 60);

      ctx.fillStyle = '#10b981';
      ctx.font = '11px Courier New';
      ctx.textAlign = 'left';
      ctx.fillText(`FREQ: ${circuitState.frequency.toFixed(1)}Hz`, 32, 95);
      ctx.fillText(`AMPL: ${circuitState.Vrms.toFixed(2)}V`, 32, 110);
      ctx.fillText(`MODE: AC SINE`, 32, 125);

      // Generator Terminals
      // Red (+)
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(140, 155, 8, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#fca5a5';
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('+', 138, 158);

      // Black (-)
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(140, 235, 8, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.fillText('-', 138, 238);

      // Draw components on board
      // 1. Resistor (between 260, 200 and 380, 200)
      ctx.strokeStyle = '#d97706'; // amber leads
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(230, 200);
      ctx.lineTo(260, 200);
      ctx.moveTo(380, 200);
      ctx.lineTo(410, 200);
      ctx.stroke();

      // Resistor body
      ctx.fillStyle = '#b45309';
      ctx.fillRect(260, 192, 120, 16);
      
      // Resistor color stripes (value coding)
      ctx.fillStyle = '#78350f'; // brown (first digit)
      ctx.fillRect(280, 192, 10, 16);
      ctx.fillStyle = '#000000'; // black (second digit)
      ctx.fillRect(300, 192, 10, 16);
      ctx.fillStyle = '#b45309'; // multiplier (brown)
      ctx.fillRect(320, 192, 10, 16);
      ctx.fillStyle = '#fbbf24'; // tolerance (gold)
      ctx.fillRect(350, 192, 8, 16);

      // 2. Inductor Solenoid Coil (between 420, 200 and 540, 200)
      ctx.strokeStyle = '#d97706'; // copper leads
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(390, 200);
      ctx.lineTo(420, 200);
      ctx.moveTo(540, 200);
      ctx.lineTo(570, 200);
      ctx.stroke();

      // Solenoid coils (3D looking overlapping helix loops)
      ctx.strokeStyle = '#ea580c'; // copper color
      ctx.lineWidth = 4.5;
      for (let lx = 430; lx < 530; lx += 12) {
        ctx.beginPath();
        ctx.arc(lx, 200, 10, 0, Math.PI, true);
        ctx.stroke();
      }

      // 3. Capacitor Radial (between 580, 200 and 700, 200)
      ctx.strokeStyle = '#94a3b8'; // metal leads
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(550, 200);
      ctx.lineTo(580, 200);
      ctx.moveTo(700, 200);
      ctx.lineTo(730, 200);
      ctx.stroke();

      // Capacitor body cylinder
      ctx.fillStyle = '#2563eb'; // blue capacitor
      ctx.fillRect(580, 190, 120, 20);
      // Stripe
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(590, 190, 15, 20);
      ctx.fillStyle = '#1e293b';
      ctx.font = '8px sans-serif';
      ctx.fillText('-', 595, 202);

      // Draw Terminals circles
      terminals.forEach((term) => {
        const isHovered = hoveredTerm === term.id;
        ctx.fillStyle = isHovered ? '#6366f1' : '#334155';
        ctx.beginPath();
        ctx.arc(term.x, term.y, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = isHovered ? '#a5b4fc' : '#475569';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // Draw wires that user connected
      wires.forEach(([t1Id, t2Id]) => {
        const t1 = terminals.find((t) => t.id === t1Id)!;
        const t2 = terminals.find((t) => t.id === t2Id)!;
        
        ctx.strokeStyle = '#6366f1'; // blue-indigo neon wires
        ctx.lineWidth = 3;
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#6366f1';

        ctx.beginPath();
        ctx.moveTo(t1.x, t1.y);
        // Draw slightly sagging wire curve rather than straight line
        const midX = (t1.x + t2.x) / 2;
        const midY = (t1.y + t2.y) / 2 + 15;
        ctx.quadraticCurveTo(midX, midY, t2.x, t2.y);
        ctx.stroke();
        
        ctx.shadowBlur = 0; // reset

        // Draw animated current flow particles if power on
        if (isPowerOn && isLoopClosed) {
          particleOffset += 0.12 * metrics.Irms; // scale speed with current
          ctx.fillStyle = '#00ffff'; // glowing cyan current
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#00ffff';

          // Emit particles along the wire curve
          for (let offset = (particleOffset % 1); offset < 1; offset += 0.25) {
            // Bezier quadratic interpolation
            const t = offset;
            const x = (1 - t) * (1 - t) * t1.x + 2 * (1 - t) * t * midX + t * t * t2.x;
            const y = (1 - t) * (1 - t) * t1.y + 2 * (1 - t) * t * midY + t * t * t2.y;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
          }
          ctx.shadowBlur = 0;
        }
      });

      // Active wire drawing preview
      if (activeWireStart) {
        const startTerm = terminals.find((t) => t.id === activeWireStart)!;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(startTerm.x, startTerm.y);
        // Track dragging line cursor
        // We'll update dynamically
        ctx.lineTo(mouseCoords.x, mouseCoords.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw Digital Multimeter unit
      ctx.fillStyle = '#1e293b'; // DMM box
      ctx.fillRect(260, 320, 280, 80);
      ctx.strokeStyle = '#f59e0b'; // yellow trim
      ctx.lineWidth = 2.5;
      ctx.strokeRect(260, 320, 280, 80);

      // Multimeter screen
      ctx.fillStyle = '#020617';
      ctx.fillRect(275, 335, 110, 45);
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(275, 335, 110, 45);

      ctx.fillStyle = '#f59e0b'; // Amber DMM digital numbers
      ctx.font = 'bold 15px Courier New';
      const readVal = isPowerOn && isLoopClosed ? dmmVoltage : 0;
      ctx.fillText(`${readVal.toFixed(2)} V`, 285, 360);
      ctx.font = '8px Courier New';
      ctx.fillText(dmmLabel, 285, 372);

      // Probe sockets
      ctx.fillStyle = '#ef4444'; // red socket
      ctx.beginPath();
      ctx.arc(430, 360, 7, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = '#000000'; // black socket
      ctx.beginPath();
      ctx.arc(470, 360, 7, 0, 2 * Math.PI);
      ctx.fill();

      // Draw probe cables (stretching from sockets to probe heads)
      ctx.lineWidth = 4;
      ctx.shadowBlur = 0;
      
      // Red cable
      ctx.strokeStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(430, 360);
      // Nice slack curves
      ctx.bezierCurveTo(430, 390, redProbePos.x, redProbePos.y + 40, redProbePos.x, redProbePos.y);
      ctx.stroke();

      // Black cable
      ctx.strokeStyle = '#000000';
      ctx.beginPath();
      ctx.moveTo(470, 360);
      ctx.bezierCurveTo(470, 390, blackProbePos.x, blackProbePos.y + 40, blackProbePos.x, blackProbePos.y);
      ctx.stroke();

      // Draw Probe Tips (Heads)
      // Red Probe Head
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(redProbePos.x - 4, redProbePos.y - 20, 8, 20);
      ctx.fillStyle = '#e2e8f0'; // metal pin
      ctx.fillRect(redProbePos.x - 1, redProbePos.y - 28, 2, 8);

      // Black Probe Head
      ctx.fillStyle = '#000000';
      ctx.fillRect(blackProbePos.x - 4, blackProbePos.y - 20, 8, 20);
      ctx.fillStyle = '#e2e8f0'; // metal pin
      ctx.fillRect(blackProbePos.x - 1, blackProbePos.y - 28, 2, 8);

      frameId = requestAnimationFrame(render);
    };

    // Track mouse coordinates for wire drafting
    let mouseCoords = { x: 0, y: 0 };
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseCoords.x = e.clientX - rect.left;
      mouseCoords.y = e.clientY - rect.top;
      
      // Check node hover
      let found: string | null = null;
      terminals.forEach((term) => {
        const dist = Math.hypot(term.x - mouseCoords.x, term.y - mouseCoords.y);
        if (dist < 12) {
          found = term.id;
        }
      });
      setHoveredTerm(found);

      // Handle probe drag moving
      if (draggingProbe === 'red') {
        setRedProbePos({ x: mouseCoords.x, y: mouseCoords.y });
      } else if (draggingProbe === 'black') {
        setBlackProbePos({ x: mouseCoords.x, y: mouseCoords.y });
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // 1. Check probe picking
      const distRed = Math.hypot(redProbePos.x - clickX, redProbePos.y - clickY);
      const distBlack = Math.hypot(blackProbePos.x - clickX, blackProbePos.y - clickY);

      if (distRed < 20) {
        setDraggingProbe('red');
        setRedAttachedTo(null);
        return;
      }
      if (distBlack < 20) {
        setDraggingProbe('black');
        setBlackAttachedTo(null);
        return;
      }

      // 2. Check terminal connection start
      terminals.forEach((term) => {
        const dist = Math.hypot(term.x - clickX, term.y - clickY);
        if (dist < 12) {
          setActiveWireStart(term.id);
        }
      });
    };

    const handleMouseUp = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Handle Probe Snap Attachments
      if (draggingProbe) {
        let snapped = false;
        terminals.forEach((term) => {
          const dist = Math.hypot(term.x - clickX, term.y - clickY);
          if (dist < 18) {
            snapped = true;
            if (draggingProbe === 'red') {
              setRedProbePos({ x: term.x, y: term.y - 5 });
              setRedAttachedTo(term.id);
            } else {
              setBlackProbePos({ x: term.x, y: term.y - 5 });
              setBlackAttachedTo(term.id);
            }
          }
        });

        // Snap back to body if let go in blank space
        if (!snapped) {
          if (draggingProbe === 'red') {
            setRedProbePos({ x: 320, y: 350 });
            setRedAttachedTo(null);
          } else {
            setBlackProbePos({ x: 480, y: 350 });
            setBlackAttachedTo(null);
          }
        }
        setDraggingProbe(null);
        return;
      }

      // Handle wiring completion
      if (activeWireStart) {
        terminals.forEach((term) => {
          const dist = Math.hypot(term.x - clickX, term.y - clickY);
          // If let go on a terminal node, create the wire
          if (dist < 12 && term.id !== activeWireStart) {
            // Check if connection already exists
            const exists = wires.some(
              ([w1, w2]) => 
                (w1 === activeWireStart && w2 === term.id) ||
                (w1 === term.id && w2 === activeWireStart)
            );
            if (!exists) {
              setWires((prev) => [...prev, [activeWireStart, term.id]]);
            }
          }
        });
        setActiveWireStart(null);
      }
    };

    // Add listeners
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);

    render();

    return () => {
      cancelAnimationFrame(frameId);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
    };
  }, [circuitState, metrics, wires, activeWireStart, draggingProbe, redProbePos, blackProbePos, hoveredTerm, dmmVoltage, dmmLabel, isPowerOn, isLoopClosed]);

  // Reset wiring board
  const handleResetWires = () => {
    setWires([]);
    setIsPowerOn(false);
    // Move probes back
    setRedProbePos({ x: 320, y: 350 });
    setRedAttachedTo(null);
    setBlackProbePos({ x: 480, y: 350 });
    setBlackAttachedTo(null);
  };

  // Autowire for helper shortcuts
  const handleAutoWire = () => {
    setWires([
      ['gen_pos', 'res_in'],
      ['res_out', 'ind_in'],
      ['ind_out', 'cap_in'],
      ['cap_out', 'gen_neg'],
    ]);
  };

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-700/80 rounded-xl p-4 shadow-2xl h-full backdrop-blur-md">
      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
        <h3 className="text-md font-semibold text-slate-100 flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-400" />
          Interactive 3D Workbench & Multimeter
        </h3>
        
        <div className="flex gap-2">
          <button
            onClick={handleAutoWire}
            className="text-[10px] bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold px-2 py-1 rounded transition border border-slate-700"
          >
            Auto-Wire Loop
          </button>
          <button
            onClick={handleResetWires}
            className="text-[10px] bg-slate-800 hover:bg-slate-750 text-red-400 font-semibold px-2 py-1 rounded transition border border-slate-700 flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Reset Board
          </button>
          
          <button
            onClick={() => isLoopClosed && setIsPowerOn(!isPowerOn)}
            disabled={!isLoopClosed}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition shadow ${
              !isLoopClosed
                ? 'bg-slate-805 text-slate-500 border border-slate-750 cursor-not-allowed'
                : isPowerOn
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            {isPowerOn ? 'Power Off' : 'Power On'}
          </button>
        </div>
      </div>

      {/* Instructions */}
      <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
        <strong>Wiring Instructions:</strong> Drag from terminal to terminal to connect them. Form a closed series loop to enable power. Drag the Multimeter probes (Red & Black) onto terminals to measure component voltages.
      </p>

      {/* Main interactive workbench canvas */}
      <div className="relative flex-grow min-h-[360px] max-h-[420px] rounded-lg overflow-hidden border border-slate-800 shadow-inner bg-slate-950">
        <canvas
          ref={canvasRef}
          width={820}
          height={410}
          className="w-full h-full block"
        />
        {/* Glow indicator at resonance */}
        {metrics.isResonant && isPowerOn && (
          <div className="absolute top-1/2 left-[57%] transform -translate-y-1/2 -translate-x-1/2 w-[600px] h-[150px] bg-indigo-500/5 rounded-full filter blur-2xl pointer-events-none animate-pulse"></div>
        )}
      </div>
    </div>
  );
};
export default LabBench3D;
