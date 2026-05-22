import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
// We will implement our own simple orbit controls or use a lightweight rotation hook to avoid package resolution issues, or import OrbitControls from three/examples/jsm/controls/OrbitControls
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { CircuitState, CalculatedMetrics } from '../utils/physics';

interface Phasor3DProps {
  circuitState: CircuitState;
  metrics: CalculatedMetrics;
  isPowerOn: boolean;
}

export const Phasor3D: React.FC<Phasor3DProps> = ({
  circuitState,
  metrics,
  isPowerOn,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create scene, camera, and renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b1329'); // Dark midnight blue

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 300;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(7, 6, 8); // 3D oblique view

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Orbit controls for interactive rotation
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 25;
    controls.minDistance = 3;

    // Add ambient and directional lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // Grid helper on XZ plane
    const gridHelper = new THREE.GridHelper(10, 10, 0x475569, 0x1e293b);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // Draw Axes (X = VR, Y = VL/VC, Z = Time/Resultant depth)
    const axesLength = 5;
    const xColor = 0x22d3ee; // VR (cyan)
    const yColor = 0xa78bfa; // VL/VC (violet)
    const zColor = 0x475569; // Z-axis (slate)

    const xArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), axesLength, xColor, 0.4, 0.25);
    const yArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), axesLength, yColor, 0.4, 0.25);
    const zArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), axesLength, zColor, 0.4, 0.25);
    scene.add(xArrow);
    scene.add(yArrow);
    scene.add(zArrow);

    // Custom labels for Axes
    const createTextSprite = (text: string, color: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.fillRect(0,0,64,32);
        ctx.font = 'bold 20px sans-serif';
        ctx.fillStyle = color;
        ctx.fillText(text, 10, 24);
      }
      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(1.2, 0.6, 1.0);
      return sprite;
    };

    const labelVR = createTextSprite('V_R', '#22d3ee');
    labelVR.position.set(5.5, 0, 0);
    scene.add(labelVR);

    const labelVL = createTextSprite('V_L', '#a78bfa');
    labelVL.position.set(0, 5.5, 0);
    scene.add(labelVL);

    const labelVC = createTextSprite('V_C', '#eab308');
    labelVC.position.set(0, -5.5, 0);
    scene.add(labelVC);

    const labelTime = createTextSprite('Time', '#64748b');
    labelTime.position.set(0, 0, 5.5);
    scene.add(labelTime);

    // Vector meshes (rendered dynamically inside render loop)
    // We will draw cylinders/arrows for:
    // - VR vector (horizontal cyan)
    // - VL vector (upward violet)
    // - VC vector (downward gold)
    // - VS vector (total source voltage: resultant - magenta)
    
    // We'll create custom arrow helpers for the dynamic values
    const vrArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 1, 0x06b6d4, 0.4, 0.2); // VR (cyan)
    const vlArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 1, 0x8b5cf6, 0.4, 0.2); // VL (violet)
    const vcArrow = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 0), 1, 0xeab308, 0.4, 0.2); // VC (gold)
    const vsArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 1, 0), new THREE.Vector3(0, 0, 0), 1, 0xec4899, 0.4, 0.2); // VS (magenta)
    
    scene.add(vrArrow);
    scene.add(vlArrow);
    scene.add(vcArrow);
    scene.add(vsArrow);

    // Helix trace helper to represent the voltage trace wrapping along the time axis (Z-axis)
    const maxTracePoints = 200;
    const traceGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(maxTracePoints * 3);
    traceGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const traceMaterial = new THREE.LineBasicMaterial({ color: 0xec4899, linewidth: 2, transparent: true, opacity: 0.8 });
    const traceLine = new THREE.Line(traceGeometry, traceMaterial);
    scene.add(traceLine);

    // Resonance sphere indicator (glows at center at resonance)
    const resonanceGeo = new THREE.SphereGeometry(0.4, 32, 32);
    const resonanceMat = new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.0 });
    const resonanceMesh = new THREE.Mesh(resonanceGeo, resonanceMat);
    scene.add(resonanceMesh);

    // Loop variables
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(container);

    const animate = () => {
      const elapsed = clock.getElapsedTime();
      
      if (isPowerOn) {
        const w = 2 * Math.PI * circuitState.frequency;
        
        // Calculate voltage peak components for arrow lengths
        // Vrms -> peak scaling factor (let's scale so 10V matches 4 units length)
        const scale = 3.5 / Math.max(5, circuitState.Vrms * 1.5);
        const VR_peak = metrics.VR_rms * Math.sqrt(2) * scale;
        const VL_peak = metrics.VL_rms * Math.sqrt(2) * scale;
        const VC_peak = metrics.VC_rms * Math.sqrt(2) * scale;

        // Current phase reference
        const angle = w * elapsed;

        // Vector directions: rotating in XY plane
        // Current/VR: in-phase reference angle
        const vrDir = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0).normalize();
        const vrLen = Math.max(0.1, VR_peak);
        vrArrow.setDirection(vrDir);
        vrArrow.setLength(vrLen, 0.3 * vrLen, 0.15 * vrLen);

        // VL: leads by 90 deg
        const vlDir = new THREE.Vector3(Math.cos(angle + Math.PI / 2), Math.sin(angle + Math.PI / 2), 0).normalize();
        const vlLen = Math.max(0.1, VL_peak);
        vlArrow.setDirection(vlDir);
        vlArrow.setLength(vlLen, 0.3 * vlLen, 0.15 * vlLen);

        // VC: lags by 90 deg
        const vcDir = new THREE.Vector3(Math.cos(angle - Math.PI / 2), Math.sin(angle - Math.PI / 2), 0).normalize();
        const vcLen = Math.max(0.1, VC_peak);
        vcArrow.setDirection(vcDir);
        vcArrow.setLength(vcLen, 0.3 * vcLen, 0.15 * vcLen);

        // VS: Total voltage (resultant sum of vectors)
        // Vector sum: Vr_vec + Vl_vec + Vc_vec
        const vsX = Math.cos(angle) * VR_peak + Math.cos(angle + Math.PI/2) * VL_peak + Math.cos(angle - Math.PI/2) * VC_peak;
        const vsY = Math.sin(angle) * VR_peak + Math.sin(angle + Math.PI/2) * VL_peak + Math.sin(angle - Math.PI/2) * VC_peak;
        const vsVec = new THREE.Vector3(vsX, vsY, 0);
        const vsLen = Math.max(0.1, vsVec.length());
        
        vsArrow.setDirection(vsVec.clone().normalize());
        vsArrow.setLength(vsLen, 0.3 * vsLen, 0.15 * vsLen);

        // Show/hide arrows if voltage is very small
        vrArrow.visible = VR_peak > 0.01;
        vlArrow.visible = VL_peak > 0.01;
        vcArrow.visible = VC_peak > 0.01;
        vsArrow.visible = vsLen > 0.01;

        // Helix drawing:
        // Z represents time going backward (so waves propagate forward along Z).
        // At Z = 0, it starts at the head of VS vector.
        // For larger Z, it shows the history of the VS vector at previous time steps.
        const positionAttr = traceGeometry.attributes.position as THREE.BufferAttribute;
        const helixPitch = 0.035; // depth spacing per step
        
        for (let i = 0; i < maxTracePoints; i++) {
          const z = i * helixPitch;
          const prevTime = elapsed - (i * 0.0003); // delay mapping
          const prevAngle = w * prevTime;

          const pX = Math.cos(prevAngle) * VR_peak + Math.cos(prevAngle + Math.PI/2) * VL_peak + Math.cos(prevAngle - Math.PI/2) * VC_peak;
          const pY = Math.sin(prevAngle) * VR_peak + Math.sin(prevAngle + Math.PI/2) * VL_peak + Math.sin(prevAngle - Math.PI/2) * VC_peak;
          
          positionAttr.setXYZ(i, pX, pY, z);
        }
        positionAttr.needsUpdate = true;
        traceLine.visible = true;

        // Resonance feedback visual
        if (metrics.isResonant) {
          const oscIntensity = 0.5 + 0.5 * Math.sin(elapsed * 12);
          resonanceMesh.scale.setScalar(1 + oscIntensity * 0.3);
          (resonanceMesh.material as THREE.MeshBasicMaterial).opacity = 0.3 + oscIntensity * 0.4;
          resonanceMesh.visible = true;
        } else {
          resonanceMesh.visible = false;
        }
      } else {
        // Zero length when power is off
        vrArrow.visible = false;
        vlArrow.visible = false;
        vcArrow.visible = false;
        vsArrow.visible = false;
        traceLine.visible = false;
        resonanceMesh.visible = false;
      }

      controls.update();
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      resonanceGeo.dispose();
      resonanceMat.dispose();
      traceGeometry.dispose();
      traceMaterial.dispose();
    };
  }, [circuitState, metrics, isPowerOn]);

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-700/80 rounded-xl p-4 shadow-2xl h-full backdrop-blur-md">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-md font-semibold text-slate-100 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-fuchsia-500 animate-pulse"></span>
          Rotating 3D Phasor Arena
        </h3>
        <div className="text-[10px] text-slate-400 font-mono flex gap-3">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-1.5 bg-cyan-400 rounded-sm"></span> V_R
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-1.5 bg-violet-400 rounded-sm"></span> V_L
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-1.5 bg-yellow-400 rounded-sm"></span> V_C
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-1.5 bg-pink-500 rounded-sm"></span> V_S
          </span>
        </div>
      </div>
      
      {/* 3D container */}
      <div 
        ref={containerRef} 
        className="relative flex-grow min-h-[220px] rounded-lg overflow-hidden border border-slate-800 shadow-inner cursor-grab active:cursor-grabbing"
      >
        <div className="absolute top-2 right-2 bg-slate-950/80 border border-slate-800 text-[10px] text-slate-400 px-2 py-1 rounded font-mono pointer-events-none">
          Drag to rotate 3D space
        </div>
      </div>
    </div>
  );
};
export default Phasor3D;
