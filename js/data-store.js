(function() {
    var STORAGE_KEY = 'packages';
    var FALLBACK_BOOKING_PASSWORD = 'Notorious3333';
    var SUPABASE_URL = (window.GRE_SUPABASE_URL || '').replace(/\/$/, '');
    var SUPABASE_ANON_KEY = window.GRE_SUPABASE_ANON_KEY || '';

    function isObject(value) {
        return value && typeof value === 'object' && !Array.isArray(value);
    }

    function normalizeTrackingNumber(value) {
        if (typeof window.normalizeTrackingNumber === 'function') {
            return window.normalizeTrackingNumber(value);
        }

        return (value || '').toString().trim().toUpperCase();
    }

    function getLocalPackages() {
        try {
            var parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            return isObject(parsed) ? parsed : {};
        } catch (error) {
            return {};
        }
    }

    function saveLocalPackages(packages) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(packages));
        } catch (error) {
            return;
        }
    }

    function isRemoteConfigured() {
        return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
    }

    async function supabaseRequest(path, options) {
        var response = await fetch(SUPABASE_URL + path, Object.assign({}, options, {
            headers: Object.assign({
                'Content-Type': 'application/json',
                apikey: SUPABASE_ANON_KEY,
                Authorization: 'Bearer ' + SUPABASE_ANON_KEY
            }, (options && options.headers) || {})
        }));

        if (!response.ok) {
            var errorMessage = 'Remote store request failed with status ' + response.status;

            try {
                var errorBody = await response.json();
                if (errorBody && errorBody.message) {
                    errorMessage = errorBody.message;
                }
            } catch (error) {
                return Promise.reject(new Error(errorMessage));
            }

            throw new Error(errorMessage);
        }

        return response;
    }

    async function bookShipmentWithPassword(record, bookingPassword) {
        if (!isObject(record)) {
            throw new Error('Invalid shipment record.');
        }

        if (!bookingPassword) {
            throw new Error('Admin password is required.');
        }

        if (!isRemoteConfigured()) {
            throw new Error('Secure booking backend is not configured.');
        }

        var trackingNumber = normalizeTrackingNumber(record.trackingNumber);
        if (!trackingNumber) {
            throw new Error('Tracking number is required.');
        }

        var normalizedRecord = Object.assign({}, record, {
            trackingNumber: trackingNumber
        });

        var response;
        try {
            response = await supabaseRequest('/rest/v1/rpc/book_shipment_secure', {
                method: 'POST',
                body: JSON.stringify({
                    booking_password: bookingPassword,
                    shipment_tracking_number: trackingNumber,
                    shipment_payload: normalizedRecord
                })
            });
        } catch (requestError) {
            var message = requestError && requestError.message ? requestError.message : '';
            var rpcMissing = message.indexOf('Could not find the function public.book_shipment_secure') !== -1;

            if (!rpcMissing) {
                throw requestError;
            }

            if (bookingPassword !== FALLBACK_BOOKING_PASSWORD) {
                throw new Error('Incorrect admin password. Booking is restricted.');
            }

            await upsertShipment(normalizedRecord);
            return {
                ok: true,
                tracking_number: trackingNumber,
                mode: 'fallback'
            };
        }

        var result = null;
        try {
            result = await response.json();
        } catch (error) {
            result = null;
        }

        if (result && result.ok === false) {
            throw new Error(result.message || 'Booking request was denied.');
        }

        var localPackages = getLocalPackages();
        localPackages[trackingNumber] = normalizedRecord;
        saveLocalPackages(localPackages);

        return result;
    }

    async function upsertShipment(record) {
        if (!isObject(record)) {
            return;
        }

        var trackingNumber = normalizeTrackingNumber(record.trackingNumber);
        if (!trackingNumber) {
            return;
        }

        var normalizedRecord = Object.assign({}, record, {
            trackingNumber: trackingNumber
        });

        var localPackages = getLocalPackages();
        localPackages[trackingNumber] = normalizedRecord;
        saveLocalPackages(localPackages);

        if (!isRemoteConfigured()) {
            return;
        }

        await supabaseRequest('/rest/v1/shipments', {
            method: 'POST',
            headers: {
                Prefer: 'resolution=merge-duplicates,return=minimal'
            },
            body: JSON.stringify([{
                tracking_number: trackingNumber,
                payload: normalizedRecord
            }])
        });
    }

    async function getShipment(trackingNumber) {
        var normalizedTracking = normalizeTrackingNumber(trackingNumber);
        if (!normalizedTracking) {
            return null;
        }

        var localPackages = getLocalPackages();
        if (localPackages[normalizedTracking]) {
            return localPackages[normalizedTracking];
        }

        if (!isRemoteConfigured()) {
            return null;
        }

        var response = await supabaseRequest(
            '/rest/v1/shipments?tracking_number=eq.' + encodeURIComponent(normalizedTracking) + '&select=payload&limit=1',
            { method: 'GET' }
        );

        var rows = await response.json();
        var payload = Array.isArray(rows) && rows[0] ? rows[0].payload : null;
        if (!isObject(payload)) {
            return null;
        }

        payload.trackingNumber = normalizeTrackingNumber(payload.trackingNumber || normalizedTracking);
        localPackages[payload.trackingNumber] = payload;
        saveLocalPackages(localPackages);

        return payload;
    }

    async function seedSamplePackages(samplePackages) {
        if (!isObject(samplePackages)) {
            return;
        }

        var localPackages = getLocalPackages();
        var hasLocalPackages = Object.keys(localPackages).length > 0;

        if (!hasLocalPackages) {
            saveLocalPackages(samplePackages);
        }

        if (!isRemoteConfigured()) {
            return;
        }

        var records = Object.keys(samplePackages).map(function(trackingNumber) {
            var record = Object.assign({}, samplePackages[trackingNumber], {
                trackingNumber: normalizeTrackingNumber(trackingNumber)
            });

            return {
                tracking_number: record.trackingNumber,
                payload: record
            };
        });

        if (!records.length) {
            return;
        }

        await supabaseRequest('/rest/v1/shipments', {
            method: 'POST',
            headers: {
                Prefer: 'resolution=merge-duplicates,return=minimal'
            },
            body: JSON.stringify(records)
        });
    }

    window.GREDataStore = {
        isRemoteConfigured: isRemoteConfigured,
        getShipment: getShipment,
        upsertShipment: upsertShipment,
        bookShipmentWithPassword: bookShipmentWithPassword,
        seedSamplePackages: seedSamplePackages,
        getLocalPackages: getLocalPackages,
        saveLocalPackages: saveLocalPackages
    };
})();
