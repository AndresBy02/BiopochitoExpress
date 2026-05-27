const crypto = require('crypto');
const fs = require('fs');
const fsp = require('fs/promises');
const http = require('http');
const path = require('path');

const PORT = Number(process.env.PORT || 3000);
const ROOT_DIR = __dirname;
const USERS_FILE = path.join(ROOT_DIR, 'database', 'usuarios.txt');
const OFFERS_FILE = path.join(ROOT_DIR, 'database', 'ofertas.json');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  const errors = [];
  const sequencePatterns = [
    '1234',
    '2345',
    '3456',
    '4567',
    '5678',
    '6789',
    'abcd',
    'bcde',
    'cdef',
    'qwerty',
    'asdf'
  ];

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

  if (!/[!@#$%^&*()\-_=+\[\]{}\\|;:'",.<>/?`~¡¿¬°¨´§¶©®™€£¥¢]/.test(password)) {
    errors.push('La contraseña debe incluir un símbolo permitido.');
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

  const normalizedPassword = password.toLowerCase();
  if (sequencePatterns.some(sequence => normalizedPassword.includes(sequence))) {
    errors.push('La contraseña no puede contener secuencias comunes como 1234, abcd, qwerty o asdf.');
  }

  return errors;
}

async function ensureUsersFile() {
  await fsp.mkdir(path.dirname(USERS_FILE), { recursive: true });

  if (!fs.existsSync(USERS_FILE)) {
    await fsp.writeFile(USERS_FILE, '', 'utf8');
  }
}

async function readUsers() {
  await ensureUsersFile();
  const content = await fsp.readFile(USERS_FILE, 'utf8');

  return content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

async function appendUser(user) {
  await ensureUsersFile();
  await fsp.appendFile(USERS_FILE, `${JSON.stringify(user)}\n`, 'utf8');
}

async function ensureOffersFile() {
  await fsp.mkdir(path.dirname(OFFERS_FILE), { recursive: true });

  if (!fs.existsSync(OFFERS_FILE)) {
    await fsp.writeFile(OFFERS_FILE, JSON.stringify({ destinations: [], packages: [] }, null, 2), 'utf8');
  }
}

async function readOffers() {
  await ensureOffersFile();
  const content = await fsp.readFile(OFFERS_FILE, 'utf8');

  if (!content.trim()) {
    return { destinations: [], packages: [] };
  }

  const parsedOffers = JSON.parse(content);
  return {
    destinations: Array.isArray(parsedOffers.destinations) ? parsedOffers.destinations : [],
    packages: Array.isArray(parsedOffers.packages) ? parsedOffers.packages : []
  };
}

async function writeOffers(offers) {
  await ensureOffersFile();
  await fsp.writeFile(OFFERS_FILE, JSON.stringify(offers, null, 2), 'utf8');
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';

    request.on('data', chunk => {
      body += chunk;

      if (body.length > 1024 * 1024) {
        reject(new Error('La solicitud es demasiado grande.'));
        request.destroy();
      }
    });

    request.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error('El JSON recibido no es válido.'));
      }
    });

    request.on('error', reject);
  });
}

async function handleRegister(request, response) {
  const body = await readRequestBody(request);
  const firstName = String(body.firstName || '').trim();
  const lastName = String(body.lastName || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const confirmPassword = String(body.confirmPassword || '');
  const errors = [];

  if (!firstName) {
    errors.push('Ingresa tu nombre.');
  }

  if (!lastName) {
    errors.push('Ingresa tu apellido.');
  }

  if (!email || !isValidEmail(email)) {
    errors.push('Ingresa un correo válido.');
  }

  if (password !== confirmPassword) {
    errors.push('Las contraseñas no coinciden.');
  }

  errors.push(...validatePassword(password));

  if (errors.length > 0) {
    sendJson(response, 400, { ok: false, errors });
    return;
  }

  const users = await readUsers();
  const emailExists = users.some(user => user.email === email);

  if (emailExists) {
    sendJson(response, 409, { ok: false, errors: ['Ya existe una cuenta registrada con ese correo.'] });
    return;
  }

  const newUser = {
    id: crypto.randomUUID(),
    firstName,
    lastName,
    email,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString()
  };

  await appendUser(newUser);
  sendJson(response, 201, {
    ok: true,
    message: 'Cuenta creada correctamente. Ya puedes iniciar sesión.',
    user: {
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email
    }
  });
}

async function handleLogin(request, response) {
  const body = await readRequestBody(request);
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (!email || !password) {
    sendJson(response, 400, { ok: false, errors: ['Ingresa correo y contraseña.'] });
    return;
  }

  if (email === 'admin' && password === 'admin') {
    sendJson(response, 200, {
      ok: true,
      message: 'Bienvenido, Admin.',
      redirectTo: '/src/views/admin/admin.html',
      user: {
        firstName: 'Admin',
        lastName: '',
        email: 'admin',
        role: 'admin'
      }
    });
    return;
  }

  if (email === 'agent' && password === 'agente') {
    sendJson(response, 200, {
      ok: true,
      message: 'Bienvenido, Agent.',
      redirectTo: '/src/views/agent/agent.html',
      user: {
        firstName: 'Agent',
        lastName: '',
        email: 'agent',
        role: 'agent'
      }
    });
    return;
  }

  const users = await readUsers();
  const user = users.find(currentUser => currentUser.email === email);

  if (!user || user.passwordHash !== hashPassword(password)) {
    sendJson(response, 401, { ok: false, errors: ['Correo o contraseña incorrectos.'] });
    return;
  }

  sendJson(response, 200, {
    ok: true,
    message: `Bienvenido, ${user.firstName}.`,
    user: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email
    }
  });
}

function parsePositiveNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

async function handleGetOffers(response) {
  const offers = await readOffers();
  sendJson(response, 200, { ok: true, offers });
}

async function handleCreateOffer(request, response) {
  const body = await readRequestBody(request);
  const type = String(body.type || '').trim();
  const errors = [];

  if (type !== 'destination' && type !== 'package') {
    errors.push('El tipo de oferta no es válido.');
  }

  const name = String(body.name || '').trim();
  const imageUrl = String(body.imageUrl || '').trim();
  const price = parsePositiveNumber(body.price);
  const rating = Math.min(5, Math.max(0, parsePositiveNumber(body.rating, 4.5)));

  if (!name) {
    errors.push('Ingresa el nombre.');
  }

  if (!imageUrl) {
    errors.push('Ingresa la URL de la imagen.');
  }

  try {
    if (imageUrl) {
      new URL(imageUrl);
    }
  } catch (error) {
    errors.push('La URL de la imagen no es válida.');
  }

  if (price <= 0) {
    errors.push('Ingresa un precio mayor a cero.');
  }

  if (errors.length > 0) {
    sendJson(response, 400, { ok: false, errors });
    return;
  }

  const offers = await readOffers();
  const createdAt = new Date().toISOString();

  if (type === 'destination') {
    const destination = {
      id: crypto.randomUUID(),
      type: 'destination',
      name,
      location: String(body.location || name).trim(),
      description: String(body.description || '').trim(),
      imageUrl,
      price,
      rating,
      createdAt
    };

    offers.destinations.push(destination);
    await writeOffers(offers);
    sendJson(response, 201, { ok: true, message: 'Destino creado correctamente.', offer: destination });
    return;
  }

  const packageOffer = {
    id: crypto.randomUUID(),
    type: 'package',
    name,
    destination: String(body.destination || '').trim(),
    duration: String(body.duration || '').trim(),
    includes: String(body.includes || '').trim(),
    imageUrl,
    price,
    rating,
    available: Math.round(parsePositiveNumber(body.available, 10)),
    createdAt
  };

  if (!packageOffer.destination) {
    sendJson(response, 400, { ok: false, errors: ['Ingresa el destino del paquete.'] });
    return;
  }

  offers.packages.push(packageOffer);
  await writeOffers(offers);
  sendJson(response, 201, { ok: true, message: 'Paquete creado correctamente.', offer: packageOffer });
}

async function serveStaticFile(request, response) {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const decodedPath = decodeURIComponent(requestUrl.pathname);
  const relativePath = decodedPath === '/' ? 'index.html' : decodedPath.slice(1);
  const filePath = path.normalize(path.join(ROOT_DIR, relativePath));

  if (!filePath.startsWith(ROOT_DIR)) {
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Acceso denegado.');
    return;
  }

  try {
    const fileBuffer = await fsp.readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, { 'Content-Type': mimeTypes[extension] || 'application/octet-stream' });
    response.end(fileBuffer);
  } catch (error) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Archivo no encontrado.');
  }
}

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === 'POST' && request.url === '/api/register') {
      await handleRegister(request, response);
      return;
    }

    if (request.method === 'POST' && request.url === '/api/login') {
      await handleLogin(request, response);
      return;
    }

    if (request.method === 'GET' && request.url === '/api/offers') {
      await handleGetOffers(response);
      return;
    }

    if (request.method === 'POST' && request.url === '/api/offers') {
      await handleCreateOffer(request, response);
      return;
    }

    if (request.method === 'GET') {
      await serveStaticFile(request, response);
      return;
    }

    sendJson(response, 405, { ok: false, errors: ['Método no permitido.'] });
  } catch (error) {
    sendJson(response, 500, { ok: false, errors: [error.message || 'Error interno del servidor.'] });
  }
});

ensureUsersFile().then(() => {
  server.listen(PORT, () => {
    console.log(`BiopochitoExpress listo en http://localhost:${PORT}`);
    console.log(`Usuarios guardados en ${USERS_FILE}`);
  });
});
