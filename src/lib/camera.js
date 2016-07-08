const MouseEvent = {
  isLeftButton(event) {
    return event.which === 1;
  },
  isRightButton(event) {
    return event.which === 3;
  },
  isLeftButtonDown(event) {
    return event.button === 0 && this.isLeftButton(event);
  }
};

const halfCircle = Math.PI / 180;

class Controls {
  constructor(object, domElement) {
    this.object = object;
    this.target = new THREE.Vector3(0, 0, 0);
    this.domElement = domElement || document;
    this.lookSpeed = 0.20;
    this.mouseX = 0;
    this.mouseY = 0;
    this.lat = -66.59;
    this.lon = -31.8;
    this.deltaX = 0;
    this.deltaY = 0;
    this.mouseDragOn = false;
    this.anchorx = null;
    this.anchory = null;
    this.mouseLocked = false;
    this.defineBindings();
  }

  enableMouseLocked() {
    this.mouseLocked = true;
  }

  disableMouseLocked() {
    this.mouseLocked = false;
  }

  defineBindings() {
    $(document).mousemove(e => this.onMouseMove(e));
    $(this.domElement).mousedown(e => this.onMouseDown(e));
    $(this.domElement).mouseup(e => this.onMouseUp(e));
    $(this.domElement).mouseenter(e => this.onMouserEnter(e));
  }


  showCrosshair() {
    document.getElementById('cursor').style.display = 'block';
  }

  hideCrosshair() {
    document.getElementById('cursor').style.display = 'none';
  }

  onMouserEnter(event) {
    if (MouseEvent.isLeftButtonDown(event))
      return;

    this.onMouseUp(event);
  }

  onMouseDown(event) {
    if (!MouseEvent.isLeftButton(event))
      return;

    if (this.mouseLocked && this.domElement !== document)
      this.domElement.focus();

    this.anchorx = event.pageX;
    this.anchory = event.pageY;
    this.setMouse(this.anchorx, this.anchory);
    this.mouseDragOn = true;

    return false;
  }

  onMouseUp(event) {
    this.mouseDragOn = false;
    return false;
  }

  setMouse(x, y) {
    this.mouseX = x;
    this.mouseY = y;
    this.setDelta(x - this.anchorx, y - this.anchory);
  }

  setDelta(x, y) {
    this.deltaX = x;
    this.deltaY = y;
  }

  setDirection(dir) {
    return {lat: this.lat, lon: this.lon} = dir;
  }

  getDirection() {
    return {lat: this.lat, lon: this.lon};
  }

  onMouseMove(event) {
    if (this.mouseDragOn) {
      this.setMouse(event.pageX, event.pageY);
    } else if (this.mouseLocked) {
      const e = event.originalEvent;
      const x = e.movementX || e.mozMovementX || e.webkitMovementX;
      const y = e.movementY || e.mozMovementY || e.webkitMovementY;
      this.setDelta(x, y);
    }
    return;
  }

  viewDirection() {
    return this.target.clone().sub(this.object.position);
  }

  move(newPosition) {
    this.object.position = newPosition;
    this.updateLook();
  }

  updateLook() {
    const {sin, cos} = Math;
    const phi = (90 - this.lat) * halfCircle;
    const theta = this.lon * halfCircle;
    const {x, y, z} = this.object.position;
    assoc(this.target, {
      x: x + (100 * sin(phi) * cos(theta)),
      y: y + (100 * cos(phi)),
      z: z + (100 * sin(phi) * sin(theta))
    });
    this.object.lookAt(this.target);
  }

  update() {
    if (!this.mouseDragOn && !this.mouseLocked)
      return;
    if (this.mouseDragOn && this.mouseX === this.anchorx &&
      this.mouseY === this.anchory)
      return;

    const {max, min} = Math;
    if (this.mouseLocked) {
      if (this.deltaX === this.previousDeltaX &&
        this.deltaY === this.previousDeltaY)
        return;

      this.previousDeltaX = this.deltaX;
      this.previousDeltaY = this.deltaY;
      this.anchorx = window.innerWidth/2;
      this.anchory = window.innerHeight/2;
    } else if (this.mouseDragOn) {
      if (this.mouseX === this.anchorx && this.mouseY === this.anchory)
        return;

      this.anchorx = this.mouseX;
      this.anchory = this.mouseY;
    }

    this.lon += this.deltaX * this.lookSpeed;
    this.lat -= this.deltaY * this.lookSpeed;
    this.lat = max(-85, min(85, this.lat));
    this.updateLook();
  }
}
