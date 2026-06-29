function generateTrackingNumber() {
    var year = new Date().getFullYear();
    var rand = Math.floor(Math.random() * 9000) + 1000;
    return 'GRE-' + year + '-' + rand;
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

function buildShipmentTimeline(record) {
    var bookedAt = new Date(record.createdAt || record.bookedAt || new Date().toISOString());
    var timeline = [
        {
            status: 'Shipment Booked',
            location: record.from,
            time: formatTimelineTime(bookedAt)
        }
    ];

    if (record.daysElapsed >= 2) {
        timeline.push({
            status: 'Processed',
            location: record.processingLocation || 'Origin Processing Center',
            time: formatTimelineTime(addDays(bookedAt, 2))
        });
    }

    if (record.daysElapsed >= 5) {
        timeline.push({
            status: 'Out for Delivery',
            location: record.to,
            time: formatTimelineTime(addDays(bookedAt, 5))
        });
    }

    return timeline;
}

function buildShipmentRecord(trackingNumber, formData) {
    var now = new Date();
    var from = formData.senderCity + ', ' + formData.senderCountry;
    var to = formData.recipientCity + ', ' + formData.recipientCountry;
    var processingLocation = formData.senderCity + ' Processing Center';

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
        shippingType: getShippingLabel(formData.shippingType),
        shippingTypeValue: formData.shippingType,
        createdAt: now.toISOString(),
        bookedAt: now.toISOString(),
        processingLocation: processingLocation,
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

function saveShipment(record) {
    var packages = JSON.parse(localStorage.getItem('packages') || '{}');
    packages[record.trackingNumber] = record;
    localStorage.setItem('packages', JSON.stringify(packages));
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

    var details = document.getElementById('confirmDetails');
    details.innerHTML = '';

    var rows = [
        ['From', record.from],
        ['To', record.to],
        ['Contents', record.contents],
        ['Weight', record.weight],
        ['Service', record.shippingType],
        ['Est. Delivery', record.estimatedDelivery],
        ['Current Status', 'Booked']
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
    saveShipment(record);
    showShipConfirmation(trackingNumber, record);
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

window.bookShipment = bookShipment;
window.trackBookedShipment = trackBookedShipment;
window.resetShippingForm = resetShippingForm;
window.buildShipmentTimeline = buildShipmentTimeline;
