function getStoredPackages() {
    try {
        var stored = JSON.parse(localStorage.getItem('packages') || '{}');
        return stored && typeof stored === 'object' ? stored : {};
    } catch (error) {
        return {};
    }
}

function saveStoredPackages(packages) {
    try {
        localStorage.setItem('packages', JSON.stringify(packages));
    } catch (error) {
        return;
    }
}

function normalizeTrackingLookup(value) {
    if (typeof window.normalizeTrackingNumber === 'function') {
        return window.normalizeTrackingNumber(value);
    }

    return (value || '').toString().trim().toUpperCase();
}

function importSharedShipment(source) {
    if (typeof window.getSharedShipmentFromSource !== 'function') {
        return '';
    }

    var sharedRecord = window.getSharedShipmentFromSource(source);
    if (!sharedRecord) {
        return '';
    }

    var trackingNumber = normalizeTrackingLookup(sharedRecord.trackingNumber);
    if (!trackingNumber) {
        return '';
    }

    var packages = getStoredPackages();
    packages[trackingNumber] = sharedRecord;
    saveStoredPackages(packages);

    return trackingNumber;
}

function getTrackingNumberFromUrl() {
    try {
        var params = new URLSearchParams(window.location.search);
        return normalizeTrackingLookup(params.get('tracking'));
    } catch (error) {
        return '';
    }
}

function getElapsedDays(createdAt) {
    var start = new Date(createdAt || new Date().toISOString());
    var now = new Date();
    var diffTime = now.getTime() - start.getTime();
    return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
}

function getRouteStopForDay(route, daysElapsed) {
    if (!Array.isArray(route) || !route.length) {
        return null;
    }

    var currentStop = route[0];
    for (var i = 0; i < route.length; i++) {
        if (daysElapsed >= route[i].day) {
            currentStop = route[i];
        }
    }

    return currentStop;
}

function getShipmentProgress(record) {
    var daysElapsed = getElapsedDays(record.createdAt || record.bookedAt);
    var route = Array.isArray(record.route) ? record.route : [];
    var currentStop = getRouteStopForDay(route, daysElapsed);
    var progress = {
        statusKey: 'booked',
        statusLabel: 'Booked',
        currentLocation: record.from,
        daysElapsed: daysElapsed,
        currentRouteStop: currentStop
    };

    if (currentStop) {
        progress.statusLabel = currentStop.status;
        progress.currentLocation = currentStop.location;
    }

    if (daysElapsed >= 5) {
        progress.statusKey = 'out-for-delivery';
        return progress;
    }

    if (daysElapsed >= 3) {
        progress.statusKey = 'in-transit';
        return progress;
    }

    if (daysElapsed >= 2) {
        progress.statusKey = 'processed';
        return progress;
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
    hydrated.currentRouteStop = progress.currentRouteStop;

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

function renderProgressTracker(record) {
    var stepsContainer = document.getElementById('progressSteps');
    var progressPercent = document.getElementById('progressPercent');
    var progressBarFill = document.getElementById('progressBarFill');
    if (!stepsContainer || !progressPercent || !progressBarFill) {
        return;
    }

    var steps = [
        { label: 'Booked', day: 0 },
        { label: 'Processed', day: 2 },
        { label: 'In Transit', day: 3 },
        { label: 'Destination Hub', day: 4 },
        { label: 'Out for Delivery', day: 5 }
    ];

    stepsContainer.innerHTML = '';

    var percentage = Math.min(100, Math.round((Math.min(record.daysElapsed, 5) / 5) * 100));
    progressPercent.textContent = percentage + '% Complete';
    progressBarFill.style.width = percentage + '%';

    steps.forEach(function(step, index) {
        var stepElement = document.createElement('div');
        stepElement.className = 'progress-step';

        if (record.daysElapsed > step.day || (record.daysElapsed >= 5 && step.day === 5)) {
            stepElement.classList.add('complete');
        }

        if (record.daysElapsed >= step.day && record.daysElapsed < (steps[index + 1] ? steps[index + 1].day : 99)) {
            stepElement.classList.add('active');
        }

        if (record.daysElapsed >= 5 && step.day === 5) {
            stepElement.classList.add('active');
        }

        stepElement.innerHTML =
            '<div class="progress-step-dot">' + (index + 1) + '</div>' +
            '<div class="progress-step-label">' + step.label + '</div>';

        stepsContainer.appendChild(stepElement);
    });
}

function renderRouteMap(record) {
    var routeMap = document.getElementById('routeMap');
    var currentRouteLabel = document.getElementById('currentRouteLabel');
    if (!routeMap || !currentRouteLabel) {
        return;
    }

    var route = Array.isArray(record.route) ? record.route : [];
    routeMap.innerHTML = '';
    currentRouteLabel.textContent = record.currentLocation;

    route.forEach(function(stop, index) {
        var stopElement = document.createElement('div');
        stopElement.className = 'route-stop';

        if (record.daysElapsed >= stop.day) {
            stopElement.classList.add('complete');
        }

        if (record.currentRouteStop && record.currentRouteStop.day === stop.day) {
            stopElement.classList.add('active');
        }

        stopElement.innerHTML =
            '<div class="route-stop-marker">' + (index + 1) + '</div>' +
            '<div class="route-stop-content">' +
                '<span class="route-stop-status">' + stop.status + '</span>' +
                '<span class="route-stop-location">' + stop.location + '</span>' +
            '</div>' +
            '<span class="route-stop-day">Day ' + stop.day + '</span>';

        routeMap.appendChild(stopElement);
    });
}

function updateStatusBadge(element, statusKey, statusLabel) {
    element.className = 'value status-badge';

    if (statusKey === 'processed' || statusKey === 'in-transit' || statusKey === 'out-for-delivery') {
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

    renderProgressTracker(record);
    renderRouteMap(record);
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
    var trackingValue = trackingInput.value.trim();
    var trackingNumber = importSharedShipment(trackingValue) || normalizeTrackingLookup(trackingValue);

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

function bootstrapSharedTracking() {
    importSharedShipment(window.location.href);

    var trackingNumber = getTrackingNumberFromUrl();
    if (!trackingNumber) {
        return;
    }

    var trackingInput = document.getElementById('trackingNumber');
    if (!trackingInput) {
        return;
    }

    trackingInput.value = trackingNumber;
    trackPackage();
}

window.trackPackage = trackPackage;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapSharedTracking);
} else {
    bootstrapSharedTracking();
}
