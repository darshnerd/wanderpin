import maplibregl from "maplibre-gl";
import type { CustomLayerInterface, CustomRenderMethodInput } from "maplibre-gl";

import { MODE_META, legKm, legMode } from "@/lib/transport";
import type { TransportMode, Trip } from "@/types";

const SEG = 48;
const FLOATS = 12;
const STRIDE = FLOATS * 4;
const FILL_HALF = 5.5;
const OUTLINE_HALF = 8.5;

const ARC_COLORS: Partial<Record<TransportMode, string>> = {
  car: "#f43f5e",
};

function arcColor(mode: TransportMode): string {
  return ARC_COLORS[mode] ?? MODE_META[mode].color;
}

export function greatCircle(
  a: [number, number],
  b: [number, number],
  n = SEG,
): [number, number][] {
  const R = Math.PI / 180;
  const D = 180 / Math.PI;
  const lat1 = a[1] * R;
  const lon1 = a[0] * R;
  const lat2 = b[1] * R;
  const lon2 = b[0] * R;
  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((lat2 - lat1) / 2) ** 2 +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2,
      ),
    );
  if (d < 1e-9) return [a, b];
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x =
      A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y =
      A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    out.push([
      Math.atan2(y, x) * D,
      Math.atan2(z, Math.sqrt(x * x + y * y)) * D,
    ]);
  }
  return out;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

interface Segment {
  offset: number;
  count: number;
}

interface ProgramEntry {
  program: WebGLProgram;
  attribs: Record<string, number>;
  uniforms: Record<string, WebGLUniformLocation | null>;
}

export interface RouteArcLayer extends CustomLayerInterface {
  setData(trip: Trip): void;
  setSelected(trip: Trip, selectedId: string | null): void;
  setProgress(p: number): void;
  setFade(f: number): void;
}

const ATTRIBS = [
  "a_pos",
  "a_next",
  "a_elev",
  "a_nextElev",
  "a_side",
  "a_t",
  "a_color",
  "a_leg",
];
const UNIFORMS = [
  "u_projection_fallback_matrix",
  "u_projection_matrix",
  "u_projection_tile_mercator_coords",
  "u_projection_clipping_plane",
  "u_projection_transition",
  "u_viewport",
  "u_halfWidth",
  "u_progress",
  "u_sel0",
  "u_sel1",
  "u_outline",
  "u_fade",
];

const FRAG = `#version 300 es
precision highp float;
uniform float u_progress;
uniform float u_outline;
uniform float u_fade;
in float v_t;
in vec3 v_color;
in float v_sel;
out highp vec4 fragColor;
void main() {
  if (v_t > u_progress) discard;
  if (u_outline > 0.5) {
    float a = 0.7 * u_fade;
    fragColor = vec4(vec3(0.03, 0.05, 0.09) * a, a);
    return;
  }
  vec3 col = mix(v_color, vec3(1.0), v_sel * 0.45);
  float lead = 1.0 - smoothstep(0.0, 0.05, u_progress - v_t);
  col = mix(col, vec3(1.0), lead * 0.6);
  float a = 0.97 * u_fade;
  fragColor = vec4(col * a, a);
}`;

function vertexSource(prelude: string, define: string): string {
  return `#version 300 es
${prelude}
${define}
uniform vec2 u_viewport;
uniform float u_halfWidth;
uniform float u_sel0;
uniform float u_sel1;
in vec2 a_pos;
in vec2 a_next;
in float a_elev;
in float a_nextElev;
in float a_side;
in float a_t;
in vec3 a_color;
in float a_leg;
out float v_t;
out vec3 v_color;
out float v_sel;
void main() {
  vec4 cur = projectTileFor3D(a_pos, a_elev);
  vec4 nxt = projectTileFor3D(a_next, a_nextElev);
  vec2 curN = cur.xy / cur.w;
  vec2 nxtN = nxt.xy / nxt.w;
  vec2 dir = (nxtN - curN) * u_viewport;
  float len = length(dir);
  vec2 nrm = len > 0.0001 ? vec2(-dir.y, dir.x) / len : vec2(0.0, 0.0);
  vec2 ndc = nrm * a_side * u_halfWidth / (u_viewport * 0.5);
  cur.xy += ndc * cur.w;
  gl_Position = cur;
  v_t = a_t;
  v_color = a_color;
  v_sel =
    (abs(a_leg - u_sel0) < 0.5 || abs(a_leg - u_sel1) < 0.5) ? 1.0 : 0.0;
}`;
}

