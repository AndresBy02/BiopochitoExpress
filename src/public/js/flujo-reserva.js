const APP_STORAGE_KEYS = {
    selectedOffer: 'biopochito.selectedOffer',
    cart: 'biopochito.cart',
    reservation: 'biopochito.reservation',
    notice: 'biopochito.notice'
};

const APP_LIMITS = {
    minPassengers: 1,
    maxPassengers: 6,
    maxReservationYears: 1
};

function appReadJson(key, fallbackValue) {
    try {
        const storedValue = localStorage.getItem(key);
        return storedValue ? JSON.parse(storedValue) : fallbackValue;
    } catch (error) {
        return fallbackValue;
    }
}

function appWriteJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function appStripTime(date) {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    return normalizedDate;
}

function appParseIsoDate(value) {
    if (!value) {
        return null;
    }

    const parsedDate = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function appToIsoDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function appAddDays(date, days) {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate;
}

function appDifferenceInDays(startDate, endDate) {
    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    return Math.round((appStripTime(endDate) - appStripTime(startDate)) / millisecondsPerDay);
}

function appFormatCurrency(value) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(value);
}

function appFormatLongDate(date) {
    return new Intl.DateTimeFormat('es-CO', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    }).format(date);
}

function appFormatReservationRange(departureDate, returnDate) {
    const departure = appParseIsoDate(departureDate);
    const returnValue = appParseIsoDate(returnDate);

    if (!departure || !returnValue) {
        return 'Fechas por confirmar';
    }

    return `${appFormatLongDate(departure)} - ${appFormatLongDate(returnValue)}`;
}

