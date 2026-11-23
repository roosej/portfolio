import * as THREE from 'three';

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
gsap.registerPlugin(ScrollTrigger);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Hero: split title + intro timeline ---------- */
const title = document.querySelector('.hero-title');
if (title) {
    const text = title.textContent;
    title.setAttribute('aria-label', text);
    title.innerHTML = [...text]
        .map((c) => `<span class="char" aria-hidden="true" style="display:inline-block">${c === ' ' ? '&nbsp;' : c}</span>`)
        .join('');
}

if (title && !reduceMotion) {
    gsap.timeline({ defaults: { ease: 'power3.out' } })
        .from('.hero-title .char', { yPercent: 110, opacity: 0, rotateX: -60, duration: 1.1, stagger: 0.04 })
        .from('.hero-subtitle', { y: 20, opacity: 0, duration: 0.9 }, '-=0.6')
        .from('.cta-button', { y: 20, opacity: 0, duration: 0.8 }, '-=0.6')
        .from('nav', { y: -30, opacity: 0, duration: 0.8 }, '-=0.8');
}

/* ---------- Hero: Three.js scene ---------- */
const hero = document.querySelector('.hero');
const isMobile = window.matchMedia('(max-width: 768px)').matches;

if (hero) {
const canvas = document.createElement('canvas');
canvas.className = 'hero-canvas';
if (isMobile) {
    // mobile: one fixed canvas behind the whole page so the sphere persists while scrolling
    canvas.classList.add('is-fixed');
    document.body.prepend(canvas);
} else {
    hero.prepend(canvas);
}

const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.z = 6;

const group = new THREE.Group();
scene.add(group);

// Mobile: a wireframe sphere whose vertices ease toward a per-section target shape (computed below)
const MORPH_VERT = `
    uniform float uTime;
    uniform float uWobble;
    varying float vGlow;
    void main() {
        vec3 d = normalize(position);
        float n = sin(d.x * 3.0 + uTime * 0.7)
                * sin(d.y * 3.4 + uTime * 0.5)
                * sin(d.z * 3.1 + uTime * 0.6);
        vec3 p = position + d * n * (0.035 + uWobble * 0.4);
        vGlow = 0.65 + 0.35 * n;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }`;
const MORPH_FRAG = `
    uniform float uOpacity;
    varying float vGlow;
    void main() { gl_FragColor = vec4(vec3(1.0), uOpacity * vGlow); }`;

// "Inside" tests for each shape (units roughly match the 1.7-radius sphere)
const box = (x, y, z, cx, cy, cz, hx, hy, hz) =>
    Math.abs(x - cx) < hx && Math.abs(y - cy) < hy && Math.abs(z - cz) < hz;
// wheel: a disc on one side of the body (zi..zo from the centerline), mirrored left/right => 4 wheels total
const wheel = (x, y, z, cx, cy, r2, zi, zo) =>
    (x - cx) ** 2 + (y - cy) ** 2 < r2 && Math.abs(z) > zi && Math.abs(z) < zo;
const rot = (x, y, a) => [x * Math.cos(a) + y * Math.sin(a), -x * Math.sin(a) + y * Math.cos(a)];
const SHAPE_DEFS = {
    sphere: { scale: 1, inside: (x, y, z) => x * x + y * y + z * z < 1.7 * 1.7 },
    octa: { scale: 1, inside: (x, y, z) => Math.abs(x) + Math.abs(y) + Math.abs(z) < 1.95 },
    cube: { scale: 1, inside: (x, y, z) => Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) < 1.35 },
    // pillow: rounded-rectangle outline, soft dome that thins toward the seam; corners end up gently squared "ears"
    pillow: {
        scale: 0.85,
        inside: (x, y, z) => {
            const ux = Math.abs(x / 2.3), uy = Math.abs(y / 1.55);
            const edge = Math.pow(ux, 3.4) + Math.pow(uy, 3.4);
            if (edge >= 1) return false;
            const dome = Math.pow(1 - ux * ux, 0.7) * Math.pow(1 - uy * uy, 0.7);
            return Math.abs(z) < 1.15 * dome;
        },
    },
    // SUV: boxy body, sloped greenhouse, four separate wheels
    suv: {
        scale: 0.85,
        inside: (x, y, z) =>
            box(x, y, z, 0, -0.25, 0, 2.0, 0.45, 0.85) ||
            (y > -0.03 && y < 0.85 && Math.abs(z) < 0.78 && Math.abs(x + 0.2) < 1.4 - (y + 0.02) * 0.65) ||
            wheel(x, y, z, 1.3, -0.72, 0.3, 0.6, 1.02) || wheel(x, y, z, -1.3, -0.72, 0.3, 0.6, 1.02),
    },
    // house: walls plus a gabled roof
    house: {
        scale: 0.95,
        inside: (x, y, z) =>
            box(x, y, z, 0, -0.4, 0, 1.2, 0.7, 1.0) ||
            (Math.abs(z) < 1.15 && y > 0.3 && y < 1.4 && Math.abs(x) < 1.55 * (1 - (y - 0.3) / 1.1)),
    },
    // moving truck: tall cargo box, lower cab with sloped windshield, four separate wheels
    truck: {
        scale: 0.9,
        inside: (x, y, z) =>
            box(x, y, z, -0.7, 0.275, 0, 1.2, 0.725, 0.9) ||
            box(x, y, z, 1.15, -0.05, 0, 0.6, 0.4, 0.8) ||
            (Math.abs(z) < 0.78 && y > 0.3 && y < 0.85 && x > 0.5 && x < 1.5 - (y - 0.3) * 0.9) ||
            wheel(x, y, z, -1.15, -0.62, 0.3, 0.7, 1.12) || wheel(x, y, z, 1.2, -0.62, 0.3, 0.7, 1.12),
    },
    // text box: rounded speech bubble with a long tail hanging off the lower-left
    textbox: {
        scale: 0.85,
        inside: (x, y, z) => {
            const dx = Math.max(Math.abs(x) - 1.5, 0), dy = Math.max(Math.abs(y - 0.4) - 0.6, 0);
            if (dx * dx + dy * dy < 0.25 && Math.abs(z) < 0.32) return true;
            const w = 1 - (-0.55 - y) / 1.15; // 1 at the bubble, 0 at the tip
            return w > 0 && w <= 1 && Math.abs(z) < 0.3 && x > -1.3 && x < -1.3 + 1.0 * w;
        },
    },
    // magnifying glass: dished lens with a thick rim, angled handle with a grip
    magnifier: {
        scale: 0.85,
        inside: (x, y, z) => {
            const s = (x - y) / Math.SQRT2, p = (x + y) / Math.SQRT2;
            const r = Math.hypot(s + 0.64, p);
            if (r < 1.15 && Math.abs(z) < 0.14 + 0.22 * Math.pow(r / 1.15, 4)) return true;
            const rad = s > 1.5 ? 0.26 : 0.2;
            return s > 0.4 && s < 2.4 && p * p + z * z < rad * rad;
        },
    },
    // hammer, tilted: chunky head centered on the origin (so enough of the mesh lands on it), slim handle below
    hammer: {
        scale: 0.9,
        inside: (x, y, z) => {
            const [u, v] = rot(x, y, 0.55);
            if (Math.abs(u) < 1.25 && v > -0.4 && v < 0.55 && Math.abs(z) < 0.55) return true;
            return v > -2.0 && v <= -0.35 && u * u + z * z < 0.2 * 0.2;
        },
    },
};

