document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupNavigation();
    setupMobileMenu();
    initializePackageStorage();
    attachEventListeners();
    setupRevealAnimations();
    setupLanguageWidget();
    setupOpsRegionRotation();
}

function setupLanguageWidget() {
    var selector = document.getElementById('languageSwitcher');
    if (!selector) {
        return;
    }

    var savedLanguage = 'en';
    try {
        savedLanguage = localStorage.getItem('gre_language') || 'en';
    } catch (error) {
        savedLanguage = 'en';
    }

    selector.value = savedLanguage;
    applyLanguage(savedLanguage);

    selector.addEventListener('change', function() {
        var lang = selector.value || 'en';

        try {
            localStorage.setItem('gre_language', lang);
        } catch (error) {
            // Ignore storage errors and still apply selection for this session.
        }

        applyLanguage(lang);
    });
}

function applyLanguage(lang) {
    var translations = {
        en: {
            home: 'Home',
            track: 'Track Package',
            about: 'About',
            contact: 'Contact',
            liveOps: 'Live Ops',
            heroEyebrow: 'Global Freight Solutions',
            heroText: 'Ship and track your cargo by air and sea - fast, secure, and reliable delivery worldwide.',
            trackerTitle: 'Track Your Package',
            search: 'Search'
        },
        es: {
            home: 'Inicio',
            track: 'Rastrear Paquete',
            about: 'Acerca de',
            contact: 'Contacto',
            liveOps: 'Operaciones Activas',
            heroEyebrow: 'Soluciones Globales de Carga',
            heroText: 'Envia y rastrea tu carga por aire y mar con entrega rapida, segura y confiable en todo el mundo.',
            trackerTitle: 'Rastrea Tu Paquete',
            search: 'Buscar'
        },
        fr: {
            home: 'Accueil',
            track: 'Suivre Colis',
            about: 'A Propos',
            contact: 'Contact',
            liveOps: 'Operations En Direct',
            heroEyebrow: 'Solutions Mondiales de Fret',
            heroText: 'Expediez et suivez votre cargaison par air et mer avec une livraison rapide, sure et fiable dans le monde entier.',
            trackerTitle: 'Suivez Votre Colis',
            search: 'Rechercher'
        },
        ar: {
            home: 'الرئيسية',
            track: 'تتبع الشحنة',
            about: 'حول',
            contact: 'اتصل',
            liveOps: 'العمليات المباشرة',
            heroEyebrow: 'حلول شحن عالمية',
            heroText: 'اشحن وتتبع الشحنة جوا وبحرا بسرعة وامان وموثوقية حول العالم.',
            trackerTitle: 'تتبع شحنتك',
            search: 'بحث'
        },
        zh: {
            home: '主页',
            track: '包裹追踪',
            about: '关于我们',
            contact: '联系我们',
            liveOps: '实时运营',
            heroEyebrow: '全球货运解决方案',
            heroText: '通过空运和海运快速安全地追踪您的货物，覆盖全球。',
            trackerTitle: '追踪您的包裹',
            search: '搜索'
        },
        pt: {
            home: 'Inicio',
            track: 'Rastrear Pacote',
            about: 'Sobre',
            contact: 'Contato',
            liveOps: 'Operacoes Ao Vivo',
            heroEyebrow: 'Solucoes Globais de Carga',
            heroText: 'Envie e rastreie sua carga por via aerea e maritima com entrega rapida, segura e confiavel no mundo todo.',
            trackerTitle: 'Rastreie Seu Pacote',
            search: 'Pesquisar'
        }
    };

    var t = translations[lang] || translations.en;

    document.documentElement.lang = lang;
    if (lang === 'ar') {
        document.body.setAttribute('dir', 'rtl');
    } else {
        document.body.setAttribute('dir', 'ltr');
    }

    var navLinks = document.querySelectorAll('.nav-link');
    if (navLinks[0]) { navLinks[0].textContent = t.home; }
    if (navLinks[1]) { navLinks[1].textContent = t.track; }
    if (navLinks[2]) { navLinks[2].textContent = t.about; }
    if (navLinks[3]) { navLinks[3].textContent = t.contact; }

    var liveOps = document.querySelector('.ops-live-pill');
    if (liveOps) {
        liveOps.innerHTML = '<span class="dot"></span>' + t.liveOps;
    }

    var heroEyebrow = document.querySelector('.hero-eyebrow');
    if (heroEyebrow) {
        heroEyebrow.textContent = t.heroEyebrow;
    }

    var heroText = document.querySelector('.hero-content p');
    if (heroText) {
        heroText.textContent = t.heroText;
    }

    var trackerTitle = document.querySelector('#tracker h2');
    if (trackerTitle) {
        trackerTitle.textContent = t.trackerTitle;
    }

    var searchBtn = document.querySelector('.tracker-card .track-button');
    if (searchBtn) {
        searchBtn.textContent = t.search;
    }
}

function setupOpsRegionRotation() {
    var regionNode = document.getElementById('opsRegion');
    if (!regionNode) {
        return;
    }

    var regions = [
        'North Atlantic Corridor',
        'Trans-Pacific Cargo Lane',
        'Gulf-EU Air Bridge',
        'West Africa Ocean Cluster',
        'South Asia Express Grid'
    ];
    var pointer = 0;

    setInterval(function() {
        pointer = (pointer + 1) % regions.length;
        regionNode.textContent = regions[pointer];
    }, 5000);
}

