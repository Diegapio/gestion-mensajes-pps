const express = require('express');
const db = require('../db');
const { requireLogin, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireLogin, requireAdmin, (req, res) => {
  const members = db.all("SELECT id, username, name, group_id FROM users WHERE role != 'admin' ORDER BY name");
  const groups = db.all('SELECT * FROM groups ORDER BY name').map((g) => ({
    ...g,
    members: members.filter((u) => u.group_id === g.id)
  }));
  const users = db
    .all(
      `SELECT u.id, u.username, u.name, g.name AS groupName
       FROM users u LEFT JOIN groups g ON g.id = u.group_id
       WHERE u.role != 'admin' ORDER BY u.name`
    )
    .map((u) => ({ ...u, groupName: u.groupName || null }));
  res.render('groups/list', { title: 'Grupos', groups, users });
});

router.post('/', requireLogin, requireAdmin, (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) {
    req.session.flash = { type: 'error', text: 'El nombre del grupo es obligatorio.' };
  } else if (db.get('SELECT 1 AS ok FROM groups WHERE name = ?', name)) {
    // la columna es COLLATE NOCASE: "Amigos" y "amigos" cuentan como el mismo nombre
    req.session.flash = { type: 'error', text: 'Ya existe un grupo con ese nombre.' };
  } else {
    db.run('INSERT INTO groups (name) VALUES (?)', name);
    req.session.flash = { type: 'ok', text: 'Grupo creado.' };
  }
  res.redirect('/groups');
});

// Asignar (o quitar) el grupo de un usuario. Solo un grupo por usuario.
router.post('/assign', requireLogin, requireAdmin, (req, res) => {
  const userId = parseInt(req.body.userId, 10);
  const user = db.get("SELECT id FROM users WHERE id = ? AND role != 'admin'", userId);
  const groupId = req.body.groupId ? parseInt(req.body.groupId, 10) : null;

  if (!user) {
    req.session.flash = { type: 'error', text: 'Usuario no válido.' };
  } else if (groupId && !db.get('SELECT 1 AS ok FROM groups WHERE id = ?', groupId)) {
    req.session.flash = { type: 'error', text: 'Grupo no válido.' };
  } else {
    db.run('UPDATE users SET group_id = ? WHERE id = ?', groupId, userId);
    req.session.flash = { type: 'ok', text: 'Grupo del usuario actualizado.' };
  }
  res.redirect('/groups');
});

router.post('/:id/delete', requireLogin, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const group = db.get('SELECT id FROM groups WHERE id = ?', id);

  if (!group) {
    req.session.flash = { type: 'error', text: 'El grupo no existe.' };
  } else if (db.get('SELECT 1 AS ok FROM users WHERE group_id = ?', id)) {
    req.session.flash = {
      type: 'error',
      text: 'No se puede borrar un grupo con usuarios. Mueve o da de baja a sus miembros primero.'
    };
  } else {
    db.run('DELETE FROM groups WHERE id = ?', id); // sus mensajes se borran en cascada
    req.session.flash = { type: 'ok', text: 'Grupo dado de baja.' };
  }
  res.redirect('/groups');
});

module.exports = router;