// Cast a ray from the center along each vertex direction; the outermost point inside the shape is the target.
function buildTarget(src, def) {
    const out = new Float32Array(src.length);
    for (let i = 0; i < src.length; i += 3) {
        const l = Math.hypot(src[i], src[i + 1], src[i + 2]) || 1;
        const dx = src[i] / l, dy = src[i + 1] / l, dz = src[i + 2] / l;
        let last = 0.3;
        for (let t = 0.1; t < 3.4; t += 0.025) {
            if (def.inside(dx * t, dy * t, dz * t)) last = t;
        }
        out[i] = dx * last * def.scale;
        out[i + 1] = dy * last * def.scale;
        out[i + 2] = dz * last * def.scale;
    }
    return out;
}

let wire, morphMat = null;
let morphTargets = null, morphCur = null, morphPos = null, morphJitter = null;
if (isMobile) {
    morphMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uWobble: { value: 0 }, uOpacity: { value: 0.5 } },
        vertexShader: MORPH_VERT,
        fragmentShader: MORPH_FRAG,
        wireframe: true,
        transparent: true,
        depthWrite: false,
    });
    const geo = new THREE.IcosahedronGeometry(1.7, 7);
    morphPos = geo.attributes.position;
    const base = morphPos.array.slice();
    morphTargets = {};
    for (const k in SHAPE_DEFS) morphTargets[k] = buildTarget(base, SHAPE_DEFS[k]);
    morphCur = morphTargets.sphere.slice();
    morphPos.array.set(morphCur);
    morphPos.needsUpdate = true;
    // per-vertex speed jitter so the surface flows instead of lerping rigidly
    // (hashed from position so duplicated vertices of the non-indexed mesh move together)
    morphJitter = new Float32Array(base.length / 3);
    for (let v = 0; v < morphJitter.length; v++) {
        const h = Math.sin(base[v * 3] * 127.1 + base[v * 3 + 1] * 311.7 + base[v * 3 + 2] * 74.7) * 43758.5453;
        morphJitter[v] = 0.6 + (h - Math.floor(h)) * 0.8;
    }
    wire = new THREE.Mesh(geo, morphMat);
    wire.frustumCulled = false;
} else {
    wire = new THREE.LineSegments(
        new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.7, 1)),
        new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22 })
    );
}
group.add(wire);

