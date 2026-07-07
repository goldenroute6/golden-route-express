(function() {
    var STORAGE_KEY = 'packages';
    var SHIPMENTS_SOURCE = window.GRE_SHIPMENTS_SOURCE || 'data/shipments.json';
    var sourceCache = null;

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
        return false;
    }

    async function fetchSourcePackages() {
        if (sourceCache) {
            return sourceCache;
        }

        try {
            var response = await fetch(SHIPMENTS_SOURCE, { cache: 'no-store' });
            if (!response.ok) {
                sourceCache = {};
                return sourceCache;
            }

            var rows = await response.json();
            if (!Array.isArray(rows)) {
                sourceCache = {};
                return sourceCache;
            }

            var mapped = {};

            rows.forEach(function(row) {
                if (!row || !isObject(row.payload)) {
                    return;
                }

                var trackingNumber = normalizeTrackingNumber(row.tracking_number || row.payload.trackingNumber);
                if (!trackingNumber) {
                    return;
                }

                var payload = Object.assign({}, row.payload, {
                    trackingNumber: trackingNumber
                });

                mapped[trackingNumber] = payload;
            });

            sourceCache = mapped;
            return mapped;
        } catch (error) {
            sourceCache = {};
            return sourceCache;
        }
    }

    async function bookShipmentWithPassword(record, bookingPassword) {
        if (!isObject(record)) {
            throw new Error('Invalid shipment record.');
        }

        if (!bookingPassword) {
            throw new Error('Admin password is required.');
        }

        var trackingNumber = normalizeTrackingNumber(record.trackingNumber);
        if (!trackingNumber) {
            throw new Error('Tracking number is required.');
        }

        var normalizedRecord = Object.assign({}, record, {
            trackingNumber: trackingNumber
        });

        await upsertShipment(normalizedRecord);

        return {
            ok: true,
            tracking_number: trackingNumber,
            mode: 'local'
        };
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

        var sourcePackages = await fetchSourcePackages();
        var payload = sourcePackages[normalizedTracking] || null;
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

        var sourcePackages = await fetchSourcePackages();
        if (Object.keys(sourcePackages).length) {
            saveLocalPackages(sourcePackages);
            return;
        }

        var localPackages = getLocalPackages();
        var hasLocalPackages = Object.keys(localPackages).length > 0;

        if (!hasLocalPackages) {
            saveLocalPackages(samplePackages);
        }
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
