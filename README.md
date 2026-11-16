# Gestión de usuarios, grupos y chat de grupo (Node.js + Express + SQLite)

Aplicación web con login, alta/baja de usuarios (con foto), alta/baja de grupos, listado de usuarios y un chat de grupo (estilo WhatsApp/Teams): cada grupo tiene su chat y todos sus miembros pueden escribir y leer.

## Puesta en marcha

```bash
git clone <URL_DEL_REPO>
cd gestion-usuarios
npm install
npm start
```

Abre http://localhost:3000. Administrador por defecto: `admin` / `admin123`
(se puede cambiar antes del primer arranque con la variable `ADMIN_PASSWORD`).

La base de datos es un fichero SQLite (`data/app.db`) que se crea solo en el primer arranque, con las tablas y el administrador. Para empezar de cero, para el servidor y borra la carpeta `data/`. Las fotos se guardan en `uploads/`. Ambas carpetas están en `.gitignore`.

Motor SQLite: se usa `better-sqlite3` (dependencia opcional). Si no se pudo instalar, la aplicación usa automáticamente el SQLite integrado de Node 22.5 o superior.

## Reglas de negocio

- Solo el administrador da de alta/baja usuarios y grupos, y asigna usuarios a grupos.
- Un usuario pertenece como máximo a **un** grupo (`users.group_id`).
- El chat es del grupo: cada usuario ve y escribe únicamente en el chat de su grupo. El servidor toma el grupo de la sesión, no del formulario, así que no se puede leer ni escribir en otro grupo.
- El administrador no participa en los chats.
- Un grupo con miembros no se puede borrar. Al borrar un grupo vacío se borran sus mensajes.
- Al dar de baja a un usuario se borra su foto y sus mensajes se conservan como "Usuario eliminado".

## Base de datos

| Tabla | Columnas |
|---|---|
| `groups` | `id`, `name` (único, sin distinguir mayúsculas) |
| `users` | `id`, `username` (único), `name`, `email`, `password_hash`, `role` (`admin`/`user`), `group_id` → groups, `photo` |
| `messages` | `id`, `group_id` → groups (cascade), `user_id` → users (set null), `body`, `created_at` |

## Estructura

```
app.js                 Configuración de Express, sesión y rutas
db.js                  SQLite: tablas, administrador por defecto y ayudas get/all/run
middleware/auth.js     requireLogin, requireAdmin, requireGroupMember
routes/auth.js         Login / logout
routes/users.js        Listado, alta (con foto) y baja de usuarios
routes/groups.js       Alta/baja de grupos y asignación de usuarios
routes/messages.js     Chat de grupo: pantalla, envío y consulta de mensajes nuevos
views/                 Plantillas EJS (partials, users, groups, messages/chat)
public/css/style.css   Estilos
public/js/chat.js      Envío sin recargar y refresco del chat cada 3 segundos
uploads/               Fotos de usuario
```

## Reparto de tareas (3 personas)

| Persona | Tarea | Ficheros | Rama |
|---|---|---|---|
| A | Base del proyecto, SQLite, login/logout, layout y CSS | `app.js`, `db.js`, `middleware/auth.js`, `routes/auth.js`, `views/login.ejs`, `views/error.ejs`, `views/partials/*`, `public/css/style.css` | `feature/base-login` |
| B | Usuarios (alta/baja, foto, listado) y grupos (alta/baja, asignación) | `routes/users.js`, `routes/groups.js`, `views/users/*`, `views/groups/*` | `feature/usuarios-grupos` |
| C | Chat de grupo | `routes/messages.js`, `views/messages/chat.ejs`, `public/js/chat.js` | `feature/chat-grupo` |

Dependencias: B y C necesitan la base de A (sesión, `db.js`, middleware y layout). Por eso A sube primero a `main` el esqueleto y B y C parten de ahí.

## Flujo de Git

1. **A** crea el repo en GitHub, sube el esqueleto a `main` y añade a B y C como colaboradores.
2. B y C: `git clone` y `npm install`.
3. Cada uno trabaja en su rama:
   ```bash
   git checkout -b feature/<nombre>
   git add .
   git commit -m "feat: descripción corta"
   git push -u origin feature/<nombre>
   ```
4. Se abre un Pull Request hacia `main`; otro compañero lo revisa y se hace merge.
5. Antes de seguir, cada uno actualiza: `git checkout main && git pull`.
6. Commits pequeños y frecuentes, con mensajes claros (`feat:`, `fix:`, `docs:`).

## Prueba manual recomendada

1. Entrar como `admin`, crear dos grupos (A y B).
2. Crear 3 usuarios: dos en el grupo A y uno en el grupo B (uno con foto).
3. Con una ventana normal y otra de incógnito, entrar como los dos usuarios del grupo A y escribirse en el chat: los mensajes aparecen en ambos en pocos segundos.
4. Entrar como el usuario del grupo B: su chat está vacío y no ve nada del grupo A.
5. Dar de baja un usuario (sus mensajes siguen con "Usuario eliminado") y un grupo vacío.
