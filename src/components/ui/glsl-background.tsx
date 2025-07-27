import React, { useRef, useEffect } from 'react';

const GLSLBackground: React.FC<{ className?: string }> = ({ className = "" }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initialize WebGL
    const gl = canvas.getContext('webgl');
    if (!gl) {
      console.warn('WebGL not supported');
      return;
    }
    glRef.current = gl;

    // Vertex shader - creates full screen quad
    const vertexShaderSource = `
      attribute vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    // Fragment shader - fractal Brownian motion
    const fragmentShaderSource = `
      precision mediump float;
      
      uniform float u_time;
      uniform vec2 u_resolution;
      
      // Better hash function for pseudo-random values
      vec2 hash2(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
      }
      
      // Improved Perlin-style noise for clouds
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        
        // Quintic interpolation for smoother results
        vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
        
        return mix(mix(dot(hash2(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
                      dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
                  mix(dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
                      dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x), u.y);
      }
      
      // Fractal Brownian Motion - the magic happens here
      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 1.0;
        
        // Layer multiple octaves of noise
        for (int i = 0; i < 6; i++) {
          value += amplitude * noise(p * frequency);
          amplitude *= 0.5;   // Each octave has half the amplitude
          frequency *= 2.0;   // Each octave has double the frequency
        }
        
        return value;
      }
      
      void main() {
        vec2 st = gl_FragCoord.xy / u_resolution.xy;
        st.x *= u_resolution.x / u_resolution.y; // Correct aspect ratio
        
        // Slower, more natural cloud movement
        float time = u_time * 0.15;
        
        // Large cloud formations (slow-moving base layer)
        vec2 cloudBase = st * 1.5 + vec2(time * 0.1, time * 0.05);
        float baseClouds = fbm(cloudBase);
        
        // Medium cloud details
        vec2 cloudMid = st * 3.0 + vec2(time * 0.2, -time * 0.15);
        float midClouds = fbm(cloudMid);
        
        // Fine cloud wisps and details
        vec2 cloudDetail = st * 6.0 + vec2(-time * 0.3, time * 0.25);
        float detailClouds = fbm(cloudDetail);
        
        // Cloud density with more dramatic contrast
        float cloudDensity = baseClouds * 0.6 + midClouds * 0.25 + detailClouds * 0.15;
        
        // Create distinct cloud shapes using smoothstep
        float clouds = smoothstep(0.35, 0.8, cloudDensity);
        clouds = clouds * clouds * (3.0 - 2.0 * clouds); // More contrast
        
        // Cloud-like coloring with more atmospheric feel
        vec3 skyColor = vec3(0.12, 0.14, 0.18);      // Deep night sky
        vec3 cloudShadow = vec3(0.16, 0.18, 0.22);   // Cloud shadows
        vec3 cloudBody = vec3(0.22, 0.25, 0.32);     // Main cloud mass
        vec3 cloudHighlight = vec3(0.28, 0.32, 0.42); // Cloud highlights
        
        // Create atmospheric layering
        vec3 color = skyColor;
        
        // Add cloud shadows (darker areas)
        float shadowMask = smoothstep(0.2, 0.5, cloudDensity);
        color = mix(color, cloudShadow, shadowMask * 0.7);
        
        // Add main cloud body
        color = mix(color, cloudBody, clouds * 0.8);
        
        // Add bright cloud highlights
        float highlights = smoothstep(0.7, 1.0, clouds) * smoothstep(0.6, 0.9, baseClouds);
        color = mix(color, cloudHighlight, highlights * 0.6);
        
        // Add subtle warm tint to highlights (like moonlight)
        float warmth = highlights * smoothstep(0.8, 1.0, clouds);
        color += vec3(warmth * 0.1, warmth * 0.08, warmth * 0.02);
        
        // Add depth with subtle blue tint in darker areas
        float depth = (1.0 - clouds) * smoothstep(0.1, 0.3, cloudDensity);
        color += vec3(depth * 0.02, depth * 0.04, depth * 0.08);
        
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    // Shader compilation helper
    const createShader = (type: number, source: string): WebGLShader | null => {
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

    // Create program
    const createProgram = (vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null => {
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

    // Compile shaders
    const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
    
    if (!vertexShader || !fragmentShader) return;

    const program = createProgram(vertexShader, fragmentShader);
    if (!program) return;
    
    programRef.current = program;

    // Set up full-screen quad geometry
    const positions = new Float32Array([
      -1, -1,  // Bottom left
       1, -1,  // Bottom right
      -1,  1,  // Top left
      -1,  1,  // Top left
       1, -1,  // Bottom right
       1,  1,  // Top right
    ]);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    // Get attribute and uniform locations
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const timeLocation = gl.getUniformLocation(program, 'u_time');
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');

    // Resize handler
    const resizeCanvas = () => {
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;
      
      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
    };

    // Render loop
    const render = (time: number) => {
      resizeCanvas();
      
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      
      gl.useProgram(program);
      
      // Set uniforms
      gl.uniform1f(timeLocation, time * 0.001);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      
      // Set up vertex attributes
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
      
      // Draw the full-screen quad
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      
      animationRef.current = requestAnimationFrame(render);
    };

    // Start the render loop
    animationRef.current = requestAnimationFrame(render);

    // Initial resize
    resizeCanvas();

    // Cleanup function
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (program) {
        gl.deleteProgram(program);
      }
      if (vertexShader) {
        gl.deleteShader(vertexShader);
      }
      if (fragmentShader) {
        gl.deleteShader(fragmentShader);
      }
      if (positionBuffer) {
        gl.deleteBuffer(positionBuffer);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 w-full h-full ${className}`}
      style={{ zIndex: -10 }}
    />
  );
};

export default GLSLBackground;