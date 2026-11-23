        // Parallax scrolling effect - shapes move at 30% of scroll speed
        const parallaxLayer = document.querySelector('.parallax-layer');
        let ticking = false;

        function updateParallax() {
            // Spread the shape layer across the whole page: at the top we see its
            // top edge, at the bottom of the page we see its bottom edge.
            const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
            const travel = Math.max(0, parallaxLayer.offsetHeight - window.innerHeight);
            const progress = Math.min(1, Math.max(0, window.pageYOffset / maxScroll));
            parallaxLayer.style.transform = `translate3d(0, ${-progress * travel}px, 0)`;
            ticking = false;
        }
        window.addEventListener('resize', updateParallax);
        window.addEventListener('load', updateParallax);

        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(updateParallax);
                ticking = true;
            }
        });

        // Navbar scroll effect
        const nav = document.getElementById('nav');
        const navToggle = document.getElementById('nav-toggle');
        const navLinks = document.getElementById('nav-links');
        window.addEventListener('scroll', () => {
            if (window.scrollY > 100) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }
        });

        function closeNavMenu() {
            if (!nav || !navToggle) {
                return;
            }
            nav.classList.remove('open');
            navToggle.setAttribute('aria-expanded', 'false');
        }

        if (nav && navToggle && navLinks) {
            navToggle.addEventListener('click', () => {
                const isOpen = nav.classList.toggle('open');
                navToggle.setAttribute('aria-expanded', String(isOpen));
            });

            navLinks.querySelectorAll('a').forEach((link) => {
                link.addEventListener('click', closeNavMenu);
            });

            document.addEventListener('click', (event) => {
                if (!nav.contains(event.target)) {
                    closeNavMenu();
                }
            });

            window.addEventListener('resize', () => {
                if (window.innerWidth > 768) {
                    closeNavMenu();
                }
            });
        }

        // Smooth scrolling
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Intersection Observer for fade-in animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        document.querySelectorAll('.fade-in').forEach(el => {
            observer.observe(el);
        });

        // Blog modal (only on pages that have it)
        const blogModal = document.getElementById('blog-modal');

        function closeBlogModal() {
            if (!blogModal) return;
            blogModal.classList.remove('open');
            document.body.style.overflow = '';
        }

        if (blogModal) {
            const modalDate = document.getElementById('modal-date');
            const modalTitle = document.getElementById('modal-title');
            const modalBody = document.getElementById('modal-body');

            document.querySelectorAll('.read-more').forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    modalDate.textContent = this.dataset.date;
                    modalTitle.textContent = this.dataset.title;
                    modalBody.innerHTML = this.dataset.content;
                    blogModal.classList.add('open');
                    document.body.style.overflow = 'hidden';
                });
            });

            document.querySelector('.blog-modal-close').addEventListener('click', closeBlogModal);
            blogModal.addEventListener('click', function(e) {
                if (e.target === blogModal) closeBlogModal();
            });
        }

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeNavMenu();
                closeBlogModal();
            }
        });
