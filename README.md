📊 Cuentas Claras - Gestión Financiera Personal

¡Bienvenido a Cuentas Claras! Esta es una aplicación web progresiva (PWA) diseñada para llevar un control total de tus ingresos y gastos de forma privada, rápida y visual. Sin registros en la nube, tus datos te pertenecen y viven solo en tu dispositivo.
✨ Características Principales

    🌓 Dual Theme: Modo oscuro profesional por defecto y un modo claro con paleta pastel de alto contraste.

    📅 Calendario Interactivo: Visualiza tus movimientos diarios con indicadores de color (verde para ingresos, rojo para gastos).

    📈 Gráficos Dinámicos: Distribución de gastos por categoría mediante gráficos de dona (Chart.js).

    📂 Categorías Personalizadas:

        🍔 Comida

        🏠 Local

        💰 Ventas

        ⚙️ Repuestos

        📦 Otros

    💾 Sistema de Guardado: Exporta e importa tus datos en formato JSON para copias de seguridad o para mover tus cuentas a otro dispositivo.

    📱 Experiencia PWA: Instálala en tu celular o PC y úsala sin conexión a internet (Modo Offline).

    ✏️ Gestión Completa (CRUD): Añade, edita y elimina transacciones con total facilidad.

🛠️ Tecnologías Utilizadas

Este proyecto fue construido priorizando la velocidad y la privacidad:

    HTML5 & CSS3: Diseño Mobile First con variables modernas y estética minimalista.

    JavaScript (Vanilla): Lógica pura sin frameworks pesados para un rendimiento óptimo.

    IndexedDB: Base de datos local en el navegador para persistencia de datos offline.

    Chart.js: Visualización de datos profesional.

    Service Workers: Para soporte offline y capacidades de instalación.

📂 Estructura del Proyecto
Plaintext

├── index.html              # Estructura principal de la app
├── estilos/                # Carpeta de estilos modularizados
│   ├── variables.css       # Colores y constantes
│   ├── base.css            # Reset y base
│   ├── layout.css          # Estructura y animaciones
│   ├── components.css      # Tarjetas y botones
│   ├── forms.css           # Formularios e inputs
│   ├── calendar.css        # Cuadrícula del calendario
│   ├── navbar.css          # Barra de navegación
│   └── theme.css           # Lógica de temas
├── database.js             # Motor de IndexedDB (CRUD)
├── ui.js                   # Lógica de la interfaz y gráficos
├── calendar.js             # Lógica del calendario interactivo
├── backup-system.js        # Sistema de exportación/importación JSON
├── app.js                  # Director de orquesta (Inicialización)
├── sw.js                   # Service Worker (Modo Offline)
├── sw-registration.js      # Registro del Service Worker
├── manifest.json           # Configuración de PWA
└── icons/                  # Iconos de la aplicación

🚀 Instalación y Uso

    Clona el repositorio:
    Bash

    git clone https://github.com/tu-usuario/cuentas-claras.git

    Abre el proyecto: Simplemente abre el archivo index.html en tu navegador o usa una extensión como Live Server.

    Despliegue: Sube tus cambios a GitHub y conéctalo con Vercel para tener tu URL personalizada gratis.

🔒 Seguridad de los Datos

Cuentas Claras prioriza tu privacidad:

    Los datos no se envían a ningún servidor.

    Todo se almacena en el almacenamiento local de tu navegador (IndexedDB).

    Al actualizar la aplicación, tus datos permanecen intactos gracias a la política de persistencia local del navegador.

🤝 Contribuciones

Si tenés ideas para mejorar el diseño o añadir funciones, ¡los Pull Requests son bienvenidos!

    Haz un Fork del proyecto.

    Crea una rama para tu mejora (git checkout -b feature/NuevaMejora).

    Haz un commit de tus cambios (git commit -m 'Añadida nueva funcionalidad').

    Haz un Push a la rama (git push origin feature/NuevaMejora).

    Abre un Pull Request.

Hecho por David Palacios [Elmouserojo]