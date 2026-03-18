nombre-del-proyecto/
│
├── docs/                       # Documentación del proyecto (PDFs, Word)
│   ├── diagramas/              # UML: Casos de uso, Secuencia, Clases, Navegación
│   ├── base-de-datos/          # Diagrama Entidad-Relación y Modelo Relacional
│   └── manuales/               # Manual de usuario e instalación
│
├── design/                     # Prototipos y Diseño
│   └── figma-links.md          # Enlaces a los tableros de Figma y capturas
│
├── database/                   # Todo lo relacionado con PostgreSQL
│   ├── scripts_creacion.sql    # DDL: Creación de tablas
│   └── scripts_datos.sql       # DML: Datos de prueba (Inserts)
│
├── src/                        # Código fuente de la aplicación (MVC)
│   ├── config/                 # Conexión a la BD y variables globales
│   ├── controllers/            # Lógica de negocio (Intermediarios)
│   ├── models/                 # Lógica de datos (Consultas SQL)
│   ├── views/                  # Interfaz de usuario (HTML, plantillas)
│   │   ├── admin/              # Vistas para el Súper Administrador
│   │   ├── agent/              # Vistas para el Agente de Aerolínea
│   │   ├── client/             # Vistas para el Cliente
│   │   └── shared/             # Componentes repetitivos (Navbar, Footer)
│   │
│   └── public/                 # Archivos accesibles públicamente
│       ├── css/                # Archivos Bootstrap / Flexbox
│       ├── js/                 # Scripts de JavaScript (validaciones, fetch)
│       └── img/                # Imágenes y logos
│
├── .gitignore                  # Archivos que Git debe ignorar (ej: node_modules)
├── README.md                   # Descripción general, equipo y guía rápida
└── index.php / index.js        # Punto de entrada de la aplicación