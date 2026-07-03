function generateTrackingNumber() {
    var year = new Date().getFullYear();
    var rand = Math.floor(Math.random() * 9000) + 1000;
    return 'GRE-' + year + '-' + rand;
}

var latestShareUrl = '';

function normalizeTrackingNumber(value) {
    return (value || '').toString().trim().toUpperCase();
}

function encodeShipmentRecord(record) {
    try {
        return btoa(unescape(encodeURIComponent(JSON.stringify(record))));
    } catch (error) {
        return '';
    }
}

function decodeShipmentRecord(encodedRecord) {
    if (!encodedRecord) {
        return null;
    }

    try {
        return JSON.parse(decodeURIComponent(escape(atob(encodedRecord))));
    } catch (error) {
        return null;
    }
}

function isShareableShipmentRecord(record) {
    return !!(
        record &&
        typeof record === 'object' &&
        normalizeTrackingNumber(record.trackingNumber) &&
        record.from &&
        record.to &&
        record.estimatedDelivery
    );
}

function buildCompactPayload(record) {
    return {
        t: record.trackingNumber || '',
        sc: record.senderCity || '',
        sk: record.senderCountry || '',
        rc: record.recipientCity || '',
        rk: record.recipientCountry || '',
        sn: record.sender || '',
        rn: record.recipient || '',
        w: record.weight || '',
        d: record.contents || '',
        st: record.shippingTypeValue || '',
        ca: record.createdAt || ''
    };
}

function expandCompactPayload(compact) {
    if (!compact || !compact.t || !compact.sc || !compact.rc) {
        return null;
    }

    var weightStr = (compact.w || '').toString().replace(/\s*kg\s*$/i, '').trim();
    var formData = {
        senderName: compact.sn || '',
        senderCity: compact.sc || '',
        senderCountry: compact.sk || '',
        recipientName: compact.rn || '',
        recipientCity: compact.rc || '',
        recipientCountry: compact.rk || '',
        cargoDescription: compact.d || '',
        cargoWeight: weightStr || '0',
        shippingType: compact.st || 'standard'
    };

    var record = buildShipmentRecord(compact.t, formData);

    if (compact.ca) {
        record.createdAt = compact.ca;
        record.bookedAt = compact.ca;
    }

    return record;
}

function getSharedShipmentFromSource(source) {
    if (!source || typeof source !== 'string') {
        return null;
    }

    try {
        var url = new URL(source, window.location.href);
        var trackingNumber = normalizeTrackingNumber(url.searchParams.get('tracking'));
        var encodedData = url.searchParams.get('shipment');

        if (!encodedData) {
            return null;
        }

        var decoded;
        try {
            decoded = JSON.parse(decodeURIComponent(escape(atob(encodedData))));
        } catch (e) {
            return null;
        }

        if (!decoded || typeof decoded !== 'object') {
            return null;
        }

        var record;
        if (decoded.t) {
            record = expandCompactPayload(decoded);
        } else {
            record = decoded;
        }

        if (!isShareableShipmentRecord(record)) {
            return null;
        }

        record.trackingNumber = normalizeTrackingNumber(record.trackingNumber);

        if (trackingNumber && record.trackingNumber !== trackingNumber) {
            return null;
        }

        return record;
    } catch (error) {
        return null;
    }
}

function buildTrackingShareUrl(record) {
    if (!isShareableShipmentRecord(record)) {
        return '';
    }

    var url = new URL(window.location.href);
    var trackingNumber = normalizeTrackingNumber(record.trackingNumber);
    var compact = buildCompactPayload(record);
    var encoded;

    try {
        encoded = btoa(unescape(encodeURIComponent(JSON.stringify(compact))));
    } catch (error) {
        return '';
    }

    if (!encoded) {
        return '';
    }

    url.searchParams.set('tracking', trackingNumber);
    url.searchParams.set('shipment', encoded);
    url.hash = 'tracker';

    return url.toString();
}

