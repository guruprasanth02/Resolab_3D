import React, { useState, useEffect } from 'react';
import { Award, BookOpen, Download, RefreshCw, Trophy, Users } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { CircuitState, CalculatedMetrics } from '../utils/physics';
import audioEngine from '../utils/audio';

// Challenge interface
export interface Challenge {
  id: string;
  title: string;
  description: string;
  targetL: number; // Henrys
  targetC: number; // Farads
  targetR: number; // Ohms
  points: number;
  completed: boolean;
}

// Data point logged by user
export interface LabDataPoint {
  frequency: number;
  V_R: number;
  V_L: number;
  V_C: number;
  I: number;
  phase: number;
}

interface GamificationProps {
  circuitState: CircuitState;
  metrics: CalculatedMetrics;
  isPowerOn: boolean;
  isLoopClosed: boolean;
  onSelectChallenge: (L: number, C: number, R: number) => void;
  // BroadcastChannel peer state sync
  isPeerMode: boolean;
  setIsPeerMode: (mode: boolean) => void;
}

export const Gamification: React.FC<GamificationProps> = ({
  circuitState,
  metrics,
  isPowerOn,
  isLoopClosed,
  onSelectChallenge,
  isPeerMode,
  setIsPeerMode,
}) => {
  // Lab challenges list
  const [challenges, setChallenges] = useState<Challenge[]>([
    {
      id: 'c1',
      title: 'Tuning 101: Basic Resonance',
      description: 'Tune a circuit with R = 50 Ω, L = 100 mH, C = 22 μF to resonance.',
      targetL: 0.1,
      targetC: 0.000022,
      targetR: 50,
      points: 100,
      completed: false,
    },
    {
      id: 'c2',
      title: 'High-Q Sharp Tuning',
      description: 'Tune a circuit with R = 10 Ω (low resistance, high selectivity), L = 50 mH, C = 10 μF.',
      targetL: 0.05,
      targetC: 0.00001,
      targetR: 10,
      points: 200,
      completed: false,
    },
    {
      id: 'c3',
      title: 'High-Frequency RF Match',
      description: 'Tune a circuit with R = 30 Ω, L = 15 mH, C = 2.2 μF to resonance.',
      targetL: 0.015,
      targetC: 0.0000022,
      targetR: 30,
      points: 250,
      completed: false,
    },
  ]);

  const [activeChallengeId, setActiveChallengeId] = useState<string | null>(null);
  const [precisionScore, setPrecisionScore] = useState<number | null>(null);
  const [badges, setBadges] = useState<string[]>([]);
  const [dataPoints, setDataPoints] = useState<LabDataPoint[]>([]);

  // Setup BroadcastChannel for sync
  const [syncChannel, setSyncChannel] = useState<BroadcastChannel | null>(null);

  useEffect(() => {
    const channel = new BroadcastChannel('resolab-sync');
    setSyncChannel(channel);

    channel.onmessage = (event) => {
      if (isPeerMode && event.data.type === 'SYNC_DATA_POINTS') {
        setDataPoints(event.data.payload);
      }
    };

    return () => {
      channel.close();
    };
  }, [isPeerMode]);

  // Sync data points to other windows
  const broadcastDataPoints = (points: LabDataPoint[]) => {
    if (syncChannel) {
      syncChannel.postMessage({
        type: 'SYNC_DATA_POINTS',
        payload: points,
      });
    }
  };

  // Check if current values match active challenge parameters
  const isChallengeSetupCorrect = (ch: Challenge) => {
    const margin = 0.000001; // float precision margin
    return (
      Math.abs(circuitState.L - ch.targetL) < margin &&
      Math.abs(circuitState.C - ch.targetC) < margin &&
      Math.abs(circuitState.R - ch.targetR) < margin
    );
  };

  // Record data point to notebook
  const logDataPoint = () => {
    if (!isLoopClosed || !isPowerOn) return;

    const newPoint: LabDataPoint = {
      frequency: circuitState.frequency,
      V_R: metrics.VR_rms,
      V_L: metrics.VL_rms,
      V_C: metrics.VC_rms,
      I: metrics.Irms,
      phase: metrics.phaseAngleDeg,
    };

    // Prevent duplicate logs for same frequency
    if (dataPoints.some((dp) => Math.abs(dp.frequency - newPoint.frequency) < 0.1)) {
      return;
    }

    const updated = [...dataPoints, newPoint].sort((a, b) => a.frequency - b.frequency);
    setDataPoints(updated);
    broadcastDataPoints(updated);
  };

  // Clear recorded points
  const clearDataPoints = () => {
    setDataPoints([]);
    broadcastDataPoints([]);
  };

  // Test resonance match and calculate score
  const verifyResonance = () => {
    if (!isLoopClosed || !isPowerOn) return;

    const fr = metrics.f_r;
    const currentF = circuitState.frequency;
    
    // Score based on distance from peak (in Hz)
    const hzDiff = Math.abs(currentF - fr);
    const score = Math.max(0, Math.round(100 - hzDiff * 1.5));
    
    setPrecisionScore(score);

    if (score >= 98) {
      // Wow feedback: sound chime, confetti
      audioEngine.playResonanceChime();
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      // Complete active challenge if conditions met
      if (activeChallengeId) {
        setChallenges((prev) =>
          prev.map((ch) => {
            if (ch.id === activeChallengeId) {
              // Award badge if not completed
              if (!ch.completed) {
                const badgeName = `Master Tuner: ${ch.title.split(':')[0]}`;
                if (!badges.includes(badgeName)) {
                  setBadges((b) => [...b, badgeName]);
                }
              }
              return { ...ch, completed: true };
            }
            return ch;
          })
        );
      }
      
      // General achievement badge
      if (!badges.includes('Resonance Pioneer')) {
        setBadges((b) => [...b, 'Resonance Pioneer']);
      }
    }
  };

  // Select a challenge and push parameter shifts
  const startChallenge = (ch: Challenge) => {
    setActiveChallengeId(ch.id);
    setPrecisionScore(null);
    onSelectChallenge(ch.targetL, ch.targetC, ch.targetR);
  };

  // Export HTML virtual lab report
  const exportLabReport = () => {
    const tableHtml = dataPoints
      .map(
        (dp) => `
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px; font-family: monospace;">${dp.frequency.toFixed(1)} Hz</td>
        <td style="border: 1px solid #ddd; padding: 8px; font-family: monospace;">${dp.I.toFixed(3)} A</td>
        <td style="border: 1px solid #ddd; padding: 8px; font-family: monospace;">${dp.V_R.toFixed(2)} V</td>
        <td style="border: 1px solid #ddd; padding: 8px; font-family: monospace;">${dp.V_L.toFixed(2)} V</td>
        <td style="border: 1px solid #ddd; padding: 8px; font-family: monospace;">${dp.V_C.toFixed(2)} V</td>
        <td style="border: 1px solid #ddd; padding: 8px; font-family: monospace;">${dp.phase.toFixed(1)}°</td>
      </tr>`
      )
      .join('');

    const badgesHtml = badges
      .map((b) => `<span style="background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 9999px; margin-right: 6px; font-size: 12px; font-weight: bold; border: 1px solid #bae6fd;">${b}</span>`)
      .join('') || '<span style="color: #666; font-style: italic;">No badges earned yet.</span>';

    const reportContent = `
      <html>
        <head>
          <title>ResoLab 3D - Engineering Lab Report</title>
          <style>
            body { font-family: sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 40px auto; padding: 0 20px; }
            h1 { color: #1e3a8a; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; }
            h2 { color: #1e40af; margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background-color: #f3f4f6; border: 1px solid #ddd; padding: 10px; text-align: left; }
            .badge-container { margin: 15px 0; }
            .summary-box { background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 8px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <h1>ResoLab 3D: LCR Series Circuit Report</h1>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          
          <h2>Experimental Parameters</h2>
          <ul>
            <li><strong>Resistor (R):</strong> ${circuitState.R} &Omega;</li>
            <li><strong>Inductor (L):</strong> ${(circuitState.L * 1000).toFixed(1)} mH</li>
            <li><strong>Capacitor (C):</strong> ${(circuitState.C * 1000000).toFixed(2)} &mu;F</li>
            <li><strong>Theoretical Resonant Frequency (f_r):</strong> ${metrics.f_r.toFixed(2)} Hz</li>
          </ul>

          <h2>Recorded Data Points</h2>
          ${
            dataPoints.length > 0
              ? `<table>
                  <thead>
                    <tr>
                      <th>Frequency (f)</th>
                      <th>Current (I_rms)</th>
                      <th>V_Resistor</th>
                      <th>V_Inductor</th>
                      <th>V_Capacitor</th>
                      <th>Phase Angle</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${tableHtml}
                  </tbody>
                </table>`
              : '<p><em>No data points recorded in this experiment.</em></p>'
          }

          <h2>Earned Badges & Achievements</h2>
          <div class="badge-container">${badgesHtml}</div>

          <div class="summary-box">
            <h3>Lab Conclusion & Grade</h3>
            <p>At the theoretical resonant frequency of <strong>${metrics.f_r.toFixed(1)} Hz</strong>, inductive reactance cancels capacitive reactance. The circuit's current peaks at <strong>${(
      circuitState.Vrms / circuitState.R
    ).toFixed(2)} A</strong>.</p>
            <p><strong>Data Density:</strong> ${dataPoints.length} points logged. <strong>Precision Grade:</strong> ${
      precisionScore !== null ? `${precisionScore}% Accuracy` : 'Not evaluated yet'
    }</p>
          </div>
        </body>
      </html>
    `;

    const blob = new Blob([reportContent], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ResoLab3D_Report_${Date.now()}.html`;
    link.click();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Challenges Card */}
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-4 shadow-2xl backdrop-blur-md flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
            <h3 className="text-md font-semibold text-slate-100 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Tuning Challenges & Quests
            </h3>
            <button
              onClick={() => {
                setIsPeerMode(!isPeerMode);
              }}
              className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-semibold border transition ${
                isPeerMode
                  ? 'bg-indigo-950 border-indigo-500/50 text-indigo-400'
                  : 'bg-slate-800 border-slate-750 text-slate-400 hover:text-slate-200'
              }`}
              title="Mirror state across multi-tab peer observation"
            >
              <Users className="w-3 h-3" />
              {isPeerMode ? 'Peer Observer: ON' : 'Observer Sync'}
            </button>
          </div>

          <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
            {challenges.map((ch) => {
              const isActive = activeChallengeId === ch.id;
              const isSetup = isChallengeSetupCorrect(ch);
              
              return (
                <div
                  key={ch.id}
                  className={`p-2.5 rounded-lg border text-xs transition cursor-pointer ${
                    ch.completed
                      ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-300'
                      : isActive
                      ? isSetup
                        ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-200'
                        : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                      : 'bg-slate-800/40 border-slate-750 text-slate-300 hover:bg-slate-800/80'
                  }`}
                  onClick={() => startChallenge(ch)}
                >
                  <div className="flex items-center justify-between font-bold mb-1">
                    <span>{ch.title}</span>
                    <span className="text-[10px] bg-slate-700/60 text-slate-300 px-1.5 py-0.5 rounded-full">
                      {ch.points} pts
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{ch.description}</p>
                  
                  {isActive && !ch.completed && (
                    <div className="mt-2 flex items-center justify-between border-t border-slate-800 pt-2 text-[10px]">
                      <span className={isSetup ? 'text-emerald-400 font-semibold' : 'text-amber-500 font-semibold'}>
                        {isSetup ? '✓ Component Values Matching' : '⚠️ Adjust components L, C, R to match values'}
                      </span>
                      {isSetup && isPowerOn && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            verifyResonance();
                          }}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-2 py-0.5 rounded text-[10px]"
                        >
                          Lock Resonance
                        </button>
                      )}
                    </div>
                  )}

                  {ch.completed && (
                    <div className="mt-1.5 text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" /> Completed!
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Score display */}
        {precisionScore !== null && (
          <div className="mt-3 bg-slate-950/60 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between">
            <span className="text-xs text-slate-400">Tuning Accuracy Score:</span>
            <span className={`text-md font-extrabold font-mono ${
              precisionScore >= 98 ? 'text-emerald-400' :
              precisionScore >= 90 ? 'text-indigo-400' :
              'text-amber-500'
            }`}>
              {precisionScore}%
            </span>
          </div>
        )}
      </div>

      {/* Lab Notebook Card */}
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-4 shadow-2xl backdrop-blur-md flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
            <h3 className="text-md font-semibold text-slate-100 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              Virtual Lab Notebook
            </h3>
            <div className="flex gap-2">
              <button
                onClick={logDataPoint}
                disabled={!isPowerOn || !isLoopClosed}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white font-semibold text-[10px] px-2.5 py-1 rounded transition flex items-center gap-1 shadow-md"
              >
                Log Data
              </button>
              <button
                onClick={clearDataPoints}
                className="bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-750 text-[10px] p-1 rounded transition"
                title="Reset log data"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Data Table */}
          <div className="overflow-y-auto max-h-[165px] border border-slate-800 rounded-lg bg-slate-950/50">
            {dataPoints.length > 0 ? (
              <table className="w-full text-[10px] text-slate-300 font-mono">
                <thead className="bg-slate-950 sticky top-0 text-[9px] uppercase tracking-wider text-slate-450">
                  <tr>
                    <th className="p-1.5 text-left border-b border-slate-850">Freq</th>
                    <th className="p-1.5 text-left border-b border-slate-850">Current</th>
                    <th className="p-1.5 text-left border-b border-slate-850">V_R</th>
                    <th className="p-1.5 text-left border-b border-slate-850">V_L</th>
                    <th className="p-1.5 text-left border-b border-slate-850">V_C</th>
                    <th className="p-1.5 text-left border-b border-slate-850">Phase</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {dataPoints.map((dp, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/60">
                      <td className="p-1.5">{dp.frequency.toFixed(1)}Hz</td>
                      <td className="p-1.5 text-indigo-400">{dp.I.toFixed(2)}A</td>
                      <td className="p-1.5">{dp.V_R.toFixed(1)}V</td>
                      <td className="p-1.5">{dp.V_L.toFixed(1)}V</td>
                      <td className="p-1.5">{dp.V_C.toFixed(1)}V</td>
                      <td className={`p-1.5 ${Math.abs(dp.phase) < 1 ? 'text-emerald-400 font-bold' : dp.phase > 0 ? 'text-purple-400' : 'text-cyan-400'}`}>
                        {dp.phase.toFixed(1)}°
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-[11px] text-slate-500 italic">
                Connect circuit, turn power ON, adjust frequency, and click "Log Data" to record experimental measurements.
              </div>
            )}
          </div>
        </div>

        {/* Notebook achievements and export */}
        <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between">
          <div className="text-[10px] text-slate-400 flex flex-wrap gap-1 max-w-[70%]">
            {badges.map((bg, i) => (
              <span
                key={i}
                className="bg-indigo-950/60 border border-indigo-850 text-indigo-400 font-bold px-1.5 py-0.5 rounded-full text-[9px] shadow-sm animate-fade-in"
              >
                ★ {bg}
              </span>
            ))}
          </div>
          <button
            onClick={exportLabReport}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-1.5 px-3 rounded-lg transition shadow-md flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Report
          </button>
        </div>
      </div>
    </div>
  );
};
export default Gamification;
