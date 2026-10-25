// The reader. Plain ES5 with no build step, because the iPad 2 stops at iOS 9.3.5.
(function () {
  'use strict';

  var PDFJS_DIR = 'vendor/pdfjs-2.6.347/';
  var CACHE_SIZE = 6;
  var SWIPE_MIN = 40;

  var stage = document.getElementById('stage');
  var pagesBox = document.getElementById('pages');
  var welcome = document.getElementById('welcome');
  var bar = document.getElementById('bar');
  var fileInput = document.getElementById('file');
  var macButton = document.getElementById('mac');
  var coverButton = document.getElementById('cover');
  var updateButton = document.getElementById('update');
  var where = document.getElementById('where');
  var list = document.getElementById('list');
  var listItems = document.getElementById('list-items');
  var message = document.getElementById('message');

  var doc = null;      // the open PDF
  var docKey = '';     // name and size, to remember the page
  var spreads = [];
  var index = 0;
  var coverAlone = true;
  var renderToken = 0;
  var cache = {};      // rendered canvases by page and target size
  var cacheOrder = [];
  var lastTouch = 0;

  // Storage can throw in private browsing, so every call is guarded.
  function load(key) {
    try {
      return JSON.parse(window.localStorage.getItem(key)) || null;
    } catch (e) {
      return null;
    }
  }

  function save(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      // Nothing to do: the page is simply not remembered.
    }
  }

  function showMessage(text) {
    message.textContent = text;
    message.hidden = !text;
  }

  // PDF.js is big for an iPad 2, so it loads on the first open only.
  var pdfjsReady = null;
  function pdfjs() {
    if (!pdfjsReady) {
      pdfjsReady = new Promise(function (resolve, reject) {
        var script = document.createElement('script');
        script.src = PDFJS_DIR + 'pdf.min.js';
        script.onload = function () {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_DIR + 'pdf.worker.min.js';
          resolve(window.pdfjsLib);
        };
        script.onerror = function () {
          pdfjsReady = null;
          reject(new Error('The PDF engine could not load.'));
        };
        document.body.appendChild(script);
      });
    }
    return pdfjsReady;
  }

  function twoUp() {
    return stage.clientWidth > stage.clientHeight;
  }

  function currentPage() {
    return spreads.length ? spreads[index][0] : 1;
  }

  function rebuild(page) {
    spreads = Spreads.build(doc.numPages, twoUp(), coverAlone);
    index = Spreads.indexOf(spreads, page);
  }

  function showCover() {
    coverButton.setAttribute('aria-pressed', String(coverAlone));
    coverButton.textContent = 'Cover alone: ' + (coverAlone ? 'on' : 'off');
  }

  function remember() {
    save('ipr:' + docKey, { page: currentPage(), cover: coverAlone });
  }

  function dropCanvas(canvas) {
    // iOS keeps canvas memory until the size is zero.
    canvas.width = 0;
    canvas.height = 0;
  }

  function cachePut(key, canvas) {
    cache[key] = canvas;
    cacheOrder.push(key);
    while (cacheOrder.length > CACHE_SIZE) {
      var old = cacheOrder.shift();
      if (cache[old] && cache[old].parentNode !== pagesBox) {
        dropCanvas(cache[old]);
      }
      delete cache[old];
    }
  }

  function clearCache() {
    for (var key in cache) {
      if (cache.hasOwnProperty(key)) {
        dropCanvas(cache[key]);
      }
    }
    cache = {};
    cacheOrder = [];
  }

  // Renders one page to fit a box of the given CSS size.
  function renderPage(number, boxWidth, boxHeight) {
    var key = number + '@' + boxWidth + 'x' + boxHeight;
    if (cache[key]) {
      return Promise.resolve(cache[key]);
    }
    return doc.getPage(number).then(function (page) {
      var base = page.getViewport({ scale: 1 });
      var scale = Math.min(boxWidth / base.width, boxHeight / base.height);
      var ratio = window.devicePixelRatio || 1;
      var viewport = page.getViewport({ scale: scale * ratio });
      var canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = Math.floor(viewport.width / ratio) + 'px';
      canvas.style.height = Math.floor(viewport.height / ratio) + 'px';
      canvas.setAttribute('aria-label', 'Page ' + number);
      return page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise.then(function () {
        cachePut(key, canvas);
        return canvas;
      });
    });
  }

  function renderSpread(i) {
    var spread = spreads[i];
    var width = Math.floor(stage.clientWidth / spread.length);
    var height = stage.clientHeight;
    return Promise.all(spread.map(function (number) {
      return renderPage(number, width, height);
    }));
  }

  function show() {
    var token = ++renderToken;
    var i = index;
    where.textContent = Spreads.label(spreads[i], doc.numPages);
    renderSpread(i).then(function (canvases) {
      if (token !== renderToken) {
        return;
      }
      while (pagesBox.firstChild) {
        pagesBox.removeChild(pagesBox.firstChild);
      }
      canvases.forEach(function (canvas) {
        pagesBox.appendChild(canvas);
      });
      // Get the next pages ready so the turn is instant, then the previous ones.
      if (i + 1 < spreads.length) {
        renderSpread(i + 1).then(function () {
          if (i > 0 && token === renderToken) {
            renderSpread(i - 1);
          }
        });
      }
    }).catch(function (error) {
      showMessage('This page could not be shown: ' + error.message);
    });
  }

  function turn(step) {
    if (!doc) {
      return;
    }
    var next = index + step;
    if (next < 0 || next >= spreads.length) {
      return;
    }
    index = next;
    remember();
    show();
  }

  function open(name, size, data) {
    showMessage('Opening ' + name + '…');
    pdfjs().then(function (lib) {
      return lib.getDocument({ data: data }).promise;
    }).then(function (pdf) {
      if (doc) {
        doc.destroy();
      }
      clearCache();
      doc = pdf;
      docKey = name + ':' + size;
      var saved = load('ipr:' + docKey);
      coverAlone = saved ? saved.cover !== false : true;
      showCover();
      rebuild(saved ? saved.page : 1);
      welcome.hidden = true;
      bar.className = 'away';
      showMessage('');
      show();
    }).catch(function (error) {
      showMessage('This file could not be opened as a PDF: ' + error.message);
    });
  }

  fileInput.addEventListener('change', function () {
    var file = fileInput.files && fileInput.files[0];
    if (!file) {
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      open(file.name, file.size, new Uint8Array(reader.result));
    };
    reader.onerror = function () {
      showMessage('The file could not be read.');
    };
    reader.readAsArrayBuffer(file);
    fileInput.value = '';
  });

  coverButton.addEventListener('click', function () {
    coverAlone = !coverAlone;
    showCover();
    if (doc) {
      rebuild(currentPage());
      remember();
      show();
    }
  });

  // When the Mac serves the app, it also lists the PDFs of its folder.
  function get(url, type, done) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.responseType = type;
    xhr.onload = function () {
      done(xhr.status === 200 ? xhr.response : null);
    };
    xhr.onerror = function () {
      done(null);
    };
    xhr.send();
  }

  function fromMac(item) {
    list.hidden = true;
    showMessage('Loading ' + item.name + '…');
    get('pdfs/' + encodeURIComponent(item.name), 'arraybuffer', function (buffer) {
      if (!buffer) {
        showMessage('The Mac did not send ' + item.name + '.');
        return;
      }
      open(item.name, item.size, new Uint8Array(buffer));
    });
  }

  function fillList(items) {
    while (listItems.firstChild) {
      listItems.removeChild(listItems.firstChild);
    }
    items.forEach(function (item) {
      var li = document.createElement('li');
      var button = document.createElement('button');
      button.type = 'button';
      button.textContent = item.name;
      button.addEventListener('click', function () {
        fromMac(item);
      });
      li.appendChild(button);
      listItems.appendChild(li);
    });
  }

  macButton.addEventListener('click', function () {
    get('pdfs.json', 'text', function (text) {
      var items = null;
      try {
        items = JSON.parse(text);
      } catch (e) {
        items = null;
      }
      if (!items) {
        showMessage('The Mac is not reachable.');
        return;
      }
      fillList(items);
      list.hidden = false;
    });
  });

  document.getElementById('list-close').addEventListener('click', function () {
    list.hidden = true;
  });

  get('pdfs.json', 'text', function (text) {
    macButton.hidden = !text || text.charAt(0) !== '[';
  });

  // Tap zones and swipes. Pinch zoom stays free, and swipes pause while zoomed.
  function zoomed() {
    return window.innerWidth < document.documentElement.clientWidth - 1;
  }

  function tapAt(x) {
    var width = stage.clientWidth;
    if (!doc || (x > width * 0.3 && x < width * 0.7)) {
      bar.className = bar.className ? '' : 'away';
      showMessage('');
    } else {
      turn(x <= width * 0.3 ? -1 : 1);
    }
  }

  var start = null;
  stage.addEventListener('touchstart', function (event) {
    if (event.touches.length > 1) {
      start = null;
      return;
    }
    var touch = event.touches[0];
    start = { x: touch.clientX, y: touch.clientY };
  });

  stage.addEventListener('touchend', function (event) {
    lastTouch = Date.now();
    if (!start || event.touches.length > 0 || zoomed()) {
      start = null;
      return;
    }
    var touch = event.changedTouches[0];
    var dx = touch.clientX - start.x;
    var dy = touch.clientY - start.y;
    start = null;
    // Stops the double-tap zoom and the click that would follow the tap.
    if (event.cancelable) {
      event.preventDefault();
    }
    if (Math.abs(dx) > SWIPE_MIN && Math.abs(dx) > Math.abs(dy)) {
      turn(dx < 0 ? 1 : -1);
    } else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      tapAt(touch.clientX);
    }
  });

  stage.addEventListener('click', function (event) {
    if (Date.now() - lastTouch > 800) {
      tapAt(event.clientX);
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.keyCode === 37) {
      turn(-1);
    } else if (event.keyCode === 39 || event.keyCode === 32) {
      turn(1);
    }
  });

  // Turning the iPad switches between one and two pages. Pinch zoom also fires
  // resize, so only a real change of the screen size counts.
  var resizeTimer = 0;
  var stageSize = stage.clientWidth + 'x' + stage.clientHeight;
  window.addEventListener('resize', function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      var size = stage.clientWidth + 'x' + stage.clientHeight;
      if (size === stageSize) {
        return;
      }
      stageSize = size;
      if (doc) {
        var page = currentPage();
        clearCache();
        rebuild(page);
        show();
      }
    }, 250);
  });

  // A new version was cached in the background: apply it now if nothing is open.
  var appCache = window.applicationCache;
  if (appCache) {
    appCache.addEventListener('updateready', function () {
      if (doc) {
        updateButton.hidden = false;
      } else {
        window.location.reload();
      }
    });
  }

  updateButton.addEventListener('click', function () {
    window.location.reload();
  });
})();
