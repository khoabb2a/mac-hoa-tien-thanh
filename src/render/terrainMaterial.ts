import * as THREE from 'three';

/**
 * Vật liệu mặt ô địa hình: texture họa bản AI (đất, đường đá, nước) lấy mẫu theo tọa độ thế giới
 * nên các ô liền nhau ghép liền mạch; nhân với `aTint` (Thiên Nhãn, đá, cầu) và ánh sáng 5 nấc mực.
 * `aLayer`: 0 = đất cỏ, 1 = đường đá, 2 = nước (trôi chậm theo uTime).
 */
export const LAYER = { ground: 0, road: 1, water: 2 } as const;

const vertex = /* glsl */ `
  attribute vec3 aTint;
  attribute float aLayer;
  varying vec3 vTint;
  varying float vLayer;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  #include <common>
  #include <fog_pars_vertex>
  void main() {
    vTint = aTint;
    vLayer = aLayer;
    vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vPosW = world.xyz;
    vNormalW = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D tGround;
  uniform sampler2D tRoad;
  uniform sampler2D tWater;
  uniform vec3 uScale;   // số ô cho một lần lặp texture: đất, đường, nước
  uniform float uTime;
  uniform vec3 uLight;
  varying vec3 vTint;
  varying float vLayer;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  #include <common>
  #include <fog_pars_fragment>
  void main() {
    vec2 p = vPosW.xz;
    vec3 tex;
    if (vLayer < 0.5) tex = texture2D(tGround, p / uScale.x).rgb;
    else if (vLayer < 1.5) tex = texture2D(tRoad, p / uScale.y).rgb;
    else tex = texture2D(tWater, (p + vec2(uTime * 0.12, uTime * 0.05)) / uScale.z).rgb;
    float l = dot(normalize(vNormalW), uLight) * 0.5 + 0.5;
    float band = floor(l * 4.0 + 0.5) / 4.0;            // 5 nấc mực
    vec3 col = tex * vTint * mix(0.62, 1.0, band);       // mặt bên tối hơn mặt trên
    gl_FragColor = vec4(col, 1.0);
    #include <fog_fragment>
    #include <colorspace_fragment>
  }
`;

const loader = new THREE.TextureLoader();
const white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
white.needsUpdate = true;

function repeatTexture(url: string, onLoad: () => void): THREE.Texture {
  const tex = loader.load(import.meta.env.BASE_URL + url, onLoad);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function terrainMaterial(): THREE.ShaderMaterial {
  const mat = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        tGround: { value: white },
        tRoad: { value: white },
        tWater: { value: white },
        uScale: { value: new THREE.Vector3(4, 2, 4) },
        uTime: { value: 0 },
        uLight: { value: new THREE.Vector3(-0.55, 1, 0.35).normalize() },
      },
    ]),
  });
  // UniformsUtils.merge sao chép giá trị, nên gán texture sau khi tạo vật liệu.
  mat.uniforms.tGround.value = repeatTexture('sprites/dat_co.webp', () => (mat.needsUpdate = true));
  mat.uniforms.tRoad.value = repeatTexture('sprites/duong_da.webp', () => (mat.needsUpdate = true));
  mat.uniforms.tWater.value = repeatTexture('sprites/mat_nuoc.webp', () => (mat.needsUpdate = true));
  return mat;
}
