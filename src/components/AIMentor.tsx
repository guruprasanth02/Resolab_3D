import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, BrainCircuit, Key, Info } from 'lucide-react';
import type { CircuitState, CalculatedMetrics } from '../utils/physics';

interface AIMentorProps {
  circuitState: CircuitState;
  metrics: CalculatedMetrics;
  isPowerOn: boolean;
  isLoopClosed: boolean;
}

interface Message {
  sender: 'ai' | 'user';
  text: string;
  timestamp: Date;
}

export const AIMentor: React.FC<AIMentorProps> = ({
  circuitState,
  metrics,
  isPowerOn,
  isLoopClosed,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Initial welcome message
  useEffect(() => {
    setMessages([
      {
        sender: 'ai',
        text: "Hello! I am your AI Lab Mentor. I'm monitoring your LCR circuit in real-time. Connect the components, sweep the frequency, and ask me any questions about phase angles, reactances, or resonance!",
        timestamp: new Date(),
      },
    ]);
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Real-time Physics Diagnostic Report based on current simulation state
  const getDiagnosticMessage = () => {
    if (!isLoopClosed) {
      return {
        title: 'Circuit Incomplete',
        text: 'The series LCR loop is not closed. Use the virtual wiring tool to connect: Generator (+) → Resistor → Inductor → Capacitor → Generator (-).',
        status: 'warning',
      };
    }
    if (!isPowerOn) {
      return {
        title: 'Power Source Off',
        text: 'The function generator is off. Toggle the power switch to start the AC current flow.',
        status: 'info',
      };
    }

    const { frequency } = circuitState;
    const { XL, XC, f_r, phaseAngleDeg, isResonant } = metrics;

    if (isResonant) {
      return {
        title: 'Resonance Lock Achieved!',
        text: `At f = ${frequency.toFixed(1)}Hz, XL = XC = ${XL.toFixed(1)}Ω. They perfectly cancel each other, leaving only the Resistor (${circuitState.R}Ω) to limit current. The phase angle is 0.0°—voltage and current are completely in-phase.`,
        status: 'success',
      };
    }

    if (frequency < f_r) {
      return {
        title: 'Capacitive State (Low Frequency)',
        text: `Frequency (${frequency.toFixed(1)}Hz) is below resonance (${f_r.toFixed(1)}Hz). XC (${XC.toFixed(1)}Ω) is greater than XL (${XL.toFixed(1)}Ω). The circuit is capacitive. The phase angle is ${phaseAngleDeg.toFixed(1)}°—current LEADS voltage.`,
        status: 'capacitive',
      };
    }

    return {
      title: 'Inductive State (High Frequency)',
      text: `Frequency (${frequency.toFixed(1)}Hz) is above resonance (${f_r.toFixed(1)}Hz). XL (${XL.toFixed(1)}Ω) is greater than XC (${XC.toFixed(1)}Ω). The circuit is inductive. The phase angle is +${phaseAngleDeg.toFixed(1)}°—current LAGS voltage.`,
      status: 'inductive',
    };
  };

  const diagnostic = getDiagnosticMessage();

  // Local rule-based dictionary for quick, zero-latency physics help
  const getLocalResponse = (q: string): string => {
    const query = q.toLowerCase();
    
    if (query.includes('resonance') && (query.includes('what') || query.includes('define') || query.includes('explain'))) {
      return "Resonance in a series LCR circuit occurs when the inductive reactance (XL = 2πfL) and capacitive reactance (XC = 1/(2πfC)) are equal in magnitude but opposite in phase. Because they are 180° out of phase, they cancel each other out, reducing the circuit's total impedance (Z) to its minimum value: the resistance (R). This causes the current to peak and the phase angle (φ) between the source voltage and current to become 0°.";
    }
    if (query.includes('formula') || query.includes('calculate')) {
      return "Key LCR formulas:\n" +
             "• Inductive Reactance: XL = 2 * π * f * L\n" +
             "• Capacitive Reactance: XC = 1 / (2 * π * f * C)\n" +
             "• Impedance: Z = √(R² + (XL - XC)²)\n" +
             "• Resonant Frequency: f_r = 1 / (2 * π * √(L * C))\n" +
             "• Phase Angle: φ = arctan((XL - XC) / R)";
    }
    if (query.includes('phase angle') || query.includes('phase shift') || query.includes('lead') || query.includes('lag')) {
      return "The phase angle φ measures the time offset between the AC voltage wave and the AC current wave. In a resistor, they are in phase. In a pure inductor, voltage leads current by 90°. In a pure capacitor, voltage lags current by 90°. In series LCR, at frequencies below resonance (capacitive), the current leads the source voltage (negative phase angle). Above resonance (inductive), the current lags the source voltage (positive phase angle). At resonance, they are in phase (0°).";
    }
    if (query.includes('q factor') || query.includes('quality factor')) {
      return "The Quality (Q) Factor is a dimensionless parameter that describes how 'sharp' or selective the resonance peak is. A higher Q factor means a narrower resonance peak and higher voltage magnification across the inductor or capacitor. It is calculated as Q = (2 * π * f_r * L) / R = 1/R * √(L/C). Reducing resistance increases the Q-factor, making the current curve much sharper!";
    }
    if (query.includes('impedance') || query.includes('what is z')) {
      return "Impedance (Z) is the total opposition that a circuit offers to alternating current (AC). It is the AC equivalent of DC resistance. In a series LCR circuit, Z is the vector sum of resistance (R) and reactance (XL - XC). Formula: Z = √(R² + (XL - XC)²). At resonance, XL - XC = 0, so Z reaches its minimum possible value: Z = R.";
    }
    if (query.includes('voltage magnification') || query.includes('voltage exceed')) {
      return "Yes, in a high-Q series LCR circuit at resonance, the voltage drops across the inductor (VL) and capacitor (VC) can actually exceed the source voltage (VS) by a factor of Q! This is because energy is oscillating back and forth between L and C, building up large voltages that cancel each other out vectorially, so the net voltage sum still equals the source voltage.";
    }
    if (query.includes('hello') || query.includes('hi ') || query.includes('hey')) {
      return "Hello! I am ready to help you with your circuit experiment. Ask me anything about reactances, phase relationships, formulas, or how to tune your circuit to resonance.";
    }

    return "That's an interesting question! To give you a detailed answer on that topic, you can provide a Gemini API Key using the key button in the top right, and I'll invoke full AI capabilities. Otherwise, ask me about 'resonance', 'formulas', 'impedance', 'phase angle', or 'Q factor'!";
  };

  // Call actual Gemini API if API key is provided
  const queryGemini = async (userPrompt: string): Promise<string> => {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `You are an expert Physics and Electrical Engineering Tutor. You are helping a student in an interactive 3D LCR circuit simulator. 
                    The current circuit values are:
                    Resistor R: ${circuitState.R} ohms
                    Inductor L: ${(circuitState.L * 1000).toFixed(1)} mH
                    Capacitor C: ${(circuitState.C * 1000000).toFixed(1)} uF
                    AC Frequency f: ${circuitState.frequency.toFixed(1)} Hz
                    Source Voltage V_rms: ${circuitState.Vrms} V
                    Calculated Reactance XL: ${metrics.XL.toFixed(1)} ohms, XC: ${metrics.XC.toFixed(1)} ohms
                    Impedance Z: ${metrics.Z.toFixed(1)} ohms, Current I_rms: ${metrics.Irms.toFixed(2)} A
                    Phase Angle: ${metrics.phaseAngleDeg.toFixed(1)} degrees
                    Theoretical Resonant Frequency: ${metrics.f_r.toFixed(1)} Hz
                    Loop closed: ${isLoopClosed ? 'Yes' : 'No'}, Power on: ${isPowerOn ? 'Yes' : 'No'}.

                    Answer the student's question in a clear, educational, and engaging way. Keep your answer reasonably concise (1-2 paragraphs), and use formatting (bolding, lists) to make it highly readable.
                    
                    Student question: ${userPrompt}`,
                  },
                ],
              },
            ],
          }),
        }
      );

      const data = await response.json();
      if (data.candidates && data.candidates[0].content.parts[0].text) {
        return data.candidates[0].content.parts[0].text;
      }
      return 'Sorry, I received an empty response from Gemini. Please check your API key.';
    } catch (error) {
      console.error(error);
      return 'Failed to reach Gemini. Please verify your internet connection and API key validity.';
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      sender: 'user',
      text: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response delay
    setTimeout(async () => {
      let aiText = '';
      if (apiKey) {
        aiText = await queryGemini(userMessage.text);
      } else {
        aiText = getLocalResponse(userMessage.text);
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: aiText,
          timestamp: new Date(),
        },
      ]);
      setIsTyping(false);
    }, 800);
  };

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl h-full backdrop-blur-md overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between bg-slate-950 px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2 text-indigo-400 font-semibold">
          <BrainCircuit className="w-5 h-5" />
          <span>AI Lab Mentor</span>
        </div>
        <button
          onClick={() => setShowKeyInput(!showKeyInput)}
          className={`p-1.5 rounded transition ${
            apiKey
              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
          title="Configure Gemini API Key"
        >
          <Key className="w-4 h-4" />
        </button>
      </div>

      {/* API Key Modal Slide-down */}
      {showKeyInput && (
        <div className="bg-slate-950 border-b border-slate-800 p-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Info className="w-3.5 h-3.5" />
            <span>Enter a Gemini API Key to enable open-ended chat capability.</span>
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="flex-grow bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={() => setShowKeyInput(false)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded px-3 py-1 text-xs transition"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Real-time Diagnostics (Wow Factor) */}
      <div className="p-3 bg-slate-950/40 border-b border-slate-800">
        <div className={`p-3 rounded-lg border text-xs leading-relaxed ${
          diagnostic.status === 'success' ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' :
          diagnostic.status === 'warning' ? 'bg-amber-950/30 border-amber-500/30 text-amber-300' :
          diagnostic.status === 'capacitive' ? 'bg-cyan-950/30 border-cyan-500/30 text-cyan-300' :
          diagnostic.status === 'inductive' ? 'bg-purple-950/30 border-purple-500/30 text-purple-300' :
          'bg-slate-900 border-slate-800 text-slate-300'
        }`}>
          <div className="font-bold mb-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            {diagnostic.title}
          </div>
          <p className="font-mono text-[11px] whitespace-pre-line">{diagnostic.text}</p>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-grow overflow-y-auto p-4 space-y-3 min-h-[160px]">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-2.5 text-xs whitespace-pre-line leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none shadow-md'
                  : 'bg-slate-800/80 text-slate-200 border border-slate-700/50 rounded-bl-none shadow-sm'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-800/80 text-slate-400 border border-slate-700/50 rounded-lg rounded-bl-none p-2.5 text-xs flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-100"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-200"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
        <input
          type="text"
          placeholder="Ask a question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-grow bg-slate-900 border border-slate-750 text-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 placeholder-slate-500"
        />
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg transition shadow-md flex items-center justify-center"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
export default AIMentor;
