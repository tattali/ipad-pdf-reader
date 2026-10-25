// Which pages share the screen. Plain ES5: iOS 9 Safari runs it as is.
(function (root) {
  'use strict';

  function build(numPages, twoUp, coverAlone) {
    var spreads = [];
    var page = 1;
    if (twoUp && coverAlone) {
      spreads.push([1]);
      page = 2;
    }
    while (page <= numPages) {
      if (twoUp && page + 1 <= numPages) {
        spreads.push([page, page + 1]);
        page += 2;
      } else {
        spreads.push([page]);
        page += 1;
      }
    }
    return spreads;
  }

  function indexOf(spreads, page) {
    for (var i = 0; i < spreads.length; i++) {
      if (spreads[i].indexOf(page) !== -1) {
        return i;
      }
    }
    return 0;
  }

  function label(spread, numPages) {
    var pages = spread.length === 2 ? spread[0] + '–' + spread[1] : String(spread[0]);
    return pages + ' / ' + numPages;
  }

  root.Spreads = { build: build, indexOf: indexOf, label: label };
})(this);
