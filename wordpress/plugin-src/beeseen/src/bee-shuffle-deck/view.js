(function () {
  function numAttr(el, name, fallback) {
    var v = Number(el.getAttribute(name));
    return Number.isFinite(v) ? v : fallback;
  }

  function readCfg(root) {
    return {
      throwX: numAttr(root, 'data-throw-x', 140),
      throwY: numAttr(root, 'data-throw-y', -40),
      throwRot: numAttr(root, 'data-throw-rot', 16),
      throwMs: numAttr(root, 'data-throw-ms', 420),
    };
  }

  function getTopCard(stack) {
    var cards = stack.querySelectorAll('.bee-shuffle__card');
    if (!cards.length) return null;
    return cards[cards.length - 1]; // last is visually on top
  }

  function initDeck(root) {
    var deck = root.querySelector('.bee-shuffle__deck');
    var stack = root.querySelector('.bee-shuffle__stack');
    if (!deck || !stack) return;

    var busy = false;

    function run() {
      if (busy) return;

      var top = getTopCard(stack);
      if (!top) return;

      var cfg = readCfg(root);
      busy = true;

      top.style.setProperty('--bee-throw-ms', cfg.throwMs + 'ms');
      top.style.setProperty('--bee-throw-x', cfg.throwX + 'px');
      top.style.setProperty('--bee-throw-y', cfg.throwY + 'px');
      top.style.setProperty('--bee-throw-rot', cfg.throwRot + 'deg');

      top.classList.add('is-throwing');

      function onDone(e) {
        if (e && e.target !== top) return;

        // Move TOP (last) card to the bottom (front of DOM)
        stack.insertBefore(top, stack.firstChild);

        top.classList.remove('is-throwing');

        // reflow helps ensure the reset transform applies cleanly
        void top.offsetHeight;

        busy = false;
      }

      top.addEventListener('transitionend', onDone, { once: true });
    }

    stack.addEventListener('click', function (e) {
      // Let links work; don’t shuffle when a link is clicked
      if (e.target && e.target.closest && e.target.closest('a')) return;
      run();
    });

    deck.tabIndex = 0;
    deck.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        run();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document
      .querySelectorAll('.wp-block-beeseen-bee-shuffle-deck')
      .forEach(function (root) {
        initDeck(root);
      });
  });
})();
