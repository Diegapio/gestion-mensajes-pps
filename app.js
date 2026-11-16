const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./db');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'cambia-este-secreto',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 4 }
  })
);

// Usuario actual y mensajes flash disponibles en todas las vistas
app.use((req, res, next) => {
  req.user = null;
  if (req.session.userId) {
    req.user = db.get('SELECT * FROM users WHERE id = ?', req.session.userId) || null;
    if (!req.user) req.session.userId = null;
  }
  res.locals.currentUser = req.user;
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  next();
});

app.use('/', require('./routes/auth'));
app.use('/users', require('./routes/users'));
app.use('/groups', require('./routes/groups'));
app.use('/messages', require('./routes/messages'));

app.use((req, res) => {
  res.status(404).render('error', { title: 'No encontrado', message: 'La página no existe.' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', { title: 'Error', message: 'Ha ocurrido un error inesperado.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