function appSlugify(text) {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function appSetNotice(message, type) {
    appWriteJson(APP_STORAGE_KEYS.notice, {
        message,
        type: type || 'info'
    });
}

function appConsumeNotice() {
    const notice = appReadJson(APP_STORAGE_KEYS.notice, null);
    localStorage.removeItem(APP_STORAGE_KEYS.notice);
    return notice;
}

function appBuildNoticeMarkup(notice) {
    if (!notice || !notice.message) {
        return '';
    }

    const colorConfig = notice.type === 'success'
        ? { background: '#ecfdf5', border: '#a7f3d0', text: '#065f46' }
        : notice.type === 'warning'
            ? { background: '#fffbeb', border: '#fde68a', text: '#92400e' }
            : { background: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' };

    return `
        <div class="info-box" style="margin-bottom: 1rem; background-color: ${colorConfig.background}; border: 1px solid ${colorConfig.border};">
            <p style="margin: 0; color: ${colorConfig.text}; font-weight: 500;">${notice.message}</p>
        </div>
    `;
}

function appGetTravelDates() {
    const today = appStripTime(new Date());
    const maxAllowedDate = new Date(today);
    maxAllowedDate.setFullYear(maxAllowedDate.getFullYear() + APP_LIMITS.maxReservationYears);

    let departureDate = appParseIsoDate(localStorage.getItem('fechaIda'));
    let returnDate = appParseIsoDate(localStorage.getItem('fechaRegreso'));

    if (!departureDate || departureDate <= today || departureDate > maxAllowedDate) {
        departureDate = appAddDays(today, 30);
    }

    if (!returnDate || returnDate <= departureDate || returnDate > maxAllowedDate) {
        returnDate = appAddDays(departureDate, 3);
    }

    return {
        departureDate: appToIsoDate(departureDate),
        returnDate: appToIsoDate(returnDate)
    };
}

function appGetDefaultOffer() {
    const travelDates = appGetTravelDates();

    return {
        id: 'cartagena-magica-hotel-caribe',
        title: 'Cartagena Magica - Hotel Caribe',
        location: 'Cartagena de Indias, Colombia',
        destination: 'Cartagena',
        image: 'https://images.unsplash.com/photo-1690571100303-cb86f92b9b01?w=1200',
        rating: '4.8',
        travelDates
    };
}

function appGetSelectedOffer() {
    const defaultOffer = appGetDefaultOffer();
    const selectedOffer = appReadJson(APP_STORAGE_KEYS.selectedOffer, {});

    return {
        ...defaultOffer,
        ...selectedOffer,
        travelDates: {
            ...defaultOffer.travelDates,
            ...(selectedOffer.travelDates || {})
        }
    };
}

function appSetSelectedOffer(offer) {
    appWriteJson(APP_STORAGE_KEYS.selectedOffer, offer);
}

function appNormalizeComplement(input, complementConfig) {
    if (!input) {
        return null;
    }

    if (typeof input === 'string') {
        return complementConfig[input] ? { ...complementConfig[input] } : null;
    }

    if (typeof input !== 'object') {
        return null;
    }

    const baseComplement = input.id && complementConfig[input.id]
        ? complementConfig[input.id]
        : null;

    return {
        ...(baseComplement || {}),
        ...input,
        price: Number(input.price ?? baseComplement?.price ?? 0)
    };
}

function appNormalizeComplements(source) {
    const complementConfig = appGetComplementConfig();
    const legacyKeys = ['complements', 'additional', 'additionals', 'extras', 'experiences', 'tours'];
    const normalizedComplements = [];
    const seenComplementIds = new Set();
    const sourceKey = legacyKeys.find(key => Array.isArray(source?.[key]));

    const rawComplements = sourceKey
        ? source[sourceKey]
        : [];

    rawComplements.forEach(rawComplement => {
        const normalizedComplement = appNormalizeComplement(rawComplement, complementConfig);
        const uniqueKey = normalizedComplement?.id || normalizedComplement?.label;

        if (!normalizedComplement || !uniqueKey || seenComplementIds.has(uniqueKey)) {
            return;
        }

        seenComplementIds.add(uniqueKey);
        normalizedComplements.push(normalizedComplement);
    });

    Object.keys(complementConfig).forEach(complementId => {
        if (!source || source[complementId] !== true || seenComplementIds.has(complementId)) {
            return;
        }

        seenComplementIds.add(complementId);
        normalizedComplements.push({ ...complementConfig[complementId] });
    });

    return normalizedComplements;
}

function appNormalizePurchaseData(data) {
    if (!data) {
        return data;
    }

    const normalizedComplements = appNormalizeComplements(data);
    const legacyTariff = appGetTariffById(data.tariffId || 'standard');
    const desiredPassengers = Math.min(
        APP_LIMITS.maxPassengers,
        Math.max(
            APP_LIMITS.minPassengers,
            Number(data.passengers) || data.tickets?.length || APP_LIMITS.minPassengers
        )
    );
    const normalizedTickets = appSyncTickets({
        tickets: Array.isArray(data.tickets) && data.tickets.length
            ? data.tickets
            : appBuildLegacyTickets(data),
        desiredCount: desiredPassengers,
        defaultTariffId: legacyTariff.id
    });
    const pricing = appCalculatePricing({
        tickets: normalizedTickets,
        complements: normalizedComplements
    });
    const tickets = appBuildTickets({
        tickets: normalizedTickets,
        complements: normalizedComplements,
        pricing,
        code: data.code
    });
    const passengers = tickets.length;
    const seats = tickets.map(ticket => ({
        seatNumber: ticket.seatNumber,
        classId: ticket.ticketClassId,
        classLabel: ticket.ticketClassLabel
    }));
    const uniqueTariffLabels = [...new Set(tickets.map(ticket => ticket.tariffLabel))];
    const uniqueClassLabels = [...new Set(tickets.map(ticket => ticket.ticketClassLabel))];

    return {
        ...data,
        passengers,
        tariffId: tickets[0]?.tariffId || legacyTariff.id,
        tariffLabel: uniqueTariffLabels.length === 1 ? uniqueTariffLabels[0] : 'Tarifa mixta',
        ticketClassId: tickets[0]?.ticketClassId || 'economy',
        ticketClassLabel: uniqueClassLabels.length === 1 ? uniqueClassLabels[0] : 'Mixta',
        complements: normalizedComplements,
        seats,
        tickets,
        pricing
    };
}

function appGetCart() {
    return appNormalizePurchaseData(appReadJson(APP_STORAGE_KEYS.cart, null));
}

function appSetCart(cart) {
    if (cart) {
        appWriteJson(APP_STORAGE_KEYS.cart, appNormalizePurchaseData(cart));
    } else {
        localStorage.removeItem(APP_STORAGE_KEYS.cart);
    }

    appSyncCartBadge();
}

function appGetReservation() {
    return appNormalizePurchaseData(appReadJson(APP_STORAGE_KEYS.reservation, null));
}

function appSetReservation(reservation) {
    if (reservation) {
        appWriteJson(APP_STORAGE_KEYS.reservation, appNormalizePurchaseData(reservation));
    } else {
        localStorage.removeItem(APP_STORAGE_KEYS.reservation);
    }
}

function appGetTariffConfig() {
    return {
        basic: {
            id: 'basic',
            label: 'Tarifa Basica',
            pricePerPassenger: 1250000
        },
        standard: {
            id: 'standard',
            label: 'Tarifa Estandar',
            pricePerPassenger: 1450000
        },
        premium: {
            id: 'premium',
            label: 'Tarifa Premium',
            pricePerPassenger: 1850000
        }
    };
}

function appGetTariffById(tariffId) {
    const tariffConfig = appGetTariffConfig();
    return tariffConfig[tariffId] || tariffConfig.standard;
}

function appGetComplementConfig() {
    return {
        tour: {
            id: 'tour',
            label: 'Tour Ciudad Amurallada',
            price: 120000
        },
        transfer: {
            id: 'transfer',
            label: 'Traslado Aeropuerto-Hotel',
            price: 80000
        },
        insurance: {
            id: 'insurance',
            label: 'Seguro de Viaje',
            price: 95000
        }
    };
}
//inicio de añadir seleccion de puestos y clases de vuelo
function appGetSeatClassConfig() {
    return {
        first: {
            id: 'first',
            label: 'Primera clase',
            rows: [1, 2],
            columns: ['A', 'C', 'D', 'F'],
            accent: '#b45309',
            aisleAfter: 'C',
            surcharge: 600000
        },
        executive: {
            id: 'executive',
            label: 'Ejecutiva',
            rows: [3, 4, 5],
            columns: ['A', 'C', 'D', 'F'],
            accent: '#0f766e',
            aisleAfter: 'C',
            surcharge: 250000
        },
        economy: {
            id: 'economy',
            label: 'Economica',
            rows: [6, 7, 8, 9, 10, 11, 12],
            columns: ['A', 'B', 'C', 'D', 'E', 'F'],
            accent: '#2563eb',
            aisleAfter: 'C',
            surcharge: 0
        }
    };
}

function appGetSeatClassById(classId) {
    const seatClassConfig = appGetSeatClassConfig();
    return seatClassConfig[classId] || seatClassConfig.economy;
}

function appGetTicketBasePrice(ticket) {
    return appGetTariffById(ticket.tariffId).pricePerPassenger + appGetSeatClassById(ticket.ticketClassId).surcharge;
}

function appGetBaseOccupiedSeats() {
    return new Set([
        '1A', '1F',
        '3C',
        '4A', '4F',
        '6B', '6E',
        '7C',
        '8A', '8F',
        '9D',
        '10B',
        '11E',
        '12C'
    ]);
}

function appBuildSeatInventory() {
    return Object.values(appGetSeatClassConfig()).flatMap(seatClass =>
        seatClass.rows.flatMap(row =>
            seatClass.columns.map(column => ({
                seatNumber: `${row}${column}`,
                row,
                column,
                classId: seatClass.id,
                classLabel: seatClass.label,
                accent: seatClass.accent,
                aisleAfter: seatClass.aisleAfter
            }))
        )
    );
}

function appGetSeatByNumber(seatNumber) {
    return appBuildSeatInventory().find(seat => seat.seatNumber === seatNumber) || null;
}

function appGetRawSeatNumber(rawSeat) {
    return typeof rawSeat === 'string'
        ? rawSeat
        : rawSeat?.seatNumber || rawSeat?.seat?.seatNumber || '';
}

function appNormalizeSeat(rawSeat) {
    const seatNumber = appGetRawSeatNumber(rawSeat);

    const seat = appGetSeatByNumber(seatNumber);
    if (!seat) {
        return null;
    }

    return {
        seatNumber: seat.seatNumber,
        classId: seat.classId,
        classLabel: seat.classLabel
    };
}

function appFormatSeatList(seats) {
    return (Array.isArray(seats) && seats.length)
        ? seats.map(seat => typeof seat === 'string' ? seat : seat.seatNumber).filter(Boolean).join(', ')
        : 'Por asignar';
}

function appCreateTicketId() {
    const randomValue = Math.floor(Math.random() * 900000) + 100000;
    return `TKT-${Date.now().toString(36).toUpperCase()}-${randomValue}`;
}

function appCreateDraftTicketId() {
    const randomValue = Math.floor(Math.random() * 900000) + 100000;
    return `DRF-${Date.now().toString(36).toUpperCase()}-${randomValue}`;
}

function appSplitAmount(totalAmount, totalItems) {
    const safeItems = Math.max(1, Number(totalItems) || 1);
    const baseAmount = Math.floor(totalAmount / safeItems);
    const amounts = Array.from({ length: safeItems }, () => baseAmount);
    const remainder = totalAmount - (baseAmount * safeItems);

    amounts[safeItems - 1] += remainder;
    return amounts;
}

function appDistributeAmountByWeight(totalAmount, weights) {
    if (!weights.length) {
        return [];
    }

    const safeWeights = weights.map(weight => Math.max(0, Number(weight) || 0));
    const totalWeight = safeWeights.reduce((sum, weight) => sum + weight, 0);

    if (!totalWeight) {
        return appSplitAmount(totalAmount, safeWeights.length);
    }

    const distributed = safeWeights.map(weight => Math.floor((totalAmount * weight) / totalWeight));
    let remainder = totalAmount - distributed.reduce((sum, value) => sum + value, 0);
    let index = 0;

    while (remainder > 0) {
        distributed[index % distributed.length] += 1;
        remainder -= 1;
        index += 1;
    }

    return distributed;
}

function appCreateTicketDraft(tariffId, ticketClassId) {
    const tariff = appGetTariffById(tariffId);
    const seatClass = appGetSeatClassById(ticketClassId || 'economy');

    return {
        id: '',
        draftId: appCreateDraftTicketId(),
        tariffId: tariff.id,
        tariffLabel: tariff.label,
        ticketClassId: seatClass.id,
        ticketClassLabel: seatClass.label,
        seatNumber: '',
        finalPrice: 0
    };
}

function appNormalizeTicket(rawTicket, fallbackTariffId, fallbackClassId) {
    const tariff = appGetTariffById(rawTicket?.tariffId || fallbackTariffId || 'standard');
    const seatClass = appGetSeatClassById(rawTicket?.ticketClassId || rawTicket?.classId || fallbackClassId || 'economy');
    const seat = appNormalizeSeat(rawTicket?.seatNumber || rawTicket?.seat);

    return {
        id: rawTicket?.id || '',
        draftId: rawTicket?.draftId || appCreateDraftTicketId(),
        tariffId: tariff.id,
        tariffLabel: tariff.label,
        ticketClassId: seatClass.id,
        ticketClassLabel: seatClass.label,
        seatNumber: seat && seat.classId === seatClass.id ? seat.seatNumber : '',
        finalPrice: Number(rawTicket?.finalPrice) || 0
    };
}

function appBuildLegacyTickets(data) {
    const passengers = Math.min(
        APP_LIMITS.maxPassengers,
        Math.max(APP_LIMITS.minPassengers, Number(data?.passengers) || APP_LIMITS.minPassengers)
    );
    const legacySeats = Array.isArray(data?.seats) ? data.seats : [];
    const fallbackTariffId = data?.tariffId || 'standard';
    const fallbackClassId = data?.ticketClassId || 'economy';

    return Array.from({ length: passengers }, function(_, index) {
        return {
            tariffId: fallbackTariffId,
            ticketClassId: fallbackClassId,
            seatNumber: appGetRawSeatNumber(legacySeats[index] || '')
        };
    });
}

function appFindFirstAvailableSeatNumber(ticketClassId, takenSeats) {
    const targetClass = appGetSeatClassById(ticketClassId);
    const seat = appBuildSeatInventory().find(function(item) {
        return item.classId === targetClass.id && !takenSeats.has(item.seatNumber);
    });

    return seat?.seatNumber || '';
}

function appSyncTickets(data) {
    const desiredCount = Math.min(
        APP_LIMITS.maxPassengers,
        Math.max(APP_LIMITS.minPassengers, Number(data.desiredCount) || APP_LIMITS.minPassengers)
    );
    const defaultTariffId = data.defaultTariffId || 'standard';
    const defaultClassId = data.defaultClassId || 'economy';
    let normalizedTickets = (Array.isArray(data.tickets) ? data.tickets : [])
        .map(ticket => appNormalizeTicket(ticket, defaultTariffId, defaultClassId));

    while (normalizedTickets.length < desiredCount) {
        const previousTariffId = normalizedTickets[normalizedTickets.length - 1]?.tariffId || defaultTariffId;
        const previousClassId = normalizedTickets[normalizedTickets.length - 1]?.ticketClassId || defaultClassId;
        normalizedTickets.push(appCreateTicketDraft(previousTariffId, previousClassId));
    }

    normalizedTickets = normalizedTickets.slice(0, desiredCount);

    const takenSeats = appGetBaseOccupiedSeats();

    return normalizedTickets.map(function(ticket) {
        const normalizedSeat = appNormalizeSeat(ticket.seatNumber);
        let seatNumber = normalizedSeat && normalizedSeat.classId === ticket.ticketClassId && !takenSeats.has(normalizedSeat.seatNumber)
            ? normalizedSeat.seatNumber
            : appFindFirstAvailableSeatNumber(ticket.ticketClassId, takenSeats);

        if (seatNumber) {
            takenSeats.add(seatNumber);
        }

        return {
            ...ticket,
            seatNumber
        };
    });
}
//fin de añadir seleccion de puestos y clases de vuelo(creo)
function appBuildTickets(data) {
    const tickets = Array.isArray(data.tickets) ? data.tickets : [];
    const complementPrice = (data.complements || []).reduce((total, complement) => total + complement.price, 0);
    const complementShares = appSplitAmount(complementPrice, tickets.length || 1);
    const pretaxWeights = tickets.map((ticket, index) => appGetTicketBasePrice(ticket) + (complementShares[index] || 0));
    const taxShares = appDistributeAmountByWeight(Number(data.pricing?.taxes) || 0, pretaxWeights);

    return tickets.map(function(ticket, index) {
        const baseFare = appGetTicketBasePrice(ticket);
        const finalPrice = baseFare + (complementShares[index] || 0) + (taxShares[index] || 0);

        return {
            ...ticket,
            id: data.code ? (ticket.id || appCreateTicketId()) : '',
            classLabel: ticket.ticketClassLabel,
            finalPrice
        };
    });
}

function appCalculatePricing(data) {
    const tickets = Array.isArray(data.tickets) ? data.tickets : [];
    const ticketsSubtotal = tickets.reduce((total, ticket) => total + appGetTicketBasePrice(ticket), 0);
    const complementPrice = (data.complements || []).reduce((total, complement) => total + complement.price, 0);
    const subtotal = ticketsSubtotal + complementPrice;
    const taxes = Math.round(subtotal * 0.1);

    return {
        subtotal,
        taxes,
        total: subtotal + taxes
    };
}

function appSyncCartBadge() {
    const cart = appGetCart();
    const badgeValue = cart ? String(cart.passengers || cart.tickets?.length || 1) : '0';
    document.querySelectorAll('.cart-badge').forEach(badge => {
        badge.textContent = badgeValue;
    });
}

function appGetReservationStatusMeta(reservation) {
    if (!reservation) {
        return {
            label: 'Sin reserva',
            background: '#e5e7eb',
            text: '#374151'
        };
    }

    if (reservation.status === 'cancelled') {
        return {
            label: 'Cancelada',
            background: '#fee2e2',
            text: '#991b1b'
        };
    }

    const returnDate = appParseIsoDate(reservation.returnDate);
    const today = appStripTime(new Date());

    if (returnDate && returnDate < today) {
        return {
            label: 'Finalizada',
            background: '#e0f2fe',
            text: '#075985'
        };
    }

    return {
        label: 'Confirmada',
        background: '#d1fae5',
        text: '#065f46'
    };
}

function appHasBlockingReservation() {
    const reservation = appGetReservation();

    if (!reservation || reservation.status === 'cancelled') {
        return false;
    }

    const today = appStripTime(new Date());
    const returnDate = appParseIsoDate(reservation.returnDate);
    return Boolean(returnDate) && returnDate >= today;
}

function appCanModifyReservation(reservation) {
    if (!reservation || reservation.status === 'cancelled') {
        return {
            allowed: false,
            reason: 'La reserva ya no se puede modificar.'
        };
    }

    const today = new Date();
    const departureDate = appParseIsoDate(reservation.departureDate);
    const hoursUntilDeparture = (departureDate - today) / (1000 * 60 * 60);

    if (!departureDate || hoursUntilDeparture <= 48) {
        return {
            allowed: false,
            reason: 'Solo puedes modificar la reserva con mas de 48 horas de anticipacion.'
        };
    }

    return {
        allowed: true,
        reason: ''
    };
}

function appGetCancellationPolicy(reservation) {
    if (!reservation || reservation.status === 'cancelled') {
        return {
            allowed: false,
            reason: 'La reserva ya se encuentra cancelada.',
            feeRate: 0
        };
    }

    const today = appStripTime(new Date());
    const departureDate = appParseIsoDate(reservation.departureDate);

    if (!departureDate || departureDate <= today) {
        return {
            allowed: false,
            reason: 'No es posible cancelar una reserva cuya fecha de salida ya inicio.',
            feeRate: 0
        };
    }

    const daysUntilDeparture = appDifferenceInDays(today, departureDate);

    if (daysUntilDeparture > 7) {
        return {
            allowed: true,
            reason: 'Cancelacion sin cargo.',
            feeRate: 0
        };
    }

    if (daysUntilDeparture > 3) {
        return {
            allowed: true,
            reason: 'La cancelacion genera un cargo del 30% del total.',
            feeRate: 0.3
        };
    }

    return {
        allowed: true,
        reason: 'La cancelacion genera un cargo del 50% del total.',
        feeRate: 0.5
    };
}

function appBuildOfferFromResultCard(card) {
    const travelDates = appGetTravelDates();

    return {
        id: appSlugify(card.querySelector('.result-title h3')?.textContent || 'oferta'),
        title: (card.querySelector('.result-title h3')?.textContent || '').trim(),
        location: (card.querySelector('.result-location')?.textContent || '').trim(),
        destination: (card.querySelector('.result-location')?.textContent || '').trim(),
        image: card.querySelector('.result-image img')?.src || appGetDefaultOffer().image,
        rating: (card.querySelector('.score')?.textContent || '4.8').trim(),
        travelDates
    };
}

function appInitResultsPage() {
    const resultCards = document.querySelectorAll('.result-card');
    if (!resultCards.length) {
        return;
    }

    resultCards.forEach(card => {
        const persistSelectedOffer = function() {
            appSetSelectedOffer(appBuildOfferFromResultCard(card));
        };

        card.addEventListener('click', persistSelectedOffer);

        const detailButton = card.querySelector('.btn-view-details');
        if (detailButton) {
            detailButton.addEventListener('click', persistSelectedOffer);
        }
    });
}

function appApplyOfferToDetailPage(offer) {
    const title = document.querySelector('.detail-title h1');
    const location = document.querySelector('.detail-location span');
    const galleryImage = document.getElementById('galleryImage');
    const infoItems = document.querySelectorAll('.detail-info-grid .info-item-value');

    if (title) {
        title.textContent = offer.title;
    }

    if (location) {
        location.textContent = offer.location;
    }

    if (galleryImage) {
        galleryImage.src = offer.image;
        galleryImage.alt = offer.destination;
    }

    if (infoItems.length >= 3) {
        infoItems[0].textContent = appFormatReservationRange(offer.travelDates.departureDate, offer.travelDates.returnDate);
        infoItems[1].textContent = '2 adultos';
        infoItems[2].textContent = `${appDifferenceInDays(appParseIsoDate(offer.travelDates.departureDate), appParseIsoDate(offer.travelDates.returnDate))} noches`;
    }
}

function appGetOfferDetailPassengerCount() {
    return 2;
}

function appGetOfferDetailSelection() {
    const tariffConfig = appGetTariffConfig();
    const complementConfig = appGetComplementConfig();
    const selectedTariffInput = document.querySelector('.tariff-option input[name="tariff"]:checked');
    const selectedTariff = tariffConfig[selectedTariffInput?.id || 'standard'] || tariffConfig.standard;
    const complements = Array.from(document.querySelectorAll('.complement-item input:checked'))
        .map(input => complementConfig[input.id])
        .filter(Boolean);
    const passengers = appGetOfferDetailPassengerCount();
    const tickets = appSyncTickets({
        tickets: Array.from({ length: passengers }, function() {
            return { tariffId: selectedTariff.id, ticketClassId: 'economy' };
        }),
        desiredCount: passengers,
        defaultTariffId: selectedTariff.id,
        defaultClassId: 'economy'
    });

    return {
        tariff: selectedTariff,
        complements,
        passengers,
        tickets
    };
}

function appUpdateOfferDetailSummary() {
    const sidebar = document.querySelector('.detail-sidebar');
    if (!sidebar) {
        return;
    }

    const selection = appGetOfferDetailSelection();
    const pricing = appCalculatePricing({
        tickets: selection.tickets,
        complements: selection.complements
    });

    const sidebarPriceValue = sidebar.querySelector('.sidebar-price-value');
    const sidebarBreakdown = sidebar.querySelector('.sidebar-breakdown');
    const totalValue = sidebar.querySelector('.total-value');

    if (sidebarPriceValue) {
        sidebarPriceValue.textContent = appFormatCurrency(selection.tariff.pricePerPassenger);
    }

    if (sidebarBreakdown) {
        const complementsMarkup = selection.complements.length
            ? selection.complements.map(complement => `
                <div class="breakdown-item">
                    <span class="breakdown-label">${complement.label}</span>
                    <span class="breakdown-value">${appFormatCurrency(complement.price)}</span>
                </div>
            `).join('')
            : '';

        sidebarBreakdown.innerHTML = `
            <div class="breakdown-item">
                <span class="breakdown-label">${selection.tariff.label} (${selection.passengers} pasajeros)</span>
                <span class="breakdown-value">${appFormatCurrency(selection.tariff.pricePerPassenger * selection.passengers)}</span>
            </div>
            <div class="breakdown-item">
                <span class="breakdown-label">Clase de cabina</span>
                <span class="breakdown-value">La eliges por boleto en el carrito</span>
            </div>
            <div class="breakdown-item">
                <span class="breakdown-label">Asientos</span>
                <span class="breakdown-value">Se eligen en el carrito</span>
            </div>
            ${complementsMarkup}
            <div class="breakdown-item">
                <span class="breakdown-label">Impuestos y tasas</span>
                <span class="breakdown-value">${appFormatCurrency(pricing.taxes)}</span>
            </div>
        `;
    }

    if (totalValue) {
        totalValue.textContent = appFormatCurrency(pricing.total);
    }
}

function appBuildCartFromDetail() {
    const offer = appGetSelectedOffer();
    const selection = appGetOfferDetailSelection();

    return {
        id: offer.id,
        title: offer.title,
        destination: offer.destination,
        location: offer.location,
        image: offer.image,
        departureDate: offer.travelDates.departureDate,
        returnDate: offer.travelDates.returnDate,
        passengers: selection.passengers,
        tickets: selection.tickets,
        complements: selection.complements,
        pricing: appCalculatePricing({
            tickets: selection.tickets,
            complements: selection.complements
        })
    };
}

function appUpdateReserveButton() {
    const reserveButton = document.querySelector('.btn-reserve');
    if (!reserveButton) {
        return;
    }

    if (appHasBlockingReservation()) {
        reserveButton.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            Ver tu reserva
        `;
        return;
    }

    if (appGetCart()) {
        reserveButton.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            Ir al carrito
        `;
    }
}

function appBuildTicketMixSummary(tickets, labelKey) {
    const counts = new Map();

    (Array.isArray(tickets) ? tickets : []).forEach(function(ticket) {
        const label = ticket[labelKey];
        counts.set(label, (counts.get(label) || 0) + 1);
    });

    return Array.from(counts.entries())
        .map(([label, count]) => `${count} ${label}`)
        .join(', ');
}

function appGetActiveCartTicket(tickets, preferredDraftId) {
    return tickets.find(ticket => ticket.draftId === preferredDraftId) || tickets[0] || null;
}

function appBuildCartSeatMapMarkup(tickets, activeDraftId) {
    const activeTicket = appGetActiveCartTicket(tickets, activeDraftId);

    if (!activeTicket) {
        return '';
    }

    const occupiedSeats = appGetBaseOccupiedSeats();
    tickets.forEach(function(ticket) {
        if (ticket.draftId !== activeTicket.draftId && ticket.seatNumber) {
            occupiedSeats.add(ticket.seatNumber);
        }
    });

    return Object.values(appGetSeatClassConfig()).map(function(seatClass) {
        const classIsActive = seatClass.id === activeTicket.ticketClassId;

        return `
            <section class="cart-seat-cabin ${classIsActive ? 'is-active' : 'is-locked'}">
                <div class="cart-seat-cabin-header">
                    <div>
                        <p class="cart-seat-cabin-kicker">Cabina</p>
                        <h4>${seatClass.label}</h4>
                    </div>
                    <span class="cart-seat-cabin-badge">${classIsActive ? 'Disponible para este boleto' : 'Bloqueada por clase'}</span>
                </div>
                <div class="cart-seat-rows">
                    ${seatClass.rows.map(function(row) {
                        return `
                            <div class="cart-seat-row">
                                <span class="cart-seat-row-label">${row}</span>
                                ${seatClass.columns.map(function(column) {
                                    const seatNumber = `${row}${column}`;
                                    const seat = appGetSeatByNumber(seatNumber);
                                    const isSelected = activeTicket.seatNumber === seatNumber;
                                    const isOccupied = occupiedSeats.has(seatNumber);
                                    const isLocked = !classIsActive;
                                    const stateClass = isSelected
                                        ? 'is-selected'
                                        : isOccupied
                                            ? 'is-occupied'
                                            : isLocked
                                                ? 'is-locked'
                                                : 'is-available';

                                    return `
                                        <button
                                            type="button"
                                            class="cart-seat-button ${stateClass} seat-${seat.classId}"
                                            data-cart-seat="${seatNumber}"
                                            data-active-ticket="${activeTicket.draftId}"
                                            aria-pressed="${isSelected ? 'true' : 'false'}"
                                            ${isOccupied || isLocked ? 'disabled' : ''}
                                        >
                                            ${seatNumber}
                                        </button>
                                        ${column === seatClass.aisleAfter ? '<span class="cart-seat-aisle" aria-hidden="true"></span>' : ''}
                                    `;
                                }).join('')}
                            </div>
                        `;
                    }).join('')}
                </div>
            </section>
        `;
    }).join('');
}

function appResizeCartTickets(cart, nextPassengers) {
    return {
        ...cart,
        passengers: nextPassengers,
        tickets: appSyncTickets({
            tickets: cart.tickets,
            desiredCount: nextPassengers,
            defaultTariffId: cart.tickets[cart.tickets.length - 1]?.tariffId || cart.tariffId || 'standard',
            defaultClassId: cart.tickets[cart.tickets.length - 1]?.ticketClassId || cart.ticketClassId || 'economy'
        })
    };
}

function appUpdateCartTicketTariff(cart, draftId, tariffId) {
    const nextTickets = cart.tickets.map(function(ticket) {
        return ticket.draftId === draftId
            ? {
                ...ticket,
                tariffId,
                tariffLabel: appGetTariffById(tariffId).label,
                seatNumber: ticket.seatNumber
            }
            : ticket;
    });

    return {
        ...cart,
        passengers: nextTickets.length,
        tickets: nextTickets
    };
}

function appUpdateCartTicketClass(cart, draftId, ticketClassId) {
    const seatClass = appGetSeatClassById(ticketClassId);
    const nextTickets = cart.tickets.map(function(ticket) {
        return ticket.draftId === draftId
            ? {
                ...ticket,
                ticketClassId: seatClass.id,
                ticketClassLabel: seatClass.label,
                seatNumber: ''
            }
            : ticket;
    });

    return {
        ...cart,
        passengers: nextTickets.length,
        tickets: nextTickets
    };
}

function appUpdateCartTicketSeat(cart, draftId, seatNumber) {
    const nextTickets = cart.tickets.map(function(ticket) {
        return ticket.draftId === draftId
            ? { ...ticket, seatNumber }
            : ticket;
    });

    return {
        ...cart,
        passengers: nextTickets.length,
        tickets: nextTickets
    };
}

function appInitOfferDetailPage() {
    if (!document.querySelector('.detail-sidebar')) {
        return;
    }

    const selectedOffer = appGetSelectedOffer();
    const reserveButton = document.querySelector('.btn-reserve');

    appApplyOfferToDetailPage(selectedOffer);
    appUpdateOfferDetailSummary();
    appUpdateReserveButton();

    document.querySelectorAll('.tariff-option').forEach(option => {
        option.addEventListener('click', function() {
            window.requestAnimationFrame(appUpdateOfferDetailSummary);
        });
    });

    document.querySelectorAll('.complement-item input').forEach(input => {
        input.addEventListener('change', function() {
            appUpdateOfferDetailSummary();
        });
    });

    if (!reserveButton) {
        return;
    }

    reserveButton.addEventListener('click', function(event) {
        event.preventDefault();

        if (appHasBlockingReservation()) {
            appSetNotice('Ya tienes una reserva activa. Gestionala desde la seccion "Tu reserva".', 'warning');
            window.location.href = getClientPagePath('my-reservation.html');
            return;
        }

        if (appGetCart()) {
            appSetNotice('Ya tienes una compra pendiente en el carrito. Puedes editarla o eliminarla antes de agregar otra.', 'warning');
            window.location.href = getClientPagePath('cart.html');
            return;
        }

        appSetCart(appBuildCartFromDetail());
        appSetNotice('La compra se agrego al carrito. En el carrito podras elegir clase y asientos por cada boleto.', 'success');
        appUpdateReserveButton();
        window.location.href = getClientPagePath('cart.html');
    });
}

function appRenderCartPage() {
    const cartGrid = document.querySelector('.cart-grid');
    if (!cartGrid) {
        return;
    }

    const cart = appGetCart();
    const notice = appConsumeNotice();

    if (!cart) {
        cartGrid.innerHTML = `
            <div class="cart-items">
                ${appBuildNoticeMarkup(notice)}
                <div class="empty-cart">
                    <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle>
                        <path d="M1 1h4l2.68 13.39A2 2 0 0 0 9.63 16h9.72a2 2 0 0 0 1.95-1.61L23 6H6"></path>
                    </svg>
                    <h2 class="empty-title">No tienes compras pendientes</h2>
                    <p class="empty-text">Cuando agregues una oferta, aparecera aqui para que puedas pagarla o ajustarla.</p>
                    <a href="results.html" class="btn-continue" style="max-width: 260px; margin: 0 auto;">Explorar ofertas</a>
                </div>
            </div>
            <div class="cart-summary">
                <h2 class="summary-title">Resumen de compra</h2>
                <div class="summary-breakdown">
                    <div class="summary-item">
                        <span class="summary-label">Subtotal</span>
                        <span class="summary-value">${appFormatCurrency(0)}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Impuestos y tasas</span>
                        <span class="summary-value">${appFormatCurrency(0)}</span>
                    </div>
                </div>
                <div class="summary-total">
                    <span class="total-label">Total</span>
                    <span class="total-value">${appFormatCurrency(0)}</span>
                </div>
                <button class="btn-checkout" disabled style="opacity: 0.6; cursor: not-allowed;">
                    Continuar al pago
                </button>
                <a href="results.html" class="btn-continue">Seguir comprando</a>
            </div>
        `;
        return;
    }

    const canDecreasePassengers = cart.passengers > APP_LIMITS.minPassengers;
    const canIncreasePassengers = cart.passengers < APP_LIMITS.maxPassengers;
    const complementSummary = cart.complements.length
        ? cart.complements.map(complement => complement.label).join(', ')
        : 'Sin complementos';
    const seatSummary = appFormatSeatList(cart.tickets);
    const classSummary = appBuildTicketMixSummary(cart.tickets, 'ticketClassLabel');
    const tariffSummary = appBuildTicketMixSummary(cart.tickets, 'tariffLabel');
    const activeDraftId = cartGrid.dataset.activeTicketDraftId || '';

    cartGrid.innerHTML = `
        <div class="cart-items">
            ${appBuildNoticeMarkup(notice)}
            <div class="progress-steps">
                <div class="steps-container">
                    <div class="step">
                        <div class="step-number active">1</div>
                        <span class="step-label active">Carrito</span>
                    </div>
                    <div class="step-line"></div>
                    <div class="step">
                        <div class="step-number inactive">2</div>
                        <span class="step-label inactive">Pago</span>
                    </div>
                    <div class="step-line"></div>
                    <div class="step">
                        <div class="step-number inactive">3</div>
                        <span class="step-label inactive">Confirmacion</span>
                    </div>
                </div>
            </div>

            <div class="cart-item">
                <div class="cart-item-content">
                    <img src="${cart.image}" alt="${cart.destination}" class="cart-item-image">
                    <div class="cart-item-info">
                        <div class="cart-item-header">
                            <h3 class="cart-item-title">${cart.title}</h3>
                            <button class="btn-remove" type="button" data-remove-cart="true" aria-label="Eliminar compra">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    <line x1="10" y1="11" x2="10" y2="17"></line>
                                    <line x1="14" y1="11" x2="14" y2="17"></line>
                                </svg>
                            </button>
                        </div>
                        <p class="cart-item-dates">${appFormatReservationRange(cart.departureDate, cart.returnDate)}</p>
                        <div class="cart-item-footer">
                            <div class="quantity-control">
                                <span class="quantity-label">Boletos:</span>
                                <div class="quantity-buttons">
                                    <button class="quantity-btn" type="button" data-passenger-change="-1" ${canDecreasePassengers ? '' : 'disabled style="opacity: 0.5; cursor: not-allowed;"'}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                        </svg>
                                    </button>
                                    <span class="quantity-value">${cart.passengers}</span>
                                    <button class="quantity-btn" type="button" data-passenger-change="1" ${canIncreasePassengers ? '' : 'disabled style="opacity: 0.5; cursor: not-allowed;"'}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <line x1="12" y1="5" x2="12" y2="19"></line>
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div class="cart-item-price-section">
                                <p class="cart-item-passengers">${tariffSummary || cart.tariffLabel} &middot; ${complementSummary}</p>
                                <p style="margin: 0.35rem 0 0; color: #6b7280; font-size: 0.875rem;">Clases: ${classSummary || 'Sin definir'} | Asientos: ${seatSummary}</p>
                                <p class="cart-item-price">${appFormatCurrency(cart.pricing.total)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="cart-ticket-manager">
                <div class="cart-ticket-manager-header">
                    <div>
                        <p class="cart-ticket-kicker">Tiquetes</p>
                        <h3>Clase y asiento por boleto</h3>
                        <p>Al agregar mas boletos se asignan automaticamente. Luego puedes cambiar clase y asiento aqui mismo.</p>
                    </div>
                </div>

                <div class="cart-ticket-list">
                    ${cart.tickets.map(function(ticket, index) {
                        const isActive = ticket.draftId === activeDraftId;

                        return `
                            <article class="cart-ticket-card ${isActive ? 'is-active' : ''}" data-ticket-card="${ticket.draftId}">
                                <div class="cart-ticket-card-header">
                                    <div>
                                        <p class="cart-ticket-kicker">Boleto ${index + 1}</p>
                                        <h4>${ticket.ticketClassLabel}</h4>
                                    </div>
                                    <span class="cart-ticket-price">${appFormatCurrency(ticket.finalPrice || appGetTicketBasePrice(ticket))}</span>
                                </div>
                                <div class="cart-ticket-controls">
                                    <label class="cart-ticket-field">
                                        <span>Tarifa</span>
                                        <select data-ticket-tariff="${ticket.draftId}">
                                            ${Object.values(appGetTariffConfig()).map(function(tariff) {
                                                return `<option value="${tariff.id}" ${tariff.id === ticket.tariffId ? 'selected' : ''}>${tariff.label}</option>`;
                                            }).join('')}
                                        </select>
                                    </label>
                                    <label class="cart-ticket-field">
                                        <span>Clase</span>
                                        <select data-ticket-class="${ticket.draftId}">
                                            ${Object.values(appGetSeatClassConfig()).map(function(seatClass) {
                                                return `<option value="${seatClass.id}" ${seatClass.id === ticket.ticketClassId ? 'selected' : ''}>${seatClass.label}</option>`;
                                            }).join('')}
                                        </select>
                                    </label>
                                    <button type="button" class="cart-ticket-seat-trigger" data-toggle-ticket-seat="${ticket.draftId}">
                                        <span>Asiento</span>
                                        <strong>${ticket.seatNumber || 'Sin asignar'}</strong>
                                    </button>
                                </div>
                                ${isActive ? `
                                    <div class="cart-ticket-seat-map">
                                        <div class="cart-seat-legend">
                                            <span class="cart-seat-legend-item"><span class="cart-seat-legend-swatch available"></span>Disponible</span>
                                            <span class="cart-seat-legend-item"><span class="cart-seat-legend-swatch selected"></span>Seleccionado</span>
                                            <span class="cart-seat-legend-item"><span class="cart-seat-legend-swatch occupied"></span>Ocupado</span>
                                            <span class="cart-seat-legend-item"><span class="cart-seat-legend-swatch locked"></span>Bloqueado</span>
                                        </div>
                                        <p style="margin: 0 0 1rem; color: #6b7280;">La tarifa define equipaje y beneficios. La clase define la cabina y el asiento.</p>
                                        <div class="cart-seat-map-grid">
                                            ${appBuildCartSeatMapMarkup(cart.tickets, ticket.draftId)}
                                        </div>
                                    </div>
                                ` : ''}
                            </article>
                        `;
                    }).join('')}
                </div>
            </div>

            <div class="info-box">
                <h3>Informacion importante</h3>
                <ul>
                    <li>- Solo puedes tener una compra pendiente a la vez en este flujo.</li>
                    <li>- Puedes ajustar entre ${APP_LIMITS.minPassengers} y ${APP_LIMITS.maxPassengers} boletos antes de pagar.</li>
                    <li>- Cada boleto puede viajar en una clase distinta y con un asiento diferente.</li>
                    <li>- Si cambias de idea, puedes eliminar la compra desde el icono de papelera.</li>
                </ul>
            </div>
        </div>

        <div class="cart-summary">
            <h2 class="summary-title">Resumen de compra</h2>
            <div class="summary-breakdown">
                <div class="summary-item">
                    <span class="summary-label">Subtotal</span>
                    <span class="summary-value">${appFormatCurrency(cart.pricing.subtotal)}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Impuestos y tasas</span>
                    <span class="summary-value">${appFormatCurrency(cart.pricing.taxes)}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Tarifas</span>
                    <span class="summary-value">${tariffSummary || cart.tariffLabel}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Clases</span>
                    <span class="summary-value">${classSummary || 'Sin definir'}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Asientos</span>
                    <span class="summary-value">${seatSummary}</span>
                </div>
            </div>
            <div class="summary-total">
                <span class="total-label">Total</span>
                <span class="total-value">${appFormatCurrency(cart.pricing.total)}</span>
            </div>
            <button class="btn-checkout" type="button" data-checkout="true">
                Continuar al pago
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
            </button>
            <a href="results.html" class="btn-continue">Seguir comprando</a>
            <div class="link-section">
                <a href="my-reservation.html">Ver cambios y reembolsos &rarr;</a>
            </div>
        </div>
    `;

    cartGrid.dataset.activeTicketDraftId = activeDraftId;

    const removeButton = cartGrid.querySelector('[data-remove-cart="true"]');
    if (removeButton) {
        removeButton.addEventListener('click', function() {
            appSetCart(null);
            appSetNotice('La compra se elimino del carrito.', 'success');
            appRenderCartPage();
        });
    }

    cartGrid.querySelectorAll('[data-passenger-change]').forEach(button => {
        button.addEventListener('click', function() {
            const nextPassengers = Math.min(
                APP_LIMITS.maxPassengers,
                Math.max(APP_LIMITS.minPassengers, cart.passengers + Number(this.dataset.passengerChange))
            );

            if (nextPassengers === cart.passengers) {
                return;
            }

            appSetCart(appResizeCartTickets(cart, nextPassengers));
            appRenderCartPage();
        });
    });

    cartGrid.querySelectorAll('[data-toggle-ticket-seat]').forEach(button => {
        button.addEventListener('click', function() {
            cartGrid.dataset.activeTicketDraftId = cartGrid.dataset.activeTicketDraftId === this.dataset.toggleTicketSeat
                ? ''
                : this.dataset.toggleTicketSeat;
            appRenderCartPage();
        });
    });

    cartGrid.querySelectorAll('[data-ticket-tariff]').forEach(select => {
        select.addEventListener('change', function() {
            const updatedCart = appUpdateCartTicketTariff(cart, this.dataset.ticketTariff, this.value);
            appSetCart(updatedCart);
            appRenderCartPage();
        });
    });

    cartGrid.querySelectorAll('[data-ticket-class]').forEach(select => {
        select.addEventListener('change', function() {
            const updatedCart = appUpdateCartTicketClass(cart, this.dataset.ticketClass, this.value);
            cartGrid.dataset.activeTicketDraftId = this.dataset.ticketClass;
            appSetCart(updatedCart);
            appRenderCartPage();
        });
    });

    cartGrid.querySelectorAll('[data-cart-seat]').forEach(button => {
        button.addEventListener('click', function() {
            const updatedCart = appUpdateCartTicketSeat(cart, this.dataset.activeTicket, this.dataset.cartSeat);
            cartGrid.dataset.activeTicketDraftId = this.dataset.activeTicket;
            appSetCart(updatedCart);
            appRenderCartPage();
        });
    });

    const checkoutButton = cartGrid.querySelector('[data-checkout="true"]');
    if (checkoutButton) {
        checkoutButton.addEventListener('click', function() {
            if (cart.tickets.some(ticket => !ticket.seatNumber)) {
                alert('Todos los boletos deben tener un asiento asignado antes de pagar.');
                return;
            }

            const reservationCode = `RES-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900000) + 100000)}`;
            const syncedTickets = appSyncTickets({
                tickets: cart.tickets,
                desiredCount: cart.tickets.length,
                defaultTariffId: cart.tickets[0]?.tariffId || 'standard'
            });
            const pricing = appCalculatePricing({
                tickets: syncedTickets,
                complements: cart.complements
            });
            const reservation = {
                ...cart,
                passengers: syncedTickets.length,
                code: reservationCode,
                status: 'confirmed',
                reservedAt: new Date().toISOString(),
                tickets: appBuildTickets({
                    tickets: syncedTickets,
                    complements: cart.complements,
                    pricing,
                    code: reservationCode
                }),
                pricing,
                paymentMethod: 'Visa ****1234'
            };

            appSetReservation(reservation);
            appSetCart(null);
            appSetNotice('Pago registrado correctamente. Ya puedes revisar tu reserva y descargar el voucher.', 'success');
            window.location.href = getClientPagePath('my-reservation.html');
        });
    }
}

function appBuildReservationDetailsMarkup(reservation) {
    const complementItems = reservation.complements.length
        ? reservation.complements.map(complement => `<li>- ${complement.label} (${appFormatCurrency(complement.price)})</li>`).join('')
        : '<li>- No agregaste complementos adicionales</li>';
    const classSummary = appBuildTicketMixSummary(reservation.tickets, 'ticketClassLabel');
    const tariffSummary = appBuildTicketMixSummary(reservation.tickets, 'tariffLabel');
    const ticketItems = reservation.tickets.length
        ? reservation.tickets.map(ticket => `
            <div style="padding: 0.85rem 1rem; border: 1px solid #e5e7eb; border-radius: 0.75rem; background-color: #f8fafc; margin-bottom: 0.75rem;">
                <p style="margin: 0 0 0.25rem; font-weight: 700; color: #111827;">${ticket.id}</p>
                <p style="margin: 0 0 0.25rem; color: #374151;">${ticket.tariffLabel} | Asiento ${ticket.seatNumber} | ${ticket.ticketClassLabel}</p>
                <p style="margin: 0; color: #2563eb; font-weight: 600;">${appFormatCurrency(ticket.finalPrice)}</p>
            </div>
        `).join('')
        : '<p style="margin: 0; color: #6b7280;">Los tiquetes se emitiran al confirmar el pago.</p>';

    return `
        <div class="policy-section" id="reservationDetailsCard" style="margin-top: 1.5rem;">
            <h2 class="policy-title">Detalle de la reserva</h2>
            <div class="policy-grid">
                <div class="policy-item">
                    <h3>Informacion general</h3>
                    <ul>
                        <li>- Codigo: ${reservation.code}</li>
                        <li>- Destino: ${reservation.destination}</li>
                        <li>- Fechas: ${appFormatReservationRange(reservation.departureDate, reservation.returnDate)}</li>
                        <li>- Pasajeros: ${reservation.passengers}</li>
                        <li>- Tarifas: ${tariffSummary || reservation.tariffLabel}</li>
                        <li>- Clases: ${classSummary || reservation.ticketClassLabel}</li>
                        <li>- Asientos: ${appFormatSeatList(reservation.tickets)}</li>
                    </ul>
                </div>
                <div class="policy-item">
                    <h3>Complementos</h3>
                    <ul>${complementItems}</ul>
                </div>
                <div class="policy-item">
                    <h3>Tiquetes emitidos</h3>
                    ${ticketItems}
                </div>
            </div>
        </div>
    `;
}

function appBuildModifyReservationMarkup(reservation) {
    return `
        <div class="policy-section" id="reservationModifyCard" style="margin-top: 1.5rem;">
            <h2 class="policy-title">Modificar reserva</h2>
            <form id="reservationModifyForm">
                <div class="reservation-details" style="margin-bottom: 1rem;">
                    <label class="detail-item" style="display: block;">
                        <span class="detail-label" style="display: block; margin-bottom: 0.5rem;">Nueva fecha de salida</span>
                        <input type="date" name="departureDate" value="${reservation.departureDate}" style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.5rem;">
                    </label>
                    <label class="detail-item" style="display: block;">
                        <span class="detail-label" style="display: block; margin-bottom: 0.5rem;">Nueva fecha de regreso</span>
                        <input type="date" name="returnDate" value="${reservation.returnDate}" style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.5rem;">
                    </label>
                    <label class="detail-item" style="display: block;">
                        <span class="detail-label" style="display: block; margin-bottom: 0.5rem;">Pasajeros</span>
                        <input type="number" name="passengers" min="${APP_LIMITS.minPassengers}" max="${APP_LIMITS.maxPassengers}" value="${reservation.passengers}" style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.5rem;">
                    </label>
                </div>
                <div class="actions-buttons">
                    <button type="submit" class="btn-action btn-action-primary">Guardar cambios</button>
                    <button type="button" class="btn-action btn-action-secondary" id="closeModifyReservation">Cerrar</button>
                </div>
            </form>
        </div>
    `;
}

function appDownloadVoucher(reservation) {
    const classSummary = appBuildTicketMixSummary(reservation.tickets, 'ticketClassLabel');
    const tariffSummary = appBuildTicketMixSummary(reservation.tickets, 'tariffLabel');
    const voucherContent = [
        'BIOPOCHITOEXPRESS - VOUCHER DE RESERVA',
        '',
        `Codigo: ${reservation.code}`,
        `Reserva: ${reservation.title}`,
        `Destino: ${reservation.destination}`,
        `Fechas: ${appFormatReservationRange(reservation.departureDate, reservation.returnDate)}`,
        `Pasajeros: ${reservation.passengers}`,
        `Tarifas: ${tariffSummary || reservation.tariffLabel}`,
        `Clases: ${classSummary || reservation.ticketClassLabel}`,
        `Asientos: ${appFormatSeatList(reservation.tickets)}`,
        `Total pagado: ${appFormatCurrency(reservation.pricing.total)}`,
        `Metodo de pago: ${reservation.paymentMethod}`,
        '',
        'TIQUETES:',
        ...(reservation.tickets || []).map(ticket => `${ticket.id} | ${ticket.tariffLabel} | Asiento ${ticket.seatNumber} | ${ticket.ticketClassLabel} | ${appFormatCurrency(ticket.finalPrice)}`)
    ].join('\n');

    const voucherBlob = new Blob([voucherContent], { type: 'text/plain;charset=utf-8' });
    const voucherUrl = URL.createObjectURL(voucherBlob);
    const voucherLink = document.createElement('a');
    voucherLink.href = voucherUrl;
    voucherLink.download = `voucher-${reservation.code}.txt`;
    document.body.appendChild(voucherLink);
    voucherLink.click();
    voucherLink.remove();
    URL.revokeObjectURL(voucherUrl);
}

function appValidateReservationUpdate(formData) {
    const today = appStripTime(new Date());
    const maxAllowedDate = new Date(today);
    maxAllowedDate.setFullYear(maxAllowedDate.getFullYear() + APP_LIMITS.maxReservationYears);
    const departureDate = appParseIsoDate(formData.departureDate);
    const returnDate = appParseIsoDate(formData.returnDate);
    const passengers = Number(formData.passengers);

    if (!departureDate || departureDate <= today) {
        return 'La nueva fecha de salida debe ser posterior a hoy.';
    }

    if (!returnDate || returnDate <= departureDate) {
        return 'La fecha de regreso debe ser posterior a la fecha de salida.';
    }

    if (departureDate > maxAllowedDate || returnDate > maxAllowedDate) {
        return 'Las fechas modificadas deben estar dentro del proximo ano.';
    }

    if (!Number.isInteger(passengers) || passengers < APP_LIMITS.minPassengers || passengers > APP_LIMITS.maxPassengers) {
        return `Los pasajeros deben estar entre ${APP_LIMITS.minPassengers} y ${APP_LIMITS.maxPassengers}.`;
    }

    return '';
}

function appRenderReservationPage() {
    const container = document.querySelector('.reservation-container');
    if (!container) {
        return;
    }

    const reservation = appGetReservation();
    const cart = appGetCart();
    const notice = appConsumeNotice();
    const noticeMarkup = appBuildNoticeMarkup(notice);

    if (!reservation) {
        container.innerHTML = `
            <h1 class="reservation-title">Tus reservas</h1>
            ${noticeMarkup}
            <div class="policy-section">
                <h2 class="policy-title">Aun no tienes una reserva confirmada</h2>
                <p style="color: #6b7280; margin-bottom: 1.5rem;">
                    ${cart ? 'Tienes una compra pendiente en el carrito. Completa el pago para verla aqui.' : 'Cuando finalices una compra, aqui podras ver detalles, descargar el voucher, modificar la reserva o cancelarla.'}
                </p>
                <div class="actions-buttons">
                    <a href="${cart ? 'cart.html' : 'results.html'}" class="btn-action btn-action-primary">
                        ${cart ? 'Ir al carrito' : 'Explorar ofertas'}
                    </a>
                </div>
            </div>
        `;
        return;
    }

    const statusMeta = appGetReservationStatusMeta(reservation);
    const modifyState = appCanModifyReservation(reservation);
    const cancellationState = appGetCancellationPolicy(reservation);
    const disableModify = !modifyState.allowed ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : '';
    const disableCancel = !cancellationState.allowed ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : '';
    const reservedAt = new Date(reservation.reservedAt || new Date().toISOString());
    const classSummary = appBuildTicketMixSummary(reservation.tickets, 'ticketClassLabel');
    const cancellationSummary = reservation.status === 'cancelled'
        ? `
            <div class="flight-status-box" style="background-color: #fef2f2;">
                <h4 style="color: #991b1b;">Reserva cancelada</h4>
                <p style="color: #b91c1c;">Cargo aplicado: ${appFormatCurrency(reservation.cancellationFee || 0)}. Reembolso estimado: ${appFormatCurrency(reservation.refundAmount || 0)}</p>
            </div>
        `
        : '';

    container.innerHTML = `
        <h1 class="reservation-title">Tus reservas</h1>
        ${noticeMarkup}
        <div class="reservation-card">
            <div class="reservation-content">
                <img src="${reservation.image}" alt="${reservation.destination}" class="reservation-image">
                <div class="reservation-info">
                    <div class="reservation-header">
                        <div>
                            <span class="status-badge" style="background-color: ${statusMeta.background}; color: ${statusMeta.text};">${statusMeta.label}</span>
                            <h2 class="reservation-title-text">${reservation.title}</h2>
                            <p class="reservation-code">Codigo de reserva: <span class="code-value">${reservation.code}</span></p>
                        </div>
                    </div>

                    <div class="reservation-details">
                        <div class="detail-item">
                            <svg class="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle>
                            </svg>
                            <div class="detail-content">
                                <p class="detail-label">Destino</p>
                                <p class="detail-value">${reservation.destination}</p>
                            </div>
                        </div>

                        <div class="detail-item">
                            <svg class="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            <div class="detail-content">
                                <p class="detail-label">Fechas</p>
                                <p class="detail-value">${appFormatReservationRange(reservation.departureDate, reservation.returnDate)}</p>
                            </div>
                        </div>

                        <div class="detail-item">
                            <svg class="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            <div class="detail-content">
                                <p class="detail-label">Fecha de reserva</p>
                                <p class="detail-value">${appFormatLongDate(reservedAt)}</p>
                            </div>
                        </div>
                    </div>

                    <div class="reservation-actions">
                        <div class="actions-buttons">
                            <button class="btn-action btn-action-primary" type="button" id="viewReservationDetails">Ver detalles</button>
                            <button class="btn-action btn-action-secondary" type="button" id="downloadVoucher">Descargar voucher</button>
                            <button class="btn-action btn-action-secondary" type="button" id="openModifyReservation" ${disableModify}>Modificar reserva</button>
                            <button class="btn-action btn-action-danger" type="button" id="cancelReservation" ${disableCancel}>Cancelar</button>
                        </div>
                        ${!modifyState.allowed ? `<p style="margin: 0.75rem 0 0; font-size: 0.875rem; color: #6b7280;">${modifyState.reason}</p>` : ''}
                        ${!cancellationState.allowed ? `<p style="margin: 0.5rem 0 0; font-size: 0.875rem; color: #6b7280;">${cancellationState.reason}</p>` : ''}
                    </div>
                </div>

                <div class="reservation-price">
                    <h3 class="price-summary-title">Resumen de pago</h3>
                    <div class="price-items">
                        <div class="price-item">
                            <span class="price-label">Pasajeros</span>
                            <span class="price-value">${reservation.passengers}</span>
                        </div>
                        <div class="price-item">
                            <span class="price-label">Clases</span>
                            <span class="price-value">${classSummary || reservation.ticketClassLabel}</span>
                        </div>
                        <div class="price-item">
                            <span class="price-label">Asientos</span>
                            <span class="price-value">${appFormatSeatList(reservation.tickets)}</span>
                        </div>
                        <div class="price-item">
                            <span class="price-label">Tiquetes</span>
                            <span class="price-value">${reservation.tickets.length}</span>
                        </div>
                        <div class="price-item">
                            <span class="price-label">Total pagado</span>
                            <span class="price-value price-total">${appFormatCurrency(reservation.pricing.total)}</span>
                        </div>
                    </div>
                    <div class="payment-info">
                        <div class="payment-method">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line>
                            </svg>
                            <span>Pagado con ${reservation.paymentMethod}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div id="reservationDynamicSections"></div>

        <div class="policy-section">
            <h2 class="policy-title">Gestiona tu reserva</h2>
            <div class="policy-grid">
                <div class="policy-item">
                    <h3>Cambios y modificaciones</h3>
                    <ul>
                        <li>- Puedes cambiar tus fechas hasta 48 horas antes del viaje.</li>
                        <li>- Las fechas modificadas deben seguir dentro del proximo ano.</li>
                        <li>- Los pasajeros deben mantenerse entre ${APP_LIMITS.minPassengers} y ${APP_LIMITS.maxPassengers}.</li>
                        <li>- Si cambias la cantidad de pasajeros, los asientos se actualizan segun disponibilidad.</li>
                        <li>- Los cambios se guardan de inmediato en esta misma reserva.</li>
                    </ul>
                </div>
                <div class="policy-item">
                    <h3>Politica de cancelacion</h3>
                    <ul>
                        <li>- Mas de 7 dias antes: sin cargo.</li>
                        <li>- Entre 7 y 3 dias: cargo del 30%.</li>
                        <li>- Menos de 3 dias: cargo del 50%.</li>
                        <li>- Estado actual: ${cancellationState.reason}</li>
                    </ul>
                </div>
            </div>
            ${cancellationSummary}
        </div>
    `;

    const dynamicSections = document.getElementById('reservationDynamicSections');
    const toggleDetailsButton = document.getElementById('viewReservationDetails');
    const downloadVoucherButton = document.getElementById('downloadVoucher');
    const openModifyButton = document.getElementById('openModifyReservation');
    const cancelReservationButton = document.getElementById('cancelReservation');

    if (toggleDetailsButton && dynamicSections) {
        toggleDetailsButton.addEventListener('click', function() {
            const existingCard = document.getElementById('reservationDetailsCard');

            if (existingCard) {
                existingCard.remove();
                return;
            }

            dynamicSections.insertAdjacentHTML('beforeend', appBuildReservationDetailsMarkup(reservation));
        });
    }

    if (downloadVoucherButton) {
        downloadVoucherButton.addEventListener('click', function() {
            appDownloadVoucher(reservation);
            appSetNotice('El voucher se descargo correctamente.', 'success');
            appRenderReservationPage();
        });
    }

    if (openModifyButton && modifyState.allowed && dynamicSections) {
        openModifyButton.addEventListener('click', function() {
            const existingForm = document.getElementById('reservationModifyCard');

            if (existingForm) {
                existingForm.remove();
                return;
            }

            dynamicSections.insertAdjacentHTML('beforeend', appBuildModifyReservationMarkup(reservation));

            const modifyForm = document.getElementById('reservationModifyForm');
            const closeModifyButton = document.getElementById('closeModifyReservation');

            if (closeModifyButton) {
                closeModifyButton.addEventListener('click', function() {
                    const currentCard = document.getElementById('reservationModifyCard');
                    if (currentCard) {
                        currentCard.remove();
                    }
                });
            }

            if (modifyForm) {
                modifyForm.addEventListener('submit', function(event) {
                    event.preventDefault();

                    const formData = new FormData(modifyForm);
                    const nextValues = {
                        departureDate: formData.get('departureDate'),
                        returnDate: formData.get('returnDate'),
                        passengers: formData.get('passengers')
                    };

                    const validationMessage = appValidateReservationUpdate(nextValues);
                    if (validationMessage) {
                        alert(validationMessage);
                        return;
                    }

                    const updatedReservation = {
                        ...reservation,
                        departureDate: nextValues.departureDate,
                        returnDate: nextValues.returnDate,
                        passengers: Number(nextValues.passengers),
                        pricing: appCalculatePricing({
                            tickets: appSyncTickets({
                                tickets: reservation.tickets,
                                desiredCount: Number(nextValues.passengers),
                                defaultTariffId: reservation.tickets[0]?.tariffId || reservation.tariffId || 'standard'
                            }),
                            complements: reservation.complements
                        }),
                        tickets: appSyncTickets({
                            tickets: reservation.tickets,
                            desiredCount: Number(nextValues.passengers),
                            defaultTariffId: reservation.tickets[0]?.tariffId || reservation.tariffId || 'standard'
                        }),
                        updatedAt: new Date().toISOString()
                    };

                    appSetReservation(updatedReservation);
                    appSetNotice('La reserva se modifico correctamente.', 'success');
                    appRenderReservationPage();
                });
            }
        });
    }

    if (cancelReservationButton && cancellationState.allowed) {
        cancelReservationButton.addEventListener('click', function() {
            const cancellationFee = Math.round(reservation.pricing.total * cancellationState.feeRate);
            const refundAmount = reservation.pricing.total - cancellationFee;
            const confirmationMessage = cancellationFee
                ? `Esta cancelacion aplica un cargo de ${appFormatCurrency(cancellationFee)}. El reembolso estimado sera de ${appFormatCurrency(refundAmount)}.`
                : 'Esta cancelacion no tiene costo.';

            if (!window.confirm(`${confirmationMessage}\n\nDeseas continuar?`)) {
                return;
            }

            const cancelledReservation = {
                ...reservation,
                status: 'cancelled',
                cancellationFee,
                refundAmount,
                cancelledAt: new Date().toISOString()
            };

            appSetReservation(cancelledReservation);
            appSetNotice('La reserva se cancelo correctamente.', 'success');
            appRenderReservationPage();
        });
    }
}

document.addEventListener('DOMContentLoaded', function() {
    appSyncCartBadge();
    appInitResultsPage();
    appInitOfferDetailPage();
    appRenderCartPage();
    appRenderReservationPage();
});
