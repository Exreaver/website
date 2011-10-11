var Dz = {
    remoteWindows: [],
    idx: -1,
    step: 0,
    slides: null
};

Dz.init = function() {
    document.body.className = "loaded";
    this.slides = $$("body > section");
    this.onhashchange();
    this.setupTouchEvents();
    this.onresize();
}

Dz.onkeydown = function(aEvent) {
// Don't intercept keyboard shortcuts
    if (aEvent.altKey
      || aEvent.ctrlKey
      || aEvent.metaKey
      || aEvent.shiftKey) {
      return;
    }
    if ( aEvent.keyCode == 37 // left arrow
      || aEvent.keyCode == 38 // up arrow
      || aEvent.keyCode == 33 // page up
    ) {
        aEvent.preventDefault();
        this.back();
    }
    if ( aEvent.keyCode == 39 // right arrow
      || aEvent.keyCode == 40 // down arrow
      || aEvent.keyCode == 34 // page down
    ) {
        aEvent.preventDefault();
        this.forward();
    }
    if (aEvent.keyCode == 35) { // end
        aEvent.preventDefault();
        this.goEnd();
    }
    if (aEvent.keyCode == 36) { // home
        aEvent.preventDefault();
        this.goStart();
    }
    if (aEvent.keyCode == 32) { // space
        aEvent.preventDefault();
        this.toggleContent();
    }
}

/* Touch Events */

Dz.setupTouchEvents = function() {
    var orgX, newX;
    var tracking = false;
    
    var db = document.body;
    db.addEventListener("touchstart", start.bind(this), false);
    db.addEventListener("touchmove", move.bind(this), false);

    function start(aEvent) {
        aEvent.preventDefault();
        tracking = true;
        orgX = aEvent.changedTouches[0].pageX;
    }

    function move(aEvent) {
        if (!tracking) return;
        newX = aEvent.changedTouches[0].pageX;
        if (orgX - newX > 100) {
            tracking = false;
            this.forward();
        } else {
            if (orgX - newX < -100) {
                tracking = false;
                this.back();
            }
        }
    }
}

/* Adapt the size of the slides to the window */

Dz.onresize = function() {
    var db = document.body;
    var sx = db.clientWidth / window.innerWidth;
    var sy = db.clientHeight / window.innerHeight;
    var transform = "scale(" + (1/Math.max(sx, sy)) + ")";
    
    db.style.MozTransform = transform;
    db.style.WebkitTransform = transform;
    db.style.OTransform = transform;
    db.style.msTransform = transform;
    db.style.transform = transform;
}


Dz.getDetails = function(aIdx) {
    var s = $("section:nth-of-type(" + aIdx + ")");
    var d = s.$("details");
    return d ? d.innerHTML : "";
}

Dz.onmessage = function(aEvent) {
var msg = aEvent.data;
var win = aEvent.source;
if (msg === "register") {
  this.remoteWindows.push(win);
  win.postMessage(JSON.stringify({
    method: "registered",
    title: document.title,
    count: this.slides.length
  }), "*");
  win.postMessage(JSON.stringify({
    method: "newslide",
    details: this.getDetails(this.idx),
    idx: this.idx
  }), "*");
  return;
}
if (msg === "back") this.back();
if (msg === "forward") this.forward();
if (msg === "toggleContent") this.toggleContent();
// setSlide(42)
var r = /setSlide\((\d+)\)/.exec(msg);
if (r) {
    this.setCursor(r[1], 0);
}
}