export function createRouteArcLayer(id = "route-arcs"): RouteArcLayer {
  let gl: WebGL2RenderingContext | null = null;
  let buffer: WebGLBuffer | null = null;
  let verts: Float32Array | null = null;
  let segs: Segment[] = [];
  let progress = 1;
  let sel0 = -1;
  let sel1 = -1;
  let fade = 1;
  const programs = new Map<string, ProgramEntry>();

  function upload() {
    if (!gl || !verts) return;
    if (!buffer) buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
  }

  function build(trip: Trip) {
    if (trip.length < 2) {
      verts = new Float32Array(0);
      segs = [];
      upload();
      return;
    }
    const legLens: number[] = [];
    let total = 0;
    for (let i = 1; i < trip.length; i++) {
      legLens[i] = legKm(trip, i);
      total += legLens[i];
    }
    const data: number[] = [];
    segs = [];
    let acc = 0;
    for (let i = 1; i < trip.length; i++) {
      const [r, g, b] = hexToRgb(arcColor(legMode(trip, i)));
      const km = legLens[i];
      const lift = Math.min(700000, Math.max(2000, km * 120));
      const pts = greatCircle(
        [trip[i - 1].lng, trip[i - 1].lat],
        [trip[i].lng, trip[i].lat],
      );
      for (let k = 1; k < pts.length; k++) {
        while (pts[k][0] - pts[k - 1][0] > 180) pts[k][0] -= 360;
        while (pts[k][0] - pts[k - 1][0] < -180) pts[k][0] += 360;
      }
      const m = pts.map((p) => {
        const c = maplibregl.MercatorCoordinate.fromLngLat({
          lng: p[0],
          lat: p[1],
        });
        return [c.x, c.y] as [number, number];
      });
      const last = pts.length - 1;
      const elev = pts.map((_, k) => Math.sin((k / last) * Math.PI) * lift);
      const start = data.length / FLOATS;
      for (let k = 0; k <= last; k++) {
        let nx: number;
        let ny: number;
        let ne: number;
        if (k < last) {
          nx = m[k + 1][0];
          ny = m[k + 1][1];
          ne = elev[k + 1];
        } else {
          nx = m[k][0] * 2 - m[k - 1][0];
          ny = m[k][1] * 2 - m[k - 1][1];
          ne = elev[k];
        }
        const t = total > 0 ? (acc + (k / last) * km) / total : k / last;
        for (const side of [-1, 1]) {
          data.push(m[k][0], m[k][1], nx, ny, elev[k], ne, side, t, r, g, b, i);
        }
      }
      segs.push({ offset: start, count: data.length / FLOATS - start });
      acc += km;
    }
    verts = new Float32Array(data);
    upload();
  }

  function getShader(g: WebGL2RenderingContext, sd: CustomRenderMethodInput["shaderData"]): ProgramEntry {
    const cached = programs.get(sd.variantName);
    if (cached) return cached;
    const vs = g.createShader(g.VERTEX_SHADER)!;
    g.shaderSource(vs, vertexSource(sd.vertexShaderPrelude, sd.define));
    g.compileShader(vs);
    const fs = g.createShader(g.FRAGMENT_SHADER)!;
    g.shaderSource(fs, FRAG);
    g.compileShader(fs);
    const program = g.createProgram()!;
    g.attachShader(program, vs);
    g.attachShader(program, fs);
    g.linkProgram(program);
    const attribs: Record<string, number> = {};
    for (const a of ATTRIBS) attribs[a] = g.getAttribLocation(program, a);
    const uniforms: Record<string, WebGLUniformLocation | null> = {};
    for (const u of UNIFORMS) uniforms[u] = g.getUniformLocation(program, u);
    const entry = { program, attribs, uniforms };
    programs.set(sd.variantName, entry);
    return entry;
  }

  return {
    id,
    type: "custom",
    renderingMode: "3d",

    onAdd(_map, context) {
      gl = context as WebGL2RenderingContext;
      upload();
    },

    onRemove() {
      if (gl) {
        if (buffer) gl.deleteBuffer(buffer);
        programs.forEach((p) => gl!.deleteProgram(p.program));
      }
      programs.clear();
      buffer = null;
      verts = null;
      gl = null;
    },

    render(g, args) {
      if (!verts || verts.length === 0 || segs.length === 0) return;
      if (fade <= 0.01) return;
      const ctx = g as WebGL2RenderingContext;
      const { program, attribs, uniforms } = getShader(ctx, args.shaderData);
      const dp = args.defaultProjectionData;
      ctx.useProgram(program);

      ctx.uniformMatrix4fv(
        uniforms.u_projection_fallback_matrix,
        false,
        dp.fallbackMatrix as Iterable<number> as Float32List,
      );
      ctx.uniformMatrix4fv(
        uniforms.u_projection_matrix,
        false,
        dp.mainMatrix as Iterable<number> as Float32List,
      );
      ctx.uniform4f(
        uniforms.u_projection_tile_mercator_coords,
        ...(dp.tileMercatorCoords as [number, number, number, number]),
      );
      ctx.uniform4f(
        uniforms.u_projection_clipping_plane,
        ...(dp.clippingPlane as [number, number, number, number]),
      );
      ctx.uniform1f(uniforms.u_projection_transition, dp.projectionTransition);
      ctx.uniform2f(
        uniforms.u_viewport,
        ctx.drawingBufferWidth,
        ctx.drawingBufferHeight,
      );
      ctx.uniform1f(uniforms.u_progress, progress);
      ctx.uniform1f(uniforms.u_sel0, sel0);
      ctx.uniform1f(uniforms.u_sel1, sel1);
      ctx.uniform1f(uniforms.u_fade, fade);

      ctx.bindBuffer(ctx.ARRAY_BUFFER, buffer);
      const ptr = (name: string, size: number, off: number) => {
        const loc = attribs[name];
        if (loc < 0) return;
        ctx.enableVertexAttribArray(loc);
        ctx.vertexAttribPointer(loc, size, ctx.FLOAT, false, STRIDE, off);
      };
      ptr("a_pos", 2, 0);
      ptr("a_next", 2, 8);
      ptr("a_elev", 1, 16);
      ptr("a_nextElev", 1, 20);
      ptr("a_side", 1, 24);
      ptr("a_t", 1, 28);
      ptr("a_color", 3, 32);
      ptr("a_leg", 1, 44);

      ctx.enable(ctx.DEPTH_TEST);
      ctx.depthFunc(ctx.LEQUAL);
      ctx.depthMask(false);
      ctx.enable(ctx.BLEND);
      ctx.blendFunc(ctx.ONE, ctx.ONE_MINUS_SRC_ALPHA);

      ctx.uniform1f(uniforms.u_halfWidth, OUTLINE_HALF);
      ctx.uniform1f(uniforms.u_outline, 1);
      for (const s of segs) ctx.drawArrays(ctx.TRIANGLE_STRIP, s.offset, s.count);

      ctx.uniform1f(uniforms.u_halfWidth, FILL_HALF);
      ctx.uniform1f(uniforms.u_outline, 0);
      for (const s of segs) ctx.drawArrays(ctx.TRIANGLE_STRIP, s.offset, s.count);

      ctx.depthMask(true);
    },

    setData(trip) {
      build(trip);
    },

    setSelected(trip, selectedId) {
      const idx = selectedId ? trip.findIndex((s) => s.id === selectedId) : -1;
      sel0 = idx >= 1 ? idx : -1;
      sel1 = idx >= 0 && idx + 1 <= trip.length - 1 ? idx + 1 : -1;
    },

    setProgress(p) {
      progress = p;
    },

    setFade(f) {
      fade = f;
    },
  };
}
