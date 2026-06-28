document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
    setupNavigation();
    setupMobileMenu();
    initializeLocalStorage();
    attachEventListeners();
}

function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach((link) => {
        link.addEventListener('click', function () {
            navLinks.forEach((navLink) => navLink.classList.remove('active'));
            this.classList.add('active');
            closeMobileMenu();
        });
    });
}

function setupMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    if (!hamburger || !navMenu) {
        return;
    }

    hamburger.addEventListener('click', function () {
        const isExpanded = navMenu.classList.toggle('active');
        this.classList.toggle('active', isExpanded);
        this.setAttribute('aria-expanded', String(isExpanded));
    });
}

function closeMobileMenu() {
    const navMenu = document.querySelector('.nav-menu');
    const hamburger = document.querySelector('.hamburger');

    if (navMenu && hamburger) {
        navMenu.classList.remove('active');
        hamburger.classList.remove('active');
        hamburger.setAttribute('aria-expanded', 'false');
    }
}

function scrollToTracker() {
    const tracker = document.getElementById('tracker');

    if (tracker) {
        tracker.scrollIntoView({ behavior: 'smooth' });
    }
}

function initializeLocalStorage() {
    if (localStorage.getItem('packages')) {
        return;
    }

    const samplePackages = {
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

    localStorage.setItem('packages', JSON.stringify(samplePackages));
}

function attachEventListeners() {
    const trackingInput = document.getElementById('trackingNumber');
    const trackPackageButton = document.getElementById('trackPackageButton');
    const scrollToTrackerButton = document.getElementById('scrollToTrackerButton');

    if (trackingInput) {
        trackingInput.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                trackPackage();
            }
        });
    }

    if (trackPackageButton) {
        trackPackageButton.addEventListener('click', trackPackage);
    }

    if (scrollToTrackerButton) {
        scrollToTrackerButton.addEventListener('click', scrollToTracker);
    }
}

function formatDate(dateString) {
    if (!dateString) {
        return 'Unavailable';
    }

    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateString);
    const date = new Date(isDateOnly ? `${dateString}T12:00:00` : dateString);

    if (Number.isNaN(date.getTime())) {
        return dateString;
    }

    const formatOptions = isDateOnly
        ? { year: 'numeric', month: 'long', day: 'numeric' }
        : { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };

    return new Intl.DateTimeFormat('en-US', formatOptions).format(date);
}

function getStatusColor(status) {
    switch (status) {
        case 'delivered':
            return 'delivered';
        case 'in-transit':
            return 'in-transit';
        case 'pending':
            return 'pending';
        default:
            return 'pending';
    }
}

function getStatusText(status) {
    switch (status) {
        case 'delivered':
            return '✓ Delivered';
        case 'in-transit':
            return '→ In Transit';
        case 'pending':
            return '⏳ Pending';
        default:
            return 'Unknown';
    }
}

window.formatDate = formatDate;
window.getStatusColor = getStatusColor;
window.getStatusText = getStatusText;