// Inner counter-rotating shape
const inner = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.OctahedronGeometry(0.8, 0)),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })
);
group.add(inner);

// Particle shell
const COUNT = isMobile ? 350 : 900;
const pos = new Float32Array(COUNT * 3);
for (let i = 0; i < COUNT; i++) {
    const r = 2.6 + Math.random() * 2.4;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i * 3 + 2] = r * Math.cos(phi);
}
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
const points = new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.02, transparent: true, opacity: 0.6, sizeAttenuation: true })
);
scene.add(points);

function resize() {
    const w = isMobile ? canvas.clientWidth : hero.clientWidth;
    const h = isMobile ? canvas.clientHeight : hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // shift shape right on wide screens so the title stays clear
    group.position.x = w > 900 ? 2.4 : 0;
    group.scale.setScalar(w > 900 ? 1 : w > 600 ? 0.8 : 0.5);
}
let lastW = 0;
resize();
lastW = window.innerWidth;
// ignore height-only resizes (mobile address bar show/hide)
window.addEventListener('resize', () => {
    if (window.innerWidth !== lastW) { lastW = window.innerWidth; resize(); }
});

const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
});

let heroVisible = true;
ScrollTrigger.create({
    trigger: hero,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => (heroVisible = self.isActive),
});

// scroll-driven: shape drifts and fades as you leave the hero
const scrollState = { p: 0 };
gsap.to(scrollState, {
    p: 1,
    ease: 'none',
    scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
});

