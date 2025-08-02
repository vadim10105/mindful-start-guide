import React, { useEffect, useRef } from 'react';

interface SkyBackgroundProps {
  className?: string;
  intensity?: number; // 0-1, how prominent the clouds are
  speed?: number; // Cloud movement speed multiplier
}

export const SkyBackground: React.FC<SkyBackgroundProps> = ({ 
  className = "", 
  intensity = 0.6,
  speed = 1.0 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const fragmentShaderSource = `
    #ifdef GL_ES
    precision mediump float;
    #endif

    uniform vec2 u_resolution;
    uniform float u_time;
    uniform float u_intensity;
    uniform float u_speed;

    // Improved noise function
    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        
        vec2 u = f * f * (3.0 - 2.0 * f);
        
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    // Fractal Brownian Motion for clouds
    float fbm(vec2 st) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 1.0;
        
        for (int i = 0; i < 6; i++) {
            value += amplitude * noise(st * frequency);
            frequency *= 2.0;
            amplitude *= 0.5;
        }
        return value;
    }

    void main() {
        vec2 st = gl_FragCoord.xy / u_resolution.xy;
        
        // Dynamic cloud movement with varying speeds - much faster!
        vec2 windDirection = vec2(1.0, 0.2); // Main wind direction
        vec2 fastClouds = st * 6.0 + windDirection * u_time * 0.15 * u_speed;
        vec2 slowClouds = st * 4.0 + windDirection * u_time * 0.08 * u_speed;
        
        // Mix different cloud layers for more dynamic movement
        float fastCloudNoise = fbm(fastClouds);
        float slowCloudNoise = fbm(slowClouds);
        float clouds = mix(fastCloudNoise, slowCloudNoise, 0.6);
        
        // Add noticeable wind variation
        vec2 windVariation = vec2(sin(u_time * 0.5), cos(u_time * 0.3)) * 0.3;
        clouds += fbm((st + windVariation) * 8.0 + u_time * 0.1) * 0.15;
        
        // Cloud threshold with better visibility
        float cloudThreshold = 0.55 - (u_intensity * 0.25);
        float cloudStrength = smoothstep(cloudThreshold - 0.12, cloudThreshold + 0.25, clouds);
        
        // Create prominence variation - some clouds more defined than others
        float prominenceNoise = fbm(st * 2.0 + u_time * 0.03);
        float cloudProminence = smoothstep(0.3, 0.8, prominenceNoise);
        
        // Mix between subtle and prominent clouds with better visibility
        float finalCloudStrength = mix(cloudStrength * 0.5, cloudStrength * 1.2, cloudProminence);
        
        // Gentle sky gradient
        vec3 skyColor = mix(
            vec3(0.85, 0.92, 0.98),  // Very light blue at horizon
            vec3(0.70, 0.85, 0.95),  // Slightly deeper blue at top
            st.y * 0.5
        );
        
        // Bright white cloud colors with prominence variation
        vec3 baseCloudColor = mix(
            vec3(1.0, 1.0, 1.0),     // Pure white clouds
            vec3(0.95, 0.97, 1.0),   // Very slight blue tint at top
            st.y * 0.3
        );
        
        // Add more defined cloud shadows that move with wind
        vec2 shadowOffset = windDirection * u_time * 0.05 + vec2(0.05, 0.05);
        float cloudShadow = fbm(fastClouds * 1.2 + shadowOffset) * 0.12;
        baseCloudColor = mix(baseCloudColor, vec3(0.85, 0.90, 0.95), cloudShadow);
        
        // Make prominent clouds extra bright and defined
        vec3 prominentCloudColor = mix(baseCloudColor, vec3(1.1, 1.1, 1.1), cloudProminence * 0.5);
        vec3 cloudColor = mix(baseCloudColor * 0.9, prominentCloudColor, cloudProminence);
        
        // Blend sky and clouds with variable prominence
        vec3 finalColor = mix(skyColor, cloudColor, finalCloudStrength * 0.85);
        
        // Add very subtle atmospheric glow
        float atmosphere = 1.0 - abs(st.y - 0.5) * 1.5;
        finalColor += vec3(0.02, 0.03, 0.05) * atmosphere;
        
        gl_FragColor = vec4(finalColor, 1.0);
    }
  `;

  const vertexShaderSource = `
    attribute vec4 a_position;
    void main() {
        gl_Position = a_position;
    }
  `;

  const createShader = (gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  };

  const createProgram = (gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null => {
    const program = gl.createProgram();
    if (!program) return null;
    
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program linking error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    
    return program;
  };

  const setupWebGL = () => {
    const canvas = canvasRef.current;
    if (!canvas) return false;

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      console.warn('WebGL not supported, sky background will be static');
      return false;
    }

    glRef.current = gl;

    // Create shaders
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    
    if (!vertexShader || !fragmentShader) return false;

    // Create program
    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) return false;

    programRef.current = program;

    // Create vertex buffer (full screen quad)
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]), gl.STATIC_DRAW);

    // Get attribute location
    const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    return true;
  };

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      
      if (glRef.current) {
        glRef.current.viewport(0, 0, displayWidth, displayHeight);
      }
    }
  };

  const render = () => {
    const gl = glRef.current;
    const program = programRef.current;
    const canvas = canvasRef.current;
    
    if (!gl || !program || !canvas) return;

    resizeCanvas();

    gl.clearColor(0.7, 0.85, 0.95, 1.0); // Fallback sky color
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);

    // Set uniforms
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    const timeLocation = gl.getUniformLocation(program, 'u_time');
    const intensityLocation = gl.getUniformLocation(program, 'u_intensity');
    const speedLocation = gl.getUniformLocation(program, 'u_speed');

    if (resolutionLocation) {
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    }
    if (timeLocation) {
      gl.uniform1f(timeLocation, (Date.now() - startTimeRef.current) / 1000.0);
    }
    if (intensityLocation) {
      gl.uniform1f(intensityLocation, intensity);
    }
    if (speedLocation) {
      gl.uniform1f(speedLocation, speed);
    }

    // Draw
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    animationRef.current = requestAnimationFrame(render);
  };

  useEffect(() => {
    if (setupWebGL()) {
      render();
    }

    const handleResize = () => resizeCanvas();
    window.addEventListener('resize', handleResize);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [intensity, speed]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 w-full h-full ${className}`}
      style={{
        background: 'linear-gradient(to bottom, #87ceeb 0%, #e0f6ff 50%, #f0f8ff 100%)', // Sky blue fallback
        zIndex: -1,
      }}
    />
  );
};