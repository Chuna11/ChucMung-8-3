const rotatingContainer = document.getElementById('rotatingContainer');
const galaxy = document.getElementById('galaxy');

// Phát hiện mobile để giảm hiệu ứng cho đỡ giật
const isMobile =
  window.innerWidth < 768 ||
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

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
// Ít chữ bay hơn trên mobile
const maxParticles = isMobile ? 25 : 120;
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

// Âm thanh pháo hoa dùng chung cho mọi nơi (countdown & section 2)
let fireworkSound = null;
let lastFireworkSoundTime = 0;
function playFireworkSound() {
  const now = performance.now();
  const minInterval = isMobile ? 1200 : 600; // ms, tránh spam tiếng nổ
  if (now - lastFireworkSoundTime <= minInterval) return;
  lastFireworkSoundTime = now;

  try {
    if (!fireworkSound) {
      fireworkSound = new Audio('./media/Firework.mp3');
      fireworkSound.preload = 'auto';
      fireworkSound.volume = 0.75;
    }
    fireworkSound.currentTime = 0;
    fireworkSound.play().catch(e => console.log("Lỗi phát âm thanh pháo hoa:", e));
  } catch (e) {
    console.log("Lỗi khởi tạo âm thanh pháo hoa:", e);
  }
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
  // Khoảng spawn chữ bay thưa hơn trên mobile
  const interval = isMobile ? 1100 : 300;
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

  // Desktop mới xoay 3D để nhẹ hơn trên điện thoại
  if (!isMobile) {
    document.addEventListener('mousemove', e => updateRotation(e.clientX, e.clientY));
    document.addEventListener('touchmove', e => {
      if (e.touches.length > 0) {
        const t = e.touches[0];
        updateRotation(t.clientX, t.clientY);
      }
    }, { passive: true });
  }
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

  // ===== VẼ THÀNH PHỐ VỀ ĐÊM Ở BACKGROUND =====
  let cityBuildings = [];

  function createCity() {
    cityBuildings = [];
    const isMobile = window.innerWidth < 600;

    const minWidth = isMobile ? 40 : 60;
    const maxWidth = isMobile ? 80 : 110;
    const minHeight = canvas.height * 0.18;
    const maxHeight = canvas.height * 0.4;

    let x = 0;
    const gapX = isMobile ? 4 : 8;

    // Tạo dãy tòa nhà phủ kín toàn bộ chiều ngang màn hình
    while (x < canvas.width) {
      const w = Math.min(
        minWidth + Math.random() * (maxWidth - minWidth),
        canvas.width - x
      );
      const h = minHeight + Math.random() * (maxHeight - minHeight);
      const baseY = canvas.height;

      // màu nhà hơi xanh tối / tím để nổi bật cửa sổ
      const baseColor = `hsl(${210 + Math.random() * 40}, 35%, 12%)`;

      // Tạo cửa sổ đơn giản
      const windows = [];
      const windowSize = isMobile ? 3 : 4;
      const windowGapX = windowSize * 2.5;
      const windowGapY = windowSize * 3;

      for (let wy = baseY - 10; wy > baseY - h + 10; wy -= windowGapY) {
        for (let wx = x + 8; wx < x + w - 8; wx += windowGapX) {
          if (Math.random() < 0.55) {
            windows.push({
              x: wx,
              y: wy,
              size: windowSize,
              // một số cửa sáng, một số hơi mờ để giống thực tế
              brightness: 0.6 + Math.random() * 0.4,
              // thông số để cửa sổ tự đổi màu theo thời gian
              baseHue: 40 + Math.random() * 40, // vàng/cam ấm
              speed: 0.4 + Math.random() * 0.8,
              phase: Math.random() * Math.PI * 2
            });
          }
        }
      }

      cityBuildings.push({
        x,
        y: baseY - h,
        w,
        h,
        color: baseColor,
        windows
      });

      x += w + gapX;
    }
  }

  function drawCity(time) {
    if (!cityBuildings.length) return;

    cityBuildings.forEach((b) => {
      // thân tòa nhà
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);

      // đường viền nhẹ phía trên để tách nóc nhà
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(b.x, b.y, b.w, 2);

      // cửa sổ
      b.windows.forEach((w) => {
        // Hue thay đổi nhẹ theo thời gian để đèn chuyển màu ấm dịu
        const hue = (w.baseHue + time * w.speed * 50) % 360;
        const flicker = 0.7 + 0.3 * Math.sin(time * w.speed * 3 + w.phase);
        const lightness = 55 * flicker;
        ctx.fillStyle = `hsla(${hue}, 80%, ${lightness}%, ${w.brightness})`;
        ctx.fillRect(w.x, w.y, w.size, w.size * 1.4);
      });
    });

    // một lớp mờ nhẹ phía trên để blend với nền trời
    const grad = ctx.createLinearGradient(
      0,
      canvas.height * 0.6,
      0,
      canvas.height
    );
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.7)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, canvas.height * 0.6, canvas.width, canvas.height * 0.4);
  }
  // ===== HẾT PHẦN THÀNH PHỐ =====

  function resize() {
    // Luôn cho canvas pháo hoa (và thành phố) phủ trọn bề ngang màn hình
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    createCity();
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
      // Phát tiếng nổ (dùng hàm chung, có giới hạn tần suất)
      playFireworkSound();

      const particleCount = isMobile ? 25 : 60;
      for (let i = 0; i < particleCount; i++) {
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

  let cityTime = 0;

  function animate() {
    cityTime += 0.02;
    // nền trời đêm mờ + city phía dưới
    ctx.fillStyle = "rgba(0,0,20,0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawCity(cityTime);

    // Ít pháo hoa mới hơn trên mobile
    const spawnProb = isMobile ? 0.02 : 0.04;
    if (Math.random() < spawnProb) {
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

// Cho phép đoạn countdown gọi tiếng pháo hoa trước khi mở quà
window.playFireworkSound = playFireworkSound;

window.startFireworks = startFireworks;
window.startStars = startStars;

// Remove or comment out the auto-load listener as we trigger manually
/*
window.addEventListener('DOMContentLoaded', () => {
  ...
});
*/

