(function () {
  var tokenKey = 'pocket-desk-session';
  var token = '';
  var notes = [];
  var drawings = [];
  var currentDrawing = null;
  var drawingPages = [];
  var activeDrawingPage = 0;
  var drawingItem = null;
  var drawingPoint = null;
  var drawingTimeout = null;
  var drawingSaving = false;
  var drawingSaveAgain = false;
  var pairScreen = document.getElementById('pair-screen');
  var deskScreen = document.getElementById('desk-screen');
  var pairError = document.getElementById('pair-error');
  var notesMessage = document.getElementById('notes-message');
  var noteList = document.getElementById('note-list');
  var noteForm = document.getElementById('note-form');
  var noteSearch = document.getElementById('note-search');
  var clock24 = true;
  var timerRemaining = 300000;
  var timerDeadline = 0;
  var timerRunning = false;
  var snakeTimer = null;
  var snake = [];
  var snakeFood = { x: 8, y: 8 };
  var snakeDirection = { x: 1, y: 0 };
  var snakeNextDirection = { x: 1, y: 0 };
  var snakePoints = 0;
  var footballKicks = 0;
  var footballGoals = 0;
  var hoopPosition = 10;
  var hoopDirection = 1;
  var hoopPoints = 0;
  var hoopEnd = 0;
  var hoopRunning = false;
  var tttCells = [];
  var tttTurn = 'X';
  var tttDone = false;
  var memoryDeck = [];
  var memoryOpen = [];
  var memoryFound = [];
  var memoryLocked = false;
  var tileValues = [];
  var tileScore = 0;
  var reactionState = 'idle';
  var reactionTimeout = null;
  var reactionStarted = 0;
  var reactionBest = 0;
  var rpsWins = 0;
  var rpsLosses = 0;
  var simonSequence = [];
  var simonPosition = 0;
  var simonShowing = false;
  var numberLength = 3;
  var numberCurrent = '';
  var wordScore = 0;
  var wordCurrent = '';
  var higherCurrent = 7;
  var higherStreak = 0;
  var sprintStarted = 0;
  var sprintCount = 0;
  var sprintRunning = false;
  var sprintBest = 0;
  var guessTarget = 0;
  var colorScore = 0;
  var whackScore = 0;
  var whackRunning = false;
  var whackTimeout = null;
  var diceBest = 0;

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
      catch (error) { result = { error: 'The server sent an unreadable response.' }; }
      if (xhr.status === 401) {
        clearToken();
        showDesk(false);
        pairError.innerHTML = 'This session ended. Enter the current code to connect again.';
        return;
      }
      callback(xhr.status, result);
    };
    xhr.onerror = function () {
      callback(0, { error: 'Pocket Desk is not responding. Check that it is running on the same Wi-Fi.' });
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
    var panels = ['clock-panel', 'timer-panel', 'games-panel', 'theme-panel', 'notes-panel', 'files-panel', 'photo-panel', 'device-panel', 'voice-panel'];
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
    document.getElementById('tool-picker').value = name;
    if (name === 'files-panel') loadFiles('');
    if (name === 'notes-panel') loadNotes();
    if (name === 'notes-panel') loadDrawings();
    if (name === 'photo-panel') checkPhotoSetting();
    if (name === 'device-panel') loadDevice();
    if (name === 'games-panel') drawSnake();
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
        text(notesMessage, 'Saved on this computer · ' + notes.length + (notes.length === 1 ? ' note' : ' notes'));
        renderNotes();
      } else text(notesMessage, result.error || 'Could not load notes.');
    });
  }

  function renderDrawings() {
    var list = document.getElementById('drawing-list');
    var i;
    var row;
    var title;
    var details;
    var actions;
    var open;
    var remove;
    while (list.firstChild) list.removeChild(list.firstChild);
    if (!drawings.length) {
      row = document.createElement('li'); row.className = 'quiet-message'; text(row, 'No drawings yet.'); list.appendChild(row); return;
    }
    for (i = 0; i < drawings.length; i += 1) {
      row = document.createElement('li'); row.className = 'note-card';
      title = document.createElement('h3'); title.className = 'note-title'; text(title, drawings[i].title || 'Untitled drawing');
      details = document.createElement('p'); details.className = 'note-date'; text(details, drawings[i].pages.length + (drawings[i].pages.length === 1 ? ' page' : ' pages') + ' · ' + formatDate(drawings[i].updated));
      actions = document.createElement('div'); actions.className = 'note-actions';
      open = document.createElement('button'); open.type = 'button'; open.className = 'small-action'; open.setAttribute('data-drawing-open', drawings[i].id); text(open, 'Open');
      remove = document.createElement('button'); remove.type = 'button'; remove.className = 'small-action remove'; remove.setAttribute('data-drawing-delete', drawings[i].id); text(remove, 'Delete');
      actions.appendChild(open); actions.appendChild(remove); row.appendChild(title); row.appendChild(details); row.appendChild(actions); list.appendChild(row);
    }
  }

  function loadDrawings() {
    request('GET', '/api/drawings', null, function (status, result) {
      if (status === 200) { drawings = result.drawings || []; renderDrawings(); }
      else text(document.getElementById('drawings-message'), result.error || 'Could not load drawings.');
    });
  }

  function showDrawingEditor(show) {
    document.getElementById('notes-home').style.display = show ? 'none' : 'block';
    document.getElementById('drawing-editor').style.display = show ? 'block' : 'none';
    document.getElementsByClassName('notes-actions')[0].style.display = show ? 'none' : 'block';
    window.scrollTo(0, 0);
  }

  function newDrawing() {
    currentDrawing = { id: '', title: '', pages: [{ items: [] }] };
    drawingPages = currentDrawing.pages;
    activeDrawingPage = 0;
    document.getElementById('drawing-title').value = '';
    text(document.getElementById('drawing-save-state'), 'New drawing');
    showDrawingEditor(true);
    renderDrawingPages();
    fillDrawingAhead();
  }

  function openDrawing(id) {
    var i;
    for (i = 0; i < drawings.length; i += 1) {
      if (drawings[i].id !== id) continue;
      currentDrawing = JSON.parse(JSON.stringify(drawings[i]));
      drawingPages = currentDrawing.pages;
      if (!drawingPages.length) drawingPages.push({ items: [] });
      activeDrawingPage = 0;
      document.getElementById('drawing-title').value = currentDrawing.title;
      text(document.getElementById('drawing-save-state'), 'Saved');
      showDrawingEditor(true);
      renderDrawingPages();
      fillDrawingAhead();
      return;
    }
  }

  function drawingChanged() {
    if (!currentDrawing) return;
    text(document.getElementById('drawing-save-state'), 'Unsaved changes');
    if (drawingTimeout) window.clearTimeout(drawingTimeout);
    drawingTimeout = window.setTimeout(saveDrawingNow, 900);
  }

  function saveDrawingNow() {
    if (!currentDrawing) return;
    if (drawingSaving) { drawingSaveAgain = true; return; }
    var cleanTitle = document.getElementById('drawing-title').value.replace(/^\s+|\s+$/g, '').slice(0, 80);
    var hasContent = !!cleanTitle;
    for (var pageIndex = 0; pageIndex < drawingPages.length; pageIndex += 1) if (drawingPages[pageIndex].items.length) hasContent = true;
    if (!currentDrawing.id && !hasContent) return;
    currentDrawing.title = cleanTitle || 'Untitled drawing';
    currentDrawing.pages = drawingPages;
    var savingDrawing = currentDrawing;
    drawingSaving = true;
    drawingSaveAgain = false;
    text(document.getElementById('drawing-save-state'), 'Saving…');
    var method = currentDrawing.id ? 'PUT' : 'POST';
    var path = currentDrawing.id ? '/api/drawings/' + encodeURIComponent(currentDrawing.id) : '/api/drawings';
    request(method, path, { title: currentDrawing.title, pages: currentDrawing.pages }, function (status, result) {
      drawingSaving = false;
      if (status === 200 || status === 201) {
        var savedDrawing = result.drawing;
        if (currentDrawing === savingDrawing) { currentDrawing = savedDrawing; drawingPages = currentDrawing.pages; }
        var i;
        for (i = 0; i < drawings.length; i += 1) if (drawings[i].id === savedDrawing.id) drawings.splice(i, 1);
        drawings.unshift(savedDrawing);
        renderDrawings();
        if (currentDrawing === savingDrawing) text(document.getElementById('drawing-save-state'), 'Saved');
      } else if (currentDrawing === savingDrawing) text(document.getElementById('drawing-save-state'), result.error || 'Could not save');
      if (drawingSaveAgain) { drawingSaveAgain = false; if (currentDrawing) drawingChanged(); }
    });
  }

  function renderDrawingPage(index) {
    var canvas = document.getElementById('drawing-canvas-' + index);
    if (!canvas || !canvas.getContext) return;
    if (canvas.width !== 720 || canvas.height !== 900) { canvas.width = 720; canvas.height = 900; }
    canvas.style.height = (canvas.clientWidth * 1.25) + 'px';
    canvas.setAttribute('data-ready', 'yes');
    var context = canvas.getContext('2d');
    var items = drawingPages[index].items;
    var i;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    for (i = 0; i < items.length; i += 1) drawDrawingItem(context, items[i]);
    if (drawingItem && activeDrawingPage === index && drawingItem.kind !== 'stroke') drawDrawingItem(context, drawingItem);
  }

  function drawDrawingItem(context, item) {
    context.save();
    context.strokeStyle = item.color;
    context.fillStyle = item.color;
    context.lineWidth = item.width || 3;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    if (item.kind === 'stroke') {
      context.beginPath();
      context.moveTo(item.points[0][0], item.points[0][1]);
      var i;
      for (i = 1; i < item.points.length; i += 1) context.lineTo(item.points[i][0], item.points[i][1]);
      if (item.points.length === 1) context.lineTo(item.points[0][0] + .1, item.points[0][1] + .1);
      context.stroke();
    } else if (item.kind === 'line') {
      context.beginPath(); context.moveTo(item.x1, item.y1); context.lineTo(item.x2, item.y2); context.stroke();
    } else if (item.kind === 'rect') {
      context.strokeRect(item.x1, item.y1, item.x2 - item.x1, item.y2 - item.y1);
    } else if (item.kind === 'ellipse') {
      var cx = (item.x1 + item.x2) / 2; var cy = (item.y1 + item.y2) / 2;
      var rx = Math.abs(item.x2 - item.x1) / 2; var ry = Math.abs(item.y2 - item.y1) / 2;
      context.beginPath(); context.moveTo(cx + rx, cy);
      context.bezierCurveTo(cx + rx, cy + ry * .5523, cx + rx * .5523, cy + ry, cx, cy + ry);
      context.bezierCurveTo(cx - rx * .5523, cy + ry, cx - rx, cy + ry * .5523, cx - rx, cy);
      context.bezierCurveTo(cx - rx, cy - ry * .5523, cx - rx * .5523, cy - ry, cx, cy - ry);
      context.bezierCurveTo(cx + rx * .5523, cy - ry, cx + rx, cy - ry * .5523, cx + rx, cy);
      context.stroke();
    } else if (item.kind === 'text') {
      context.font = (item.size || 22) + 'px Arial, sans-serif';
      var lines = item.text.split('\n');
      var line;
      for (line = 0; line < lines.length; line += 1) context.fillText(lines[line], item.x, item.y + line * (item.size || 22) * 1.3, 680);
    }
    context.restore();
  }

  function appendDrawingCanvas(index) {
    var holder = document.createElement('div');
    var label = document.createElement('div');
    var canvas = document.createElement('canvas');
    holder.className = 'drawing-page';
    label.className = 'drawing-page-label';
    text(label, 'Page ' + (index + 1));
    canvas.width = 1; canvas.height = 1; canvas.id = 'drawing-canvas-' + index;
    canvas.setAttribute('data-drawing-page', String(index));
    canvas.setAttribute('aria-label', 'Drawing page ' + (index + 1));
    canvas.addEventListener('mousedown', function (event) { startDrawingInput(canvas, index, event); });
    canvas.addEventListener('mousemove', function (event) { moveDrawingInput(canvas, index, event); });
    canvas.addEventListener('mouseup', function (event) { endDrawingInput(canvas, index, event); });
    canvas.addEventListener('mouseleave', function (event) { endDrawingInput(canvas, index, event); });
    canvas.addEventListener('touchstart', function (event) { if (event.touches.length) { event.preventDefault(); startDrawingInput(canvas, index, event.touches[0]); } }, false);
    canvas.addEventListener('touchmove', function (event) { if (event.touches.length) { event.preventDefault(); moveDrawingInput(canvas, index, event.touches[0]); } }, false);
    canvas.addEventListener('touchend', function (event) { event.preventDefault(); endDrawingInput(canvas, index, event.changedTouches[0]); }, false);
    canvas.addEventListener('touchcancel', function (event) { endDrawingInput(canvas, index, event.changedTouches[0]); }, false);
    holder.appendChild(label); holder.appendChild(canvas); document.getElementById('drawing-pages').appendChild(holder);
    canvas.style.height = (canvas.clientWidth * 1.25) + 'px';
    var rect = canvas.getBoundingClientRect();
    if (rect.bottom >= -window.innerHeight && rect.top <= window.innerHeight * 2) renderDrawingPage(index);
  }

  function renderDrawingPages() {
    var list = document.getElementById('drawing-pages');
    while (list.firstChild) list.removeChild(list.firstChild);
    for (var i = 0; i < drawingPages.length; i += 1) appendDrawingCanvas(i);
    updateDrawingPageMessage();
  }

  function drawingCoordinates(canvas, event) {
    var rect = canvas.getBoundingClientRect();
    return { x: Math.max(0, Math.min(720, (event.clientX - rect.left) * 720 / rect.width)),
             y: Math.max(0, Math.min(900, (event.clientY - rect.top) * 900 / rect.height)) };
  }

  function startDrawingInput(canvas, index, event) {
    activeDrawingPage = index;
    var point = drawingCoordinates(canvas, event);
    var tool = document.getElementById('drawing-tool').value;
    var color = document.getElementById('drawing-color').value;
    var width = parseInt(document.getElementById('drawing-size').value, 10) || 4;
    if (tool === 'text') {
      drawingPoint = point;
      document.getElementById('drawing-text-entry').style.display = 'block';
      document.getElementById('drawing-text-value').focus();
      return;
    }
    drawingItem = { kind: tool === 'pen' || tool === 'eraser' ? 'stroke' : tool, color: tool === 'eraser' ? '#ffffff' : color, width: tool === 'eraser' ? Math.max(14, width * 4) : width };
    if (tool === 'pen' || tool === 'eraser') {
      drawingItem.points = [[point.x, point.y]];
      drawingPages[index].items.push(drawingItem);
    } else {
      drawingItem.x1 = point.x; drawingItem.y1 = point.y; drawingItem.x2 = point.x; drawingItem.y2 = point.y;
    }
    renderDrawingPage(index);
  }

  function moveDrawingInput(canvas, index, event) {
    if (!drawingItem || activeDrawingPage !== index) return;
    var point = drawingCoordinates(canvas, event);
    if (drawingItem.kind === 'stroke') {
      var previous = drawingItem.points[drawingItem.points.length - 1];
      if (Math.abs(point.x - previous[0]) + Math.abs(point.y - previous[1]) < 2) return;
      drawingItem.points.push([point.x, point.y]);
    } else {
      drawingItem.x2 = point.x; drawingItem.y2 = point.y;
    }
    renderDrawingPage(index);
  }

  function endDrawingInput(canvas, index, event) {
    if (!drawingItem || activeDrawingPage !== index) return;
    if (drawingItem.kind !== 'stroke' && event) {
      var point = drawingCoordinates(canvas, event);
      drawingItem.x2 = point.x; drawingItem.y2 = point.y;
      drawingPages[index].items.push(drawingItem);
    }
    drawingItem = null;
    renderDrawingPage(index);
    drawingChanged();
  }

  function updateDrawingPageMessage() {
    text(document.getElementById('drawing-pages-message'), drawingPages.length + (drawingPages.length === 1 ? ' page' : ' pages') + ' · more pages load as you scroll');
  }

  function fillDrawingAhead() {
    if (!currentDrawing || document.getElementById('drawing-editor').style.display === 'none' || document.getElementById('notes-panel').style.display === 'none') return;
    var guard = 0;
    while (Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) < window.pageYOffset + window.innerHeight + 350 && guard < 4) {
      drawingPages.push({ items: [] });
      appendDrawingCanvas(drawingPages.length - 1);
      guard += 1;
    }
    var pageNodes = document.getElementsByClassName('drawing-page');
    var i;
    for (i = 0; i < pageNodes.length; i += 1) {
      if (pageNodes[i].getBoundingClientRect().top <= window.innerHeight / 2) activeDrawingPage = i;
    }
    if (guard) {
      updateDrawingPageMessage();
      var hasContent = document.getElementById('drawing-title').value.replace(/^\s+|\s+$/g, '') !== '';
      for (i = 0; i < drawingPages.length; i += 1) if (drawingPages[i].items.length) hasContent = true;
      if (hasContent) drawingChanged();
    }
  }

  function updateDrawingCanvases() {
    if (!currentDrawing || document.getElementById('drawing-editor').style.display === 'none' || document.getElementById('notes-panel').style.display === 'none') return;
    var canvases = document.getElementById('drawing-pages').getElementsByTagName('canvas');
    var i;
    var rect;
    for (i = 0; i < canvases.length; i += 1) {
      rect = canvases[i].getBoundingClientRect();
      if (rect.bottom >= -window.innerHeight && rect.top <= window.innerHeight * 2) {
        if (canvases[i].width !== 720 || canvases[i].height !== 900) renderDrawingPage(i);
        else canvases[i].style.height = (canvases[i].clientWidth * 1.25) + 'px';
      } else if (canvases[i].width !== 1) {
        canvases[i].width = 1; canvases[i].height = 1;
        canvases[i].style.height = (canvases[i].clientWidth * 1.25) + 'px';
        canvases[i].setAttribute('data-ready', 'no');
      }
    }
  }

  function drawingScroll() { fillDrawingAhead(); updateDrawingCanvases(); }

  function insertDrawingText() {
    var value = document.getElementById('drawing-text-value').value;
    if (!currentDrawing || !drawingPoint || !value.replace(/^\s+|\s+$/g, '')) return;
    var color = document.getElementById('drawing-color').value;
    var width = parseInt(document.getElementById('drawing-size').value, 10) || 4;
    drawingPages[activeDrawingPage].items.push({ kind: 'text', text: value, x: drawingPoint.x, y: drawingPoint.y, color: color, width: width, size: 22 });
    document.getElementById('drawing-text-value').value = '';
    document.getElementById('drawing-text-entry').style.display = 'none';
    renderDrawingPage(activeDrawingPage);
    drawingChanged();
  }

  function drawingListClick(event) {
    var target = event.target;
    var openId = null;
    var deleteId = null;
    while (target && target !== this) {
      if (target.getAttribute) {
        openId = target.getAttribute('data-drawing-open');
        deleteId = target.getAttribute('data-drawing-delete');
        if (openId || deleteId) break;
      }
      target = target.parentNode;
    }
    if (openId) openDrawing(openId);
    if (deleteId && window.confirm('Delete this drawing and all its pages?')) {
      request('DELETE', '/api/drawings/' + encodeURIComponent(deleteId), null, function (status, result) {
        if (status === 200) { drawings = drawings.filter(function (item) { return item.id !== deleteId; }); renderDrawings(); }
        else text(document.getElementById('drawings-message'), result.error || 'Could not delete drawing.');
      });
    }
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
      var downloadLink;
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
          if (result.items[i].can_preview) {
            link.href = '#';
            link.setAttribute('data-file-path', result.items[i].path);
            link.setAttribute('data-file-mode', 'open');
            text(link, 'Open · ' + result.items[i].name);
          } else {
            link.href = '#';
            link.setAttribute('data-file-path', result.items[i].path);
            link.setAttribute('data-file-mode', 'download');
            text(link, 'Download · ' + result.items[i].name);
          }
          text(kind, result.items[i].size_label);
          if (result.items[i].can_preview) {
            downloadLink = document.createElement('a');
            downloadLink.className = 'file-download';
            downloadLink.href = '#';
            downloadLink.setAttribute('data-file-path', result.items[i].path);
            downloadLink.setAttribute('data-file-mode', 'download');
            text(downloadLink, 'Download');
            row.appendChild(link);
            row.appendChild(downloadLink);
            row.appendChild(kind);
          } else {
            link.appendChild(kind);
            row.appendChild(link);
          }
          fileList.appendChild(row);
          continue;
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
    text(reading, 'Checking computer…');
    request('GET', '/api/device', null, function (status, result) {
      var gib = function (bytes) { return (bytes / 1073741824).toFixed(1) + ' GB'; };
      if (status !== 200) {
        text(reading, 'Computer details unavailable');
        text(document.getElementById('battery-detail'), result.error || 'Could not read computer status.');
        return;
      }
      if (result.battery_available) {
        text(reading, result.battery_percent + '%');
        text(document.getElementById('battery-detail'), result.on_ac_power === null ? 'Power connection not reported.' : (result.on_ac_power ? 'Connected to power.' : 'Running on battery.'));
      } else {
        text(reading, 'No battery detected');
        text(document.getElementById('battery-detail'), 'Battery information is not reported by this computer.');
      }
      text(document.getElementById('memory-reading'), result.memory_available ? gib(result.memory_total_bytes - result.memory_available_bytes) + ' / ' + gib(result.memory_total_bytes) : 'Unavailable');
      text(document.getElementById('memory-detail'), result.memory_available ? result.memory_used_percent + '% in use · ' + gib(result.memory_available_bytes) + ' available' : 'Memory details are available on Windows.');
      text(document.getElementById('storage-reading'), result.storage_available ? gib(result.storage_free_bytes) + ' free' : 'Unavailable');
      text(document.getElementById('storage-detail'), result.storage_available ? gib(result.storage_used_bytes) + ' used of ' + gib(result.storage_total_bytes) + ' · drive used by Pocket Desk' : 'Drive space could not be read.');
      text(document.getElementById('process-reading'), result.process_memory_bytes ? gib(result.process_memory_bytes) + ' RAM' : 'Usage unavailable');
      text(document.getElementById('system-detail'), result.system + ' · ' + result.processor);
    });
  }

  function clockTick() {
    var now = new Date();
    var hours = now.getHours();
    var suffix = '';
    if (!clock24) {
      suffix = hours >= 12 ? ' PM' : ' AM';
      hours = hours % 12 || 12;
    }
    document.getElementById('clock-time').className = clock24 ? 'clock-time' : 'clock-time compact-clock';
    text(document.getElementById('clock-time'), pad(hours) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds()) + suffix);
    text(document.getElementById('clock-date'), ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()] + ', ' + ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][now.getMonth()] + ' ' + now.getDate());
    if (timerRunning) {
      timerRemaining = Math.max(0, timerDeadline - (+new Date()));
      if (!timerRemaining) {
        timerRunning = false;
        text(document.getElementById('timer-message'), 'Time is up. Take a breath.');
        document.getElementById('timer-toggle').textContent = 'Start timer';
        saveTimer();
      }
      renderTimer();
    }
    if (hoopRunning) {
      hoopPosition += hoopDirection * 2.1;
      if (hoopPosition >= 91) { hoopPosition = 91; hoopDirection = -1; }
      if (hoopPosition <= 3) { hoopPosition = 3; hoopDirection = 1; }
      document.getElementById('hoop-target').style.left = hoopPosition + '%';
      if (+new Date() >= hoopEnd) {
        hoopRunning = false;
        text(document.getElementById('hoop-score'), 'Final score: ' + hoopPoints + ' · Play again?');
        document.getElementById('hoop-shoot').textContent = 'Play again';
      }
    }
  }

  function pad(value) { return value < 10 ? '0' + value : String(value); }

  function renderTimer() {
    var total = Math.ceil(timerRemaining / 1000);
    text(document.getElementById('timer-readout'), pad(Math.floor(total / 60)) + ':' + pad(total % 60));
  }

  function saveTimer() {
    try { window.localStorage.setItem('pocket-desk-timer', JSON.stringify({ remaining: timerRemaining, deadline: timerDeadline, running: timerRunning })); } catch (error) {}
  }

  function loadTimer() {
    try {
      var saved = JSON.parse(window.localStorage.getItem('pocket-desk-timer') || 'null');
      if (saved && typeof saved.remaining === 'number') {
        timerRunning = !!saved.running;
        timerDeadline = saved.deadline || 0;
        timerRemaining = timerRunning ? Math.max(0, timerDeadline - (+new Date())) : saved.remaining;
        if (!timerRemaining) timerRunning = false;
        document.getElementById('timer-minutes').value = Math.floor(timerRemaining / 60000);
        document.getElementById('timer-seconds').value = Math.floor((timerRemaining % 60000) / 1000);
        document.getElementById('timer-toggle').textContent = timerRunning ? 'Pause timer' : 'Start timer';
        if (saved.running && !timerRunning) text(document.getElementById('timer-message'), 'Timer finished while the desk was away.');
      }
    } catch (error) {}
    renderTimer();
  }

  function applyTheme(theme, save) {
    var themes = ['paper', 'midnight', 'ocean', 'grove', 'rose'];
    var i;
    if (themes.indexOf(theme) === -1) theme = 'paper';
    for (i = 0; i < themes.length; i += 1) document.body.className = document.body.className.replace(new RegExp('(^|\\s)theme-' + themes[i] + '(?=\\s|$)', 'g'), ' ');
    if (theme !== 'paper' && themes.indexOf(theme) !== -1) document.body.className += ' theme-' + theme;
    var buttons = document.querySelectorAll('[data-theme-choice]');
    for (i = 0; i < buttons.length; i += 1) {
      buttons[i].className = buttons[i].getAttribute('data-theme-choice') === theme ? 'theme-selected' : '';
      buttons[i].setAttribute('aria-pressed', buttons[i].getAttribute('data-theme-choice') === theme ? 'true' : 'false');
    }
    if (save) { try { window.localStorage.setItem('pocket-desk-theme', theme); } catch (error) {} }
  }

  function drawSnake() {
    var canvas = document.getElementById('snake-board');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var i;
    ctx.fillStyle = document.body.className.indexOf('theme-midnight') >= 0 ? '#202527' : '#e7e6da';
    ctx.fillRect(0, 0, 240, 240);
    ctx.fillStyle = '#b66c51';
    ctx.fillRect(snakeFood.x * 12 + 2, snakeFood.y * 12 + 2, 8, 8);
    ctx.fillStyle = '#4e7058';
    for (i = 0; i < snake.length; i += 1) ctx.fillRect(snake[i].x * 12 + 1, snake[i].y * 12 + 1, 10, 10);
  }

  function startSnake() {
    if (snakeTimer) { window.clearInterval(snakeTimer); snakeTimer = null; }
    snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    snakeDirection = { x: 1, y: 0 };
    snakeNextDirection = { x: 1, y: 0 };
    snakePoints = 0;
    placeFood();
    text(document.getElementById('snake-score'), 'Score 0');
    document.getElementById('snake-start').textContent = 'Restart Snake';
    drawSnake();
    snakeTimer = window.setInterval(snakeStep, 170);
  }

  function placeFood() {
    snakeFood = { x: Math.floor(Math.random() * 20), y: Math.floor(Math.random() * 20) };
  }

  function snakeStep() {
    var head = { x: snake[0].x + snakeNextDirection.x, y: snake[0].y + snakeNextDirection.y };
    var i;
    snakeDirection = snakeNextDirection;
    if (head.x < 0 || head.y < 0 || head.x >= 20 || head.y >= 20) return endSnake();
    for (i = 0; i < snake.length; i += 1) if (head.x === snake[i].x && head.y === snake[i].y) return endSnake();
    snake.unshift(head);
    if (head.x === snakeFood.x && head.y === snakeFood.y) { snakePoints += 1; placeFood(); text(document.getElementById('snake-score'), 'Score ' + snakePoints); }
    else snake.pop();
    drawSnake();
  }

  function endSnake() {
    window.clearInterval(snakeTimer);
    snakeTimer = null;
    text(document.getElementById('snake-score'), 'Game over · score ' + snakePoints);
  }

  function chooseDirection(name) {
    var choices = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
    var next = choices[name];
    if (next && (next.x !== -snakeDirection.x || next.y !== -snakeDirection.y)) snakeNextDirection = next;
  }

  function footballShot(shot) {
    if (footballKicks >= 5) return;
    var keeper = ['left', 'center', 'right'][Math.floor(Math.random() * 3)];
    footballKicks += 1;
    if (shot !== keeper) footballGoals += 1;
    text(document.getElementById('football-score'), (shot !== keeper ? 'GOAL! ' : 'Saved! ') + footballGoals + ' / ' + footballKicks + ' · ' + (5 - footballKicks) + ' kicks left');
    if (footballKicks === 5) text(document.getElementById('football-score'), 'Full time · ' + footballGoals + ' goals from 5 kicks');
  }

  function startHoop() {
    hoopPoints = 0;
    hoopRunning = true;
    hoopEnd = +new Date() + 20000;
    document.getElementById('hoop-shoot').textContent = 'Shoot!';
    text(document.getElementById('hoop-score'), 'Score 0 · 20 seconds');
  }

  function shootHoop() {
    if (!hoopRunning) return startHoop();
    var distance = Math.abs(hoopPosition - 50);
    if (distance < 10) hoopPoints += 3;
    else if (distance < 22) hoopPoints += 2;
    text(document.getElementById('hoop-score'), 'Score ' + hoopPoints + ' · ' + Math.max(0, Math.ceil((hoopEnd - (+new Date())) / 1000)) + ' seconds');
  }

  function startTicTacToe() {
    var cells = document.getElementById('ttt-board').getElementsByTagName('button');
    var i;
    tttCells = ['', '', '', '', '', '', '', '', ''];
    tttTurn = 'X';
    tttDone = false;
    for (i = 0; i < cells.length; i += 1) cells[i].textContent = '';
    text(document.getElementById('ttt-status'), 'X goes first');
  }

  function playTicTacToe(index, button) {
    var wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    var i;
    if (tttDone || tttCells[index]) return;
    tttCells[index] = tttTurn;
    button.textContent = tttTurn;
    for (i = 0; i < wins.length; i += 1) {
      if (tttCells[wins[i][0]] === tttTurn && tttCells[wins[i][1]] === tttTurn && tttCells[wins[i][2]] === tttTurn) {
        tttDone = true;
        text(document.getElementById('ttt-status'), tttTurn + ' wins');
        return;
      }
    }
    if (tttCells.join('').length === 9) { tttDone = true; text(document.getElementById('ttt-status'), 'Draw'); return; }
    tttTurn = tttTurn === 'X' ? 'O' : 'X';
    text(document.getElementById('ttt-status'), tttTurn + ' goes next');
  }

  function shuffle(values) {
    var i;
    var j;
    var value;
    for (i = values.length - 1; i > 0; i -= 1) {
      j = Math.floor(Math.random() * (i + 1));
      value = values[i]; values[i] = values[j]; values[j] = value;
    }
    return values;
  }

  function startMemory() {
    var i;
    var board = document.getElementById('memory-board');
    var button;
    memoryDeck = shuffle([1,1,2,2,3,3,4,4,5,5,6,6]);
    memoryOpen = [];
    memoryFound = [];
    memoryLocked = false;
    while (board.firstChild) board.removeChild(board.firstChild);
    for (i = 0; i < memoryDeck.length; i += 1) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'memory-card';
      button.setAttribute('data-memory', String(i));
      button.textContent = '?';
      board.appendChild(button);
    }
    text(document.getElementById('memory-status'), 'Pairs found: 0 of 6');
  }

  function turnMemory(index, button) {
    var first;
    var second;
    if (memoryLocked || memoryFound[index] || memoryOpen.length === 2 || (memoryOpen.length && memoryOpen[0].index === index)) return;
    button.textContent = String(memoryDeck[index]);
    button.className = 'memory-card memory-open';
    memoryOpen.push({ index: index, button: button });
    if (memoryOpen.length !== 2) return;
    first = memoryOpen[0]; second = memoryOpen[1];
    if (memoryDeck[first.index] === memoryDeck[second.index]) {
      memoryFound[first.index] = true; memoryFound[second.index] = true;
      first.button.className = 'memory-card memory-found'; second.button.className = 'memory-card memory-found';
      memoryOpen = [];
      text(document.getElementById('memory-status'), 'Pairs found: ' + (Object.keys(memoryFound).length / 2) + ' of 6');
      return;
    }
    memoryLocked = true;
    window.setTimeout(function () {
      first.button.textContent = '?'; second.button.textContent = '?';
      first.button.className = 'memory-card'; second.button.className = 'memory-card';
      memoryOpen = []; memoryLocked = false;
    }, 700);
  }

  function addTile() {
    var empty = [];
    var i;
    for (i = 0; i < tileValues.length; i += 1) if (!tileValues[i]) empty.push(i);
    if (empty.length) tileValues[empty[Math.floor(Math.random() * empty.length)]] = Math.random() < 0.9 ? 2 : 4;
  }

  function renderTiles() {
    var board = document.getElementById('tiles-board');
    var i;
    var cell;
    while (board.firstChild) board.removeChild(board.firstChild);
    for (i = 0; i < 16; i += 1) {
      cell = document.createElement('div');
      cell.className = 'tile-cell' + (tileValues[i] ? ' tile-v' + Math.min(tileValues[i], 2048) : '');
      cell.textContent = tileValues[i] ? String(tileValues[i]) : '';
      board.appendChild(cell);
    }
    text(document.getElementById('tiles-status'), 'Score ' + tileScore);
  }

  function startTiles() {
    tileValues = [];
    tileScore = 0;
    var i;
    for (i = 0; i < 16; i += 1) tileValues[i] = 0;
    addTile(); addTile(); renderTiles();
  }

  function moveTiles(direction) {
    var before = tileValues.join(',');
    var line;
    var indexes;
    var packed;
    var i;
    var j;
    var row;
    var col;
    var merged;
    for (line = 0; line < 4; line += 1) {
      indexes = [];
      for (i = 0; i < 4; i += 1) {
        row = direction === 'down' ? 3 - i : (direction === 'up' ? i : line);
        col = direction === 'right' ? 3 - i : (direction === 'left' ? i : line);
        indexes.push(row * 4 + col);
      }
      packed = [];
      for (i = 0; i < 4; i += 1) if (tileValues[indexes[i]]) packed.push(tileValues[indexes[i]]);
      merged = [];
      for (i = 0; i < packed.length; i += 1) {
        if (packed[i] === packed[i + 1]) { merged.push(packed[i] * 2); tileScore += packed[i] * 2; i += 1; }
        else merged.push(packed[i]);
      }
      for (j = 0; j < 4; j += 1) tileValues[indexes[j]] = merged[j] || 0;
    }
    if (before !== tileValues.join(',')) { addTile(); renderTiles(); }
  }

  function startReaction() {
    reactionState = 'waiting';
    var padNode = document.getElementById('reaction-pad');
    padNode.className = 'reaction-pad reaction-wait';
    text(padNode, 'Wait for green…');
    reactionTimeout = window.setTimeout(function () {
      reactionState = 'ready';
      reactionStarted = +new Date();
      padNode.className = 'reaction-pad reaction-ready';
      text(padNode, 'Tap now');
    }, 1300 + Math.floor(Math.random() * 2600));
  }

  function playReaction() {
    var padNode = document.getElementById('reaction-pad');
    if (reactionState === 'waiting') {
      window.clearTimeout(reactionTimeout); reactionState = 'idle';
      padNode.className = 'reaction-pad'; text(padNode, 'Too soon · try again'); return;
    }
    if (reactionState === 'ready') {
      var result = +new Date() - reactionStarted;
      reactionState = 'idle';
      if (!reactionBest || result < reactionBest) reactionBest = result;
      padNode.className = 'reaction-pad'; text(padNode, result + ' ms · tap to retry');
      text(document.getElementById('reaction-status'), 'Best time: ' + reactionBest + ' ms'); return;
    }
    startReaction();
  }

  function playRps(choice) {
    var options = ['rock', 'paper', 'scissors'];
    var computer = options[Math.floor(Math.random() * 3)];
    var win = (choice === 'rock' && computer === 'scissors') || (choice === 'paper' && computer === 'rock') || (choice === 'scissors' && computer === 'paper');
    var result = choice === computer ? 'Tie' : (win ? 'You win' : 'Computer wins');
    if (win) rpsWins += 1;
    if (!win && choice !== computer) rpsLosses += 1;
    text(document.getElementById('rps-status'), result + ' · computer chose ' + computer + ' · ' + rpsWins + ' wins / ' + rpsLosses + ' losses');
  }

  function showSimon(index) {
    var button = document.querySelector('[data-simon="' + index + '"]');
    button.className = 'simon-lit';
    window.setTimeout(function () { button.className = ''; }, 320);
  }

  function simonNext() {
    simonSequence.push(Math.floor(Math.random() * 4));
    simonPosition = 0; simonShowing = true;
    text(document.getElementById('simon-status'), 'Level ' + simonSequence.length + ' · watch');
    var i = 0;
    function flash() {
      if (i >= simonSequence.length) { simonShowing = false; text(document.getElementById('simon-status'), 'Your turn'); return; }
      showSimon(simonSequence[i]); i += 1; window.setTimeout(flash, 620);
    }
    window.setTimeout(flash, 300);
  }

  function playSimon(value) {
    if (simonShowing || !simonSequence.length) return;
    showSimon(value);
    if (simonSequence[simonPosition] !== value) {
      simonSequence = []; text(document.getElementById('simon-status'), 'Missed it · press Start to try again'); return;
    }
    simonPosition += 1;
    if (simonPosition === simonSequence.length) window.setTimeout(simonNext, 550);
  }

  function startNumber() {
    var i;
    numberCurrent = '';
    for (i = 0; i < numberLength; i += 1) numberCurrent += String(Math.floor(Math.random() * 10));
    document.getElementById('number-answer').value = '';
    text(document.getElementById('number-prompt'), numberCurrent);
    text(document.getElementById('number-status'), 'Memorize it');
    window.setTimeout(function () { text(document.getElementById('number-prompt'), 'Type the number'); document.getElementById('number-answer').focus(); }, 1400);
  }

  function checkNumber() {
    if (!numberCurrent) return;
    if (document.getElementById('number-answer').value === numberCurrent) {
      numberLength += 1; text(document.getElementById('number-status'), 'Correct · next round has ' + numberLength + ' digits');
    } else {
      numberLength = 3; text(document.getElementById('number-status'), 'Not quite · try again at ' + numberLength + ' digits');
    }
  }

  function nextWord() {
    var words = ['garden', 'planet', 'pocket', 'window', 'silver', 'pencil', 'coffee', 'button', 'orange', 'little'];
    var letters;
    wordCurrent = words[Math.floor(Math.random() * words.length)];
    letters = shuffle(wordCurrent.split(''));
    while (letters.join('') === wordCurrent) letters = shuffle(wordCurrent.split(''));
    text(document.getElementById('word-scramble'), letters.join(''));
    document.getElementById('word-answer').value = '';
    text(document.getElementById('word-status'), 'Score ' + wordScore);
  }

  function guessHigher(direction) {
    var next = Math.floor(Math.random() * 13) + 1;
    var correct = direction === 'higher' ? next >= higherCurrent : next <= higherCurrent;
    text(document.getElementById('higher-card'), String(next));
    if (next === higherCurrent || correct) higherStreak += 1; else higherStreak = 0;
    higherCurrent = next;
    text(document.getElementById('higher-status'), (correct ? 'Correct' : 'Wrong') + ' · streak ' + higherStreak);
  }

  function sprintTap() {
    var now = +new Date();
    if (!sprintRunning) {
      sprintCount = 0; sprintRunning = true; sprintStarted = now;
      text(document.getElementById('sprint-pad'), 'Tap!');
      window.setTimeout(function () {
        sprintRunning = false;
        if (sprintCount > sprintBest) sprintBest = sprintCount;
        text(document.getElementById('sprint-pad'), 'Finished');
        text(document.getElementById('sprint-status'), sprintCount + ' taps · best ' + sprintBest);
      }, 10000);
      return;
    }
    if (now - sprintStarted <= 10000) sprintCount += 1;
  }

  function openGame(game) {
    var games = ['snake-game', 'football-game', 'hoop-game', 'ttt-game', 'memory-game', 'tiles-game', 'reaction-game', 'rps-game', 'simon-game', 'number-game', 'word-game', 'higher-game', 'sprint-game', 'coin-game', 'dice-game', 'guess-game', 'color-game', 'whack-game'];
    var i;
    if (game !== 'snake-game' && snakeTimer) { window.clearInterval(snakeTimer); snakeTimer = null; }
    if (game !== 'hoop-game') hoopRunning = false;
    for (i = 0; i < games.length; i += 1) document.getElementById(games[i]).style.display = games[i] === game ? 'block' : 'none';
    document.getElementById('game-picker').value = game;
    if (game === 'snake-game') drawSnake();
    if (game === 'ttt-game') startTicTacToe();
    if (game === 'memory-game') startMemory();
    if (game === 'tiles-game') startTiles();
    if (game === 'reaction-game') { reactionState = 'idle'; document.getElementById('reaction-pad').className = 'reaction-pad'; text(document.getElementById('reaction-pad'), 'Tap to start'); }
    if (game === 'simon-game') { simonSequence = []; text(document.getElementById('simon-status'), 'Level 0'); }
    if (game === 'number-game') { numberLength = 3; numberCurrent = ''; document.getElementById('number-answer').value = ''; text(document.getElementById('number-prompt'), 'Ready'); text(document.getElementById('number-status'), ''); }
    if (game === 'word-game') nextWord();
    if (game === 'higher-game') { higherCurrent = Math.floor(Math.random() * 13) + 1; higherStreak = 0; text(document.getElementById('higher-card'), String(higherCurrent)); text(document.getElementById('higher-status'), 'Streak: 0'); }
    if (game === 'sprint-game') { sprintRunning = false; sprintCount = 0; text(document.getElementById('sprint-pad'), 'Start'); text(document.getElementById('sprint-status'), 'Best: ' + sprintBest); }
    if (game === 'coin-game') { text(document.getElementById('coin-result'), '?'); text(document.getElementById('coin-status'), 'Choose a side.'); }
    if (game === 'dice-game') text(document.getElementById('dice-status'), 'Best: ' + (diceBest || '—'));
    if (game === 'guess-game') resetGuess();
    if (game === 'color-game') { colorScore = 0; nextColorPrompt(); }
    if (game === 'whack-game') { whackRunning = false; window.clearTimeout(whackTimeout); text(document.getElementById('whack-status'), 'Score: 0 · tap to start'); }
  }

  function resetGuess() {
    guessTarget = Math.floor(Math.random() * 100) + 1;
    document.getElementById('guess-entry').value = '';
    text(document.getElementById('guess-status'), 'I picked a number.');
  }

  function nextColorPrompt() {
    var names = ['RED', 'BLUE', 'GREEN', 'PURPLE'];
    var colors = ['#bd5a4b', '#4e7f9b', '#4e805d', '#89649a'];
    var word = Math.floor(Math.random() * names.length);
    var ink = Math.floor(Math.random() * names.length);
    var choices = document.getElementById('color-choices');
    var button;
    document.getElementById('color-prompt').textContent = names[word];
    document.getElementById('color-prompt').style.color = colors[ink];
    choices.textContent = '';
    for (var i = 0; i < names.length; i += 1) {
      button = document.createElement('button'); button.type = 'button'; button.setAttribute('data-color-index', String(i));
      button.style.color = colors[i]; button.textContent = names[i]; choices.appendChild(button);
    }
    choices.setAttribute('data-answer', String(ink));
    text(document.getElementById('color-status'), 'Score: ' + colorScore);
  }

  function whackTap(event) {
    if (!whackRunning) {
      whackRunning = true; whackScore = 0;
      whackTimeout = window.setTimeout(function () { whackRunning = false; text(document.getElementById('whack-status'), 'Time · score ' + whackScore + ' · tap to play again'); }, 15000);
    } else whackScore += 1;
    var button = document.getElementById('whack-board').getElementsByTagName('button')[0];
    button.style.left = (5 + Math.floor(Math.random() * 75)) + '%';
    button.style.top = (5 + Math.floor(Math.random() * 75)) + '%';
    text(document.getElementById('whack-status'), 'Score: ' + whackScore + ' · 15 seconds');
  }

  document.getElementById('tool-picker').addEventListener('change', function () { setPanel(this.value); });
  document.getElementById('game-picker').addEventListener('change', function () { openGame(this.value); });
  document.getElementById('ttt-board').addEventListener('click', function (event) {
    var index = event.target.getAttribute('data-cell');
    if (index !== null) playTicTacToe(parseInt(index, 10), event.target);
  });
  document.getElementById('ttt-reset').addEventListener('click', startTicTacToe);
  document.getElementById('memory-reset').addEventListener('click', startMemory);
  document.getElementById('memory-board').addEventListener('click', function (event) {
    var index = event.target.getAttribute('data-memory');
    if (index !== null) turnMemory(parseInt(index, 10), event.target);
  });
  document.getElementById('tiles-reset').addEventListener('click', startTiles);
  document.getElementById('tiles-game').getElementsByClassName('game-pad')[0].addEventListener('click', function (event) {
    var direction = event.target.getAttribute('data-tile-direction');
    if (direction) moveTiles(direction);
  });
  document.getElementById('reaction-pad').addEventListener('click', playReaction);
  document.getElementById('rps-choices').addEventListener('click', function (event) {
    var choice = event.target.getAttribute('data-rps');
    if (choice) playRps(choice);
  });
  document.getElementById('simon-start').addEventListener('click', function () { simonSequence = []; simonNext(); });
  document.getElementsByClassName('simon-board')[0].addEventListener('click', function (event) {
    var value = event.target.getAttribute('data-simon');
    if (value !== null) playSimon(parseInt(value, 10));
  });
  document.getElementById('number-start').addEventListener('click', startNumber);
  document.getElementById('number-submit').addEventListener('click', checkNumber);
  document.getElementById('word-next').addEventListener('click', nextWord);
  document.getElementById('word-submit').addEventListener('click', function () {
    if (document.getElementById('word-answer').value.toLowerCase().replace(/\s/g, '') === wordCurrent) {
      wordScore += 1; text(document.getElementById('word-status'), 'Correct · score ' + wordScore); nextWord();
    } else text(document.getElementById('word-status'), 'Try again · score ' + wordScore);
  });
  document.getElementById('higher-higher').addEventListener('click', function () { guessHigher('higher'); });
  document.getElementById('higher-lower').addEventListener('click', function () { guessHigher('lower'); });
  document.getElementById('higher-reset').addEventListener('click', function () { higherCurrent = Math.floor(Math.random() * 13) + 1; higherStreak = 0; text(document.getElementById('higher-card'), String(higherCurrent)); text(document.getElementById('higher-status'), 'Streak: 0'); });
  document.getElementById('sprint-pad').addEventListener('click', sprintTap);

  document.getElementById('coin-game').addEventListener('click', function (event) {
    var called = event.target.getAttribute('data-coin');
    if (!called) return;
    var result = Math.random() < .5 ? 'Heads' : 'Tails';
    text(document.getElementById('coin-result'), result);
    text(document.getElementById('coin-status'), result === called ? 'You called it!' : 'Not this time.');
  });
  document.getElementById('dice-roll').addEventListener('click', function () {
    var total = Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1;
    text(document.getElementById('dice-result'), String(total));
    if (total > diceBest) diceBest = total;
    text(document.getElementById('dice-status'), 'Total ' + total + ' · best ' + diceBest);
  });
  document.getElementById('guess-submit').addEventListener('click', function () {
    var value = parseInt(document.getElementById('guess-entry').value, 10);
    if (!value || value < 1 || value > 100) { text(document.getElementById('guess-status'), 'Enter a number from 1 to 100.'); return; }
    text(document.getElementById('guess-status'), value === guessTarget ? 'You got it! Pick a new number to play again.' : (value < guessTarget ? 'Higher.' : 'Lower.'));
    if (value === guessTarget) guessTarget = Math.floor(Math.random() * 100) + 1;
  });
  document.getElementById('guess-reset').addEventListener('click', resetGuess);
  document.getElementById('color-choices').addEventListener('click', function (event) {
    var choice = event.target.getAttribute('data-color-index');
    if (choice === null) return;
    if (choice === this.getAttribute('data-answer')) colorScore += 1; else colorScore = Math.max(0, colorScore - 1);
    nextColorPrompt();
  });
  document.getElementById('whack-board').addEventListener('click', whackTap);

  document.getElementById('clock-format').addEventListener('click', function () {
    clock24 = !clock24;
    this.textContent = clock24 ? 'Switch to 12-hour' : 'Switch to 24-hour';
    try { window.localStorage.setItem('pocket-desk-clock-format', clock24 ? '24' : '12'); } catch (error) {}
    clockTick();
  });
  document.getElementById('timer-toggle').addEventListener('click', function () {
    if (timerRunning) {
      timerRemaining = Math.max(0, timerDeadline - (+new Date()));
      timerRunning = false;
      text(document.getElementById('timer-message'), 'Timer paused.');
    } else {
      if (!timerRemaining) {
        var minutes = parseInt(document.getElementById('timer-minutes').value, 10) || 0;
        var seconds = parseInt(document.getElementById('timer-seconds').value, 10) || 0;
        minutes = Math.max(0, Math.min(599, minutes));
        seconds = Math.max(0, Math.min(59, seconds));
        timerRemaining = (minutes * 60 + seconds) * 1000;
      }
      if (!timerRemaining) { text(document.getElementById('timer-message'), 'Set a time longer than zero first.'); return; }
      timerDeadline = (+new Date()) + timerRemaining;
      timerRunning = true;
      text(document.getElementById('timer-message'), 'Timer is running. Keep this page open.');
    }
    this.textContent = timerRunning ? 'Pause timer' : 'Start timer';
    saveTimer();
  });
  document.getElementById('timer-reset').addEventListener('click', function () {
    timerRunning = false;
    timerDeadline = 0;
    var minutes = Math.max(0, Math.min(599, parseInt(document.getElementById('timer-minutes').value, 10) || 0));
    var seconds = Math.max(0, Math.min(59, parseInt(document.getElementById('timer-seconds').value, 10) || 0));
    timerRemaining = (minutes * 60 + seconds) * 1000;
    document.getElementById('timer-toggle').textContent = 'Start timer';
    text(document.getElementById('timer-message'), 'Timer reset.');
    renderTimer();
    saveTimer();
  });
  document.getElementById('timer-minutes').addEventListener('change', function () { if (!timerRunning) document.getElementById('timer-reset').click(); });
  document.getElementById('timer-seconds').addEventListener('change', function () { if (!timerRunning) document.getElementById('timer-reset').click(); });
  document.getElementById('snake-start').addEventListener('click', startSnake);
  document.getElementsByClassName('game-pad')[0].addEventListener('click', function (event) {
    var direction = event.target.getAttribute('data-direction');
    if (direction) chooseDirection(direction);
  });
  document.getElementsByClassName('shot-choices')[0].addEventListener('click', function (event) {
    var shot = event.target.getAttribute('data-shot');
    if (shot) footballShot(shot);
  });
  document.getElementById('football-reset').addEventListener('click', function () {
    footballKicks = 0;
    footballGoals = 0;
    text(document.getElementById('football-score'), 'Choose a corner to take your first kick.');
  });
  document.getElementById('hoop-shoot').addEventListener('click', shootHoop);
  document.getElementsByClassName('theme-options')[0].addEventListener('click', function (event) {
    var choice = event.target.getAttribute('data-theme-choice');
    if (!choice && event.target.parentNode) choice = event.target.parentNode.getAttribute('data-theme-choice');
    if (choice) applyTheme(choice, true);
  });
  document.getElementById('refresh-device').addEventListener('click', loadDevice);
  document.getElementById('photo-file').addEventListener('change', function () {
    var file = this.files && this.files[0];
    var reader;
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { text(document.getElementById('photo-message'), 'Choose an image smaller than 8 MB.'); return; }
    if (!/^image\/(jpeg|png|gif|webp|heic|heif)$/i.test(file.type)) { text(document.getElementById('photo-message'), 'Choose a JPEG, PNG, GIF, WebP, or HEIC image.'); return; }
    if (!window.confirm('Send “' + file.name + '” to the photo folder chosen on the computer?')) { this.value = ''; return; }
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
    text(pairError, 'Checking the code…');
    request('POST', '/api/pair', { code: code }, function (status, result) {
      if (status === 200 && result.token) {
        token = result.token;
        saveToken(token);
        text(pairError, '');
        showDesk(true);
        loadNotes();
      } else text(pairError, result.error || 'That code did not work. Check the Pocket Desk window.');
    });
  });

  document.getElementById('disconnect-button').addEventListener('click', function () {
    request('POST', '/api/unpair', {}, function (status) {
      clearToken();
      showDesk(false);
      text(pairError, status === 200 ? 'Disconnected. Enter the current code to reconnect.' : 'Disconnected here. Clear the session from the desktop app if needed.');
    });
  });

  document.getElementById('new-note').addEventListener('click', function () {
    showDrawingEditor(false);
    resetNoteForm();
    noteForm.style.display = 'block';
    document.getElementById('note-title').focus();
  });

  document.getElementById('new-drawing').addEventListener('click', newDrawing);
  document.getElementById('drawing-back').addEventListener('click', function () {
    if (drawingTimeout) window.clearTimeout(drawingTimeout);
    saveDrawingNow();
    showDrawingEditor(false);
    loadDrawings();
  });
  document.getElementById('drawing-title').addEventListener('input', drawingChanged);
  document.getElementById('drawing-tool').addEventListener('change', function () {
    document.getElementById('drawing-text-entry').style.display = this.value === 'text' ? 'block' : 'none';
  });
  document.getElementById('drawing-insert-text').addEventListener('click', insertDrawingText);
  document.getElementById('drawing-undo').addEventListener('click', function () {
    if (!drawingPages[activeDrawingPage] || !drawingPages[activeDrawingPage].items.length) return;
    drawingPages[activeDrawingPage].items.pop(); renderDrawingPage(activeDrawingPage); drawingChanged();
  });
  document.getElementById('drawing-clear').addEventListener('click', function () {
    if (!drawingPages[activeDrawingPage]) return;
    if (!window.confirm('Clear this page?')) return;
    drawingPages[activeDrawingPage].items = []; renderDrawingPage(activeDrawingPage); drawingChanged();
  });
  document.getElementById('drawing-list').addEventListener('click', drawingListClick);
  window.addEventListener('scroll', drawingScroll);
  window.addEventListener('resize', updateDrawingCanvases);

  document.getElementById('cancel-note').addEventListener('click', function () {
    noteForm.style.display = 'none';
    resetNoteForm();
  });

  noteForm.addEventListener('submit', function (event) {
    var id = document.getElementById('note-id').value;
    var data = { title: document.getElementById('note-title').value, body: document.getElementById('note-body').value };
    event.preventDefault();
    if (!data.body.replace(/^\s+|\s+$/g, '')) { text(document.getElementById('note-error'), 'Enter some text before saving.'); return; }
    request(id ? 'PUT' : 'POST', id ? '/api/notes/' + encodeURIComponent(id) : '/api/notes', data, function (status, result) {
      if (status === 200 || status === 201) {
        noteForm.style.display = 'none';
        resetNoteForm();
        text(notesMessage, 'Saved on this computer.');
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
      } else if (window.confirm('Delete this note?')) {
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
    var filePath = null;
    var fileMode = null;
    while (target && target !== this) {
      if (target.getAttribute) {
        directory = target.getAttribute('data-folder');
        parent = target.getAttribute('data-parent');
        filePath = target.getAttribute('data-file-path');
        fileMode = target.getAttribute('data-file-mode');
        if (directory !== null || parent !== null || filePath !== null) break;
      }
      target = target.parentNode;
    }
    if (directory !== null) loadFiles(directory);
    else if (parent !== null) loadFiles(parent);
    else if (filePath !== null) {
      event.preventDefault();
      text(document.getElementById('files-message'), fileMode === 'open' ? 'Opening file…' : 'Preparing download…');
      request('POST', '/api/files/link', { path: filePath, mode: fileMode }, function (status, result) {
        if (status === 200 && result.url) window.location.href = result.url;
        else text(document.getElementById('files-message'), result.error || 'Could not open that file.');
      });
    }
  });

  var savedTheme = 'paper';
  try { savedTheme = window.localStorage.getItem('pocket-desk-theme') || 'paper'; } catch (error) {}
  try { clock24 = window.localStorage.getItem('pocket-desk-clock-format') !== '12'; } catch (error) {}
  document.getElementById('clock-format').textContent = clock24 ? 'Switch to 12-hour' : 'Switch to 24-hour';
  applyTheme(savedTheme, false);
  loadTimer();
  clockTick();
  window.setInterval(clockTick, 500);
  token = readToken();
  if (token) {
    showDesk(true);
    loadNotes();
  } else showDesk(false);
}());
