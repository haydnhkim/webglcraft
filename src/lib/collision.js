const CollisionUtils = {
  // The two intervals are [s1, f1] and [s2, f2]
  testIntervalCollision(s1, f1, s2, f2) {
    if (s1 === s2)
      return true;

    if (s1 < s2)
      return f1 >= s2;

    return f2 >= s1;
  },

  //Cubes are objects with vmax, vmin (the vertices with greatest/smallest values)
  //properties. Assumes unrotated cubes.
  testCubeCollision(cube1, cube2) {
    const fcol = this.testIntervalCollision;
    const iterable = ['x', 'y', 'z'];

    for (let i = 0; i < iterable.length; i++) {
      const axis = iterable[i];
      const collides = fcol(cube1.vmin[axis], cube1.vmax[axis],
        cube2.vmin[axis], cube2.vmax[axis]);
      if (!collides)
        return false;
    }

    return true;
  }
};
