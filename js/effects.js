const rotatingContainer = document.getElementById('rotatingContainer');
const galaxy = document.getElementById('galaxy');

let messages = ["Happy New Year 2026"]; // Mặc định nếu chưa load kịp
fetch('mess.txt')
  .then(res => res.text())
  .then(text => {
    const list = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (list.length > 0) messages = list;
  })
  .catch(err => console.error("Lỗi tải tin nhắn:", err));
// No image URLs used anymore
const icons = ["❤️", "🍀", "🌸","✨"];
const maxParticles = window.innerWidth < 600 ? 50 : 120;
const activeParticles = new Set();

const colors = [
  "#ff69b4", // hồng
  "#ff4757", // đỏ
  "#ffa502", // cam
  "#fffa65", // vàng
  "#2ed573", // xanh lá
  "#1e90ff", // xanh dương
  "#3742fa", // tím xanh
  "#a55eea", // tím
  "#00cec9", // cyan
  "#ffffff"  // trắng
];

function randomColor() {
  return colors[Math.floor(Math.random() * colors.length)];
}


function createParticle() {
  if (activeParticles.size >= maxParticles) return;

  const el = document.createElement('div');
  const isIcon = Math.random() < 0.3;
  el.className = 'text-particle';
  const color = randomColor();
  el.style.color = color;
  el.style.textShadow = `
    0 0 5px ${color},
    0 0 10px ${color},
    0 0 20px ${color}
  `;


  el.textContent = isIcon ? icons[Math.floor(Math.random() * icons.length)] : messages[Math.floor(Math.random() * messages.length)];
  el.style.fontSize = (isIcon ? 20 : 18) + Math.random() * 10 + 'px';
  el.style.opacity = 0;
  rotatingContainer.appendChild(el);

  const w = el.offsetWidth || 40;
  el.style.left = Math.random() * (window.innerWidth - w) + 'px';

  const z = -Math.random() * 600;
  const startY = window.innerHeight + 50;
  const endY = -50;
  const duration = 7000 + Math.random() * 4000;
  const t0 = performance.now();

  function animate(t) {
    const p = (t - t0) / duration;
    if (p >= 1) {
      el.remove();
      activeParticles.delete(el);
    } else {
      const y = startY + p * (endY - startY);
      const op = p < 0.1 ? p * 10 : (p > 0.9 ? (1 - p) * 10 : 1);
      el.style.opacity = op;
      el.style.transform = `translate3d(0, ${y}px, ${z}px)`;
      requestAnimationFrame(animate);
    }
  }

  activeParticles.add(el);
  requestAnimationFrame(animate);
}

