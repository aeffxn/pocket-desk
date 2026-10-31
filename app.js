(function () {
  var tokenKey = 'pocket-desk-session';
  var token = '';
  var notes = [];
  var pairScreen = document.getElementById('pair-screen');
  var deskScreen = document.getElementById('desk-screen');
  var pairError = document.getElementById('pair-error');
  var notesMessage = document.getElementById('notes-message');
  var noteList = document.getElementById('note-list');
  var noteForm = document.getElementById('note-form');
  var noteSearch = document.getElementById('note-search');

  function readToken() {
    try { return window.localStorage.getItem(tokenKey) || ''; }
    catch (error) { return ''; }
  }

  function saveToken(value) {
    try { window.localStorage.setItem(tokenKey, value); } catch (error) {}
  }

  function clearToken() {
    token = '';
    try { window.localStorage.removeItem(tokenKey); } catch (error) {}
  }

  function showDesk(connected) {
    pairScreen.style.display = connected ? 'none' : 'block';
    deskScreen.style.display = connected ? 'block' : 'none';
  }

  function request(method, path, data, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, path, true);
    xhr.setRequestHeader('Accept', 'application/json');
    if (token) xhr.setRequestHeader('Authorization', 'Bearer ' + token);
    if (data !== null) xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onreadystatechange = function () {
      var result;
      if (xhr.readyState !== 4) return;
      try { result = xhr.responseText ? JSON.parse(xhr.responseText) : {}; }
      catch (error) { result = { error: 'The laptop sent an unreadable response.' }; }
      if (xhr.status === 401) {
        clearToken();
        showDesk(false);
        pairError.innerHTML = 'This session ended. Enter the current code from the laptop to pair again.';
        return;
      }
      callback(xhr.status, result);
    };
    xhr.onerror = function () {
      callback(0, { error: 'The laptop is not answering. Check that Pocket Desk is still running on the same Wi-Fi.' });
    };
    xhr.send(data === null ? null : JSON.stringify(data));
  }

  function text(node, value) { node.textContent = value; }

  function formatDate(value) {
    var date = new Date(value);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString();
  }

  function setPanel(name) {
    var panels = ['notes-panel', 'files-panel', 'photo-panel', 'device-panel', 'voice-panel'];
    var i;
    var panel;
    var tabs = document.getElementsByClassName('tool-tab');
    for (i = 0; i < panels.length; i += 1) {
      panel = document.getElementById(panels[i]);
      panel.style.display = panels[i] === name ? 'block' : 'none';
    }
    for (i = 0; i < tabs.length; i += 1) {
      tabs[i].className = tabs[i].getAttribute('data-panel') === name ? 'tool-tab active' : 'tool-tab';
    }
    if (name === 'files-panel') loadFiles('');
    if (name === 'notes-panel') loadNotes();
    if (name === 'photo-panel') checkPhotoSetting();
    if (name === 'device-panel') loadDevice();
  }

  function renderNotes() {
    var query = noteSearch.value.toLowerCase().replace(/^\s+|\s+$/g, '');
    var i;
    var item;
    var haystack;
    var row;
    var title;
    var date;
    var body;
    var actions;
    var edit;
    var remove;
    var shown = 0;
    while (noteList.firstChild) noteList.removeChild(noteList.firstChild);
    for (i = 0; i < notes.length; i += 1) {
      item = notes[i];
      haystack = (item.title + ' ' + item.body).toLowerCase();
      if (query && haystack.indexOf(query) === -1) continue;
      row = document.createElement('li');
      row.className = 'note-card';
      title = document.createElement('h3');
      title.className = 'note-title';
      text(title, item.title || 'Untitled scrap');
      date = document.createElement('p');
      date.className = 'note-date';
      text(date, formatDate(item.updated));
      body = document.createElement('p');
      body.className = 'note-body';
      text(body, item.body);
      actions = document.createElement('div');
      actions.className = 'note-actions';
      edit = document.createElement('button');
      edit.className = 'small-action';
      edit.type = 'button';
      edit.setAttribute('data-edit', item.id);
      text(edit, 'Edit');
      remove = document.createElement('button');
      remove.className = 'small-action remove';
      remove.type = 'button';
      remove.setAttribute('data-remove', item.id);
      text(remove, 'Delete');
      actions.appendChild(edit);
      actions.appendChild(remove);
      row.appendChild(title);
      row.appendChild(date);
      row.appendChild(body);
      row.appendChild(actions);
      noteList.appendChild(row);
      shown += 1;
    }
    if (!shown) {
      row = document.createElement('li');
      row.className = 'quiet-message';
      text(row, query ? 'No notes match that search.' : 'A clear desk. Add the first note when something is worth keeping.');
      noteList.appendChild(row);
    }
  }

  function loadNotes() {
    request('GET', '/api/notes', null, function (status, result) {
      if (status === 200) {
        notes = result.notes || [];
        text(notesMessage, 'Saved on the laptop · ' + notes.length + (notes.length === 1 ? ' note' : ' notes'));
        renderNotes();
      } else text(notesMessage, result.error || 'Could not load notes.');
    });
  }

  function resetNoteForm() {
    document.getElementById('note-id').value = '';
    document.getElementById('note-title').value = '';
    document.getElementById('note-body').value = '';
    document.getElementById('note-error').innerHTML = '';
  }

  function loadFiles(directory) {
    var url = '/api/files';
    var fileList = document.getElementById('file-list');
    var message = document.getElementById('files-message');
    if (directory) url += '?dir=' + encodeURIComponent(directory);
    text(message, 'Opening the shelf…');
    request('GET', url, null, function (status, result) {
      var i;
      var row;
      var link;
      var kind;
      var back;
      while (fileList.firstChild) fileList.removeChild(fileList.firstChild);
      if (status !== 200) { text(message, result.error || 'Could not open the shared folder.'); return; }
      text(document.getElementById('file-path'), result.display_path || 'Shared folder');
      text(message, result.items.length ? 'Read-only shelf · ' + result.items.length + ' items' : 'This folder is empty.');
      if (directory) {
        back = document.createElement('button');
        back.type = 'button';
        back.className = 'back-folder';
        back.setAttribute('data-parent', parentPath(directory));
        text(back, '← One folder up');
        row = document.createElement('li');
        row.className = 'file-row';
        row.appendChild(back);
        fileList.appendChild(row);
      }
      for (i = 0; i < result.items.length; i += 1) {
        row = document.createElement('li');
        row.className = 'file-row';
        kind = document.createElement('span');
        kind.className = 'file-kind';
        if (result.items[i].type === 'folder') {
          link = document.createElement('button');
          link.type = 'button';
          link.className = 'folder-button';
          link.setAttribute('data-folder', result.items[i].path);
          text(link, '▱  ' + result.items[i].name);
          text(kind, 'FOLDER');
        } else {
          link = document.createElement('a');
          link.className = 'file-link';
          link.href = '/api/files/download?path=' + encodeURIComponent(result.items[i].path);
          link.setAttribute('data-download', 'yes');
          text(link, '↓  ' + result.items[i].name);
          text(kind, result.items[i].size_label);
        }
        link.appendChild(kind);
        row.appendChild(link);
        fileList.appendChild(row);
      }
    });
  }

  function parentPath(value) {
    var bits = value.split('/');
    bits.pop();
    return bits.join('/');
  }

  function checkPhotoSetting() {
    request('GET', '/api/uploads/status', null, function (status, result) {
      var enabled = status === 200 && result.photos_enabled;
      document.getElementById('photo-state').textContent = enabled ? 'READY' : 'OFF';
      document.getElementById('photo-disabled').style.display = enabled ? 'none' : 'block';
      document.getElementById('photo-file').disabled = !enabled;
    });
  }

  function loadDevice() {
    var reading = document.getElementById('battery-reading');
    text(reading, 'Checking the laptop…');
    request('GET', '/api/device', null, function (status, result) {
      if (status !== 200 || !result.available) {
        text(reading, 'No battery reading is available.');
        text(document.getElementById('battery-detail'), 'The laptop may be a desktop, or Windows may not report battery information.');
      } else {
        text(reading, result.percent + '%');
        text(document.getElementById('battery-detail'), result.on_ac_power === null ? 'Windows could not tell whether the laptop is plugged in.' : (result.on_ac_power ? 'Plugged into power.' : 'Running on battery.'));
      }
    });
  }

  document.getElementById('refresh-device').addEventListener('click', loadDevice);
  document.getElementById('photo-file').addEventListener('change', function () {
    var file = this.files && this.files[0];
    var reader;
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { text(document.getElementById('photo-message'), 'Choose an image smaller than 8 MB.'); return; }
    if (!/^image\/(jpeg|png|gif)$/i.test(file.type)) { text(document.getElementById('photo-message'), 'Choose a JPEG, PNG, or GIF image.'); return; }
    if (!window.confirm('Send “' + file.name + '” to the photo folder chosen on the laptop?')) { this.value = ''; return; }
    reader = new FileReader();
    reader.onload = function () {
      request('POST', '/api/photos', { data: reader.result }, function (status, result) {
        text(document.getElementById('photo-message'), status === 201 ? 'Saved as ' + result.saved : (result.error || 'Could not save the photo.'));
        document.getElementById('photo-file').value = '';
      });
    };
    reader.onerror = function () { text(document.getElementById('photo-message'), 'Safari could not read that image.'); };
    reader.readAsDataURL(file);
  });

  document.getElementById('pair-form').addEventListener('submit', function (event) {
    var code = document.getElementById('pair-code').value.replace(/\s/g, '');
    event.preventDefault();
    text(pairError, 'Checking the laptop code…');
    request('POST', '/api/pair', { code: code }, function (status, result) {
      if (status === 200 && result.token) {
        token = result.token;
        saveToken(token);
        text(pairError, '');
        showDesk(true);
        loadNotes();
      } else text(pairError, result.error || 'That code did not work. Check the laptop control page.');
    });
  });

  document.getElementById('disconnect-button').addEventListener('click', function () {
    request('POST', '/api/unpair', {}, function (status) {
      clearToken();
      showDesk(false);
      text(pairError, status === 200 ? 'Disconnected. Ask the laptop for the current code when you want to return.' : 'Disconnected on this iPad. The laptop owner can clear the session from the control page.');
    });
  });

  document.getElementById('new-note').addEventListener('click', function () {
    resetNoteForm();
    noteForm.style.display = 'block';
    document.getElementById('note-title').focus();
  });

  document.getElementById('cancel-note').addEventListener('click', function () {
    noteForm.style.display = 'none';
    resetNoteForm();
  });

  noteForm.addEventListener('submit', function (event) {
    var id = document.getElementById('note-id').value;
    var data = { title: document.getElementById('note-title').value, body: document.getElementById('note-body').value };
    event.preventDefault();
    if (!data.body.replace(/^\s+|\s+$/g, '')) { text(document.getElementById('note-error'), 'Write a little something before saving.'); return; }
    request(id ? 'PUT' : 'POST', id ? '/api/notes/' + encodeURIComponent(id) : '/api/notes', data, function (status, result) {
      if (status === 200 || status === 201) {
        noteForm.style.display = 'none';
        resetNoteForm();
        text(notesMessage, 'Saved on the laptop.');
        loadNotes();
      } else text(document.getElementById('note-error'), result.error || 'Could not save this note.');
    });
  });

  noteSearch.addEventListener('input', renderNotes);

  noteList.addEventListener('click', function (event) {
    var id = event.target.getAttribute('data-edit') || event.target.getAttribute('data-remove');
    var action = event.target.getAttribute('data-edit') ? 'edit' : (event.target.getAttribute('data-remove') ? 'remove' : '');
    var i;
    if (!id || !action) return;
    for (i = 0; i < notes.length; i += 1) {
      if (notes[i].id !== id) continue;
      if (action === 'edit') {
        document.getElementById('note-id').value = notes[i].id;
        document.getElementById('note-title').value = notes[i].title;
        document.getElementById('note-body').value = notes[i].body;
        noteForm.style.display = 'block';
        document.getElementById('note-title').focus();
      } else if (window.confirm('Remove this note from the laptop?')) {
        request('DELETE', '/api/notes/' + encodeURIComponent(id), null, function (status, result) {
          if (status === 200) loadNotes();
          else text(notesMessage, result.error || 'Could not remove this note.');
        });
      }
      break;
    }
  });

  document.getElementsByClassName('tool-tabs')[0].addEventListener('click', function (event) {
    var target = event.target;
    var name = '';
    while (target && target !== this) {
      name = target.getAttribute && target.getAttribute('data-panel');
      if (name) break;
      target = target.parentNode;
    }
    if (name) setPanel(name);
  });

  document.getElementById('file-list').addEventListener('click', function (event) {
    var target = event.target;
    var directory = null;
    var parent = null;
    while (target && target !== this) {
      if (target.getAttribute) {
        directory = target.getAttribute('data-folder');
        parent = target.getAttribute('data-parent');
        if (directory !== null || parent !== null) break;
      }
      target = target.parentNode;
    }
    if (directory !== null) loadFiles(directory);
    else if (parent !== null) loadFiles(parent);
  });

  token = readToken();
  if (token) {
    showDesk(true);
    loadNotes();
  } else showDesk(false);
}());
