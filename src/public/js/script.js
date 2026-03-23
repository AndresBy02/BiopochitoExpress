// Mobile Menu Toggle
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    mobileMenu.classList.toggle('active');
}

function getClientPagePath(pageName) {
    const inClientViews = window.location.pathname.includes('/src/views/client/');
    return inClientViews ? pageName : `src/views/client/${pageName}`;
}
/* 4 i */
function stripTime(date) {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    return normalizedDate;
}

function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date, amount) {
    return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function isSameDate(firstDate, secondDate) {
    return Boolean(firstDate) && Boolean(secondDate)
        && firstDate.getTime() === secondDate.getTime();
}

function formatLongDate(date) {
    return new Intl.DateTimeFormat('es-CO', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    }).format(date);
}

function formatShortDate(date) {
    return new Intl.DateTimeFormat('es-CO', {
        day: 'numeric',
        month: 'short'
    }).format(date);
}

function formatIsoDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

document.addEventListener('DOMContentLoaded', function() {
    const searchForm = document.querySelector('.search-form');
    const toggleButtons = document.querySelectorAll('.toggle-btn');
    const inputFechas = document.getElementById('fechas');
    const tripDateLabel = document.getElementById('tripDateLabel');
    const datePicker = document.getElementById('datePicker');
    const datePickerPanel = document.getElementById('datePickerPanel');
    const datePickerTitle = document.getElementById('datePickerTitle');
    const datePickerHelper = document.getElementById('datePickerHelper');
    const departureSummary = document.getElementById('departureSummary');
    const departureSummaryValue = document.getElementById('departureSummaryValue');
    const returnSummary = document.getElementById('returnSummary');
    const returnSummaryValue = document.getElementById('returnSummaryValue');
    const datePickerClose = document.getElementById('datePickerClose');
    const calendarPrev = document.getElementById('calendarPrev');
    const calendarNext = document.getElementById('calendarNext');
    const calendarMonths = document.getElementById('calendarMonths');
    const today = stripTime(new Date());
    // inicio cambio: restringir reservas a maximo 1 ano en el futuro
    const maxReservationDate = stripTime(new Date(today));
    maxReservationDate.setFullYear(maxReservationDate.getFullYear() + 1);
    // fin cambio: restringir reservas a maximo 1 ano en el futuro

    if (!searchForm || !inputFechas || !datePicker || !datePickerPanel || !calendarMonths) {
        return;
    }

    const calendarState = {
        tripType: 'roundtrip',
        selecting: 'departure',
        departureDate: null,
        returnDate: null,
        visibleMonth: startOfMonth(today)
    };

    // cambio i 4
    function runWithoutScrollJump(callback) {
        const currentScrollPosition = window.scrollY;
        callback();
        window.requestAnimationFrame(function() {
            window.scrollTo({ top: currentScrollPosition });
        });
    }

    function preventDatePickerFocusJump(element) {
        if (!element) {
            return;
        }

        ['mousedown', 'pointerdown'].forEach(eventName => {
            element.addEventListener(eventName, function(event) {
                event.preventDefault();
            });
        });
    }
    // cambio f 4

    function openDatePicker() {
        // inicio cambio: abrir calendario listo mejorado
        calendarState.selecting = 'departure';

        if (calendarState.tripType === 'oneway') {
            calendarState.returnDate = null;
        }
        // fin cambio: abrir calendario mejorado

        if (calendarState.departureDate) {
            calendarState.visibleMonth = startOfMonth(calendarState.departureDate);
        } else {
            calendarState.visibleMonth = startOfMonth(today);
        }

        datePickerPanel.hidden = false;
        inputFechas.setAttribute('aria-expanded', 'true');
        renderCalendar();
    }

    function closeDatePicker() {
        datePickerPanel.hidden = true;
        inputFechas.setAttribute('aria-expanded', 'false');
    }

    function updateSummaries() {
        const hasDeparture = Boolean(calendarState.departureDate);
        const hasReturn = Boolean(calendarState.returnDate);
        const isRoundTrip = calendarState.tripType === 'roundtrip';

        tripDateLabel.textContent = isRoundTrip ? 'Ida y vuelta' : 'Fecha de salida';
        inputFechas.placeholder = isRoundTrip ? 'Selecciona fechas' : 'Selecciona fecha de salida';

        if (isRoundTrip) {
            datePickerTitle.textContent = calendarState.selecting === 'return' ? 'Selecciona tu regreso' : 'Ida y vuelta';
            datePickerHelper.textContent = calendarState.selecting === 'return'
                ? 'Ahora elige una fecha de regreso posterior a la ida y dentro del proximo ano.'
                : 'Selecciona la fecha de salida y luego una fecha de regreso posterior dentro del proximo ano.';
        } else {
            datePickerTitle.textContent = 'Solo ida';
            datePickerHelper.textContent = 'Selecciona la fecha en la que deseas viajar dentro del proximo ano.';
        }

        departureSummaryValue.textContent = hasDeparture ? formatLongDate(calendarState.departureDate) : 'Selecciona fecha';
        returnSummaryValue.textContent = hasReturn ? formatLongDate(calendarState.returnDate) : 'Selecciona fecha';

        departureSummary.classList.toggle('active', calendarState.selecting === 'departure' || !hasDeparture || calendarState.tripType === 'oneway');
        returnSummary.classList.toggle('active', isRoundTrip && calendarState.selecting === 'return');
        returnSummary.classList.toggle('disabled', !isRoundTrip || !hasDeparture);

        if (!hasDeparture) {
            inputFechas.value = '';
        } else if (!isRoundTrip) {
            inputFechas.value = formatLongDate(calendarState.departureDate);
        } else if (hasReturn) {
            inputFechas.value = `${formatShortDate(calendarState.departureDate)} - ${formatShortDate(calendarState.returnDate)}`;
        } else {
            inputFechas.value = `${formatShortDate(calendarState.departureDate)} - Selecciona regreso`;
        }
    }

    function buildMonth(monthDate) {
        const monthWrapper = document.createElement('div');
        monthWrapper.className = 'calendar-month';

        const title = document.createElement('h4');
        title.className = 'calendar-month-title';
        title.textContent = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(monthDate);
        monthWrapper.appendChild(title);

        const weekdays = document.createElement('div');
        weekdays.className = 'calendar-weekdays';
        ['D', 'L', 'M', 'M', 'J', 'V', 'S'].forEach(day => {
            const dayLabel = document.createElement('span');
            dayLabel.textContent = day;
            weekdays.appendChild(dayLabel);
        });
        monthWrapper.appendChild(weekdays);

        const daysGrid = document.createElement('div');
        daysGrid.className = 'calendar-days';

        const firstDayOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
        const offset = firstDayOfMonth.getDay();
        const shouldLimitReturnDates = calendarState.tripType === 'roundtrip'
            && calendarState.selecting === 'return'
            && calendarState.departureDate;

        for (let index = 0; index < offset; index += 1) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day-empty';
            daysGrid.appendChild(emptyDay);
        }

        for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
            const currentDate = stripTime(new Date(monthDate.getFullYear(), monthDate.getMonth(), dayNumber));
            const dayButton = document.createElement('button');
            dayButton.type = 'button';
            dayButton.className = 'calendar-day';
            dayButton.textContent = String(dayNumber);

            const isPastDate = currentDate < today;
            const exceedsReservationLimit = currentDate > maxReservationDate;
            const blocksReturnDate = shouldLimitReturnDates && currentDate <= calendarState.departureDate;
            dayButton.disabled = isPastDate || exceedsReservationLimit || blocksReturnDate;

            if (isSameDate(currentDate, today)) {
                dayButton.classList.add('today');
            }

            if (calendarState.departureDate && calendarState.returnDate
                && currentDate > calendarState.departureDate
                && currentDate < calendarState.returnDate) {
                dayButton.classList.add('in-range');
            }

            if (isSameDate(currentDate, calendarState.departureDate) && isSameDate(currentDate, calendarState.returnDate)) {
                dayButton.classList.add('single-date');
            } else if (isSameDate(currentDate, calendarState.departureDate) && calendarState.returnDate) {
                dayButton.classList.add('range-start');
            } else if (isSameDate(currentDate, calendarState.returnDate)) {
                dayButton.classList.add('range-end');
            } else if (isSameDate(currentDate, calendarState.departureDate)) {
                dayButton.classList.add('single-date');
            }

            preventDatePickerFocusJump(dayButton);

            dayButton.addEventListener('click', function(event) {
                event.preventDefault();

                runWithoutScrollJump(function() {
                    if (calendarState.tripType === 'oneway') {
                        calendarState.departureDate = currentDate;
                        if (calendarState.returnDate && calendarState.returnDate <= currentDate) {
                            calendarState.returnDate = null;
                        }
                        calendarState.selecting = 'departure';
                        updateSummaries();
                        renderCalendar();
                        closeDatePicker();
                        return;
                    }

                    if (calendarState.selecting === 'departure' || !calendarState.departureDate) {
                        calendarState.departureDate = currentDate;
                        if (calendarState.returnDate && calendarState.returnDate <= currentDate) {
                            calendarState.returnDate = null;
                        }
                        calendarState.selecting = 'return';
                        updateSummaries();
                        renderCalendar();
                        return;
                    }

                    if (currentDate <= calendarState.departureDate) {
                        alert('La fecha de regreso debe ser mayor a la fecha de ida.');
                        return;
                    }

                    calendarState.returnDate = currentDate;
                    calendarState.selecting = 'departure';
                    updateSummaries();
                    renderCalendar();
                    closeDatePicker();
                });
            });

            daysGrid.appendChild(dayButton);
        }

        monthWrapper.appendChild(daysGrid);
        return monthWrapper;
    }

    function renderCalendar() {
        calendarMonths.innerHTML = '';
        calendarMonths.appendChild(buildMonth(calendarState.visibleMonth));
        calendarMonths.appendChild(buildMonth(addMonths(calendarState.visibleMonth, 1)));

        const isCurrentMonth = calendarState.visibleMonth.getFullYear() === today.getFullYear()
            && calendarState.visibleMonth.getMonth() === today.getMonth();
        const isLastAllowedMonth = calendarState.visibleMonth.getFullYear() === maxReservationDate.getFullYear()
            && calendarState.visibleMonth.getMonth() === maxReservationDate.getMonth();

        calendarPrev.disabled = isCurrentMonth;
        calendarNext.disabled = isLastAllowedMonth;
    }

    // cambio i 5
    preventDatePickerFocusJump(inputFechas);
    preventDatePickerFocusJump(datePickerClose);
    preventDatePickerFocusJump(departureSummary);
    preventDatePickerFocusJump(returnSummary);
    preventDatePickerFocusJump(calendarPrev);
    preventDatePickerFocusJump(calendarNext);
    // cambio f 5

    toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const nextTripType = this.dataset.tripType;

            toggleButtons.forEach(toggleButton => toggleButton.classList.remove('active'));
            this.classList.add('active');

            calendarState.tripType = nextTripType;
            // inicio cambio: limpiar regreso al cambiar a solo ida
            if (nextTripType === 'oneway') {
                calendarState.returnDate = null;
            }
            // fin cambio: limpiar regreso al cambiar a solo ida
            calendarState.selecting = 'departure';

            updateSummaries();

            if (!datePickerPanel.hidden) {
                renderCalendar();
            }
        });
    });

    inputFechas.addEventListener('click', function(event) {
        event.preventDefault();
        runWithoutScrollJump(function() {
            if (datePickerPanel.hidden) {
                openDatePicker();
            } else {
                closeDatePicker();
            }
        });
    });

    datePickerClose.addEventListener('click', function(event) {
        event.preventDefault();
        runWithoutScrollJump(closeDatePicker);
    });

    departureSummary.addEventListener('click', function(event) {
        event.preventDefault();
        runWithoutScrollJump(function() {
            calendarState.selecting = 'departure';
            updateSummaries();
            renderCalendar();
        });
    });

    returnSummary.addEventListener('click', function(event) {
        event.preventDefault();
        runWithoutScrollJump(function() {
            if (calendarState.tripType !== 'roundtrip' || !calendarState.departureDate) {
                return;
            }

            calendarState.selecting = 'return';
            updateSummaries();
            renderCalendar();
        });
    });

    calendarPrev.addEventListener('click', function(event) {
        event.preventDefault();
        runWithoutScrollJump(function() {
            const previousMonth = addMonths(calendarState.visibleMonth, -1);
            const currentMonth = startOfMonth(today);

            if (previousMonth < currentMonth) {
                return;
            }

            calendarState.visibleMonth = previousMonth;
            renderCalendar();
        });
    });

    calendarNext.addEventListener('click', function(event) {
        event.preventDefault();
        runWithoutScrollJump(function() {
            const nextMonth = addMonths(calendarState.visibleMonth, 1);
            const lastAllowedMonth = startOfMonth(maxReservationDate);

            if (nextMonth > lastAllowedMonth) {
                return;
            }

            calendarState.visibleMonth = nextMonth;
            renderCalendar();
        });
    });

    searchForm.addEventListener('submit', function(event) {
        event.preventDefault();

        if (!calendarState.departureDate) {
            alert('Selecciona la fecha de ida antes de continuar.');
            openDatePicker();
            return;
        }

        if (calendarState.tripType === 'roundtrip' && !calendarState.returnDate) {
            alert('Selecciona una fecha de regreso posterior a la ida.');
            calendarState.selecting = 'return';
            updateSummaries();
            openDatePicker();
            return;
        }

        // inicio cambio: validar limite maximo de reserva a 1 año
        if (calendarState.departureDate > maxReservationDate) {
            alert('La fecha de ida no puede ser mayor a un ano en el futuro.');
            openDatePicker();
            return;
        }

        if (calendarState.tripType === 'roundtrip' && calendarState.returnDate > maxReservationDate) {
            alert('La fecha de regreso no puede ser mayor a un ano en el futuro.');
            calendarState.selecting = 'return';
            updateSummaries();
            openDatePicker();
            return;
        }
        // fin cambio: validar limite maximo de reserva a 1 año

        localStorage.setItem('tipoViajeSeleccionado', calendarState.tripType);
        localStorage.setItem('fechaIda', formatIsoDate(calendarState.departureDate));
        localStorage.setItem('fechasSeleccionadas', inputFechas.value);

        if (calendarState.tripType === 'roundtrip' && calendarState.returnDate) {
            localStorage.setItem('fechaRegreso', formatIsoDate(calendarState.returnDate));
        } else {
            localStorage.removeItem('fechaRegreso');
        }

        window.location.href = getClientPagePath('results.html');
    });

    document.addEventListener('click', function(event) {
        if (!datePicker.contains(event.target)) {
            closeDatePicker();
        }
    });

    // inicio cambio: cerrar calendario con tecla Esc
    document.addEventListener('keydown', function(event) {
        if (event.key !== 'Escape' || datePickerPanel.hidden) {
            return;
        }

        event.preventDefault();
        closeDatePicker();
        inputFechas.focus();
    });
    // fin cambio: cerrar calendario con tecla Esc

    updateSummaries();
     /* 4 f */
    // Offer card clicks
    const offerCards = document.querySelectorAll('.offer-card');
    offerCards.forEach(card => {
        card.addEventListener('click', function(event) {
            if (!event.target.classList.contains('btn-primary')) {
                window.location.href = getClientPagePath('offer-detail.html');
            }
        });
    });
});

// Close mobile menu when clicking outside
document.addEventListener('click', function(event) {
    const mobileMenu = document.getElementById('mobileMenu');
    const menuToggle = document.querySelector('.menu-toggle');

    if (mobileMenu && menuToggle) {
        if (!mobileMenu.contains(event.target) && !menuToggle.contains(event.target)) {
            mobileMenu.classList.remove('active');
        }
    }
});

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(event) {
        event.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});
