function getAuthFormMessage(form) {
  return form.querySelector('[data-auth-message]');
}

function showAuthMessage(form, messages, type) {
  const messageBox = getAuthFormMessage(form);
  const messageList = Array.isArray(messages) ? messages : [messages];

  if (!messageBox) {
    return;
  }

  messageBox.className = `auth-message ${type}`;
  messageBox.innerHTML = messageList.map(message => `<p>${message}</p>`).join('');
  messageBox.hidden = false;
}

function clearAuthMessage(form) {
  const messageBox = getAuthFormMessage(form);

  if (!messageBox) {
    return;
  }

  messageBox.hidden = true;
  messageBox.innerHTML = '';
}

async function sendAuthRequest(url, payload) {
  if (window.location.protocol === 'file:') {
    throw new Error('Abre el proyecto desde http://localhost:3000 para poder crear cuentas e iniciar sesión.');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const responseText = await response.text();
  let data = null;

  if (!responseText.trim()) {
    throw new Error('El servidor no devolvió respuesta. Verifica que node server.js esté corriendo.');
  }

  try {
    data = JSON.parse(responseText);
  } catch (error) {
    throw new Error('La respuesta del servidor no fue válida. Abre la página desde http://localhost:3000 y no desde Live Server ni doble clic.');
  }

  if (!response.ok || !data.ok) {
    throw new Error((data.errors || ['No se pudo completar la solicitud.']).join('\n'));
  }

  return data;
}

function getPasswordErrors(password) {
  const errors = [];
  const hasSymbol = /[!@#$%^&*()\-_=+\[\]{}\\|;:'",.<>/?`~¡¿¬°¨´§¶©®™€£¥¢]/.test(password);
  const commonSequences = ['1234', '2345', '3456', '4567', '5678', '6789', 'abcd', 'bcde', 'cdef', 'qwerty', 'asdf'];
  const normalizedPassword = password.toLowerCase();

  if (password.length < 8) {
    errors.push('La contraseña debe tener mínimo 8 caracteres.');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('La contraseña debe incluir una mayúscula.');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('La contraseña debe incluir una minúscula.');
  }

  if (!/\d/.test(password)) {
    errors.push('La contraseña debe incluir un número.');
  }

  if (!hasSymbol) {
    errors.push('La contraseña debe incluir un símbolo.');
  }

  if (/\s/.test(password)) {
    errors.push('La contraseña no puede tener espacios.');
  }

  if (/(.)\1{3,}/.test(password)) {
    errors.push('La contraseña no puede repetir el mismo carácter 4 veces seguidas.');
  }

  if (/^[!@#$%^&*()\-_=+\[\]{}\\|;:'",.<>/?`~¡¿¬°¨´§¶©®™€£¥¢]+$/.test(password)) {
    errors.push('La contraseña no puede estar formada solo por símbolos.');
  }

  if (commonSequences.some(sequence => normalizedPassword.includes(sequence))) {
    errors.push('La contraseña no puede contener secuencias comunes como 1234, abcd, qwerty o asdf.');
  }

  return errors;
}

function setupRegisterForm() {
  const registerForm = document.getElementById('registerForm');

  if (!registerForm) {
    return;
  }

  registerForm.addEventListener('submit', async event => {
    event.preventDefault();
    clearAuthMessage(registerForm);

    const payload = {
      firstName: registerForm.firstName.value.trim(),
      lastName: registerForm.lastName.value.trim(),
      email: registerForm.email.value.trim(),
      password: registerForm.password.value,
      confirmPassword: registerForm.confirmPassword.value
    };
    const errors = [];

    if (!payload.firstName) {
      errors.push('Ingresa tu nombre.');
    }

    if (!payload.lastName) {
      errors.push('Ingresa tu apellido.');
    }

    if (!payload.email) {
      errors.push('Ingresa tu correo electrónico.');
    }

    if (payload.password !== payload.confirmPassword) {
      errors.push('Las contraseñas no coinciden.');
    }

    errors.push(...getPasswordErrors(payload.password));

    if (!registerForm.terms.checked) {
      errors.push('Acepta los términos y la política de privacidad.');
    }

    if (errors.length > 0) {
      showAuthMessage(registerForm, errors, 'error');
      return;
    }

    try {
      const data = await sendAuthRequest('/api/register', payload);
      showAuthMessage(registerForm, `${data.message} Te llevaremos al inicio de sesión.`, 'success');
      registerForm.reset();

      setTimeout(() => {
        window.location.href = 'inicio.html';
      }, 1200);
    } catch (error) {
      showAuthMessage(registerForm, error.message.split('\n'), 'error');
    }
  });
}

function setupLoginForm() {
  const loginForm = document.getElementById('loginForm');

  if (!loginForm) {
    return;
  }

  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    clearAuthMessage(loginForm);

    const payload = {
      email: loginForm.email.value.trim(),
      password: loginForm.password.value
    };

    try {
      const data = await sendAuthRequest('/api/login', payload);
      localStorage.setItem('usuarioActivo', JSON.stringify(data.user));
      showAuthMessage(loginForm, `${data.message} Te llevaremos a tu panel.`, 'success');

      setTimeout(() => {
        window.location.href = data.redirectTo || '../../../index.html';
      }, 900);
    } catch (error) {
      showAuthMessage(loginForm, error.message.split('\n'), 'error');
    }
  });
}

function setupActiveUserGreeting() {
  const accountText = document.getElementById('accountText');
  const accountLinkMobile = document.getElementById('accountLinkMobile');
  const logoutButton = document.getElementById('logoutButton');
  const logoutButtonMobile = document.getElementById('logoutButtonMobile');
  const storedUser = localStorage.getItem('usuarioActivo');

  if (!storedUser || (!accountText && !accountLinkMobile)) {
    return;
  }

  try {
    const user = JSON.parse(storedUser);
    const firstName = user.firstName || user.email || 'usuario';
    const greeting = `Bienvenido, ${firstName}`;
    const accountTargets = [
      accountText,
      accountLinkMobile,
      ...document.querySelectorAll('.header-actions .btn-account span, .nav-mobile .btn-account span')
    ].filter(Boolean);

    accountTargets.forEach(target => {
      target.textContent = greeting;
    });

    if (logoutButton) {
      logoutButton.hidden = false;
    }

    if (logoutButtonMobile) {
      logoutButtonMobile.hidden = false;
    }
  } catch (error) {
    localStorage.removeItem('usuarioActivo');
  }
}

function setupAccountButtonsNavigation() {
  const accountButtons = document.querySelectorAll('button.btn-account');

  accountButtons.forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      window.location.href = 'inicio.html';
    });
  });
}

function closeUserSession() {
  localStorage.removeItem('usuarioActivo');
  window.location.href = getHomePath();
}

function getHomePath() {
  const pathname = window.location.pathname.replace(/\\/g, '/');

  if (pathname.includes('/src/views/admin/') || pathname.includes('/src/views/agent/')) {
    return '../../../index.html';
  }

  if (pathname.includes('/src/views/client/')) {
    return '../../../index.html';
  }

  return 'index.html';
}

function setupLogoutButtons() {
  const logoutButtons = document.querySelectorAll('#logoutButton, #logoutButtonMobile');

  logoutButtons.forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      closeUserSession();
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupRegisterForm();
  setupLoginForm();
  setupAccountButtonsNavigation();
  setupActiveUserGreeting();
  setupLogoutButtons();
});
