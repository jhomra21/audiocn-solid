// Adapted from WebThreads by React Bits and the audiocn upstream site.
// Site-only rendering code; it is never included in registry items.

import { Mesh, Program, Renderer, Triangle } from "ogl";
import { onSettled } from "solid-js";

import { createCompatEffect } from "@/lib/solid/effect";
import { cn } from "@/lib/utils";

export type FanMode = "center" | "left" | "right";

export interface WebThreadsProps {
  backgroundColor?: string;
  brightness?: number;
  class?: string;
  color1?: string;
  color2?: string;
  color3?: string;
  falloff?: number;
  fanMode?: FanMode;
  frequency?: number;
  glow?: number;
  grain?: boolean;
  grainIntensity?: number;
  lightMode?: boolean;
  mirror?: boolean;
  mouseInteraction?: boolean;
  mouseStrength?: number;
  opacity?: number;
  position?: number;
  shimmer?: boolean;
  speed?: number;
  spread?: number;
  taper?: number;
  thickness?: number;
  threadCount?: number;
}

interface Uniform<T> {
  value: T;
}

interface Uniforms {
  iResolution: Uniform<Float32Array>;
  iTime: Uniform<number>;
  uBackgroundColor: Uniform<Float32Array>;
  uBrightness: Uniform<number>;
  uColor1: Uniform<Float32Array>;
  uColor2: Uniform<Float32Array>;
  uColor3: Uniform<Float32Array>;
  uEnableMouse: Uniform<number>;
  uFalloff: Uniform<number>;
  uFanMode: Uniform<number>;
  uFrequency: Uniform<number>;
  uGlow: Uniform<number>;
  uGrain: Uniform<number>;
  uGrainIntensity: Uniform<number>;
  uLightMode: Uniform<boolean>;
  uMirror: Uniform<number>;
  uMouse: Uniform<Float32Array>;
  uMouseActive: Uniform<number>;
  uMouseStrength: Uniform<number>;
  uOpacity: Uniform<number>;
  uPosition: Uniform<number>;
  uShimmer: Uniform<number>;
  uSpeed: Uniform<number>;
  uSpread: Uniform<number>;
  uTaper: Uniform<number>;
  uThickness: Uniform<number>;
  uThreadCount: Uniform<number>;
}

interface ResolvedProps {
  backgroundColor: string;
  brightness: number;
  color1: string;
  color2: string;
  color3: string;
  falloff: number;
  fanMode: FanMode;
  frequency: number;
  glow: number;
  grain: boolean;
  grainIntensity: number;
  lightMode: boolean;
  mirror: boolean;
  mouseInteraction: boolean;
  mouseStrength: number;
  opacity: number;
  position: number;
  shimmer: boolean;
  speed: number;
  spread: number;
  taper: number;
  thickness: number;
  threadCount: number;
}

const HEX_COLOR = /^#?[\da-f]{6}$/iu;

const CHANNEL_MAX = 255;

const MAX_DPR = 2;

const MS_PER_SECOND = 1000;

const MOUSE_EASING = 0.05;

const FAN_MODE: Record<FanMode, number> = {
  center: 0,
  left: 1,
  right: 2,
};

const DEFAULTS: ResolvedProps = {
  backgroundColor: "#FFFFFF",
  brightness: 0.6,
  color1: "#5227FF",
  color2: "#FF9FFC",
  color3: "#FFFFFF",
  falloff: 0.6,
  fanMode: "center",
  frequency: 5,
  glow: 0.02,
  grain: true,
  grainIntensity: 0.05,
  lightMode: false,
  mirror: true,
  mouseInteraction: true,
  mouseStrength: 0.3,
  opacity: 1,
  position: 0.5,
  shimmer: false,
  speed: 0.2,
  spread: 0.18,
  taper: 1,
  thickness: 1.1,
  threadCount: 6,
};

const vertex = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uSpeed;
uniform float uThreadCount;
uniform float uFrequency;
uniform float uSpread;
uniform float uTaper;
uniform float uPosition;
uniform float uFanMode;
uniform float uGlow;
uniform float uFalloff;
uniform float uThickness;
uniform float uBrightness;
uniform float uOpacity;
uniform float uMirror;
uniform float uShimmer;
uniform float uGrain;
uniform float uGrainIntensity;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec3 uBackgroundColor;
uniform bool uLightMode;
uniform vec2 uMouse;
uniform float uMouseStrength;
uniform float uEnableMouse;
uniform float uMouseActive;
out vec4 fragColor;