function loopParticles() {
  let last = 0;
  const interval = window.innerWidth < 600 ? 800 : 300;
  function tick(t) {
    if (t - last > interval) {
      createParticle();
      last = t;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

let starsStarted = false;
function startStars() {
  if (starsStarted) return;
  starsStarted = true;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 150;

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  galaxy.appendChild(renderer.domElement);

  const starsCount = 500;
  const positions = new Float32Array(starsCount * 3);
  const sizes = new Float32Array(starsCount);
  const baseSizes = [];
  const twinkleSpeed = [];
  const twinkleOffset = [];


  for (let i = 0; i < starsCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 400;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 400;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 400;
    sizes[i] = Math.random() * 1.5 + 0.5;

    baseSizes.push(sizes[i]);
    twinkleSpeed.push(0.5 + Math.random() * 1.5); // tốc độ khác nhau
    twinkleOffset.push(Math.random() * Math.PI * 2); // lệch pha

  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

  const starTexture = new THREE.TextureLoader().load(
    "https://threejs.org/examples/textures/sprites/disc.png"
  );
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      time: { value: 0 },
      color: { value: new THREE.Color(0xffffff) }
    },
    vertexShader: `
    attribute float size;
    uniform float time;
    varying float vOpacity;

    void main() {
      float twinkle = sin(time + size * 10.0);
      vOpacity = 0.5 + twinkle * 0.5;

      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      float pointSize = size * (200.0 / -mvPosition.z);
      gl_PointSize = clamp(pointSize, 1.0, 6.0);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
    fragmentShader: `
    uniform vec3 color;
    varying float vOpacity;

    void main() {
      float d = distance(gl_PointCoord, vec2(0.5));
      if (d > 0.5) discard;

      gl_FragColor = vec4(color, vOpacity);
    }
  `
  });


  const stars = new THREE.Points(geometry, material);
  scene.add(stars);

  function animate() {
    requestAnimationFrame(animate);
    const time = Date.now() * 0.002;
    material.uniforms.time.value += 0.02;

    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}


function initRotation() {
  function updateRotation(x, y) {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const rotY = ((x - cx) / cx) * 10;
    const rotX = (-(y - cy) / cy) * 10;
    rotatingContainer.style.transform = `translate(-50%, -50%) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
  }

  document.addEventListener('mousemove', e => updateRotation(e.clientX, e.clientY));
  document.addEventListener('touchmove', e => {
    if (e.touches.length > 0) {
      const t = e.touches[0];
      updateRotation(t.clientX, t.clientY);
    }
  }, { passive: true });
}

function setupMusic() {
  const audio = new Audio('./style/nhac.mp3');
  audio.loop = true;
  audio.currentTime = 22;
  audio.volume = 0.8;

  let started = false;
  audio.play().then(() => {
    started = true;
    console.log("🎵 Nhạc tự động phát");
  }).catch(() => {
    console.log("🔇 Autoplay bị chặn, chờ người dùng chạm");
  });

  function resumeAudio() {
    if (started) return;
    audio.play().then(() => {
      started = true;
      console.log("🎵 Nhạc đã phát sau khi tương tác");
      document.removeEventListener('click', resumeAudio);
      document.removeEventListener('touchstart', resumeAudio);
    });
  }

  document.addEventListener('click', resumeAudio);
  document.addEventListener('touchstart', resumeAudio);
}


let fireworksStarted = false;
function startFireworks() {
  if (fireworksStarted) return;
  fireworksStarted = true;
  const canvas = document.getElementById("fireworks");
  const ctx = canvas.getContext("2d");

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  const fireworks = [];
  const particles = [];

  class Firework {
    constructor() {
      this.x = Math.random() * canvas.width;
      this.y = canvas.height;
      this.targetY = Math.random() * canvas.height * 0.4 + 50;
      this.speed = 6 + Math.random() * 3;
      this.color = randomColor();

      this.exploded = false;
    }

    update() {
      this.y -= this.speed;
      if (this.y <= this.targetY) {
        this.explode();
        this.exploded = true;
      }
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
    }

    explode() {
      // Phát âm thanh tiếng nổ pháo hoa
      const sound = new Audio('./media/Firework.mp3');
      sound.volume = 0.5;
      sound.play().catch(e => console.log("Lỗi phát âm thanh:", e));

      for (let i = 0; i < 60; i++) {
        particles.push(new Particle(this.x, this.y, randomColor()));
      }
    }
  }

  class Particle {
    constructor(x, y, color) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.x = x;
      this.y = y;
      this.alpha = 1;
      this.color = color;
      this.gravity = 0.05;
    }

    update() {
      this.vy += this.gravity;
      this.x += this.vx;
      this.y += this.vy;
      this.alpha -= 0.015;
    }

    draw() {
      ctx.globalAlpha = this.alpha;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function animate() {
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (Math.random() < 0.04) {
      fireworks.push(new Firework());
    }

    for (let i = fireworks.length - 1; i >= 0; i--) {
      fireworks[i].update();
      fireworks[i].draw();
      if (fireworks[i].exploded) fireworks.splice(i, 1);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].update();
      particles[i].draw();
      if (particles[i].alpha <= 0) particles.splice(i, 1);
    }

    requestAnimationFrame(animate);
  }

  animate();
}


// function startSection2() {
window.startSection2 = function () {
  document.getElementById('galaxy').style.display = 'block';
  document.getElementById('rotatingContainer').style.display = 'block';
  document.getElementById('fireworks').style.display = 'block';

  startFireworks();
  // startStars(); // Tùy chọn: có thể hiện cả sao ở nền nếu muốn
  loopParticles();
  initRotation();
};

window.startFireworks = startFireworks;
window.startStars = startStars;

// Remove or comment out the auto-load listener as we trigger manually
/*
window.addEventListener('DOMContentLoaded', () => {
  ...
});
*/

