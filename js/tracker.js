function getStoredPackages() {
    return JSON.parse(localStorage.getItem('packages') || '{}');
}

function saveStoredPackages(packages) {
    localStorage.setItem('packages', JSON.stringify(packages));
}

function getElapsedDays(createdAt) {
    var start = new Date(createdAt || new Date().toISOString());
    var now = new Date();
    var diffTime = now.getTime() - start.getTime();
    return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
}

function getShipmentProgress(record) {
    var daysElapsed = getElapsedDays(record.createdAt || record.bookedAt);
    var progress = {
        statusKey: 'booked',
        statusLabel: 'Booked',
        currentLocation: record.from,
        daysElapsed: daysElapsed
    };

    if (daysElapsed >= 5) {
        progress.statusKey = 'out-for-delivery';
        progress.statusLabel = 'Out for Delivery';
        progress.currentLocation = record.to;
        return progress;
    }

    if (daysElapsed >= 2) {
        progress.statusKey = 'processed';
        progress.statusLabel = 'Processed';
        progress.currentLocation = record.processingLocation || 'Origin Processing Center';
    }

    return progress;
}

function hydrateShipment(record) {
    var hydrated = Object.assign({}, record);
    var progress = getShipmentProgress(hydrated);

    hydrated.daysElapsed = progress.daysElapsed;
    hydrated.status = progress.statusKey;
    hydrated.statusLabel = progress.statusLabel;
    hydrated.currentLocation = progress.currentLocation;

    if (typeof window.buildShipmentTimeline === 'function') {
        hydrated.timeline = window.buildShipmentTimeline(hydrated);
    } else if (!Array.isArray(hydrated.timeline)) {
        hydrated.timeline = [];
    }

    return hydrated;
}

function renderTimeline(events) {
    var timelineEvents = document.getElementById('timelineEvents');
    timelineEvents.innerHTML = '';

    events.forEach(function(event) {
        var wrapper = document.createElement('div');
        wrapper.className = 'timeline-event';

        var time = document.createElement('div');
        time.className = 'event-time';
        time.textContent = event.time;

        var description = document.createElement('div');
        description.className = 'event-description';
        description.innerHTML = '<strong>' + event.status + '</strong>';

        var location = document.createElement('div');
        location.className = 'event-location';
        location.textContent = event.location;

        wrapper.appendChild(time);
        wrapper.appendChild(description);
        wrapper.appendChild(location);
        timelineEvents.appendChild(wrapper);
    });
}

function updateStatusBadge(element, statusKey, statusLabel) {
    element.className = 'value status-badge';

    if (statusKey === 'processed') {
        element.classList.add('in-transit');
    } else if (statusKey === 'out-for-delivery') {
        element.classList.add('in-transit');
    } else {
        element.classList.add('pending');
    }

    element.textContent = statusLabel;
}

function showTrackingResult(record) {
    document.getElementById('resultTrackingNumber').textContent = record.trackingNumber;
    updateStatusBadge(document.getElementById('resultStatus'), record.status, record.statusLabel);
    document.getElementById('resultLocation').textContent = record.currentLocation;
    document.getElementById('resultDelivery').textContent = record.estimatedDelivery;

    renderTimeline(record.timeline || []);

    document.getElementById('trackingResults').style.display = 'block';
    document.getElementById('noResults').style.display = 'none';
}

function hideTrackingResult() {
    document.getElementById('trackingResults').style.display = 'none';
}

function showNoResults() {
    hideTrackingResult();
    document.getElementById('noResults').style.display = 'block';
}

function trackPackage() {
    var trackingInput = document.getElementById('trackingNumber');
    var trackingNumber = trackingInput.value.trim().toUpperCase();

    if (!trackingNumber) {
        showNoResults();
        return;
    }

    var packages = getStoredPackages();
    var record = packages[trackingNumber];

    if (!record) {
        showNoResults();
        return;
    }

    var hydratedRecord = hydrateShipment(record);
    packages[trackingNumber] = hydratedRecord;
    saveStoredPackages(packages);
    showTrackingResult(hydratedRecord);
}

window.trackPackage = trackPackage;