#define TAU 6.28318530718
#define MAX_THREADS 10

float glow(float x, float str, float dist) {
  return dist / pow(max(x, 1e-4), str);
}

void main() {
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  float n = max(uThreadCount, 1.0);

  float pinchX = uFanMode < 0.5 ? 0.5 : (uFanMode < 1.5 ? 0.0 : 1.0);
  if (uEnableMouse > 0.5) {
    pinchX = mix(
      pinchX,
      uMouse.x,
      clamp(uMouseStrength, 0.0, 1.0) * uMouseActive
    );
  }

  float spreadDx = uSpread * abs(uv.x - pinchX);
  float baseT = iTime * uSpeed;
  float tauOverN = TAU / n;
  float mirror = uMirror > 0.5 ? sign(pinchX - uv.x) : 1.0;
  bool doShimmer = uShimmer > 0.5;
  float shimmerT = iTime * 1.7;
  float invThickness = 1.0 / max(uThickness, 0.01);
  float xFreq = uv.x * uFrequency;
  float yOff = uv.y - uPosition;
  float ciScale = n > 1.0 ? 1.0 / (n - 1.0) : 0.0;

  vec3 col = vec3(0.0);
  float gsum = 0.0;

  for (int idx = 0; idx < MAX_THREADS; idx++) {
    float i = float(idx);
    if (i >= n) break;

    float amplitude = spreadDx * (1.0 + i * uTaper);
    float shimmer = doShimmer ? sin(shimmerT + i * 1.3) * 0.35 : 0.0;
    float phase = (baseT + i * tauOverN) * mirror + shimmer;

    float sdf = abs(yOff + sin(xFreq + phase) * amplitude) * invThickness;

    float g = glow(sdf, uFalloff, uGlow);
    float ci = i * ciScale;
    vec3 threadCol = mix(uColor1, uColor2, ci);

    col += g * threadCol;
    gsum += g;
  }

  float coreAmt = smoothstep(0.5, 2.2, gsum);
  col = mix(col, uColor3 * gsum, coreAmt * 0.5);

  float bright = uBrightness;
  if (uEnableMouse > 0.5) {
    vec2 md = uv - uMouse;
    float d2 = dot(md, md);
    bright +=
      clamp(uMouseStrength, 0.0, 1.0) *
      uMouseActive *
      exp(-d2 * 6.0) *
      0.6;
  }
  col *= bright;

  float alpha = clamp(gsum, 0.0, 1.0) * uOpacity;
  vec3 outRgb = col * alpha;

  if (uGrain > 0.5) {
    float gv =
      (fract(
        sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + iTime) *
        43758.5453
      ) - 0.5) *
      uGrainIntensity;
    outRgb = clamp(outRgb + gv, 0.0, 1.0);
    alpha = clamp(alpha + gv, 0.0, 1.0);
  }

  if (uLightMode) {
    vec3 mapped = vec3(1.0) - exp(-max(col, vec3(0.0)) * 1.3);
    float rawEnergy =
      clamp(max(mapped.r, max(mapped.g, mapped.b)) * uOpacity, 0.0, 1.0);
    float coverage = smoothstep(0.18, 0.72, rawEnergy);
    coverage *= coverage;
    vec3 hue =
      mapped / max(max(mapped.r, max(mapped.g, mapped.b)), 1e-4);
    vec3 chroma = pow(clamp(hue, 0.0, 1.0), vec3(0.78));
    vec3 pigment = mix(chroma, vec3(0.08), 0.12);
    vec3 ink = mix(vec3(0.9), pigment, 0.82 + coverage * 0.18);
    fragColor = vec4(mix(uBackgroundColor, ink, coverage), 1.0);
  } else {
    fragColor = vec4(outRgb, alpha);
  }
}
`;

const channel = (digits: string, offset: number) =>
  Number.parseInt(digits.slice(offset, offset + 2), 16) / CHANNEL_MAX;

const writeColor = (target: Float32Array, hex: string) => {
  const digits = HEX_COLOR.test(hex) ? hex.replace("#", "") : "ffffff";

  target[0] = channel(digits, 0);
  target[1] = channel(digits, 2);
  target[2] = channel(digits, 4);
};

const createUniforms = (): Uniforms => ({
  iResolution: { value: new Float32Array([1, 1]) },
  iTime: { value: 0 },
  uBackgroundColor: { value: new Float32Array([1, 1, 1]) },
  uBrightness: { value: DEFAULTS.brightness },
  uColor1: { value: new Float32Array([1, 1, 1]) },
  uColor2: { value: new Float32Array([1, 1, 1]) },
  uColor3: { value: new Float32Array([1, 1, 1]) },
  uEnableMouse: { value: 1 },
  uFalloff: { value: DEFAULTS.falloff },
  uFanMode: { value: FAN_MODE.center },
  uFrequency: { value: DEFAULTS.frequency },
  uGlow: { value: DEFAULTS.glow },
  uGrain: { value: 1 },
  uGrainIntensity: { value: DEFAULTS.grainIntensity },
  uLightMode: { value: false },
  uMirror: { value: 1 },
  uMouse: { value: new Float32Array([0.5, 0.5]) },
  uMouseActive: { value: 0 },
  uMouseStrength: { value: DEFAULTS.mouseStrength },
  uOpacity: { value: DEFAULTS.opacity },
  uPosition: { value: DEFAULTS.position },
  uShimmer: { value: 0 },
  uSpeed: { value: DEFAULTS.speed },
  uSpread: { value: DEFAULTS.spread },
  uTaper: { value: DEFAULTS.taper },
  uThickness: { value: DEFAULTS.thickness },
  uThreadCount: { value: DEFAULTS.threadCount },
});

const resolveProps = (props: WebThreadsProps): ResolvedProps => ({
  backgroundColor: props.backgroundColor ?? DEFAULTS.backgroundColor,
  brightness: props.brightness ?? DEFAULTS.brightness,
  color1: props.color1 ?? DEFAULTS.color1,
  color2: props.color2 ?? DEFAULTS.color2,
  color3: props.color3 ?? DEFAULTS.color3,
  falloff: props.falloff ?? DEFAULTS.falloff,
  fanMode: props.fanMode ?? DEFAULTS.fanMode,
  frequency: props.frequency ?? DEFAULTS.frequency,
  glow: props.glow ?? DEFAULTS.glow,
  grain: props.grain ?? DEFAULTS.grain,
  grainIntensity: props.grainIntensity ?? DEFAULTS.grainIntensity,
  lightMode: props.lightMode ?? DEFAULTS.lightMode,
  mirror: props.mirror ?? DEFAULTS.mirror,
  mouseInteraction: props.mouseInteraction ?? DEFAULTS.mouseInteraction,
  mouseStrength: props.mouseStrength ?? DEFAULTS.mouseStrength,
  opacity: props.opacity ?? DEFAULTS.opacity,
  position: props.position ?? DEFAULTS.position,
  shimmer: props.shimmer ?? DEFAULTS.shimmer,
  speed: props.speed ?? DEFAULTS.speed,
  spread: props.spread ?? DEFAULTS.spread,
  taper: props.taper ?? DEFAULTS.taper,
  thickness: props.thickness ?? DEFAULTS.thickness,
  threadCount: props.threadCount ?? DEFAULTS.threadCount,
});

const applyUniforms = (
  uniforms: Uniforms,
  values: ResolvedProps
): void => {
  uniforms.uSpeed.value = values.speed;
  uniforms.uThreadCount.value = Math.round(values.threadCount);
  uniforms.uFrequency.value = values.frequency;
  uniforms.uSpread.value = values.spread;
  uniforms.uTaper.value = values.taper;
  uniforms.uPosition.value = values.position;
  uniforms.uFanMode.value = FAN_MODE[values.fanMode];
  uniforms.uGlow.value = values.glow;
  uniforms.uFalloff.value = values.falloff;
  uniforms.uThickness.value = values.thickness;
  uniforms.uBrightness.value = values.brightness;
  uniforms.uOpacity.value = values.opacity;
  uniforms.uMirror.value = values.mirror ? 1 : 0;
  uniforms.uShimmer.value = values.shimmer ? 1 : 0;
  uniforms.uGrain.value = values.grain ? 1 : 0;
  uniforms.uGrainIntensity.value = values.grainIntensity;
  uniforms.uLightMode.value = values.lightMode;
  uniforms.uMouseStrength.value = values.mouseStrength;
  uniforms.uEnableMouse.value = values.mouseInteraction ? 1 : 0;

  writeColor(uniforms.uColor1.value, values.color1);
  writeColor(uniforms.uColor2.value, values.color2);
  writeColor(uniforms.uColor3.value, values.color3);
  writeColor(uniforms.uBackgroundColor.value, values.backgroundColor);
};

export const WebThreads = (props: WebThreadsProps) => {
  let container: HTMLDivElement | undefined;
  let uniforms: Uniforms | undefined;

  createCompatEffect(
    () => resolveProps(props),
    (values) => {
      if (uniforms) {
        applyUniforms(uniforms, values);
      }
    }
  );

  onSettled(() => {
    if (!container) {
      return;
    }

    const renderer = new Renderer({
      alpha: true,
      antialias: false,
      dpr: Math.min(window.devicePixelRatio || 1, MAX_DPR),
      premultipliedAlpha: true,
      webgl: 2,
    });

    const { gl } = renderer;
    const { canvas } = gl;

    gl.clearColor(0, 0, 0, 0);

    canvas.style.display = "block";
    canvas.style.height = "100%";
    canvas.style.width = "100%";
    container.append(canvas);

    const nextUniforms = createUniforms();

    uniforms = nextUniforms;
    applyUniforms(nextUniforms, resolveProps(props));

    const mesh = new Mesh(gl, {
      geometry: new Triangle(gl),
      program: new Program(gl, {
        fragment,
        uniforms: nextUniforms,
        vertex,
      }),
    });

    const setSize = () => {
      if (!container) {
        return;
      }

      const rect = container.getBoundingClientRect();

      renderer.setSize(
        Math.max(1, Math.floor(rect.width)),
        Math.max(1, Math.floor(rect.height))
      );
      nextUniforms.iResolution.value[0] = gl.drawingBufferWidth;
      nextUniforms.iResolution.value[1] = gl.drawingBufferHeight;
      renderer.render({ scene: mesh });
    };

    const resizeObserver = new ResizeObserver(setSize);

    resizeObserver.observe(container);
    setSize();

    let mouseX = 0.5;
    let mouseY = 0.5;
    let targetX = 0.5;
    let targetY = 0.5;
    let currentActive = 0;
    let targetActive = 0;

    const onMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();

      targetX = (event.clientX - rect.left) / rect.width;
      targetY = 1 - (event.clientY - rect.top) / rect.height;
      targetActive = 1;
    };

    const onMouseEnter = () => {
      targetActive = 1;
    };

    const onMouseLeave = () => {
      targetActive = 0;
    };

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseenter", onMouseEnter);
    canvas.addEventListener("mouseleave", onMouseLeave);

    let frame = 0;
    let onScreen = true;
    const startedAt = performance.now();

    const loop = (now: number) => {
      nextUniforms.iTime.value = (now - startedAt) / MS_PER_SECOND;
      mouseX += MOUSE_EASING * (targetX - mouseX);
      mouseY += MOUSE_EASING * (targetY - mouseY);
      currentActive += MOUSE_EASING * (targetActive - currentActive);
      nextUniforms.uMouse.value[0] = mouseX;
      nextUniforms.uMouse.value[1] = mouseY;
      nextUniforms.uMouseActive.value = currentActive;

      renderer.render({ scene: mesh });
      frame = requestAnimationFrame(loop);
    };

    const update = () => {
      const running = frame !== 0;
      const shouldRun = onScreen && !document.hidden;

      if (shouldRun && !running) {
        frame = requestAnimationFrame(loop);
      } else if (!shouldRun && running) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    };

    const intersectionObserver = new IntersectionObserver((entries) => {
      onScreen = entries.at(-1)?.isIntersecting ?? false;
      update();
    });

    intersectionObserver.observe(container);
    document.addEventListener("visibilitychange", update);
    update();

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", update);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseenter", onMouseEnter);
      canvas.removeEventListener("mouseleave", onMouseLeave);
      uniforms = undefined;
      canvas.remove();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  });

  return (
    <div
      class={cn("relative h-full w-full overflow-hidden", props.class)}
      data-home-threads=""
      ref={(node) => {
        container = node;
      }}
    />
  );
};
