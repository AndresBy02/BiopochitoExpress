// Agent-specific functionality

// View Reservation Details
function viewReservation(reservationId) {
    alert('Viendo detalles de la reserva #RES-' + reservationId);
    // En una implementación real, aquí se mostraría un modal con todos los detalles
}

// Confirm Payment
function confirmPayment(reservationId) {
    if (confirm('¿Confirmar el pago de la reserva #RES-' + reservationId + '?')) {
        alert('Pago confirmado exitosamente');
        // Actualizar el estado en la tabla
        location.reload();
    }
}

// Load Seating Map
function loadSeatingMap(flightCode) {
    if (!flightCode) return;
    
    console.log('Cargando mapa de asientos para vuelo: ' + flightCode);
    // En una implementación real, aquí se cargarían los asientos desde el servidor
}

// Seat Selection
document.addEventListener('DOMContentLoaded', function() {
    const seats = document.querySelectorAll('.seat');
    const selectedSeatInput = document.getElementById('selectedSeat');
    
    seats.forEach(seat => {
        seat.addEventListener('click', function() {
            if (this.classList.contains('occupied')) {
                alert('Este asiento ya está ocupado');
                return;
            }
            
            // Remove previous selection
            seats.forEach(s => s.classList.remove('selected'));
            
            // Select this seat
            this.classList.add('selected');
            
            // Update input
            if (selectedSeatInput) {
                selectedSeatInput.value = this.getAttribute('data-seat');
            }
        });
    });
});

// Manejo de secciones con ARIA (similar a admin)
document.addEventListener('DOMContentLoaded', function() {
  const sidebarLinks = document.querySelectorAll('.sidebar-link');
  const sections = document.querySelectorAll('.admin-section');
  
  function setActiveSection(sectionId) {
    sections.forEach(section => {
      section.hidden = true;
      section.classList.remove('active');
      section.setAttribute('aria-hidden', 'true');
    });
    const activeSection = document.getElementById(`${sectionId}-section`);
    if (activeSection) {
      activeSection.hidden = false;
      activeSection.classList.add('active');
      activeSection.setAttribute('aria-hidden', 'false');
    }
    sidebarLinks.forEach(link => {
      const isActive = link.getAttribute('data-section') === sectionId;
      link.setAttribute('aria-selected', isActive ? 'true' : 'false');
      if (isActive) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }
  
  sidebarLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const sectionId = this.getAttribute('data-section');
      if (sectionId) {
        setActiveSection(sectionId);
        window.location.hash = sectionId;
      }
    });
  });
  
  const initialHash = window.location.hash.substring(1);
  if (initialHash && document.querySelector(`.sidebar-link[data-section="${initialHash}"]`)) {
    setActiveSection(initialHash);
  } else {
    setActiveSection('reservas');
  }
  
  // Navegación por teclado en asientos
  const seats = document.querySelectorAll('.seat');
  seats.forEach(seat => {
    seat.setAttribute('tabindex', '0');
    seat.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        seat.click();
      }
    });
    // Selección visual de asiento (simulación)
    seat.addEventListener('click', function() {
      if (!this.classList.contains('occupied')) {
        document.querySelectorAll('.seat').forEach(s => s.classList.remove('selected'));
        this.classList.add('selected');
        const seatName = this.getAttribute('data-seat') || this.innerText;
        const selectedSeatInput = document.getElementById('selectedSeat');
        if (selectedSeatInput) selectedSeatInput.value = seatName;
      }
    });
  });
});

// Funciones dummy para demostración
function viewReservation(id) {
  alert(`Ver detalles de reserva ${id}`);
}

function confirmPayment(id) {
  alert(`Confirmar pago de reserva ${id}`);
}

function loadSeatingMap(flightId) {
  if (!flightId) return;
  alert(`Cargando mapa de asientos para vuelo ${flightId}`);
  // Aquí se actualizaría el mapa dinámicamente
}