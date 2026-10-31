(function () {
  function request(method, path, data, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, path, true);
    xhr.setRequestHeader('Accept', 'application/json');
    if (data !== null) xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      var result = {};
      try { result = xhr.responseText ? JSON.parse(xhr.responseText) : {}; } catch (error) {}
      callback(xhr.status, result);
    };
    xhr.onerror = function () { callback(0, { error: 'The local control page cannot reach Pocket Desk.' }); };
    xhr.send(data === null ? null : JSON.stringify(data));
  }

  function update() {
    request('GET', '/api/status', null, function (status, result) {
      var state = document.getElementById('host-state');
      var codeCard = document.getElementById('code-card');
      var pairedCard = document.getElementById('paired-card');
      if (status !== 200) {
        state.innerHTML = '<span class="status-lamp"></span> DESK SERVER NOT RUNNING';
        codeCard.style.display = 'none';
        pairedCard.style.display = 'none';
        document.getElementById('host-message').textContent = result.error || 'Start the server again to reconnect.';
        return;
      }
      document.getElementById('host-message').textContent = '';
      if (result.paired) {
        state.innerHTML = '<span class="status-lamp"></span> DEVICE CONNECTED';
        codeCard.style.display = 'none';
        pairedCard.style.display = 'block';
      } else {
        state.innerHTML = '<span class="status-lamp"></span> READY TO PAIR';
        pairedCard.style.display = 'none';
        codeCard.style.display = 'block';
        document.getElementById('pairing-code').textContent = result.code || '······';
        document.getElementById('code-expiry').textContent = result.seconds_left > 0 ? 'Code refreshes in about ' + result.seconds_left + ' seconds.' : 'A fresh code is being prepared.';
      }
    });
  }

  document.getElementById('host-disconnect').addEventListener('click', function () {
    if (!window.confirm('Disconnect the connected device? It will need the new code to reconnect.')) return;
    request('POST', '/api/disconnect', {}, function (status, result) {
      document.getElementById('host-message').textContent = status === 200 ? 'Device disconnected. A new code is ready.' : (result.error || 'Could not disconnect the device.');
      update();
    });
  });

  update();
  window.setInterval(update, 3000);
}());
