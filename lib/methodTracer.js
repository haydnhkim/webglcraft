class MethodTracer {
  constructor() {
    this.tracer = {};
  }

  trace(clasname) {
    const clas = eval(clasname);
    const ref = clas.prototype;
    for (let name in ref) {
      if (!ref.hasOwnProperty(name))
        continue;
      const f = ref[name];
      if (!(typeof f === 'function')) {
        continue;
      }
      const uniqueId = `${clasname}#${name}`;
      const tracer = this.tracer;
      tracer[uniqueId] = false;
      clas.prototype[name] = function() {
        let args;
        args = 1 <= arguments.length ? Array.prototype.slice.call(arguments, 0) : [];
        tracer[uniqueId] = true;
        return f.apply(null, args);
      };
    }
    return this;
  }

  traceClasses(classNames) {
    const iterable = classNames.split(' ');
    for (let i = 0; i < iterable.length; i++) {
      const clas = iterable[i];
      this.trace(clas);
    }
    return this;
  }

  traceModule(module, moduleName) {
    for (let name in module) {
      if (!module.hasOwnProperty(name))
        continue;
      const f = module[name];
      if (!(typeof f === 'function')) {
        continue;
      }
      const uniqueId = "Module " + moduleName + "#" + name;
      const tracer = this.tracer;
      tracer[uniqueId] = false;
      module[name] = this.wrapfn(module, uniqueId, f);
    }
    return this;
  }

  wrapfn(module, uniqueId, f) {
    return () => {
      const args = 1 <= arguments.length ? Array.prototype.slice.call(arguments, 0) : [];
      this.tracer[uniqueId] = true;
      return f.apply(module, args);
    };
  }

  printUnused() {
    const ref = this.tracer;
    for (let id in ref) {
      if (!ref.hasOwnProperty(id))
        continue;
      const used = ref[id];
      if (!used) {
        puts(id);
      }
    }
    return this;
  }
}