// mobile: page progress drives spin/parallax; the section on screen picks the target shape
let pageTarget = 0;
let pageP = 0;
let activeShape = 'sphere';
let showcase = 0; // 0..1: eased toward 1 when the shape is a recognizable object
const SHOWCASE = new Set(['pillow', 'suv', 'house', 'truck', 'textbox', 'magnifier', 'hammer']);
if (isMobile) {
    ScrollTrigger.create({
        trigger: document.documentElement,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => (pageTarget = self.progress),
    });
    const SECTION_SHAPES = [
        ['.hero', 'sphere'],
        ['#about', 'octa'],
        ['#skills', 'cube'],
        ['.projects-grid .project:nth-child(1)', 'pillow'],
        ['.projects-grid .project:nth-child(2)', 'suv'],
        ['.projects-grid .project:nth-child(3)', 'house'],
        ['.projects-grid .project:nth-child(4)', 'truck'],
        ['#testimonials', 'textbox'],
        ['#insights', 'magnifier'],
        ['#contact', 'hammer'],
    ];
    SECTION_SHAPES.forEach(([sel, shape]) => {
        const el = document.querySelector(sel);
        if (!el) return;
        const set = () => (activeShape = shape);
        ScrollTrigger.create({ trigger: el, start: 'top 60%', end: 'bottom 60%', onEnter: set, onEnterBack: set });
    });
}

const clock = new THREE.Clock();
let lastT = 0;
renderer.setAnimationLoop(() => {
    const t = clock.getElapsedTime();
    const dt = Math.min(t - lastT, 0.05);
    lastT = t;
    const speed = reduceMotion ? 0 : 1;

    if (isMobile) {
        pageP += (pageTarget - pageP) * 0.08;

        // ease every vertex toward the active shape's target
        const tgt = morphTargets[activeShape];
        const k = reduceMotion ? 1 : 1 - Math.exp(-dt * 3.2);
        let moved = 0;
        for (let v = 0, j = 0; v < morphJitter.length; v++, j += 3) {
            const kk = Math.min(1, k * morphJitter[v]);
            const dx = (tgt[j] - morphCur[j]) * kk;
            const dy = (tgt[j + 1] - morphCur[j + 1]) * kk;
            const dz = (tgt[j + 2] - morphCur[j + 2]) * kk;
            morphCur[j] += dx; morphCur[j + 1] += dy; morphCur[j + 2] += dz;
            moved += Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
        }
        morphPos.array.set(morphCur);
        morphPos.needsUpdate = true;

        morphMat.uniforms.uTime.value = t * speed;
        morphMat.uniforms.uWobble.value += (Math.min(1, (moved / morphJitter.length) * 14) - morphMat.uniforms.uWobble.value) * 0.15;

        // recognizable objects hold a gentle 3/4 view; primitives keep spinning with scroll
        showcase += ((SHOWCASE.has(activeShape) ? 1 : 0) - showcase) * 0.06;
        const spinY = t * 0.1 * speed + pageP * Math.PI * 3;
        const spinX = 0.35 + pageP * 1.4;
        const showY = -0.5 + 0.3 * Math.sin(t * 0.6 * speed);
        wire.rotation.y = spinY + (showY - spinY) * showcase;
        wire.rotation.x = spinX + (0.16 - spinX) * showcase;
        group.position.y = pageP * 0.9;
        inner.rotation.y = -t * 0.25 * speed - pageP * 4;
        inner.rotation.z = t * 0.15 * speed + pageP * 2;
        inner.scale.setScalar((1 - 0.55 * Math.sin(pageP * Math.PI)) * (1 - showcase));
        inner.visible = showcase < 0.98;
        points.rotation.y = t * 0.03 * speed + pageP * 1.5;
        points.rotation.x = pageP * 0.6;
        // stay visible behind the hero, calmer behind body copy
        morphMat.uniforms.uOpacity.value = 0.55 - 0.33 * scrollState.p + 0.12 * showcase;
        renderer.render(scene, camera);
        return;
    }

    if (!heroVisible) return;
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;

    wire.rotation.y = t * 0.12 * speed + mouse.x * 0.5 + scrollState.p * 2;
    wire.rotation.x = t * 0.07 * speed + mouse.y * 0.4;
    inner.rotation.y = -t * 0.25 * speed;
    inner.rotation.z = t * 0.15 * speed;
    points.rotation.y = t * 0.03 * speed + mouse.x * 0.15;
    points.rotation.x = mouse.y * 0.1;

    group.position.y = scrollState.p * 1.5;
    wire.material.opacity = 0.22 * (1 - scrollState.p);
    inner.material.opacity = 0.35 * (1 - scrollState.p);
    points.material.opacity = 0.6 * (1 - scrollState.p);

    renderer.render(scene, camera);
});
}

