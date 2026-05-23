import React, { useRef, useEffect, useState } from 'react';
import { Power, Settings, RotateCcw, Package } from 'lucide-react';
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

// Component inventory item
interface InventoryItem {
  id: 'source' | 'resistor' | 'inductor' | 'capacitor';
  label: string;
  color: string;
  placed: boolean;
}

// Inline editor popup state
interface EditPopup {
  component: 'R' | 'L' | 'C';
  x: number;
  y: number;
  currentValue: string;
}

export const LabBench3D: React.FC<LabBench3DProps> = ({
  circuitState,
  metrics,
  isPowerOn,
  setIsPowerOn,
  isLoopClosed,
  setIsLoopClosed,
  onStateChange,
  dmmVoltage,
  setDmmVoltage,
  dmmLabel,
  setDmmLabel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Terminals positions on the workbench (sized for 820x410 canvas)
  const terminals: TermNode[] = [
    { id: 'gen_pos', name: 'Generator (+)', x: 140, y: 155 },
    { id: 'res_in',  name: 'Resistor IN',   x: 260, y: 200 },
    { id: 'res_out', name: 'Resistor OUT',  x: 380, y: 200 },
    { id: 'ind_in',  name: 'Inductor IN',   x: 420, y: 200 },
    { id: 'ind_out', name: 'Inductor OUT',  x: 540, y: 200 },
    { id: 'cap_in',  name: 'Capacitor IN',  x: 580, y: 200 },
    { id: 'cap_out', name: 'Capacitor OUT', x: 700, y: 200 },
    { id: 'gen_neg', name: 'Generator (-)', x: 140, y: 235 },
  ];

  // Component inventory — tracks what has been placed
  const [inventory, setInventory] = useState<InventoryItem[]>([
    { id: 'source',    label: 'AC Source',  color: '#6366f1', placed: false },
    { id: 'resistor',  label: 'Resistor',   color: '#d97706', placed: false },
    { id: 'inductor',  label: 'Inductor',   color: '#ea580c', placed: false },
    { id: 'capacitor', label: 'Capacitor',  color: '#3b82f6', placed: false },
  ]);

  const allPlaced = inventory.every((item) => item.placed);

  // Dragging from inventory tray
  const [draggingInventory, setDraggingInventory] = useState<string | null>(null);

  // Wiring connections
  const [wires, setWires] = useState<[string, string][]>([]);
  const [activeWireStart, setActiveWireStart] = useState<string | null>(null);

  // Multimeter probes positions
  const [redProbePos, setRedProbePos]     = useState<{ x: number; y: number }>({ x: 320, y: 350 });
  const [blackProbePos, setBlackProbePos] = useState<{ x: number; y: number }>({ x: 480, y: 350 });
  const [draggingProbe, setDraggingProbe] = useState<'red' | 'black' | null>(null);

  // Terminal attachment tracking
  const [redAttachedTo, setRedAttachedTo]     = useState<string | null>(null);
  const [blackAttachedTo, setBlackAttachedTo] = useState<string | null>(null);

  // Hover state
  const [hoveredTerm, setHoveredTerm] = useState<string | null>(null);

  // Inline edit popup for component values
  const [editPopup, setEditPopup] = useState<EditPopup | null>(null);

  // Click regions for component bodies (for double-click-to-edit)
  const componentRegions = {
    resistor:  { x: 260, y: 192, w: 120, h: 16 },
    inductor:  { x: 430, y: 190, w: 100, h: 20 },
    capacitor: { x: 580, y: 190, w: 120, h: 20 },
  };

  // Check if series LCR loop is closed
  useEffect(() => {
    const hasConnection = (t1: string, t2: string) =>
      wires.some(
        ([w1, w2]) => (w1 === t1 && w2 === t2) || (w2 === t1 && w1 === t2)
      );

    const c1 = hasConnection('gen_pos', 'res_in');
    const c2 = hasConnection('res_out', 'ind_in');
    const c3 = hasConnection('ind_out', 'cap_in');
    const c4 = hasConnection('cap_out', 'gen_neg');

    const closed = allPlaced && c1 && c2 && c3 && c4;
    setIsLoopClosed(closed);
    if (!closed) setIsPowerOn(false);
  }, [wires, allPlaced, setIsLoopClosed, setIsPowerOn]);

  // Handle probe measurement calculations
  useEffect(() => {
    if (!isPowerOn || !isLoopClosed) {
      setDmmVoltage(0.00);
      setDmmLabel('OPEN LOOP');
      return;
    }

    const sortedProbes = [redAttachedTo, blackAttachedTo].sort();

    if (sortedProbes[0] === 'res_in' && sortedProbes[1] === 'res_out') {
      setDmmVoltage(metrics.VR_rms);
      setDmmLabel('V_R (RESISTOR)');
    } else if (sortedProbes[0] === 'ind_in' && sortedProbes[1] === 'ind_out') {
      setDmmVoltage(metrics.VL_rms);
      setDmmLabel('V_L (INDUCTOR)');
    } else if (sortedProbes[0] === 'cap_in' && sortedProbes[1] === 'cap_out') {
      setDmmVoltage(metrics.VC_rms);
      setDmmLabel('V_C (CAPACITOR)');
    } else if (
      (redAttachedTo === 'gen_pos' && blackAttachedTo === 'gen_neg') ||
      (redAttachedTo === 'gen_neg' && blackAttachedTo === 'gen_pos')
    ) {
      setDmmVoltage(circuitState.Vrms);
      setDmmLabel('V_S (SOURCE)');
    } else if (
      (redAttachedTo === 'res_out' && blackAttachedTo === 'cap_out') ||
      (redAttachedTo === 'cap_out' && blackAttachedTo === 'res_out') ||
      (redAttachedTo === 'ind_in'  && blackAttachedTo === 'cap_out') ||
      (redAttachedTo === 'cap_out' && blackAttachedTo === 'ind_in')
    ) {
      const vLC = metrics.Irms * Math.abs(metrics.XL - metrics.XC);
      setDmmVoltage(vLC);
      setDmmLabel('V_LC (L+C COMBINED)');
    } else {
      setDmmVoltage(0.00);
      setDmmLabel('NO DIRECT COMPONENT');
    }
  }, [redAttachedTo, blackAttachedTo, isPowerOn, isLoopClosed, metrics, circuitState.Vrms]);

  // Main Workbench rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameId: number;
    let particleOffset = 0;
    let mouseCoords = { x: 0, y: 0 };
    let lastClickTime = 0;

    const render = () => {
      const width  = canvas.width;
      const height = canvas.height;

      // Background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);

      // ── Breadboard ──────────────────────────────
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(200, 120, 560, 180);

      ctx.fillStyle = '#334155';
      for (let x = 220; x < 750; x += 20) {
        for (let y = 140; y <= 280; y += 20) {
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, 2 * Math.PI);
          ctx.fill();
        }
      }

      if (allPlaced) {
        // ── AC Function Generator (left panel) ──
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

        // Generator label
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('AC SOURCE', 95, 165);

        // Sine wave indicator on generator screen
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let sx = 0; sx < 120; sx++) {
          const sy = 50 + Math.sin((sx / 120) * Math.PI * 4 + Date.now() / 500) * 8;
          if (sx === 0) ctx.moveTo(32 + sx, sy);
          else ctx.lineTo(32 + sx, sy);
        }
        ctx.stroke();

        // Generator Terminals — Red (+)
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(140, 155, 8, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#fca5a5';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('+', 140, 158);

        // Generator Terminals — Black (-)
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(140, 235, 8, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.fillText('-', 140, 238);

        // ── Resistor ────────────────────────────
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(230, 200); ctx.lineTo(260, 200);
        ctx.moveTo(380, 200); ctx.lineTo(410, 200);
        ctx.stroke();

        ctx.fillStyle = '#b45309';
        ctx.fillRect(260, 192, 120, 16);

        // Resistor stripes
        const rStripes = ['#78350f', '#000000', '#b45309', '#fbbf24'];
        const rStripeX = [280, 300, 320, 350];
        rStripes.forEach((color, i) => {
          ctx.fillStyle = color;
          ctx.fillRect(rStripeX[i], 192, i === 3 ? 8 : 10, 16);
        });

        // Resistor label + value
        ctx.fillStyle = '#fcd34d';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('R', 320, 186);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px monospace';
        ctx.fillText(`${circuitState.R} Ω`, 320, 222);
        ctx.fillStyle = '#475569';
        ctx.font = '8px sans-serif';
        ctx.fillText('dbl-click to edit', 320, 233);

        // ── Inductor (Solenoid coil) ─────────────
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(390, 200); ctx.lineTo(420, 200);
        ctx.moveTo(540, 200); ctx.lineTo(570, 200);
        ctx.stroke();

        ctx.strokeStyle = '#ea580c';
        ctx.lineWidth = 4.5;
        for (let lx = 430; lx < 530; lx += 12) {
          ctx.beginPath();
          ctx.arc(lx, 200, 10, 0, Math.PI, true);
          ctx.stroke();
        }

        // Inductor label + value
        ctx.fillStyle = '#a78bfa';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('L', 480, 186);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px monospace';
        ctx.fillText(`${(circuitState.L * 1000).toFixed(1)} mH`, 480, 222);
        ctx.fillStyle = '#475569';
        ctx.font = '8px sans-serif';
        ctx.fillText('dbl-click to edit', 480, 233);

        // ── Capacitor ────────────────────────────
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(550, 200); ctx.lineTo(580, 200);
        ctx.moveTo(700, 200); ctx.lineTo(730, 200);
        ctx.stroke();

        ctx.fillStyle = '#2563eb';
        ctx.fillRect(580, 190, 120, 20);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(590, 190, 15, 20);
        ctx.fillStyle = '#1e293b';
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('-', 595, 202);

        // Capacitor label + value
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('C', 640, 186);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px monospace';
        ctx.fillText(`${(circuitState.C * 1e6).toFixed(1)} μF`, 640, 222);
        ctx.fillStyle = '#475569';
        ctx.font = '8px sans-serif';
        ctx.fillText('dbl-click to edit', 640, 233);

        // ── Resonance Glow on components ─────────
        if (metrics.isResonant && isPowerOn) {
          ctx.shadowBlur = 20;
          ctx.shadowColor = '#34d399';
          ctx.strokeStyle = 'rgba(52,211,153,0.3)';
          ctx.lineWidth = 2;
          ctx.strokeRect(258, 190, 124, 20);
          ctx.strokeRect(428, 188, 104, 24);
          ctx.strokeRect(578, 188, 124, 24);
          ctx.shadowBlur = 0;
        }

        // ── Terminal Nodes ─────────────────────
        terminals.forEach((term) => {
          const isHov = hoveredTerm === term.id;
          ctx.fillStyle = isHov ? '#6366f1' : '#334155';
          ctx.beginPath();
          ctx.arc(term.x, term.y, 6, 0, 2 * Math.PI);
          ctx.fill();
          ctx.strokeStyle = isHov ? '#a5b4fc' : '#475569';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });

        // ── Wires ───────────────────────────────
        wires.forEach(([t1Id, t2Id]) => {
          const t1 = terminals.find((t) => t.id === t1Id)!;
          const t2 = terminals.find((t) => t.id === t2Id)!;

          ctx.strokeStyle = '#6366f1';
          ctx.lineWidth = 3;
          ctx.shadowBlur = 6;
          ctx.shadowColor = '#6366f1';

          ctx.beginPath();
          ctx.moveTo(t1.x, t1.y);
          const midX = (t1.x + t2.x) / 2;
          const midY = (t1.y + t2.y) / 2 + 15;
          ctx.quadraticCurveTo(midX, midY, t2.x, t2.y);
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Current flow particles
          if (isPowerOn && isLoopClosed) {
            particleOffset += 0.12 * Math.max(0.1, metrics.Irms);
            ctx.fillStyle = '#00ffff';
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#00ffff';

            for (let offset = particleOffset % 1; offset < 1; offset += 0.25) {
              const tt = offset;
              const px = (1-tt)*(1-tt)*t1.x + 2*(1-tt)*tt*midX + tt*tt*t2.x;
              const py = (1-tt)*(1-tt)*t1.y + 2*(1-tt)*tt*midY + tt*tt*t2.y;
              ctx.beginPath();
              ctx.arc(px, py, 4, 0, 2 * Math.PI);
              ctx.fill();
            }
            ctx.shadowBlur = 0;
          }
        });

        // Active wire preview
        if (activeWireStart) {
          const startTerm = terminals.find((t) => t.id === activeWireStart)!;
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(startTerm.x, startTerm.y);
          ctx.lineTo(mouseCoords.x, mouseCoords.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      } else {
        // ── "Place components first" overlay ──────
        ctx.fillStyle = 'rgba(15,23,42,0.7)';
        ctx.fillRect(200, 120, 560, 180);
        ctx.fillStyle = '#475569';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('← Drag components from the Inventory Tray above onto the breadboard', 480, 215);
        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#334155';
        ctx.fillText('Place all 4 components to begin wiring', 480, 235);
      }

      // ── Digital Multimeter ──────────────────────
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(260, 320, 280, 80);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(260, 320, 280, 80);

      ctx.fillStyle = '#020617';
      ctx.fillRect(275, 335, 110, 45);
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(275, 335, 110, 45);

      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 15px Courier New';
      ctx.textAlign = 'left';
      const readVal = isPowerOn && isLoopClosed ? dmmVoltage : 0;
      ctx.fillText(`${readVal.toFixed(2)} V`, 285, 360);
      ctx.font = '8px Courier New';
      ctx.fillText(dmmLabel, 285, 372);

      // Probe sockets
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.arc(430, 360, 7, 0, 2 * Math.PI); ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath(); ctx.arc(470, 360, 7, 0, 2 * Math.PI); ctx.fill();

      // Red cable
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(430, 360);
      ctx.bezierCurveTo(430, 390, redProbePos.x, redProbePos.y + 40, redProbePos.x, redProbePos.y);
      ctx.stroke();

      // Black cable
      ctx.strokeStyle = '#111827';
      ctx.beginPath();
      ctx.moveTo(470, 360);
      ctx.bezierCurveTo(470, 390, blackProbePos.x, blackProbePos.y + 40, blackProbePos.x, blackProbePos.y);
      ctx.stroke();

      // Red probe head
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(redProbePos.x - 4, redProbePos.y - 20, 8, 20);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(redProbePos.x - 1, redProbePos.y - 28, 2, 8);

      // Black probe head
      ctx.fillStyle = '#111827';
      ctx.fillRect(blackProbePos.x - 4, blackProbePos.y - 20, 8, 20);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(blackProbePos.x - 1, blackProbePos.y - 28, 2, 8);

      frameId = requestAnimationFrame(render);
    };

    // ── Event Handlers ─────────────────────────────────────────────────────
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      mouseCoords.x = (e.clientX - rect.left) * scaleX;
      mouseCoords.y = (e.clientY - rect.top)  * scaleY;

      let found: string | null = null;
      terminals.forEach((term) => {
        if (Math.hypot(term.x - mouseCoords.x, term.y - mouseCoords.y) < 12) found = term.id;
      });
      setHoveredTerm(found);

      if (draggingProbe === 'red') {
        setRedProbePos({ x: mouseCoords.x, y: mouseCoords.y });
      } else if (draggingProbe === 'black') {
        setBlackProbePos({ x: mouseCoords.x, y: mouseCoords.y });
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const cx = (e.clientX - rect.left) * scaleX;
      const cy = (e.clientY - rect.top)  * scaleY;

      const now = Date.now();
      const isDoubleClick = now - lastClickTime < 400;
      lastClickTime = now;

      // Double-click on component bodies → open edit popup
      if (isDoubleClick && allPlaced) {
        const reg = componentRegions;
        const hitR = cx >= reg.resistor.x  && cx <= reg.resistor.x  + reg.resistor.w  && cy >= reg.resistor.y  && cy <= reg.resistor.y  + reg.resistor.h;
        const hitL = cx >= reg.inductor.x  && cx <= reg.inductor.x  + reg.inductor.w  && cy >= reg.inductor.y  && cy <= reg.inductor.y  + reg.inductor.h;
        const hitC = cx >= reg.capacitor.x && cx <= reg.capacitor.x + reg.capacitor.w && cy >= reg.capacitor.y && cy <= reg.capacitor.y + reg.capacitor.h;

        if (hitR) {
          const canvasRect = canvas.getBoundingClientRect();
          setEditPopup({ component: 'R', x: e.clientX - canvasRect.left + 10, y: e.clientY - canvasRect.top - 30, currentValue: String(circuitState.R) });
          return;
        }
        if (hitL) {
          const canvasRect = canvas.getBoundingClientRect();
          setEditPopup({ component: 'L', x: e.clientX - canvasRect.left + 10, y: e.clientY - canvasRect.top - 30, currentValue: String((circuitState.L * 1000).toFixed(1)) });
          return;
        }
        if (hitC) {
          const canvasRect = canvas.getBoundingClientRect();
          setEditPopup({ component: 'C', x: e.clientX - canvasRect.left + 10, y: e.clientY - canvasRect.top - 30, currentValue: String((circuitState.C * 1e6).toFixed(1)) });
          return;
        }
      }

      // Probe picking
      if (Math.hypot(redProbePos.x - cx, redProbePos.y - cy) < 20) {
        setDraggingProbe('red');
        setRedAttachedTo(null);
        return;
      }
      if (Math.hypot(blackProbePos.x - cx, blackProbePos.y - cy) < 20) {
        setDraggingProbe('black');
        setBlackAttachedTo(null);
        return;
      }

      // Terminal wire start
      if (allPlaced) {
        terminals.forEach((term) => {
          if (Math.hypot(term.x - cx, term.y - cy) < 12) {
            setActiveWireStart(term.id);
          }
        });
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const cx = (e.clientX - rect.left) * scaleX;
      const cy = (e.clientY - rect.top)  * scaleY;

      if (draggingProbe) {
        let snapped = false;
        terminals.forEach((term) => {
          if (Math.hypot(term.x - cx, term.y - cy) < 18) {
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

      if (activeWireStart && allPlaced) {
        terminals.forEach((term) => {
          if (Math.hypot(term.x - cx, term.y - cy) < 12 && term.id !== activeWireStart) {
            const exists = wires.some(
              ([w1, w2]) =>
                (w1 === activeWireStart && w2 === term.id) ||
                (w1 === term.id && w2 === activeWireStart)
            );
            if (!exists) setWires((prev) => [...prev, [activeWireStart, term.id]]);
          }
        });
        setActiveWireStart(null);
      }
    };

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
  }, [
    circuitState, metrics, wires, activeWireStart, draggingProbe,
    redProbePos, blackProbePos, hoveredTerm, dmmVoltage, dmmLabel,
    isPowerOn, isLoopClosed, allPlaced, inventory,
  ]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const handleResetAll = () => {
    setWires([]);
    setIsPowerOn(false);
    setRedProbePos({ x: 320, y: 350 });
    setRedAttachedTo(null);
    setBlackProbePos({ x: 480, y: 350 });
    setBlackAttachedTo(null);
    setInventory((prev) => prev.map((i) => ({ ...i, placed: false })));
  };

  const handleAutoWire = () => {
    setWires([
      ['gen_pos', 'res_in'],
      ['res_out', 'ind_in'],
      ['ind_out', 'cap_in'],
      ['cap_out', 'gen_neg'],
    ]);
  };

  const handlePlaceAll = () => {
    setInventory((prev) => prev.map((i) => ({ ...i, placed: true })));
  };

  // Commit component value edit
  const handleEditCommit = () => {
    if (!editPopup) return;
    const val = parseFloat(editPopup.currentValue);
    if (isNaN(val)) { setEditPopup(null); return; }

    if (editPopup.component === 'R') {
      const clamped = Math.max(10, Math.min(200, Math.round(val)));
      onStateChange({ R: clamped });
    } else if (editPopup.component === 'L') {
      const clamped = Math.max(10, Math.min(500, val));
      onStateChange({ L: clamped / 1000 });
    } else if (editPopup.component === 'C') {
      const clamped = Math.max(1, Math.min(100, val));
      onStateChange({ C: clamped / 1e6 });
    }
    setEditPopup(null);
  };

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-700/80 rounded-xl p-4 shadow-2xl backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
        <h3 className="text-md font-semibold text-slate-100 flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-400" />
          Interactive 3D Workbench &amp; Multimeter
        </h3>

        <div className="flex gap-2">
          <button
            onClick={handleAutoWire}
            disabled={!allPlaced}
            className="text-[10px] bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 font-semibold px-2 py-1 rounded transition border border-slate-700"
          >
            Auto-Wire Loop
          </button>
          <button
            onClick={handleResetAll}
            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-red-400 font-semibold px-2 py-1 rounded transition border border-slate-700 flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Reset Board
          </button>

          <button
            onClick={() => isLoopClosed && setIsPowerOn(!isPowerOn)}
            disabled={!isLoopClosed}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition shadow ${
              !isLoopClosed
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                : isPowerOn
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            {isPowerOn ? 'Power Off' : 'Power On'}
          </button>
        </div>
      </div>

      {/* ── COMPONENT INVENTORY TRAY (Spec F1) ───────────────────────────── */}
      <div className="mb-3 p-3 bg-slate-950/50 border border-slate-800 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Package className="w-4 h-4 text-indigo-400" />
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
            Component Inventory — drag onto breadboard or click to place
          </span>
          <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${allPlaced ? 'text-emerald-400 bg-emerald-950/50 border border-emerald-800' : 'text-amber-400 bg-amber-950/30 border border-amber-800/50'}`}>
            {inventory.filter((i) => i.placed).length}/4 Placed
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {inventory.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (!item.placed) {
                  setInventory((prev) =>
                    prev.map((i) => (i.id === item.id ? { ...i, placed: true } : i))
                  );
                }
              }}
              draggable={!item.placed}
              onDragStart={() => setDraggingInventory(item.id)}
              onDragEnd={() => {
                // Auto-place on drag end (simulates drop onto canvas)
                setInventory((prev) =>
                  prev.map((i) => (i.id === item.id ? { ...i, placed: true } : i))
                );
                setDraggingInventory(null);
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[11px] font-semibold transition-all select-none ${
                item.placed
                  ? 'bg-slate-950/30 border-slate-700/30 text-slate-600 cursor-default opacity-50'
                  : 'cursor-grab active:cursor-grabbing hover:scale-105 hover:shadow-lg border-slate-600 bg-slate-800 text-slate-200 hover:border-indigo-500/60'
              }`}
              style={item.placed ? {} : { boxShadow: `0 0 12px ${item.color}30` }}
              title={item.placed ? `${item.label} placed on board` : `Click or drag to place ${item.label}`}
            >
              <span
                className="w-3 h-3 rounded-sm shrink-0"
                style={{ backgroundColor: item.placed ? '#334155' : item.color }}
              />
              {item.label}
              {item.placed ? (
                <span className="text-emerald-500 text-[9px]">✓ Placed</span>
              ) : (
                <span className="text-slate-500 text-[9px]">→ Board</span>
              )}
            </button>
          ))}
          {!allPlaced && (
            <button
              onClick={handlePlaceAll}
              className="ml-auto text-[10px] bg-indigo-900/50 hover:bg-indigo-800/60 text-indigo-400 border border-indigo-800/60 font-semibold px-3 py-1.5 rounded-lg transition"
            >
              Place All
            </button>
          )}
        </div>
      </div>

      {/* Instructions */}
      <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
        <strong>Wiring:</strong> After placing components, drag from terminal to terminal to connect them.
        Form a closed series loop to enable power. Drag the <span className="text-red-400">Red</span> &amp; <span className="text-slate-300">Black</span> probes to measure component voltages.
        <strong> Double-click</strong> R, L, or C on the board to edit their values.
      </p>

      {/* Main canvas */}
      <div className="relative flex-grow min-h-[360px] max-h-[420px] rounded-lg overflow-hidden border border-slate-800 shadow-inner bg-slate-950">
        <canvas
          ref={canvasRef}
          width={820}
          height={410}
          className="w-full h-full block"
        />

        {/* Inline component value editor popup */}
        {editPopup && (
          <div
            className="absolute z-20 bg-slate-900 border border-indigo-500/50 rounded-xl p-3 shadow-2xl animate-scale-in"
            style={{ left: Math.min(editPopup.x, 380), top: Math.min(editPopup.y, 260) }}
          >
            <div className="text-[11px] font-bold text-indigo-300 mb-2">
              Edit {editPopup.component === 'R' ? 'Resistance (Ω)' : editPopup.component === 'L' ? 'Inductance (mH)' : 'Capacitance (μF)'}
            </div>
            <div className="flex gap-2">
              <input
                autoFocus
                type="number"
                value={editPopup.currentValue}
                onChange={(e) => setEditPopup({ ...editPopup, currentValue: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleEditCommit();
                  if (e.key === 'Escape') setEditPopup(null);
                }}
                className="w-28 bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-slate-100 text-xs font-mono focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleEditCommit}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-lg transition"
              >
                Set
              </button>
              <button
                onClick={() => setEditPopup(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs px-2 py-1 rounded-lg transition"
              >
                ✕
              </button>
            </div>
            <div className="text-[9px] text-slate-500 mt-1.5">
              {editPopup.component === 'R' ? 'Range: 10 – 200 Ω' : editPopup.component === 'L' ? 'Range: 10 – 500 mH' : 'Range: 1 – 100 μF'} · Press Enter to confirm
            </div>
          </div>
        )}

        {/* Resonance glow overlay */}
        {metrics.isResonant && isPowerOn && (
          <div className="absolute top-1/2 left-[57%] transform -translate-y-1/2 -translate-x-1/2 w-[600px] h-[150px] bg-emerald-500/5 rounded-full filter blur-2xl pointer-events-none animate-pulse" />
        )}
      </div>
    </div>
  );
};

export default LabBench3D;
