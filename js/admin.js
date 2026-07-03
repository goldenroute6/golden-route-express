(function() {
    var supabase = null;
    var loginForm = document.getElementById('adminLoginForm');
    var bookingForm = document.getElementById('adminBookingForm');
    var loginPanel = document.getElementById('adminLoginPanel');
    var sessionPanel = document.getElementById('adminSession');
    var bookingPanel = document.getElementById('bookingPanel');
    var bookingSuccess = document.getElementById('bookingSuccess');
    var adminUserEmail = document.getElementById('adminUserEmail');
    var createdTrackingNumber = document.getElementById('createdTrackingNumber');
    var adminError = document.getElementById('adminError');
    var adminNotice = document.getElementById('adminNotice');
    var adminLogoutBtn = document.getElementById('adminLogoutBtn');

    function showError(message) {
        adminError.style.display = 'block';
        adminError.textContent = message;
        adminNotice.style.display = 'none';
    }

    function showNotice(message) {
        adminNotice.style.display = 'block';
        adminNotice.textContent = message;
        adminError.style.display = 'none';
    }

    function clearMessages() {
        adminError.style.display = 'none';
        adminNotice.style.display = 'none';
    }

    function normalizeTrackingNumber(value) {
        return (value || '').toString().trim().toUpperCase();
    }

    function generateTrackingNumber() {
        var year = new Date().getFullYear();
        var rand = Math.floor(Math.random() * 9000) + 1000;
        return 'GRE-' + year + '-' + rand;
    }

    function getDeliveryDate() {
        var date = new Date();
        date.setDate(date.getDate() + 5);
        return date.toISOString().split('T')[0];
    }

    function getShippingLabel(shippingType) {
        switch (shippingType) {
            case 'air':
                return 'Air Express';
            case 'sea':
                return 'Sea Freight';
            case 'standard':
            default:
                return 'Standard';
        }
    }

    function formatTimelineTime(date) {
        var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
        return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
            ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
    }

    function createTransitRoute(from, to, senderCity, recipientCity, shippingType) {
        var route = [
            {
                day: 0,
                status: 'Shipment Booked',
                location: from,
                locationLabel: senderCity + ' Pickup Point'
            },
            {
                day: 2,
                status: 'Processed',
                location: senderCity + ' Processing Center',
                locationLabel: senderCity + ' Processing Center'
            }
        ];

        if (shippingType === 'sea') {
            route.push(
                {
                    day: 3,
                    status: 'In Transit',
                    location: senderCity + ' Seaport Terminal',
                    locationLabel: senderCity + ' Seaport Terminal'
                },
                {
                    day: 4,
                    status: 'Arrived at Destination Hub',
                    location: recipientCity + ' Port Logistics Hub',
                    locationLabel: recipientCity + ' Port Logistics Hub'
                }
            );
        } else {
            route.push(
                {
                    day: 3,
                    status: 'In Transit',
                    location: senderCity + ' Air Cargo Hub',
                    locationLabel: senderCity + ' Air Cargo Hub'
                },
                {
                    day: 4,
                    status: 'Arrived at Destination Hub',
                    location: recipientCity + ' Distribution Hub',
                    locationLabel: recipientCity + ' Distribution Hub'
                }
            );
        }

        route.push({
            day: 5,
            status: 'Out for Delivery',
            location: to,
            locationLabel: recipientCity + ' Final Delivery Route'
        });

        return route;
    }

    function getFormData() {
        return {
            senderName: document.getElementById('senderName').value.trim(),
            senderCity: document.getElementById('senderCity').value.trim(),
            senderCountry: document.getElementById('senderCountry').value.trim(),
            recipientName: document.getElementById('recipientName').value.trim(),
            recipientCity: document.getElementById('recipientCity').value.trim(),
            recipientCountry: document.getElementById('recipientCountry').value.trim(),
            cargoDescription: document.getElementById('cargoDescription').value.trim(),
            cargoWeight: document.getElementById('cargoWeight').value.trim(),
            shippingType: document.getElementById('shippingType').value
        };
    }

    function validateFormData(data) {
        var fields = [
            ['senderName', 'Sender name'],
            ['senderCity', 'Sender city'],
            ['senderCountry', 'Sender country'],
            ['recipientName', 'Recipient name'],
            ['recipientCity', 'Recipient city'],
            ['recipientCountry', 'Recipient country'],
            ['cargoDescription', 'Cargo description'],
            ['cargoWeight', 'Cargo weight'],
            ['shippingType', 'Shipping type']
        ];

        for (var i = 0; i < fields.length; i++) {
            var key = fields[i][0];
            var label = fields[i][1];
            if (!data[key]) {
                return label + ' is required.';
            }
        }

        var weight = parseFloat(data.cargoWeight);
        if (isNaN(weight) || weight <= 0) {
            return 'Please enter a valid cargo weight.';
        }

        return null;
    }

    function buildShipmentRecord(trackingNumber, data) {
        var now = new Date();
        var from = data.senderCity + ', ' + data.senderCountry;
        var to = data.recipientCity + ', ' + data.recipientCountry;

        return {
            trackingNumber: normalizeTrackingNumber(trackingNumber),
            status: 'booked',
            from: from,
            to: to,
            currentLocation: from,
            estimatedDelivery: getDeliveryDate(),
            weight: data.cargoWeight + ' kg',
            contents: data.cargoDescription,
            sender: data.senderName,
            recipient: data.recipientName,
            senderCity: data.senderCity,
            senderCountry: data.senderCountry,
            recipientCity: data.recipientCity,
            recipientCountry: data.recipientCountry,
            shippingType: getShippingLabel(data.shippingType),
            shippingTypeValue: data.shippingType,
            createdAt: now.toISOString(),
            bookedAt: now.toISOString(),
            route: createTransitRoute(from, to, data.senderCity, data.recipientCity, data.shippingType),
            daysElapsed: 0,
            timeline: [
                {
                    status: 'Shipment Booked',
                    location: from,
                    time: formatTimelineTime(now)
                }
            ]
        };
    }

    function isAllowedAdmin(session) {
        var requiredEmail = (window.GRE_ADMIN_EMAIL || '').trim().toLowerCase();

        if (!session || !session.user || !session.user.email) {
            return false;
        }

        if (!requiredEmail) {
            return true;
        }

        return session.user.email.toLowerCase() === requiredEmail;
    }

    function showSignedOutView() {
        loginPanel.style.display = 'block';
        sessionPanel.style.display = 'none';
        bookingPanel.style.display = 'none';
        bookingSuccess.style.display = 'none';
    }

    function showSignedInView(session) {
        loginPanel.style.display = 'none';
        sessionPanel.style.display = 'block';
        bookingPanel.style.display = 'block';
        adminUserEmail.textContent = session.user.email;
    }

    async function refreshSessionView() {
        var result = await supabase.auth.getSession();
        var session = result.data.session;

        if (!session) {
            showSignedOutView();
            return;
        }

        if (!isAllowedAdmin(session)) {
            await supabase.auth.signOut();
            showSignedOutView();
            showError('This account is not authorized for admin booking.');
            return;
        }

        showSignedInView(session);
    }

    async function handleLogin(event) {
        event.preventDefault();
        clearMessages();

        var email = document.getElementById('adminEmail').value.trim();
        var password = document.getElementById('adminPassword').value;

        if (!email || !password) {
            showError('Email and password are required.');
            return;
        }

        var response = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (response.error) {
            showError(response.error.message);
            return;
        }

        await refreshSessionView();
        showNotice('Signed in successfully. You can now create bookings.');
    }

    async function handleLogout() {
        clearMessages();
        await supabase.auth.signOut();
        showSignedOutView();
        showNotice('Signed out.');
    }

    async function handleBooking(event) {
        event.preventDefault();
        clearMessages();

        var formData = getFormData();
        var validationError = validateFormData(formData);
        if (validationError) {
            showError(validationError);
            return;
        }

        var trackingNumber = generateTrackingNumber();
        var record = buildShipmentRecord(trackingNumber, formData);

        var result = await supabase
            .from('shipments')
            .upsert({
                tracking_number: trackingNumber,
                payload: record
            }, { onConflict: 'tracking_number' });

        if (result.error) {
            showError(result.error.message);
            return;
        }

        createdTrackingNumber.textContent = trackingNumber;
        bookingSuccess.style.display = 'block';
        bookingForm.reset();
        showNotice('Shipment created successfully.');
    }

    function init() {
        if (!window.supabase || !window.supabase.createClient) {
            showError('Supabase client failed to load.');
            return;
        }

        if (!window.GRE_SUPABASE_URL || !window.GRE_SUPABASE_ANON_KEY) {
            showError('Missing Supabase project configuration.');
            return;
        }

        supabase = window.supabase.createClient(window.GRE_SUPABASE_URL, window.GRE_SUPABASE_ANON_KEY);

        loginForm.addEventListener('submit', handleLogin);
        bookingForm.addEventListener('submit', handleBooking);
        adminLogoutBtn.addEventListener('click', handleLogout);

        refreshSessionView();
        supabase.auth.onAuthStateChange(function() {
            refreshSessionView();
        });
    }

    init();
})();
