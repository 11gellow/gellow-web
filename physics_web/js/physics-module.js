(function (global) {
  "use strict";

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  class PhysicsMenu {
    constructor(options) {
      if (!global.Matter) {
        throw new Error("Matter.js is required before physics-module.js");
      }

      this.Matter = global.Matter;
      this.canvas = options.canvas;
      this.items = options.items || [];
      this.onOpen = typeof options.onOpen === "function" ? options.onOpen : null;
      this.cooldown = options.cooldown || 1300;
      this.bodies = [];
      this.walls = [];
      this.cupBodies = [];
      this.lastOpenAt = new Map();
      this.resizeTimer = 0;
      this.pixelRatio = Math.min(global.devicePixelRatio || 1, 2);

      this.init();
    }

    init() {
      const { Engine, Render, Runner, Events, Mouse, MouseConstraint, Composite } =
        this.Matter;

      this.engine = Engine.create();
      this.engine.gravity.y = 0.92;
      this.world = this.engine.world;
      this.measure();

      this.render = Render.create({
        canvas: this.canvas,
        engine: this.engine,
        options: {
          width: this.width,
          height: this.height,
          pixelRatio: this.pixelRatio,
          background: "transparent",
          wireframes: false,
          showAngleIndicator: false,
        },
      });

      this.runner = Runner.create();
      this.buildStaticWorld();
      this.spawnItems();

      this.mouse = Mouse.create(this.render.canvas);
      this.mouseConstraint = MouseConstraint.create(this.engine, {
        mouse: this.mouse,
        constraint: {
          stiffness: 0.18,
          damping: 0.08,
          render: { visible: false },
        },
      });
      Composite.add(this.world, this.mouseConstraint);
      this.render.mouse = this.mouse;

      Events.on(this.engine, "collisionStart", (event) => {
        event.pairs.forEach((pair) => this.handleCollision(pair.bodyA, pair.bodyB));
      });

      Events.on(this.render, "afterRender", () => this.drawOverlay());
      global.addEventListener("resize", () => this.requestResize());

      Render.run(this.render);
      Runner.run(this.runner, this.engine);
    }

    measure() {
      const parent = this.canvas.parentElement || document.body;
      this.width = Math.max(320, parent.clientWidth || global.innerWidth);
      this.height = Math.max(360, parent.clientHeight || global.innerHeight);
    }

    requestResize() {
      global.clearTimeout(this.resizeTimer);
      this.resizeTimer = global.setTimeout(() => this.resize(), 120);
    }

    resize() {
      const { Render } = this.Matter;
      this.measure();
      this.render.options.width = this.width;
      this.render.options.height = this.height;
      this.render.bounds.max.x = this.width;
      this.render.bounds.max.y = this.height;
      Render.setPixelRatio(this.render, this.pixelRatio);
      this.buildStaticWorld();
      this.bodies.forEach((body, index) => this.placeBody(body, index, true));
    }

    buildStaticWorld() {
      const { Bodies, Composite } = this.Matter;
      const wallSize = 90;

      if (this.walls.length) Composite.remove(this.world, this.walls);
      if (this.cupBodies.length) Composite.remove(this.world, this.cupBodies);

      this.walls = [
        Bodies.rectangle(this.width / 2, this.height + wallSize / 2, this.width + wallSize * 2, wallSize, {
          isStatic: true,
          render: { visible: false },
        }),
        Bodies.rectangle(-wallSize / 2, this.height / 2, wallSize, this.height + wallSize * 2, {
          isStatic: true,
          render: { visible: false },
        }),
        Bodies.rectangle(this.width + wallSize / 2, this.height / 2, wallSize, this.height + wallSize * 2, {
          isStatic: true,
          render: { visible: false },
        }),
      ];

      const cupWidth = clamp(this.width * 0.14, 118, 168);
      const cupHeight = clamp(this.height * 0.22, 118, 166);
      const cupX = Math.min(36 + cupWidth / 2, this.width - cupWidth / 2 - 24);
      const cupY = this.height - cupHeight / 2 - 32;
      const side = 14;

      this.cup = {
        x: cupX,
        y: cupY,
        width: cupWidth,
        height: cupHeight,
      };

      const leftWall = Bodies.rectangle(cupX - cupWidth / 2, cupY, side, cupHeight, {
        isStatic: true,
        render: { visible: false },
      });
      const rightWall = Bodies.rectangle(cupX + cupWidth / 2, cupY, side, cupHeight, {
        isStatic: true,
        render: { visible: false },
      });
      const bottomWall = Bodies.rectangle(cupX, cupY + cupHeight / 2, cupWidth + side, side, {
        isStatic: true,
        render: { visible: false },
      });
      const sensor = Bodies.rectangle(cupX, cupY + 8, cupWidth - 34, cupHeight - 28, {
        isSensor: true,
        isStatic: true,
        render: { visible: false },
      });
      sensor.plugin.gellowCupSensor = true;

      this.cupBodies = [leftWall, rightWall, bottomWall, sensor];
      Composite.add(this.world, this.walls.concat(this.cupBodies));
    }

    spawnItems() {
      const { Composite } = this.Matter;
      this.bodies = this.items.map((item, index) => this.createBody(item, index));
      Composite.add(this.world, this.bodies);
    }

    createBody(item, index) {
      const { Bodies } = this.Matter;
      const color = item.color || "#46a7ff";
      const options = {
        restitution: 0.78,
        friction: 0.14,
        frictionAir: 0.018,
        density: 0.0016,
        render: {
          fillStyle: color,
          strokeStyle: "#151515",
          lineWidth: 2,
        },
      };

      let body;
      const labelWidth = Math.max(84, item.label.length * 15 + 34);
      const size = item.size || 56;

      if (item.shape === "circle") {
        body = Bodies.circle(0, 0, size * 0.58, options);
      } else if (item.shape === "polygon") {
        body = Bodies.polygon(0, 0, item.sides || 6, size * 0.68, options);
      } else {
        body = Bodies.rectangle(0, 0, labelWidth, size, {
          ...options,
          chamfer: { radius: 12 },
        });
      }

      body.plugin.gellowItem = item;
      this.placeBody(body, index, false);
      return body;
    }

    placeBody(body, index, keepLow) {
      const { Body } = this.Matter;
      const slots = Math.max(this.bodies.length || this.items.length, 1);
      const cupSafeLeft = this.cup ? this.cup.x + this.cup.width / 2 + 70 : 70;
      const minX = Math.min(Math.max(70, cupSafeLeft), this.width - 70);
      const span = Math.max(1, this.width - minX - 70);
      const x = clamp(minX + (span / (slots + 1)) * (index + 1) + randomBetween(-24, 24), 70, this.width - 70);
      const y = keepLow ? randomBetween(90, 190) : randomBetween(-220, -40);

      Body.setPosition(body, { x, y });
      Body.setAngle(body, randomBetween(-0.7, 0.7));
      Body.setAngularVelocity(body, randomBetween(-0.08, 0.08));
      Body.setVelocity(body, {
        x: randomBetween(-2.2, 2.2),
        y: randomBetween(0.4, 2.4),
      });
    }

    handleCollision(bodyA, bodyB) {
      const sensor = bodyA.plugin.gellowCupSensor ? bodyA : bodyB.plugin.gellowCupSensor ? bodyB : null;
      const body = bodyA.plugin.gellowItem ? bodyA : bodyB.plugin.gellowItem ? bodyB : null;

      if (!sensor || !body) return;
      this.openBody(body);
    }

    openBody(body) {
      const item = body.plugin.gellowItem;
      const now = Date.now();
      const last = this.lastOpenAt.get(item.id) || 0;

      if (now - last < this.cooldown) return;
      this.lastOpenAt.set(item.id, now);

      const detail = { item, body };
      if (this.onOpen) this.onOpen(detail);
      this.canvas.dispatchEvent(new CustomEvent("gellow:open", { detail }));

      global.setTimeout(() => {
        const index = this.bodies.indexOf(body);
        this.placeBody(body, Math.max(index, 0), false);
      }, 650);
    }

    drawOverlay() {
      const ctx = this.render.context;
      this.drawCup(ctx);
      this.drawLabels(ctx);
    }

    drawCup(ctx) {
      const cup = this.cup;
      if (!cup) return;

      const left = cup.x - cup.width / 2;
      const right = cup.x + cup.width / 2;
      const top = cup.y - cup.height / 2;
      const bottom = cup.y + cup.height / 2;

      ctx.save();
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#151515";
      ctx.fillStyle = "rgba(255, 255, 255, 0.34)";
      ctx.beginPath();
      ctx.moveTo(left, top + 8);
      ctx.lineTo(left + 12, bottom);
      ctx.lineTo(right - 12, bottom);
      ctx.lineTo(right, top + 8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(left - 4, top);
      ctx.lineTo(right + 4, top);
      ctx.stroke();
      ctx.fillRect(left + 16, bottom - 22, cup.width - 32, 10);
      ctx.restore();
    }

    drawLabels(ctx) {
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "900 14px Inter, system-ui, sans-serif";

      this.bodies.forEach((body) => {
        const item = body.plugin.gellowItem;
        if (!item) return;
        ctx.save();
        ctx.translate(body.position.x, body.position.y);
        ctx.rotate(body.angle);
        ctx.fillStyle = "#151515";
        ctx.fillText(item.label, 0, 1);
        ctx.restore();
      });

      ctx.restore();
    }

    reset() {
      this.bodies.forEach((body, index) => this.placeBody(body, index, false));
    }

    shake() {
      const { Body } = this.Matter;
      this.bodies.forEach((body) => {
        Body.applyForce(body, body.position, {
          x: randomBetween(-0.035, 0.035),
          y: randomBetween(-0.065, -0.035),
        });
        Body.setAngularVelocity(body, randomBetween(-0.18, 0.18));
      });
    }
  }

  global.GellowPhysics = {
    createMenu(options) {
      return new PhysicsMenu(options);
    },
  };
})(window);