function getDeliveryDays(shippingType) {
    switch (shippingType) {
        case 'air':
            return 5;
        case 'sea':
            return 5;
        case 'standard':
        default:
            return 5;
    }
}

function getDeliveryDate(shippingType) {
    var days = getDeliveryDays(shippingType);
    var date = new Date();
    date.setDate(date.getDate() + days);
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

function addDays(date, days) {
    var next = new Date(date.getTime());
    next.setDate(next.getDate() + days);
    return next;
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

function buildShipmentTimeline(record) {
    var bookedAt = new Date(record.createdAt || record.bookedAt || new Date().toISOString());
    var route = Array.isArray(record.route) ? record.route : [];
    var timeline = [];

    route.forEach(function(stop) {
        if (record.daysElapsed >= stop.day) {
            timeline.push({
                status: stop.status,
                location: stop.location,
                time: formatTimelineTime(addDays(bookedAt, stop.day))
            });
        }
    });

    if (!timeline.length) {
        timeline.push({
            status: 'Shipment Booked',
            location: record.from,
            time: formatTimelineTime(bookedAt)
        });
    }

    return timeline;
}

function buildShipmentRecord(trackingNumber, formData) {
    var now = new Date();
    var from = formData.senderCity + ', ' + formData.senderCountry;
    var to = formData.recipientCity + ', ' + formData.recipientCountry;
    var route = createTransitRoute(
        from,
        to,
        formData.senderCity,
        formData.recipientCity,
        formData.shippingType
    );

    return {
        trackingNumber: trackingNumber,
        status: 'booked',
        from: from,
        to: to,
        currentLocation: from,
        estimatedDelivery: getDeliveryDate(formData.shippingType),
        weight: formData.cargoWeight + ' kg',
        contents: formData.cargoDescription,
        sender: formData.senderName,
        recipient: formData.recipientName,
        senderCity: formData.senderCity,
        senderCountry: formData.senderCountry,
        recipientCity: formData.recipientCity,
        recipientCountry: formData.recipientCountry,
        shippingType: getShippingLabel(formData.shippingType),
        shippingTypeValue: formData.shippingType,
        createdAt: now.toISOString(),
        bookedAt: now.toISOString(),
        route: route,
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

async function saveShipment(record) {
    if (window.GREDataStore && typeof window.GREDataStore.upsertShipment === 'function') {
        await window.GREDataStore.upsertShipment(record);
        return;
    }

    var packages = {};

    try {
        packages = JSON.parse(localStorage.getItem('packages') || '{}');
    } catch (error) {
        packages = {};
    }

    packages[record.trackingNumber] = record;

    try {
        localStorage.setItem('packages', JSON.stringify(packages));
    } catch (error) {
        return;
    }
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
        if (!data[key]) return label + ' is required.';
    }
    var weight = parseFloat(data.cargoWeight);
    if (isNaN(weight) || weight <= 0) return 'Please enter a valid cargo weight.';
    return null;
}

function showShipFormError(msg) {
    var el = document.getElementById('shipFormError');
    el.textContent = msg;
    el.style.display = 'block';
}

function hideShipFormError() {
    var el = document.getElementById('shipFormError');
    el.style.display = 'none';
}

function showShipConfirmation(trackingNumber, record) {
    document.getElementById('shippingForm').style.display = 'none';
    var conf = document.getElementById('shipConfirmation');
    conf.style.display = 'block';

    document.getElementById('confirmTrackingNumber').textContent = trackingNumber;
    var trackingLink = document.getElementById('confirmTrackingLink');
    var shareUrl = buildTrackingShareUrl(record);
    latestShareUrl = shareUrl || '';
    if (trackingLink) {
        trackingLink.href = shareUrl || '#';
        trackingLink.textContent = shareUrl ? 'Open tracking page' : 'Tracking page unavailable';
    }

    var copyLinkBtn = document.getElementById('copyLinkBtn');
    if (copyLinkBtn && navigator.share) {
        copyLinkBtn.textContent = 'Share Tracking Link';
    }

    var details = document.getElementById('confirmDetails');
    details.innerHTML = '';

    var rows = [
        ['From', record.from],
        ['To', record.to],
        ['Contents', record.contents],
        ['Weight', record.weight],
        ['Service', record.shippingType],
        ['Est. Delivery', record.estimatedDelivery],
        ['Current Status', 'Booked'],
        ['Current Location', record.currentLocation]
    ];
    rows.forEach(function(row) {
        var item = document.createElement('div');
        item.className = 'info-item';
        var lbl = document.createElement('span');
        lbl.className = 'label';
        lbl.textContent = row[0] + ':';
        var val = document.createElement('span');
        val.className = 'value';
        val.textContent = row[1];
        item.appendChild(lbl);
        item.appendChild(val);
        details.appendChild(item);
    });

    conf.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function bookShipment(event) {
    event.preventDefault();
    hideShipFormError();

    var data = getFormData();
    var error = validateFormData(data);
    if (error) {
        showShipFormError(error);
        return;
    }

    var trackingNumber = generateTrackingNumber();
    var record = buildShipmentRecord(trackingNumber, data);

    saveShipment(record).then(function() {
        showShipConfirmation(trackingNumber, record);
    }).catch(function() {
        showShipFormError('Could not save shipment. Please try again.');
    });
}

function trackBookedShipment() {
    var trackingNumber = document.getElementById('confirmTrackingNumber').textContent;
    var input = document.getElementById('trackingNumber');
    if (input) {
        input.value = trackingNumber;
        scrollToSection('tracker');
        setTimeout(function() { trackPackage(); }, 600);
    }
}

function resetShippingForm() {
    document.getElementById('shippingForm').reset();
    document.getElementById('shippingForm').style.display = 'block';
    document.getElementById('shipConfirmation').style.display = 'none';
    hideShipFormError();
}

function copyTrackingLink(button) {
    var link = document.getElementById('confirmTrackingLink');
    var shareUrl = (link ? link.getAttribute('href') : '') || latestShareUrl;
    if (!shareUrl || shareUrl === '#') {
        return;
    }

    var trackingNum = document.getElementById('confirmTrackingNumber');
    var trackingNumber = trackingNum ? trackingNum.textContent : '';

    if (navigator.share) {
        navigator.share({
            title: 'Track Your Shipment \u2014 Golden Route Express',
            text: 'Track shipment ' + trackingNumber,
            url: shareUrl
        });
        return;
    }

    var originalLabel = button ? button.textContent : '';
    var updateButtonLabel = function(label) {
        if (!button) {
            return;
        }

        button.textContent = label;
        window.setTimeout(function() {
            button.textContent = originalLabel;
        }, 1800);
    };

    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(shareUrl).then(function() {
            updateButtonLabel('Link Copied');
        }).catch(function() {
            updateButtonLabel('Copy Failed');
        });
        return;
    }

    var tempInput = document.createElement('input');
    tempInput.type = 'text';
    tempInput.value = shareUrl;
    document.body.appendChild(tempInput);
    tempInput.select();
    tempInput.setSelectionRange(0, shareUrl.length);

    try {
        if (document.execCommand('copy')) {
            updateButtonLabel('Link Copied');
        } else {
            updateButtonLabel('Copy Failed');
        }
    } catch (error) {
        updateButtonLabel('Copy Failed');
    }

    document.body.removeChild(tempInput);
}

window.bookShipment = bookShipment;
window.trackBookedShipment = trackBookedShipment;
window.resetShippingForm = resetShippingForm;
window.buildShipmentTimeline = buildShipmentTimeline;
window.normalizeTrackingNumber = normalizeTrackingNumber;
window.getSharedShipmentFromSource = getSharedShipmentFromSource;
window.copyTrackingLink = copyTrackingLink;
