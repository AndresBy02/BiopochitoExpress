// Admin Navigation
document.addEventListener('DOMContentLoaded', function() {
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all links
            sidebarLinks.forEach(l => l.classList.remove('active'));
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // Hide all sections
            const sections = document.querySelectorAll('.admin-section');
            sections.forEach(section => section.classList.remove('active'));
            
            // Show corresponding section
            const sectionId = this.getAttribute('data-section') + '-section';
            const targetSection = document.getElementById(sectionId);
            if (targetSection) {
                targetSection.classList.add('active');
            }
        });
    });
    
    // Initialize Charts if Chart.js is loaded
    if (typeof Chart !== 'undefined') {
        initializeCharts();
    }
});

function initializeCharts() {
    // Sales Chart
    const salesCtx = document.getElementById('salesChart');
    if (salesCtx) {
        new Chart(salesCtx, {
            type: 'line',
            data: {
                labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
                datasets: [{
                    label: 'Ventas',
                    data: [85, 92, 110, 95, 118, 125],
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value + 'M';
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Destinations Chart
    const destinationsCtx = document.getElementById('destinationsChart');
    if (destinationsCtx) {
        new Chart(destinationsCtx, {
            type: 'bar',
            data: {
                labels: ['Cartagena', 'San Andrés', 'Medellín', 'Bogotá', 'Santa Marta'],
                datasets: [{
                    label: 'Reservas',
                    data: [1245, 1567, 987, 856, 1089],
                    backgroundColor: [
                        'rgba(37, 99, 235, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(139, 92, 246, 0.8)',
                        'rgba(236, 72, 153, 0.8)'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
    
    // Booking Type Chart
    const bookingTypeCtx = document.getElementById('bookingTypeChart');
    if (bookingTypeCtx) {
        new Chart(bookingTypeCtx, {
            type: 'doughnut',
            data: {
                labels: ['Paquetes', 'Solo Vuelo', 'Vuelo+Hotel'],
                datasets: [{
                    data: [45, 25, 30],
                    backgroundColor: [
                        'rgba(37, 99, 235, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(245, 158, 11, 0.8)'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true
            }
        });
    }
    
    // Revenue Chart
    const revenueCtx = document.getElementById('revenueChart');
    if (revenueCtx) {
        new Chart(revenueCtx, {
            type: 'line',
            data: {
                labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
                datasets: [
                    {
                        label: 'Ingresos',
                        data: [120, 135, 148, 130, 155, 168],
                        borderColor: '#16a34a',
                        backgroundColor: 'rgba(22, 163, 74, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Gastos',
                        data: [45, 52, 48, 55, 51, 58],
                        borderColor: '#dc2626',
                        backgroundColor: 'rgba(220, 38, 38, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value + 'M';
                            }
                        }
                    }
                }
            }
        });
    }
}

// Logout
const logoutBtn = document.querySelector('.btn-logout');
if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
        if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
            window.location.href = '../../../index.html';
        }
    });
}
