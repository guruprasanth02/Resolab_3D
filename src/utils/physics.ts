/**
 * Physics calculation engine for Series LCR Circuits.
 * All units are in standard SI (Hz, Ohms, Henrys, Farads, Volts, Amperes, Radians)
 */

export interface CircuitState {
  R: number; // Resistance (ohms)
  L: number; // Inductance (Henrys)
  C: number; // Capacitance (Farads)
  frequency: number; // Source frequency (Hz)
  Vrms: number; // Source voltage (V, RMS)
}

export interface CalculatedMetrics {
  XL: number; // Inductive Reactance (ohms)
  XC: number; // Capacitive Reactance (ohms)
  Z: number; // Impedance (ohms)
  Irms: number; // Current (A, RMS)
  phaseAngleRad: number; // Phase angle in radians
  phaseAngleDeg: number; // Phase angle in degrees
  f_r: number; // Resonant frequency (Hz)
  VR_rms: number; // Resistor voltage drop (V, RMS)
  VL_rms: number; // Inductor voltage drop (V, RMS)
  VC_rms: number; // Capacitor voltage drop (V, RMS)
  isResonant: boolean; // Is the circuit at resonance?
}

/**
 * Calculates LCR metrics based on active component values
 */
export function calculateLCR(state: CircuitState): CalculatedMetrics {
  const { R, L, C, frequency, Vrms } = state;

  const w = 2 * Math.PI * frequency;

  // Inductive reactance X_L = 2 * pi * f * L
  const XL = w * L;

  // Capacitive reactance X_C = 1 / (2 * pi * f * C)
  // Prevent division by zero
  const XC = C > 0 && w > 0 ? 1 / (w * C) : Infinity;

  // Impedance Z = sqrt( R^2 + (X_L - X_C)^2 )
  const reactanceDiff = XL - XC;
  const Z = Math.sqrt(R * R + reactanceDiff * reactanceDiff);

  // Current I = V / Z
  const Irms = Z > 0 ? Vrms / Z : 0;

  // Phase angle phi = arctan((X_L - X_C) / R)
  const phaseAngleRad = R > 0 ? Math.atan(reactanceDiff / R) : 0;
  const phaseAngleDeg = (phaseAngleRad * 180) / Math.PI;

  // Resonant frequency f_r = 1 / (2 * pi * sqrt(L * C))
  const f_r = L > 0 && C > 0 ? 1 / (2 * Math.PI * Math.sqrt(L * C)) : 0;

  // Component voltage drops (RMS)
  const VR_rms = Irms * R;
  const VL_rms = Irms * XL;
  const VC_rms = Irms * XC;

  // Resonance condition: X_L = X_C (within a small float tolerance)
  const resonanceTolerance = 1.0; // Hz tolerance
  const isResonant = Math.abs(frequency - f_r) <= resonanceTolerance;

  return {
    XL,
    XC,
    Z,
    Irms,
    phaseAngleRad,
    phaseAngleDeg,
    f_r,
    VR_rms,
    VL_rms,
    VC_rms,
    isResonant,
  };
}

/**
 * Calculates instantaneous voltages at time t (in seconds)
 * Using current i(t) = I_peak * sin(wt) as reference
 */
export function getInstantaneousValues(
  state: CircuitState,
  metrics: CalculatedMetrics,
  t: number
) {
  const { R, frequency } = state;
  const { Irms, XL, XC } = metrics;

  const w = 2 * Math.PI * frequency;
  const I_peak = Irms * Math.sqrt(2);

  // Reference current
  const i_t = I_peak * Math.sin(w * t);

  // Voltages
  // v_r is in phase with current: v_r = i(t)*R
  const v_r_t = I_peak * R * Math.sin(w * t);

  // v_l leads current by 90 deg (pi/2)
  const v_l_t = I_peak * XL * Math.sin(w * t + Math.PI / 2);

  // v_c lags current by 90 deg (-pi/2)
  const v_c_t = I_peak * XC * Math.sin(w * t - Math.PI / 2);

  // v_s = v_r + v_l + v_c = V_peak * sin(wt + phi)
  const v_s_t = v_r_t + v_l_t + v_c_t;

  return {
    current: i_t,
    v_r: v_r_t,
    v_l: v_l_t,
    v_c: v_c_t,
    v_s: v_s_t,
  };
}
