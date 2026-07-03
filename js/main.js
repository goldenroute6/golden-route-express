document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupNavigation();
    setupMobileMenu();
    initializePackageStorage();
    attachEventListeners();
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
