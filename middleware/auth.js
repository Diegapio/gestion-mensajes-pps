function requireLogin(req, res, next) {
  if (!req.user) {
    req.session.flash = { type: 'error', text: 'Debes iniciar sesión.' };
    return res.redirect('/login');
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res
      .status(403)
      .render('error', { title: 'Acceso denegado', message: 'Solo el administrador puede hacer esto.' });
  }
  next();
}

// Usuario normal que pertenece a un grupo (necesario para el chat)
function requireGroupMember(req, res, next) {
  if (req.user.role === 'admin') {
    req.session.flash = { type: 'error', text: 'El administrador no participa en el chat.' };
    return res.redirect('/users');
  }
  if (!req.user.group_id) {
    req.session.flash = { type: 'error', text: 'No perteneces a ningún grupo todavía.' };
    return res.redirect('/users');
  }
  next();
}

module.exports = { requireLogin, requireAdmin, requireGroupMember };