/* ---------- Scroll reveals ---------- */
if (!reduceMotion) {
    const reveal = (targets, vars = {}, trigger) =>
        gsap.from(targets, {
            y: 40,
            opacity: 0,
            duration: 0.9,
            ease: 'power3.out',
            ...vars,
            clearProps: 'transform,opacity',
            onComplete() { gsap.utils.toArray(targets).forEach((el) => el.classList && el.classList.add('revealed')); },
            scrollTrigger: { trigger: trigger || targets, start: 'top 85%', once: true },
        });

    document.querySelectorAll('.section-header').forEach((h) => {
        reveal(h.children, { stagger: 0.12 }, h);
    });

    reveal('.about-text p', { stagger: 0.15 }, '.about-text');

    // stat counters
    document.querySelectorAll('.stat-number').forEach((el) => {
        const m = el.textContent.match(/^(\d+)(.*)$/);
        if (!m) return;
        const end = parseInt(m[1], 10);
        const suffix = m[2];
        const obj = { v: 0 };
        el.textContent = '0' + suffix;
        gsap.to(obj, {
            v: end,
            duration: 1.8,
            ease: 'power2.out',
            onUpdate: () => (el.textContent = Math.round(obj.v) + suffix),
            scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        });
    });
    reveal('.stat-item', { stagger: 0.12 }, '.about-stats');

    reveal('.skill-category', { stagger: 0.1 }, '.skills-grid');
    gsap.from('.skill-list li', {
        x: -14,
        opacity: 0,
        duration: 0.5,
        stagger: 0.04,
        ease: 'power2.out',
        scrollTrigger: { trigger: '.skills-grid', start: 'top 75%', once: true },
    });

    // projects: image curtain wipe + content slide
    document.querySelectorAll('.project').forEach((p) => {
        const img = p.querySelector('.project-image');
        const imgEl = img.querySelector('img');
        const content = p.querySelector('.project-content');
        gsap.timeline({ scrollTrigger: { trigger: p, start: 'top 80%', once: true } })
            .from(img, { clipPath: 'inset(0 100% 0 0)', duration: 1.2, ease: 'power3.inOut' })
            .from(imgEl, { scale: 1.3, duration: 1.4, ease: 'power3.out' }, 0)
            .from(content.children, { y: 30, opacity: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out' }, 0.5);

        // subtle image parallax while scrolling
        gsap.fromTo(imgEl, { yPercent: -6 }, {
            yPercent: 6,
            ease: 'none',
            scrollTrigger: { trigger: p, start: 'top bottom', end: 'bottom top', scrub: true },
        });
    });

    reveal('.testimonial', { stagger: 0.15 }, '.testimonials-grid');
    reveal('.teaser-list li', { stagger: 0.12 }, '.teaser-list');
    reveal('.teaser-cta', {}, '.teaser-cta');
    reveal('.contact-content > *', { stagger: 0.1 }, '.contact-content');

    // magnetic CTA
    const cta = document.querySelector('.cta-button');
    if (window.matchMedia('(hover: hover)').matches) {
    const xTo = gsap.quickTo(cta, 'x', { duration: 0.4, ease: 'power3' });
    const yTo = gsap.quickTo(cta, 'y', { duration: 0.4, ease: 'power3' });
    cta.addEventListener('pointermove', (e) => {
        const r = cta.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.25);
        yTo((e.clientY - r.top - r.height / 2) * 0.35);
    });
    cta.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    }
}
