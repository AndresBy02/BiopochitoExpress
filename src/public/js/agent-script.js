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
