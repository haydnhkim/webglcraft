const instructions = {
  leftclick: "Remove block",
  rightclick: "Add block",
  drag: "Drag with the left mouse clicked to move the camera",
  save: "Save map",
  pause: "Pause/Unpause",
  space: "Jump",
  wasd: "WASD keys to move"
};

class Instructions {
  constructor(callback) {
    this.callback = callback;
    this.domElement = $('#instructions');
  }

  intructionsBody() {
    this.domElement.append(`
      <div id='instructionsContent'>
        <h1>Click to start</h1>
        <table>${this.lines()}</table>
      </div>
    `);
    $("#instructionsContent").mousedown(() => {
      this.domElement.hide();
      return this.callback();
    });
  }

  ribbon() {
    return `
      <a href="https://github.com/danielribeiro/WebGLCraft" target="_blank">
        <img
          style="position: fixed; top: 0; right: 0; border: 0;"
          src="http://s3.amazonaws.com/github/ribbons/forkme_right_darkblue_121621.png"
          alt="Fork me on GitHub"
        />
      </a>`
  }

  insert() {
    this.setBoder();
    this.intructionsBody();
    const minecraft = "<a href='http://www.minecraft.net/' target='_blank'>Minecraft</a>";
    const legal = `<div>Not affiliated with Mojang. ${minecraft} is a trademark of Mojang</div>`;
    const hnimage = '<img class="alignnone" title="hacker news" src="http://1.gravatar.com/blavatar/96c849b03aefaf7ef9d30158754f0019?s=20" alt="" width="20" height="20" />';
    const hnlink = `<div>Comment on  ${hnimage} <a href='http://news.ycombinator.com/item?id=3376620'  target='_blank'>Hacker News</a></div>`;
    this.domElement.append(legal + hnlink + this.ribbon());
    return this.domElement.show();
  }

  lines() {
    const ret = Object.keys(instructions).map(key => this.line(key))
    return ret.join(' ');
  }

  line(name) {
    const inst = instructions[name];
    return `
      <tr>
        <td class='image'>${this.img(name)}</td>
        <td class='label'>${inst}</td>
      </tr>
    `;
  }

  setBoder() {
    this.domElement.css('border-radius', '10px');
  }

  img(name) {
    return `<img src='./instructions/${name}.png'/>`;
  }
}
