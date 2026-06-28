function getPackages() {
    try {
        return JSON.parse(localStorage.getItem('packages') || '{}');
    } catch (error) {
        return {};
    }
}

function trackPackage() {
    const trackingInput = document.getElementById('trackingNumber');
    const trackingNumber = trackingInput.value.trim().toUpperCase();

    if (!trackingNumber) {
        showMessage('Please enter a tracking number', 'error');
        return;
    }

    const packages = getPackages();
    const packageData = packages[trackingNumber];

    hideResults();

    if (packageData) {
        displayPackageInfo(packageData);
        return;
    }

    showMessage('Package not found. Please check your tracking number and try again.', 'error');
}

function displayPackageInfo(packageData) {
    const resultsDiv = document.getElementById('trackingResults');
    const trackingNumberEl = document.getElementById('resultTrackingNumber');
    const statusEl = document.getElementById('resultStatus');
    const locationEl = document.getElementById('resultLocation');
    const deliveryEl = document.getElementById('resultDelivery');
    const timelineEventsEl = document.getElementById('timelineEvents');
    const timeline = Array.isArray(packageData.timeline) ? packageData.timeline : [];

    trackingNumberEl.textContent = packageData.trackingNumber || 'Unavailable';
    statusEl.textContent = getStatusText(packageData.status);
    statusEl.className = `value status-badge ${getStatusColor(packageData.status)}`;
    locationEl.textContent = packageData.currentLocation || 'Unavailable';
    deliveryEl.textContent = formatDate(packageData.estimatedDelivery);
    timelineEventsEl.replaceChildren();

    timeline.forEach((event) => {
        timelineEventsEl.appendChild(createTimelineEvent(event));
    });

    resultsDiv.style.display = 'block';
    resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function createTimelineEvent(event) {
    const eventDiv = document.createElement('div');
    const timeDiv = document.createElement('div');
    const descriptionDiv = document.createElement('div');
    const statusStrong = document.createElement('strong');
    const locationDiv = document.createElement('div');

    eventDiv.className = 'timeline-event';

    timeDiv.className = 'event-time';
    timeDiv.textContent = event?.time || 'Status update pending';

    descriptionDiv.className = 'event-description';
    statusStrong.textContent = event?.status || 'Status unavailable';
    descriptionDiv.appendChild(statusStrong);

    locationDiv.className = 'event-location';
    locationDiv.textContent = `📍 ${event?.location || 'Location unavailable'}`;

    eventDiv.append(timeDiv, descriptionDiv, locationDiv);

    return eventDiv;
}

function showMessage(message, type) {
    const resultsDiv = document.getElementById('trackingResults');
    const noResultsDiv = document.getElementById('noResults');

    resultsDiv.style.display = 'none';
    noResultsDiv.style.display = 'none';

    if (type === 'error') {
        noResultsDiv.textContent = message;
        noResultsDiv.style.display = 'block';
        noResultsDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function hideResults() {
    document.getElementById('trackingResults').style.display = 'none';
    document.getElementById('noResults').style.display = 'none';
}

window.trackPackage = trackPackage;
