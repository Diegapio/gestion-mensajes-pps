// Chat de grupo: envío sin recargar y consulta de mensajes nuevos cada 3 segundos.
// Si el JavaScript no funciona, el formulario sigue enviando con un POST normal.
(function () {
  var log = document.getElementById('chat-log');
  var form = document.getElementById('chat-form');
  var input = document.getElementById('chat-input');
  var errorBox = document.getElementById('chat-error');
  var lastId = parseInt(log.getAttribute('data-last-id'), 10) || 0;
  var lastDay = '';

  function fmt(iso) {
    var d = new Date(iso);
    var day = d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    var hour = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    return { day: day, hour: hour };
  }

  function stickToBottom() {
    return log.scrollHeight - log.scrollTop - log.clientHeight < 80;
  }

  function scrollDown() {
    log.scrollTop = log.scrollHeight;
  }

  // Rellena las horas de los mensajes que ya vienen pintados desde el servidor
  Array.prototype.forEach.call(log.querySelectorAll('time[data-iso]'), function (t) {
    var f = fmt(t.getAttribute('data-iso'));
    t.textContent = f.day + ' ' + f.hour;
  });

  function addMessage(m) {
    if (log.querySelector('[data-id="' + m.id + '"]')) return; // evita duplicados
    var empty = document.getElementById('chat-empty');
    if (empty) empty.remove();

    var row = document.createElement('div');
    row.className = 'msg ' + (m.mine ? 'mine' : 'other');
    row.setAttribute('data-id', m.id);

    var avatar;
    if (m.photo) {
      avatar = document.createElement('img');
      avatar.className = 'avatar sm';
      avatar.src = '/uploads/' + encodeURIComponent(m.photo);
      avatar.alt = '';
    } else {
      avatar = document.createElement('span');
      avatar.className = 'avatar sm placeholder';
      avatar.textContent = m.name.charAt(0).toUpperCase();
    }

    var bubble = document.createElement('div');
    bubble.className = 'bubble';
    if (!m.mine) {
      var author = document.createElement('div');
      author.className = 'author';
      author.textContent = m.name; // textContent: nunca se interpreta como HTML
      bubble.appendChild(author);
    }
    var text = document.createElement('div');
    text.className = 'text';
    text.textContent = m.body;
    bubble.appendChild(text);
    var when = document.createElement('time');
    when.className = 'when';
    var f = fmt(m.createdAt);
    when.textContent = f.day + ' ' + f.hour;
    bubble.appendChild(when);

    row.appendChild(avatar);
    row.appendChild(bubble);
    log.appendChild(row);
    if (m.id > lastId) lastId = m.id;
  }

  function poll() {
    fetch('/messages/poll?after=' + lastId, { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
      .then(function (r) {
        if (r.redirected || !r.ok) throw new Error('sesion');
        return r.json();
      })
      .then(function (data) {
        if (!data.messages.length) return;
        var down = stickToBottom();
        data.messages.forEach(addMessage);
        if (down) scrollDown();
      })
      .catch(function () {});
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var body = input.value.trim();
    if (!body) return;
    errorBox.hidden = true;
    fetch('/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      credentials: 'same-origin',
      body: new URLSearchParams({ body: body })
    })
      .then(function (r) {
        return r.json().then(function (j) {
          return { ok: r.ok, json: j };
        });
      })
      .then(function (res) {
        if (!res.ok) {
          errorBox.textContent = res.json.error || 'No se pudo enviar el mensaje.';
          errorBox.hidden = false;
          return;
        }
        input.value = '';
        input.style.height = '';
        poll();
        setTimeout(scrollDown, 150);
      })
      .catch(function () {
        errorBox.textContent = 'No se pudo enviar el mensaje. Comprueba la conexión o vuelve a iniciar sesión.';
        errorBox.hidden = false;
      });
  });

  // Enter envía, Shift+Enter hace salto de línea
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  input.addEventListener('input', function () {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 140) + 'px';
  });

  scrollDown();
  setInterval(poll, 3000);
})();
