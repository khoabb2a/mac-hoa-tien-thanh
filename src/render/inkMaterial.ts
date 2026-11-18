import * as THREE from 'three';
import { PALETTE } from './palette';

/**
 * Vật liệu "mặc phân ngũ sắc": ánh sáng lượng tử hóa thành 5 nấc, nấc tối kéo về mực nùng,
 * cộng hạt giấy theo tọa độ màn hình. Đây là shader tạm cho khối thô; công trình thật sẽ là
 * sprite do AI vẽ (GDD mục 3.2, 3.4) — shader này vẫn dùng cho địa hình, núi, nước.
 */
const LIGHT_DIR = new THREE.Vector3(-0.55, 1, 0.35).normalize();

const vertex = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vPosW;
  #ifdef USE_TINT
    attribute vec3 aTint;
    varying vec3 vTint;
  #endif
  #include <common>
  #include <fog_pars_vertex>
  void main() {
    #ifdef USE_TINT
      vTint = aTint;
    #endif
    vNormalW = normalize(mat3(modelMatrix) * normal);
    #ifdef USE_INSTANCING
      vNormalW = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
      vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      vPosW = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;
    #else
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vPosW = (modelMatrix * vec4(position, 1.0)).xyz;
    #endif
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uShadow;
  uniform vec3 uLight;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  #ifdef USE_TINT
    varying vec3 vTint;
  #endif
  #include <common>
  #include <fog_pars_fragment>
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    float l = dot(normalize(vNormalW), uLight) * 0.5 + 0.5;
    float band = floor(l * 4.0 + 0.5) / 4.0;          // 5 nấc mực
    vec3 base = uColor;
    vec3 shade = uShadow;
    #ifdef USE_TINT
      base *= vTint;
      shade *= vTint;
    #endif
    vec3 col = mix(shade, base, band);
    float grain = hash(floor(gl_FragCoord.xy * 0.5));  // hạt giấy
    float wash = sin(vPosW.x * 1.7 + vPosW.z * 2.3) * 0.5 + 0.5; // loang nhẹ
    col *= 0.93 + 0.05 * grain + 0.03 * wash;
    gl_FragColor = vec4(col, 1.0);
    #include <fog_fragment>
    #include <colorspace_fragment>
  }
`;

/**
 * @param tint nếu true, nhân màu với thuộc tính instanced `aTint` (vec3, không gian màu tuyến tính)
 *             — dùng cho lưới ô địa hình để tô từng ô.
 */
export function inkMaterial(color: string, shadow: string = PALETTE.inkTrong, tint = false): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    defines: tint ? { USE_TINT: '' } : {},
    vertexShader: vertex,
    fragmentShader: fragment,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uColor: { value: new THREE.Color(color) },
        uShadow: { value: new THREE.Color(shadow) },
        uLight: { value: LIGHT_DIR.clone() },
      },
    ]),
  });
}

const edgeMaterial = new THREE.LineBasicMaterial({ color: PALETTE.inkTieu, transparent: true, opacity: 0.85 });

/** Thêm nét câu lặc (viền mực) cho mesh: các cạnh gấp hơn `angle` độ. */
export function withInkEdges(mesh: THREE.Mesh, angle = 28): THREE.Mesh {
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, angle), edgeMaterial);
  mesh.add(edges);
  return mesh;
}
