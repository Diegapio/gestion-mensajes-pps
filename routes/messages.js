// Chat de grupo (estilo WhatsApp / Teams): cada usuario ve y escribe en el chat de SU grupo.
// El grupo se toma siempre del usuario de la sesión, nunca de lo que envíe el navegador,
// así que nadie puede leer ni escribir en un grupo ajeno.
const express = require('express');
const db = require('../db');
const { requireLogin, requireGroupMember } = require('../middleware/auth');

const router = express.Router();
router.use(requireLogin, requireGroupMember);

const MAX_LEN = 2000;
const HISTORY = 200; // mensajes que se muestran al abrir el chat

const SELECT_MESSAGES = `
  SELECT m.id, m.user_id, m.body, m.created_at, u.name, u.photo
  FROM messages m LEFT JOIN users u ON u.id = m.user_id
  WHERE m.group_id = ?`;

function toView(m, me) {
  return {
    id: m.id,
    mine: m.user_id === me.id,
    name: m.name || 'Usuario eliminado',
    photo: m.photo || null,
    body: m.body,
    createdAt: m.created_at
  };
}

// Pantalla del chat
router.get('/', (req, res) => {
  const group = db.get('SELECT * FROM groups WHERE id = ?', req.user.group_id);
  const members = db.all('SELECT name FROM users WHERE group_id = ? ORDER BY name', req.user.group_id);
  const rows = db
    .all(`${SELECT_MESSAGES} ORDER BY m.id DESC LIMIT ?`, req.user.group_id, HISTORY)
    .reverse()
    .map((m) => toView(m, req.user));
  res.render('messages/chat', {
    title: `Chat · ${group.name}`,
    group,
    members,
    messages: rows,
    lastId: rows.length ? rows[rows.length - 1].id : 0,
    maxLen: MAX_LEN
  });
});

// Mensajes nuevos desde un id (lo consulta el navegador cada pocos segundos)
router.get('/poll', (req, res) => {
  const after = parseInt(req.query.after, 10) || 0;
  const rows = db
    .all(`${SELECT_MESSAGES} AND m.id > ? ORDER BY m.id LIMIT 200`, req.user.group_id, after)
    .map((m) => toView(m, req.user));
  res.json({ messages: rows });
});

// Enviar un mensaje al grupo
router.post('/', (req, res) => {
  const body = (req.body.body || '').trim();
  const wantsJson = (req.get('accept') || '').includes('application/json');

  if (!body) {
    if (wantsJson) return res.status(400).json({ error: 'El mensaje está vacío.' });
    req.session.flash = { type: 'error', text: 'El mensaje está vacío.' };
    return res.redirect('/messages');
  }
  if (body.length > MAX_LEN) {
    const error = `El mensaje no puede superar los ${MAX_LEN} caracteres.`;
    if (wantsJson) return res.status(400).json({ error });
    req.session.flash = { type: 'error', text: error };
    return res.redirect('/messages');
  }

  const r = db.run(
    'INSERT INTO messages (group_id, user_id, body, created_at) VALUES (?, ?, ?, ?)',
    req.user.group_id,
    req.user.id,
    body,
    new Date().toISOString()
  );
  if (wantsJson) return res.json({ ok: true, id: r.id });
  res.redirect('/messages');
});

module.exports = router;
