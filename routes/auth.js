const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  res.redirect(req.user ? '/users' : '/login');
});

router.get('/login', (req, res) => {
  if (req.user) return res.redirect('/users');
  res.render('login', { title: 'Iniciar sesión' });
});

router.post('/login', (req, res) => {
  const username = (req.body.username || '').trim();
  const password = req.body.password || '';
  const user = db.get('SELECT * FROM users WHERE username = ?', username);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    req.session.flash = { type: 'error', text: 'Usuario o contraseña incorrectos.' };
    return res.redirect('/login');
  }

  req.session.regenerate((err) => {
    if (err) return res.redirect('/login');
    req.session.userId = user.id;
    res.redirect('/users');
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