function setupNavigation() {
    var navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(function(link) {
        link.addEventListener('click', function() {
            navLinks.forEach(function(activeLink) {
                activeLink.classList.remove('active');
            });

            this.classList.add('active');
            closeMobileMenu();
        });
    });
}

function setupMobileMenu() {
    var hamburger = document.querySelector('.hamburger');
    var navMenu = document.querySelector('.nav-menu');

    if (!hamburger || !navMenu) {
        return;
    }

    hamburger.addEventListener('click', function() {
        navMenu.classList.toggle('active');
        this.classList.toggle('active');
    });
}

function closeMobileMenu() {
    var navMenu = document.querySelector('.nav-menu');
    var hamburger = document.querySelector('.hamburger');

    if (!navMenu || !hamburger) {
        return;
    }

    navMenu.classList.remove('active');
    hamburger.classList.remove('active');
}

function scrollToSection(sectionId) {
    var section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

function scrollToTracker() {
    scrollToSection('tracker');
}

function getSamplePackages() {
    return {
        'GRE-2024-001': {
            trackingNumber: 'GRE-2024-001',
            status: 'in-transit',
            from: 'New York, NY',
            to: 'Los Angeles, CA',
            currentLocation: 'Chicago, IL',
            estimatedDelivery: '2024-12-25',
            weight: '2.5 kg',
            contents: 'Electronics',
            timeline: [
                { status: 'Package Picked Up', location: 'New York, NY', time: '2024-12-20 08:00 AM' },
                { status: 'In Transit', location: 'Chicago, IL', time: '2024-12-22 02:30 PM' },
                { status: 'Out for Delivery', location: 'Los Angeles, CA', time: '2024-12-25 09:00 AM' }
            ]
        },
        'GRE-2024-002': {
            trackingNumber: 'GRE-2024-002',
            status: 'delivered',
            from: 'Boston, MA',
            to: 'Miami, FL',
            currentLocation: 'Miami, FL',
            estimatedDelivery: '2024-12-23',
            weight: '1.2 kg',
            contents: 'Books',
            timeline: [
                { status: 'Package Picked Up', location: 'Boston, MA', time: '2024-12-18 10:15 AM' },
                { status: 'In Transit', location: 'Atlanta, GA', time: '2024-12-20 05:45 PM' },
                { status: 'Delivered', location: 'Miami, FL', time: '2024-12-23 03:20 PM' }
            ]
        },
        'GRE-2024-003': {
            trackingNumber: 'GRE-2024-003',
            status: 'pending',
            from: 'Seattle, WA',
            to: 'Denver, CO',
            currentLocation: 'Seattle, WA',
            estimatedDelivery: '2024-12-27',
            weight: '5.0 kg',
            contents: 'Furniture',
            timeline: [
                { status: 'Package Received', location: 'Seattle, WA', time: '2024-12-22 11:30 AM' },
                { status: 'Processing', location: 'Seattle, WA', time: '2024-12-23 09:00 AM' },
                { status: 'In Transit', location: 'Denver, CO', time: '2024-12-27 06:00 PM' }
            ]
        }
    };
}

async function initializePackageStorage() {
    var samplePackages = getSamplePackages();

    if (window.GREDataStore && typeof window.GREDataStore.seedSamplePackages === 'function') {
        try {
            await window.GREDataStore.seedSamplePackages(samplePackages);
            return;
        } catch (error) {
            console.warn('Remote package seed failed. Falling back to local storage.', error);
        }
    }

    try {
        if (!localStorage.getItem('packages')) {
            localStorage.setItem('packages', JSON.stringify(samplePackages));
        }
    } catch (error) {
        return;
    }
}

function attachEventListeners() {
    var trackingInput = document.getElementById('trackingNumber');

    if (!trackingInput) {
        return;
    }

    trackingInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            if (typeof window.trackPackage === 'function') {
                window.trackPackage();
            }
        }
    });
}

function setupRevealAnimations() {
    var revealElements = document.querySelectorAll('.reveal, .service-card, .why-book-card, .about-item, .contact-item');
    if (!revealElements.length) {
        return;
    }

    if (typeof IntersectionObserver !== 'function') {
        revealElements.forEach(function(el) {
            el.classList.add('is-visible');
        });
        return;
    }

    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.14,
        rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(function(el) {
        observer.observe(el);
    });
}

function formatDate(dateString) {
    var options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };

    return new Date(dateString).toLocaleDateString('en-US', options);
}

function getStatusColor(status) {
    switch (status) {
        case 'delivered':
            return 'delivered';
        case 'in-transit':
            return 'in-transit';
        case 'pending':
        default:
            return 'pending';
    }
}

function getStatusText(status) {
    switch (status) {
        case 'delivered':
            return 'Delivered';
        case 'in-transit':
            return 'In Transit';
        case 'pending':
            return 'Pending';
        default:
            return 'Unknown';
    }
}

window.scrollToSection = scrollToSection;
window.scrollToTracker = scrollToTracker;
window.formatDate = formatDate;
window.getStatusColor = getStatusColor;
window.getStatusText = getStatusText;
