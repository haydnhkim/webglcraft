const Blocks = ["cobblestone", "plank", "brick", "diamond",
  "glowstone", "obsidian", "whitewool", "bluewool", "redwool", "netherrack"];

const blockImg = name => {
  return `
    <img
      width="32" height="32" src="./textures/${name}icon.png" id="${name}"
    />
  `;
};

const setOpacity = (target, val) => {
  $(`#${target}`).css({opacity: val});
};


class BlockSelection {
  constructor(game) {
    this.game = game;
    this.current = 'cobblestone';
  }

  mousedown(e) {
    if (e.target === this)
      return false;

    this.select(e.target.id);
    return false;
  }

  mousewheel(delta) {
    const dif = (delta >= 0 ? 1 : -1);
    const index = (Blocks.indexOf(this.current) - dif).mod(Blocks.length);
    this.select(Blocks[index]);
  }

  ligthUp(target) {
    setOpacity(target, 0.8);
  }

  lightOff(target) {
    setOpacity(target, 1);
  }

  select(name) {
    if (this.current === name)
      return;

    this.game.selectCubeBlock(name);
    this.ligthUp(name);
    this.lightOff(this.current);
    this.current = name;
  }

  insert() {
    const blockList = Blocks.map(b => blockImg(b));
    const domElement = $("#minecraft-blocks");
    domElement.append(blockList.join(''));
    this.ligthUp(this.current);
    domElement.mousedown(e => this.mousedown(e));
    $(document).mousewheel((e, delta) => this.mousewheel(delta));
    domElement.show();
  }
};
