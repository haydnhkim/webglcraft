patch(Number, {
  mod(arg) {
    if (this >= 0) { return this % arg; }
    return (this + arg) % arg;
  },

  div(arg) {
    return Math.floor(this / arg);
  },

  times(fn) {
    let i = 0;
    return (() => { let result = []; while (i < this) {
      result.push(fn(i++));
    } return result; })();
  },

  toRadians() {
    return (this * Math.PI) / 180;
  },

  toDegrees() {
    return (this * 180) / Math.PI;
  }
});


function assoc(o, i) {
  for (let k in i) {
    const v = i[k];
    o[k] = v;
  }
  return o;
}