Dz.toggleContent = function() {
// If a Video is present in this new slide, play it.
// If a Video is present in the previous slide, stop it.
var s = $("section[aria-selected]");
if (s) {
  var video = s.$("video");
  if (video) {
    if (video.ended || video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }
}
}

Dz.setCursor = function(aIdx, aStep) {
// If the user change the slide number in the URL bar, jump
// to this slide.
    aStep = (aStep != 0 && typeof aStep !== "undefined") ? "." + aStep : "";
    window.location.hash = "#" + aIdx + aStep;
}

Dz.onhashchange = function() {
var cursor = window.location.hash.split("#"),
    newidx = 1,
    newstep = 0;
if (cursor.length == 2) {
  newidx = ~~cursor[1].split(".")[0];
  newstep = ~~cursor[1].split(".")[1];
}
if (newidx != this.idx) {
  this.setSlide(newidx);
}
if (newstep != this.step) {
  this.setIncremental(newstep);
}
}

Dz.back = function() {
if (this.idx == 1 && this.step == 0) {
  return;
}
if (this.step == 0) {
  this.setCursor(this.idx - 1,
                 this.slides[this.idx - 2].$$('.incremental > *').length);
} else {
  this.setCursor(this.idx, this.step - 1);
}
}

Dz.forward = function() {
if (this.idx >= this.slides.length &&
    this.step >= this.slides[this.idx - 1].$$('.incremental > *').length) {
    return;
}
if (this.step >= this.slides[this.idx - 1].$$('.incremental > *').length) {
  this.setCursor(this.idx + 1, 0);
} else {
  this.setCursor(this.idx, this.step + 1);
}
}

Dz.goStart = function() {
this.setCursor(1, 0);
}

Dz.goEnd = function() {
var lastIdx = this.slides.length;
var lastStep = this.slides[lastIdx - 1].$$('.incremental > *').length;
this.setCursor(lastIdx, lastStep);
}

Dz.setSlide = function(aIdx) {
this.idx = aIdx;
var old = $("section[aria-selected]");
var next = $("section:nth-of-type("+ this.idx +")");
if (old) {
  old.removeAttribute("aria-selected");
  var video = old.$("video");
  if (video) {
    video.pause();
  }
}
if (next) {
  next.setAttribute("aria-selected", "true");
  var video = next.$("video");
  if (video) {
    video.play();
  }
} else {
  // That should not happen
  this.idx = -1;
  // console.warn("Slide doesn't exist.");
}
for (var i = 0; i < this.remoteWindows.length; i++) {
  this.remoteWindows[i].postMessage(JSON.stringify({
    method: "newslide",
    details: this.getDetails(this.idx),
    idx: this.idx
  }), "*");
}
}

Dz.setIncremental = function(aStep) {
this.step = aStep;
var old = this.slides[this.idx - 1].$('.incremental > *[aria-selected]');
if (old) {
  old.removeAttribute('aria-selected');
}
var incrementals = this.slides[this.idx - 1].$$('.incremental');
if (this.step <= 0) {
  incrementals.forEach(function(aNode) {
    aNode.removeAttribute('active');
  });
  return;
}
var next = this.slides[this.idx - 1].$$('.incremental > *')[this.step - 1];
if (next) {
  next.setAttribute('aria-selected', true);
  next.parentNode.setAttribute('active', true);
  var found = false;
  incrementals.forEach(function(aNode) {
    if (aNode != next.parentNode)
      if (found)
        aNode.removeAttribute('active');
      else
        aNode.setAttribute('active', true);
    else
      found = true;
  });
} else {
  setCursor(this.idx, 0);
}
return next;
}

window.onload = Dz.init.bind(Dz);
window.onkeydown = Dz.onkeydown.bind(Dz);
window.onresize = Dz.onresize.bind(Dz);
window.onhashchange = Dz.onhashchange.bind(Dz);
window.onmessage = Dz.onmessage.bind(Dz);


// Helpers
if (!Function.prototype.bind) {
Function.prototype.bind = function (oThis) {

  // closest thing possible to the ECMAScript 5 internal IsCallable
  // function 
  if (typeof this !== "function")
  throw new TypeError(
    "Function.prototype.bind - what is trying to be fBound is not callable"
  );

  var aArgs = Array.prototype.slice.call(arguments, 1),
      fToBind = this,
      fNOP = function () {},
      fBound = function () {
        return fToBind.apply( this instanceof fNOP ? this : oThis || window,
               aArgs.concat(Array.prototype.slice.call(arguments)));
      };

  fNOP.prototype = this.prototype;
  fBound.prototype = new fNOP();

  return fBound;
};
}

var $ = (HTMLElement.prototype.$ = function(aQuery) {
return this.querySelector(aQuery);
}).bind(document);

var $$ = (HTMLElement.prototype.$$ = function(aQuery) {
return this.querySelectorAll(aQuery);
}).bind(document);

NodeList.prototype.forEach = function(fun) {
if (typeof fun !== "function") throw new TypeError();
for (var i = 0; i < this.length; i++) {
  fun.call(this, this[i]);
}
}
