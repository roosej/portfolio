import * as THREE from 'three';

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
gsap.registerPlugin(ScrollTrigger);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Hero: split title + intro timeline ---------- */
const title = document.querySelector('.hero-title');
const text = title.textContent;
title.setAttribute('aria-label', text);
title.innerHTML = [...text]
    .map((c) => `<span class="char" aria-hidden="true" style="display:inline-block">${c === ' ' ? '&nbsp;' : c}</span>`)
    .join('');

if (!reduceMotion) {
    gsap.timeline({ defaults: { ease: 'power3.out' } })
        .from('.hero-title .char', { yPercent: 110, opacity: 0, rotateX: -60, duration: 1.1, stagger: 0.04 })
        .from('.hero-subtitle', { y: 20, opacity: 0, duration: 0.9 }, '-=0.6')
        .from('.cta-button', { y: 20, opacity: 0, duration: 0.8 }, '-=0.6')
        .from('nav', { y: -30, opacity: 0, duration: 0.8 }, '-=0.8');
}

/* ---------- Hero: Three.js scene ---------- */
const hero = document.querySelector('.hero');
const canvas = document.createElement('canvas');
canvas.className = 'hero-canvas';
hero.prepend(canvas);

const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.z = 6;

const group = new THREE.Group();
scene.add(group);

// Wireframe icosahedron
const wire = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.7, 1)),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22 })
);
group.add(wire);

// Inner counter-rotating shape
const inner = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.OctahedronGeometry(0.8, 0)),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })
);
group.add(inner);

// Particle shell
const COUNT = 900;
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
    const w = hero.clientWidth;
    const h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // shift shape right on wide screens so the title stays clear
    group.position.x = w > 900 ? 2.4 : 0;
    group.scale.setScalar(w > 900 ? 1 : 0.8);
}
resize();
window.addEventListener('resize', resize);

const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
window.addEventListener('pointermove', (e) => {
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

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
    if (!heroVisible) return;
    const t = clock.getElapsedTime();
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;

    const speed = reduceMotion ? 0 : 1;
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
    reveal('.blog-card', { stagger: 0.15 }, '.blog-grid');
    reveal('.contact-content > *', { stagger: 0.1 }, '.contact-content');

    // magnetic CTA
    const cta = document.querySelector('.cta-button');
    const xTo = gsap.quickTo(cta, 'x', { duration: 0.4, ease: 'power3' });
    const yTo = gsap.quickTo(cta, 'y', { duration: 0.4, ease: 'power3' });
    cta.addEventListener('pointermove', (e) => {
        const r = cta.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.25);
        yTo((e.clientY - r.top - r.height / 2) * 0.35);
    });
    cta.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
}
