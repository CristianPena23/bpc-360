BPC 360 · Best Practices for Cybersecurity 360

Prototipo web educativo para aprender a protegerse en una ciudad conectada (Smart City). Nació como solución a un reto de la asignatura Gestión Empresarial de la Universidad Militar Nueva Granada y se enfoca en hábitos de ciberseguridad para ciudadanos sin conocimientos técnicos.

¿Qué incluye?
Página	Qué hace
index.html	Inicio y catálogo de módulos de aprendizaje
diagnostico.html	Diagnóstico de riesgo: cuestionario de hábitos (WiFi públicas, QR, etc.) con puntaje y resultado
modulo-sms.html	Módulo "Mensajes fraudulentos": qué es el smishing, señales de alerta, qué hacer y quiz
simulacion.html	Práctica: mensajes reales/falsos simulados; el usuario decide cuáles son fraude y recibe la explicación de las señales
progreso.html	Progreso, insignias y reinicio del avance
Enfoque de seguridad y diseño
Educación basada en escenarios: la simulación muestra SMS con remitente, contexto y señales de fraude (urgencia, enlaces, suplantación) y explica cada respuesta.
Privacidad por diseño: no hay backend ni cuentas; el progreso se guarda solo en localStorage del navegador y se puede borrar desde "Mi progreso".
Contenido separado del código: preguntas, quiz y mensajes viven en JSON (data/), por lo que se pueden ampliar sin tocar la lógica.
Accesibilidad: foco gestionado en resultados y diálogos, etiquetas ARIA y navegación por teclado.
Tecnologías

HTML5, CSS3 y JavaScript vanilla (sin frameworks ni dependencias).

Estructura
├── index.html, diagnostico.html, modulo-sms.html, simulacion.html, progreso.html
├── css/      estilos por página
├── js/       lógica por página + storage.js (progreso) y nav.js (navegación)
├── data/     preguntas-diagnostico.json, quiz-sms.json, mensajes-simulacion.json
└── assets/   imágenes y video
Ejecutar localmente

No requiere instalación. Clona el repositorio y abre index.html, o sirve la carpeta:

bash
git clone https://github.com/CristianPena23/bpc-360.git
cd bpc-360
python3 -m http.server 8000   # abre http://localhost:8000
Estado y siguientes pasos

Prototipo funcional con el módulo de mensajes fraudulentos. Pendiente: módulos de QR y WiFi pública, que reutilizan la misma estructura de datos y las insignias del progreso.

Equipo

Nikol Sofía Forero Borja, Andrés Edilson Briceño Monroy, Cristian Camilo Peña Garzón, Camilo Alejandro Trujillo Muñoz y Samuel Dali González Vargas.

Proyecto académico, Universidad Militar Nueva Granada.
