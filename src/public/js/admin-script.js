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

    setupOfferManagement();
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
            localStorage.removeItem('usuarioActivo');
            window.location.href = '../../../index.html';
        }
    });
}

// Manejo de navegación en el sidebar con ARIA
document.addEventListener('DOMContentLoaded', function() {
  const sidebarLinks = document.querySelectorAll('.sidebar-link');
  const sections = document.querySelectorAll('.admin-section');
  
  function setActiveSection(sectionId, activeLinkId) {
    // Ocultar todas las secciones y actualizar roles
    sections.forEach(section => {
      section.hidden = true;
      section.classList.remove('active');
      section.setAttribute('aria-hidden', 'true');
    });
    
    // Mostrar la sección activa
    const activeSection = document.getElementById(`${sectionId}-section`);
    if (activeSection) {
      activeSection.hidden = false;
      activeSection.classList.add('active');
      activeSection.setAttribute('aria-hidden', 'false');
    }
    
    // Actualizar estado de los tabs
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
      const linkId = this.id;
      if (sectionId) {
        setActiveSection(sectionId, linkId);
        // Actualizar URL hash sin scroll
        window.location.hash = sectionId;
      }
    });
  });
  
  // Cargar sección según hash al inicio
  const initialHash = window.location.hash.substring(1);
  if (initialHash && document.querySelector(`.sidebar-link[data-section="${initialHash}"]`)) {
    setActiveSection(initialHash, `tab-${initialHash}`);
  } else {
    setActiveSection('dashboard', 'tab-dashboard');
  }
});

// (Los gráficos con Chart.js se mantienen igual, solo se añadió aria-label a los canvas)

function formatAdminCurrency(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function showAdminFormMessage(form, messages, type) {
  const box = form.querySelector('[data-admin-message]');
  const list = Array.isArray(messages) ? messages : [messages];

  if (!box) {
    return;
  }

  box.className = `admin-form-message ${type}`;
  box.innerHTML = list.map(message => `<p>${message}</p>`).join('');
  box.hidden = false;
}

function hideAdminFormMessage(form) {
  const box = form.querySelector('[data-admin-message]');

  if (!box) {
    return;
  }

  box.hidden = true;
  box.innerHTML = '';
}

async function adminRequest(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error((data.errors || ['No se pudo guardar la informacion.']).join('\n'));
  }

  return data;
}

function buildDestinationAdminCard(destination) {
  const card = document.createElement('div');
  card.className = 'destination-admin-card';
  card.dataset.dynamicOffer = destination.id;
  card.innerHTML = `
    <img src="${destination.imageUrl}" alt="${destination.name}">
    <div class="destination-admin-content">
      <h3>${destination.name}</h3>
      <p>${destination.description || destination.location || 'Destino disponible para reservar'}</p>
      <div class="destination-stats">
        <span>⭐ ${Number(destination.rating || 0).toFixed(1)}</span>
        <span>✈️ Oferta activa</span>
        <span>${formatAdminCurrency(destination.price)}</span>
      </div>
      <div class="destination-actions">
        <button class="btn-secondary" type="button">Publicado</button>
        <button class="btn-danger" type="button" disabled>Demo</button>
      </div>
    </div>
  `;
  return card;
}

function buildPackageAdminRow(packageOffer) {
  const row = document.createElement('tr');
  row.dataset.dynamicOffer = packageOffer.id;
  row.innerHTML = `
    <td><strong>${packageOffer.name}</strong></td>
    <td>${packageOffer.destination}</td>
    <td>${packageOffer.duration || 'Por definir'}</td>
    <td>${packageOffer.includes || 'Vuelo + Hotel'}</td>
    <td>${formatAdminCurrency(packageOffer.price)}</td>
    <td>${packageOffer.available ?? 0}</td>
    <td><span class="badge success">Activo</span></td>
    <td>
      <button class="btn-icon" title="Publicado" type="button">✓</button>
    </td>
  `;
  return row;
}

async function loadAdminOffers() {
  try {
    const response = await fetch('/api/offers');
    const data = await response.json();

    if (!data.ok) {
      return;
    }

    const destinationGrid = document.querySelector('#destinos-section .destinations-grid');
    const packageTableBody = document.querySelector('#paquetes-section .data-table tbody');

    if (destinationGrid) {
      destinationGrid.querySelectorAll('[data-dynamic-offer]').forEach(node => node.remove());
      data.offers.destinations.forEach(destination => {
        destinationGrid.appendChild(buildDestinationAdminCard(destination));
      });
    }

    if (packageTableBody) {
      packageTableBody.querySelectorAll('[data-dynamic-offer]').forEach(node => node.remove());
      data.offers.packages.forEach(packageOffer => {
        packageTableBody.appendChild(buildPackageAdminRow(packageOffer));
      });
    }
  } catch (error) {
    console.warn('No se pudieron cargar las ofertas del admin.', error);
  }
}

function getFormPayload(form, type) {
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  payload.type = type;
  return payload;
}

function setupOfferForm(formId, type) {
  const form = document.getElementById(formId);

  if (!form) {
    return;
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    hideAdminFormMessage(form);

    try {
      const data = await adminRequest('/api/offers', getFormPayload(form, type));
      showAdminFormMessage(form, data.message, 'success');
      form.reset();
      await loadAdminOffers();
    } catch (error) {
      showAdminFormMessage(form, error.message.split('\n'), 'error');
    }
  });
}

function setupOfferManagement() {
  document.querySelectorAll('[data-toggle-admin-form]').forEach(button => {
    button.addEventListener('click', () => {
      const type = button.dataset.toggleAdminForm;
      const form = document.getElementById(type === 'destination' ? 'destinationForm' : 'packageForm');

      if (form) {
        form.hidden = !form.hidden;
      }
    });
  });

  document.querySelectorAll('[data-cancel-admin-form]').forEach(button => {
    button.addEventListener('click', () => {
      const type = button.dataset.cancelAdminForm;
      const form = document.getElementById(type === 'destination' ? 'destinationForm' : 'packageForm');

      if (form) {
        form.hidden = true;
        hideAdminFormMessage(form);
      }
    });
  });

  setupOfferForm('destinationForm', 'destination');
  setupOfferForm('packageForm', 'package');
  loadAdminOffers();
}
