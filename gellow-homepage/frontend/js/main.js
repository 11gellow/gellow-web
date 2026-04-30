(function initHomeScene() {
  const canvas = document.getElementById("scene-canvas");
  const titleShell = document.getElementById("title-shell");

  if (!canvas || !titleShell) {
    return;
  }

  const ctx = canvas.getContext("2d");
  const PORTALS = [
    {
      label: "GITHUB",
      url: "https://github.com/11gellow",
      color: "#0f172c",
      accent: "#68c8ff",
      textColor: "#f8fcff",
      iconSrc: "https://github.githubassets.com/favicons/favicon-dark.svg",
      mask: "circle",
      fallback: "GH",
    },
    {
      label: "STEAM",
      url: "https://steamcommunity.com/profiles/76561198444114302/",
      color: "#101a34",
      accent: "#8ab4ff",
      textColor: "#f3f8ff",
      iconSrc: "https://store.steampowered.com/favicon.ico",
      mask: "circle",
      fallback: "ST",
    },
    {
      label: "BILIBILI",
      url: "https://space.bilibili.com/518863790",
      color: "#24102f",
      accent: "#ff78c8",
      textColor: "#fff2fb",
      iconSrc: "https://www.bilibili.com/favicon.ico",
      mask: "rounded-square",
      fallback: "BI",
    },
    {
      label: "BLOG",
      url: "https://blog.gellow.top",
      color: "#2c250d",
      accent: "#ffe780",
      textColor: "#fffbe0",
      iconSrc: "https://blog.gellow.top/assets/favicon.png",
      mask: "hex",
      fallback: "BL",
    },
    {
      label: "RS.GELLOW.TOP",
      url: "https://rs.gellow.top",
      color: "#10231e",
      accent: "#7cffcb",
      textColor: "#effff8",
      iconSrc: "https://rs.gellow.top/favicon.ico",
      mask: "diamond",
      fallback: "RS",
    },
  ];
  const AMBIENT_TOTAL = 22;
  const scene = {
    width: 0,
    height: 0,
    dpr: Math.max(1, Math.min(window.devicePixelRatio || 1, 2)),
    time: 0,
    lastTs: 0,
    sinkCount: 0,
    shapes: [],
    particles: [],
    cloudDots: [],
    pointer: {
      x: 0,
      y: 0,
      down: false,
      dragKind: null,
      dragId: null,
      offsetX: 0,
      offsetY: 0,
      vx: 0,
      vy: 0,
      lastMoveTs: 0,
      lastRippleTs: 0,
    },
    hole: {
      x: 118,
      y: 112,
      radius: 66,
      core: 38,
      influence: 220,
      spin: 0,
    },
    panel: {
      x: 18,
      y: 250,
      w: 0,
      h: 0,
    },
  };

  function showFeedback(message, title, variant) {
    if (window.GellowFeedback?.showToast) {
      window.GellowFeedback.showToast(message, title, variant);
    }
  }

  function createCloudDots() {
    const dots = [];
    const count = Math.max(120, Math.floor(scene.width / 12));

    for (let index = 0; index < count; index += 1) {
      dots.push({
        x: scene.width * (0.3 + Math.random() * 0.68),
        y: scene.height * (0.05 + Math.random() * 0.9),
        radius: 1 + Math.random() * 2.8,
        phase: Math.random() * Math.PI * 2,
        speed: 0.24 + Math.random() * 0.92,
      });
    }

    return dots;
  }

  function preloadPortalIcons() {
    PORTALS.forEach((portal) => {
      const image = new Image();
      image.decoding = "async";
      image.referrerPolicy = "no-referrer";
      image.src = portal.iconSrc;
      portal.iconImage = image;
      image.addEventListener("error", () => {
        portal.iconImage = null;
      });
    });
  }

  function createShape(spec, kind, index) {
    const radius =
      spec.radius ||
      (kind === "portal" ? 88 + Math.random() * 12 : 36 + Math.random() * 56);
    const spawnX = scene.width * (0.54 + Math.random() * 0.4);
    const spawnY = -Math.random() * scene.height * 0.75 - index * 52;

    return {
      id: `${kind}-${index}-${Math.random().toString(16).slice(2, 7)}`,
      kind,
      portalIndex: typeof spec.portalIndex === "number" ? spec.portalIndex : -1,
      label: spec.label || "",
      url: spec.url || "",
      color: spec.color,
      accent: spec.accent,
      textColor: spec.textColor || spec.accent,
      fallback: spec.fallback || "",
      geometry: spec.geometry,
      mask: spec.mask || "circle",
      iconImage: spec.iconImage || null,
      radius,
      x: spawnX,
      y: spawnY,
      vx: (Math.random() - 0.5) * 110,
      vy: 80 + Math.random() * 140,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 2.2,
      mass: radius * radius,
      state: "free",
      absorb: 0,
      triggered: false,
      navigated: false,
    };
  }

  function createAmbientSpec() {
    const palette = [
      { color: "#1a2347", accent: "#68c8ff", geometry: "square" },
      { color: "#121d39", accent: "#7cffcb", geometry: "triangle" },
      { color: "#25163f", accent: "#ff78c8", geometry: "diamond" },
      { color: "#21260f", accent: "#ffe780", geometry: "hex" },
      { color: "#182246", accent: "#8ab4ff", geometry: "circle" },
    ];

    return palette[Math.floor(Math.random() * palette.length)];
  }

  function rebuildShapes() {
    scene.shapes = PORTALS.map((portal, index) =>
      createShape({ ...portal, portalIndex: index }, "portal", index)
    );

    for (let index = 0; index < AMBIENT_TOTAL; index += 1) {
      scene.shapes.push(createShape(createAmbientSpec(), "ambient", index));
    }
  }

  function clampPanelPosition() {
    scene.panel.x = Math.min(
      Math.max(10, scene.panel.x),
      Math.max(10, scene.width - scene.panel.w - 10)
    );
    scene.panel.y = Math.min(
      Math.max(10, scene.panel.y),
      Math.max(10, scene.height - scene.panel.h - 10)
    );
  }

  function syncPanelMetrics() {
    scene.panel.w = titleShell.offsetWidth;
    scene.panel.h = titleShell.offsetHeight;
    clampPanelPosition();
    titleShell.style.transform = `translate(${scene.panel.x}px, ${scene.panel.y}px)`;
  }

  function resizeScene() {
    scene.width = window.innerWidth;
    scene.height = window.innerHeight;
    scene.dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    canvas.width = Math.floor(scene.width * scene.dpr);
    canvas.height = Math.floor(scene.height * scene.dpr);
    canvas.style.width = `${scene.width}px`;
    canvas.style.height = `${scene.height}px`;
    ctx.setTransform(scene.dpr, 0, 0, scene.dpr, 0, 0);

    scene.hole.x = Math.min(118, scene.width * 0.13);
    scene.hole.y = Math.min(112, scene.height * 0.16);
    scene.hole.radius = scene.width < 700 ? 56 : 66;
    scene.hole.core = scene.width < 700 ? 30 : 38;
    scene.hole.influence = scene.width < 700 ? 190 : 220;
    scene.cloudDots = createCloudDots();
    syncPanelMetrics();

    if (!scene.shapes.length) {
      rebuildShapes();
      return;
    }

    scene.shapes.forEach((shape) => {
      shape.x = Math.min(
        Math.max(shape.radius + 10, shape.x),
        scene.width - shape.radius - 10
      );
      shape.y = Math.min(
        Math.max(shape.radius + 10, shape.y),
        scene.height - shape.radius - 10
      );
    });
  }

  function emitPointerRipple(x, y, kind) {
    scene.particles.push({
      kind,
      x,
      y,
      age: 0,
      life: kind === "move" ? 0.45 : 0.95,
      rotation: Math.random() * Math.PI * 2,
      scale: kind === "move" ? 16 + Math.random() * 18 : 34 + Math.random() * 44,
      color: kind === "move" ? "#68c8ff" : "#7cffcb",
    });
  }

  function emitShards(shape) {
    const pieces = shape.kind === "portal" ? 18 : 11;
    for (let index = 0; index < pieces; index += 1) {
      scene.particles.push({
        kind: "shard",
        x: shape.x,
        y: shape.y,
        age: 0,
        life: 0.72 + Math.random() * 0.38,
        vx: (Math.random() - 0.5) * 220,
        vy: (Math.random() - 0.5) * 220,
        pull: 160 + Math.random() * 160,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 8,
        scale: 6 + Math.random() * 9,
        color: shape.accent,
      });
    }
  }

  function updatePointerPosition(event, targetElement) {
    const rect = (targetElement || canvas).getBoundingClientRect();
    const nextX = event.clientX - rect.left;
    const nextY = event.clientY - rect.top;
    const dt = Math.max(16, event.timeStamp - (scene.pointer.lastMoveTs || event.timeStamp));

    scene.pointer.vx = ((event.clientX - scene.pointer.x) / dt) * 1000;
    scene.pointer.vy = ((event.clientY - scene.pointer.y) / dt) * 1000;
    scene.pointer.x = event.clientX;
    scene.pointer.y = event.clientY;
    scene.pointer.lastMoveTs = event.timeStamp;

    return { x: nextX, y: nextY };
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function hitTestShape(x, y) {
    for (let index = scene.shapes.length - 1; index >= 0; index -= 1) {
      const shape = scene.shapes[index];
      if (shape.state === "absorbing" || shape.state === "gone") {
        continue;
      }

      const dx = x - shape.x;
      const dy = y - shape.y;
      if (dx * dx + dy * dy <= shape.radius * shape.radius) {
        return shape;
      }
    }

    return null;
  }

  function hitTestHole(x, y) {
    const dx = x - scene.hole.x;
    const dy = y - scene.hole.y;
    return dx * dx + dy * dy <= (scene.hole.radius + 16) * (scene.hole.radius + 16);
  }

  function moveShapeToFront(shape) {
    const index = scene.shapes.findIndex((entry) => entry.id === shape.id);
    if (index >= 0) {
      scene.shapes.splice(index, 1);
      scene.shapes.push(shape);
    }
  }

  function beginAbsorb(shape) {
    if (!shape || shape.state === "absorbing" || shape.state === "gone") {
      return;
    }

    shape.state = "absorbing";
    shape.absorb = 0;
    shape.spin = (shape.spin >= 0 ? 1 : -1) * (4.2 + Math.random() * 1.8);
    if (scene.pointer.dragKind === "shape" && scene.pointer.dragId === shape.id) {
      scene.pointer.dragKind = null;
      scene.pointer.dragId = null;
    }

    if (shape.url && !shape.triggered) {
      shape.triggered = true;
      const variant = /(^|\.)gellow\.top$/i.test(new URL(shape.url).hostname)
        ? "nav"
        : "open";
      showFeedback(`${shape.label} portal armed`, "Singularity Route", variant);
    }
  }

  function respawnAmbientShape(shape) {
    const replacement = createShape(
      createAmbientSpec(),
      "ambient",
      Math.floor(Math.random() * 10000)
    );
    Object.assign(shape, replacement);
  }

  function respawnPortalShape(shape) {
    const template = PORTALS[shape.portalIndex];
    if (!template) {
      return;
    }

    const replacement = createShape(
      { ...template, portalIndex: shape.portalIndex },
      "portal",
      Math.floor(Math.random() * 10000)
    );
    scene.shapes.push(replacement);
  }

  function navigateShape(shape) {
    if (shape.navigated || !shape.url) {
      return;
    }

    shape.navigated = true;
    window.setTimeout(() => {
      window.location.href = shape.url;
    }, 240);
  }

  function releaseShapeDrag(pointerId) {
    const shape = scene.shapes.find((entry) => entry.id === scene.pointer.dragId);
    scene.pointer.down = false;

    if (!shape) {
      scene.pointer.dragKind = null;
      scene.pointer.dragId = null;
      return;
    }

    if (shape.state !== "absorbing") {
      shape.state = "free";
      shape.vx = scene.pointer.vx * 0.38;
      shape.vy = scene.pointer.vy * 0.38;
      shape.spin += (Math.random() - 0.5) * 0.6;

      const dx = scene.hole.x - shape.x;
      const dy = scene.hole.y - shape.y;
      if (Math.hypot(dx, dy) < scene.hole.radius + shape.radius * 0.9) {
        beginAbsorb(shape);
        emitShards(shape);
      }
    }

    scene.pointer.dragKind = null;
    scene.pointer.dragId = null;

    if (canvas.hasPointerCapture(pointerId)) {
      canvas.releasePointerCapture(pointerId);
    }
  }

  canvas.addEventListener("pointerdown", (event) => {
    const point = canvasPoint(event);
    updatePointerPosition(event, canvas);
    emitPointerRipple(point.x, point.y, "click");
    scene.pointer.down = true;

    const shape = hitTestShape(point.x, point.y);
    if (shape) {
      scene.pointer.dragKind = "shape";
      scene.pointer.dragId = shape.id;
      scene.pointer.offsetX = point.x - shape.x;
      scene.pointer.offsetY = point.y - shape.y;
      shape.state = "dragging";
      shape.vx = 0;
      shape.vy = 0;
      moveShapeToFront(shape);
      canvas.setPointerCapture(event.pointerId);
      return;
    }

    if (hitTestHole(point.x, point.y)) {
      scene.pointer.dragKind = "hole";
      scene.pointer.dragId = "hole";
      scene.pointer.offsetX = point.x - scene.hole.x;
      scene.pointer.offsetY = point.y - scene.hole.y;
      canvas.setPointerCapture(event.pointerId);
    }
  });

  canvas.addEventListener("pointermove", (event) => {
    const point = canvasPoint(event);
    updatePointerPosition(event, canvas);

    if (event.timeStamp - scene.pointer.lastRippleTs > 38) {
      emitPointerRipple(point.x, point.y, "move");
      scene.pointer.lastRippleTs = event.timeStamp;
    }

    if (scene.pointer.dragKind === "shape") {
      const shape = scene.shapes.find((entry) => entry.id === scene.pointer.dragId);
      if (!shape) {
        return;
      }

      shape.x = point.x - scene.pointer.offsetX;
      shape.y = point.y - scene.pointer.offsetY;
      shape.angle += 0.06;

      const dx = scene.hole.x - shape.x;
      const dy = scene.hole.y - shape.y;
      const dist = Math.hypot(dx, dy);
      if (dist < scene.hole.radius + shape.radius * 0.65) {
        beginAbsorb(shape);
        emitShards(shape);
      }
      return;
    }

    if (scene.pointer.dragKind === "hole") {
      scene.hole.x = point.x - scene.pointer.offsetX;
      scene.hole.y = point.y - scene.pointer.offsetY;
      scene.hole.x = Math.min(
        Math.max(scene.hole.radius + 10, scene.hole.x),
        scene.width - scene.hole.radius - 10
      );
      scene.hole.y = Math.min(
        Math.max(scene.hole.radius + 10, scene.hole.y),
        scene.height - scene.hole.radius - 10
      );
    }
  });

  canvas.addEventListener("pointerup", (event) => {
    if (scene.pointer.dragKind === "shape") {
      releaseShapeDrag(event.pointerId);
      return;
    }

    scene.pointer.down = false;
    scene.pointer.dragKind = null;
    scene.pointer.dragId = null;
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  });

  canvas.addEventListener("pointercancel", (event) => {
    if (scene.pointer.dragKind === "shape") {
      releaseShapeDrag(event.pointerId);
      return;
    }

    scene.pointer.down = false;
    scene.pointer.dragKind = null;
    scene.pointer.dragId = null;
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  });

  titleShell.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    scene.pointer.dragKind = "panel";
    scene.pointer.dragId = "panel";
    scene.pointer.offsetX = event.clientX - scene.panel.x;
    scene.pointer.offsetY = event.clientY - scene.panel.y;
    titleShell.classList.add("is-dragging");
    titleShell.setPointerCapture(event.pointerId);
  });

  titleShell.addEventListener("pointermove", (event) => {
    if (scene.pointer.dragKind !== "panel") {
      return;
    }

    scene.panel.x = event.clientX - scene.pointer.offsetX;
    scene.panel.y = event.clientY - scene.pointer.offsetY;
    clampPanelPosition();
    syncPanelMetrics();
  });

  function releasePanelDrag(event) {
    if (scene.pointer.dragKind !== "panel") {
      return;
    }

    scene.pointer.dragKind = null;
    scene.pointer.dragId = null;
    titleShell.classList.remove("is-dragging");

    if (titleShell.hasPointerCapture(event.pointerId)) {
      titleShell.releasePointerCapture(event.pointerId);
    }
  }

  titleShell.addEventListener("pointerup", releasePanelDrag);
  titleShell.addEventListener("pointercancel", releasePanelDrag);
  window.addEventListener("resize", resizeScene);

  function collideShapeWithRect(shape, rect) {
    const nearestX = Math.max(rect.x, Math.min(shape.x, rect.x + rect.w));
    const nearestY = Math.max(rect.y, Math.min(shape.y, rect.y + rect.h));
    let dx = shape.x - nearestX;
    let dy = shape.y - nearestY;
    let distance = Math.hypot(dx, dy);

    if (distance >= shape.radius) {
      return;
    }

    if (distance === 0) {
      const centerX = rect.x + rect.w * 0.5;
      const centerY = rect.y + rect.h * 0.5;
      const diffX = shape.x - centerX;
      const diffY = shape.y - centerY;
      if (Math.abs(diffX) > Math.abs(diffY)) {
        dx = diffX >= 0 ? 1 : -1;
        dy = 0;
      } else {
        dx = 0;
        dy = diffY >= 0 ? 1 : -1;
      }
      distance = 1;
    }

    const nx = dx / distance;
    const ny = dy / distance;
    const overlap = shape.radius - distance;
    shape.x += nx * overlap;
    shape.y += ny * overlap;

    const velocityAlongNormal = shape.vx * nx + shape.vy * ny;
    if (velocityAlongNormal < 0) {
      shape.vx -= 1.72 * velocityAlongNormal * nx;
      shape.vy -= 1.72 * velocityAlongNormal * ny;
    }

    if (Math.abs(shape.vx) < 28 && Math.abs(shape.vy) < 42) {
      shape.spin = 0;
    }
  }

  function updateFreeShape(shape, dt) {
    const drag = Math.exp(-1.18 * dt);
    shape.vx *= drag;
    shape.vy *= drag;
    shape.vy += 860 * dt;
    shape.spin *= Math.exp(-2.8 * dt);

    if (Math.abs(shape.spin) < 0.04) {
      shape.spin = 0;
    }

    const dx = scene.hole.x - shape.x;
    const dy = scene.hole.y - shape.y;
    const dist = Math.hypot(dx, dy);

    if (dist < scene.hole.influence) {
      const strength = (1 - dist / scene.hole.influence) * 760;
      const nx = dx / Math.max(1, dist);
      const ny = dy / Math.max(1, dist);
      shape.vx += nx * strength * dt;
      shape.vy += ny * strength * dt;

      if (dist < scene.hole.radius + shape.radius * 0.52) {
        beginAbsorb(shape);
        emitShards(shape);
        return;
      }
    }

    shape.x += shape.vx * dt;
    shape.y += shape.vy * dt;
    shape.angle += shape.spin * dt;

    const left = shape.radius + 8;
    const right = scene.width - shape.radius - 8;
    const top = shape.radius + 8;
    const bottom = scene.height - shape.radius - 8;
    const bounce = 0.76;

    if (shape.x < left) {
      shape.x = left;
      shape.vx = Math.abs(shape.vx) * bounce;
    } else if (shape.x > right) {
      shape.x = right;
      shape.vx = -Math.abs(shape.vx) * bounce;
    }

    if (shape.y < top) {
      shape.y = top;
      shape.vy = Math.abs(shape.vy) * bounce;
    } else if (shape.y > bottom) {
      shape.y = bottom;
      shape.vy = -Math.abs(shape.vy) * bounce;
      if (Math.abs(shape.vx) < 24 && Math.abs(shape.vy) < 44) {
        shape.spin = 0;
      }
    }

    collideShapeWithRect(shape, scene.panel);

    if (Math.hypot(shape.vx, shape.vy) < 26) {
      shape.spin = 0;
    }
  }

  function resolveCollisions() {
    for (let outer = 0; outer < scene.shapes.length; outer += 1) {
      const a = scene.shapes[outer];
      if (a.state !== "free") {
        continue;
      }

      for (let inner = outer + 1; inner < scene.shapes.length; inner += 1) {
        const b = scene.shapes[inner];
        if (b.state !== "free") {
          continue;
        }

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.001;
        const minDist = a.radius + b.radius;

        if (dist >= minDist) {
          continue;
        }

        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = minDist - dist;
        const totalMass = a.mass + b.mass;

        a.x -= nx * overlap * (b.mass / totalMass);
        a.y -= ny * overlap * (b.mass / totalMass);
        b.x += nx * overlap * (a.mass / totalMass);
        b.y += ny * overlap * (a.mass / totalMass);

        const rvx = b.vx - a.vx;
        const rvy = b.vy - a.vy;
        const velocityAlongNormal = rvx * nx + rvy * ny;
        if (velocityAlongNormal > 0) {
          continue;
        }

        const impulse = (-1.02 * velocityAlongNormal) / ((1 / a.mass) + (1 / b.mass));
        const ix = impulse * nx;
        const iy = impulse * ny;

        a.vx -= ix / a.mass;
        a.vy -= iy / a.mass;
        b.vx += ix / b.mass;
        b.vy += iy / b.mass;
      }
    }
  }

  function updateAbsorbingShape(shape, dt) {
    shape.absorb += dt * 1.35;
    const pull = 5.2 + shape.absorb * 10;
    shape.x += (scene.hole.x - shape.x) * Math.min(1, dt * pull);
    shape.y += (scene.hole.y - shape.y) * Math.min(1, dt * pull);
    shape.angle += shape.spin * (1 + shape.absorb * 4.5) * dt;

    if (shape.absorb > 0.78 && !shape._burst) {
      shape._burst = true;
      emitShards(shape);
    }

    if (shape.absorb < 1.02) {
      return;
    }

    scene.sinkCount += 1;

    if (shape.kind === "portal") {
      respawnPortalShape(shape);
      navigateShape(shape);
      shape.state = "gone";
      return;
    }

    delete shape._burst;
    respawnAmbientShape(shape);
  }

  function updateParticles(dt) {
    scene.particles = scene.particles.filter((particle) => {
      particle.age += dt;

      if (particle.kind === "shard") {
        const dx = scene.hole.x - particle.x;
        const dy = scene.hole.y - particle.y;
        const dist = Math.hypot(dx, dy) || 1;
        particle.vx += (dx / dist) * particle.pull * dt;
        particle.vy += (dy / dist) * particle.pull * dt;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.rotation += particle.spin * dt;
      }

      return particle.age < particle.life;
    });
  }

  function update(dt) {
    scene.time += dt;
    scene.hole.spin += dt;

    scene.shapes.forEach((shape) => {
      if (shape.state === "dragging") {
        return;
      }
      if (shape.state === "absorbing") {
        updateAbsorbingShape(shape, dt);
        return;
      }
      if (shape.state === "free") {
        updateFreeShape(shape, dt);
      }
    });

    resolveCollisions();
    updateParticles(dt);
  }

  function drawBackground() {
    ctx.clearRect(0, 0, scene.width, scene.height);

    const gradient = ctx.createLinearGradient(0, 0, 0, scene.height);
    gradient.addColorStop(0, "rgba(6, 8, 19, 0.18)");
    gradient.addColorStop(1, "rgba(4, 6, 14, 0.42)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, scene.width, scene.height);

    scene.cloudDots.forEach((dot, index) => {
      const driftX = Math.sin(scene.time * dot.speed + dot.phase) * 8;
      const driftY = Math.cos(scene.time * dot.speed * 0.8 + dot.phase) * 5;
      const x = dot.x + driftX;
      const y = dot.y + driftY;
      const dist = Math.hypot(scene.pointer.x - x, scene.pointer.y - y);
      const glow = dist < 120 ? 0.65 : 0.22;

      ctx.fillStyle = `rgba(124, 255, 203, ${glow})`;
      ctx.beginPath();
      ctx.arc(x, y, dot.radius, 0, Math.PI * 2);
      ctx.fill();

      if (index % 5 === 0 && dist < 150) {
        ctx.strokeStyle = `rgba(104, 200, 255, ${0.16 + (1 - dist / 150) * 0.22})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(scene.pointer.x, scene.pointer.y);
        ctx.stroke();
      }
    });
  }

  function drawBlackHole() {
    const hole = scene.hole;
    const hover = hitTestHole(scene.pointer.x, scene.pointer.y) && scene.pointer.dragKind !== "shape";

    ctx.save();
    ctx.translate(hole.x, hole.y);

    for (let ring = 4; ring >= 1; ring -= 1) {
      ctx.beginPath();
      ctx.fillStyle = `rgba(47, 124, 255, ${0.05 * ring})`;
      ctx.arc(
        0,
        0,
        hole.radius + ring * 20 + Math.sin(scene.time * 2 + ring) * 4,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    ctx.rotate(scene.time * 0.6);
    ctx.strokeStyle = hover ? "rgba(255, 231, 128, 0.72)" : "rgba(255, 120, 200, 0.36)";
    ctx.lineWidth = hover ? 4 : 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, hole.radius + 18, hole.radius * 0.58, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.rotate(-scene.time * 1.1);
    ctx.strokeStyle = "rgba(124, 255, 203, 0.28)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, hole.radius + 30, hole.radius * 0.3, 0.2, 0, Math.PI * 2);
    ctx.stroke();

    const coreGradient = ctx.createRadialGradient(0, 0, 6, 0, 0, hole.radius);
    coreGradient.addColorStop(0, "rgba(0, 0, 0, 0.98)");
    coreGradient.addColorStop(0.55, "rgba(4, 6, 18, 0.96)");
    coreGradient.addColorStop(1, "rgba(62, 25, 96, 0.22)");
    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(0, 0, hole.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = "#000";
    ctx.arc(0, 0, hole.core, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(124, 255, 203, 0.72)";
    ctx.font = '700 10px "Courier New", monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("DRAG", 0, -hole.radius - 18);

    ctx.restore();
  }

  function drawRoundedRect(x, y, width, height, radius) {
    const r = Math.min(radius, width * 0.5, height * 0.5);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function buildPolygonPath(sides, radius, startAngle, wobble) {
    ctx.beginPath();
    for (let index = 0; index < sides; index += 1) {
      const angle = startAngle + (Math.PI * 2 * index) / sides;
      const distortion = 1 + wobble * Math.sin(angle * 3 + scene.time * 14 + radius);
      const x = Math.cos(angle) * radius * distortion;
      const y = Math.sin(angle) * radius * distortion;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
  }

  function buildMaskPath(shape, radius, wobble) {
    switch (shape.mask) {
      case "rounded-square":
        drawRoundedRect(-radius, -radius, radius * 2, radius * 2, radius * 0.34 + wobble * 10);
        return;
      case "hex":
        buildPolygonPath(6, radius, Math.PI / 6, wobble);
        return;
      case "diamond":
        buildPolygonPath(4, radius, Math.PI / 4, wobble);
        return;
      case "circle":
      default:
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.closePath();
    }
  }

  function buildAmbientPath(shape, radius, wobble) {
    switch (shape.geometry) {
      case "triangle":
        buildPolygonPath(3, radius, -Math.PI / 2, wobble);
        return;
      case "square":
        buildPolygonPath(4, radius, Math.PI / 4, wobble);
        return;
      case "diamond":
        buildPolygonPath(4, radius, 0, wobble * 0.8);
        return;
      case "hex":
        buildPolygonPath(6, radius, Math.PI / 6, wobble);
        return;
      case "circle":
      default:
        ctx.beginPath();
        ctx.ellipse(
          0,
          0,
          radius * (1 + wobble * 0.4),
          radius * (1 - wobble * 0.2),
          0,
          0,
          Math.PI * 2
        );
        ctx.closePath();
    }
  }

  function drawPortalShape(shape) {
    const wobble = shape.state === "absorbing" ? shape.absorb * 0.42 : 0;
    const scale = shape.state === "absorbing" ? Math.max(0.1, 1 - shape.absorb * 0.88) : 1;

    ctx.save();
    ctx.translate(shape.x, shape.y);
    ctx.rotate(shape.angle);
    ctx.scale(scale, scale);

    buildMaskPath(shape, shape.radius, wobble);
    ctx.fillStyle = shape.color;
    ctx.fill();

    ctx.lineWidth = 4;
    ctx.strokeStyle = shape.accent;
    ctx.shadowColor = shape.accent;
    ctx.shadowBlur = 18;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.save();
    buildMaskPath(shape, shape.radius * 0.84, wobble * 0.7);
    ctx.clip();

    if (shape.iconImage && shape.iconImage.complete && shape.iconImage.naturalWidth > 0) {
      const iconSize = shape.radius * 1.14;
      ctx.drawImage(shape.iconImage, -iconSize * 0.5, -iconSize * 0.5, iconSize, iconSize);
    } else {
      ctx.fillStyle = shape.textColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `900 ${Math.max(28, shape.radius * 0.42)}px "Arial Black", "Impact", sans-serif`;
      ctx.fillText(shape.fallback, 0, 4);
    }

    ctx.restore();
    ctx.restore();

    const labelAlpha = shape.state === "absorbing" ? Math.max(0, 1 - shape.absorb * 1.15) : 1;
    const labelScale = shape.state === "absorbing" ? Math.max(0.52, 1 - shape.absorb * 0.4) : 1;
    const labelY = shape.y + shape.radius + 26;

    ctx.save();
    ctx.globalAlpha = labelAlpha;
    ctx.translate(shape.x, labelY);
    ctx.scale(labelScale, labelScale);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `900 ${Math.max(18, Math.min(26, shape.radius * 0.24))}px "Arial Black", "Impact", sans-serif`;
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#000";
    ctx.shadowColor = shape.accent;
    ctx.shadowBlur = 14;
    ctx.strokeText(shape.label, 0, 0);
    ctx.fillStyle = shape.accent;
    ctx.fillText(shape.label, 0, 0);
    ctx.restore();
  }

  function drawAmbientShape(shape) {
    const wobble = shape.state === "absorbing" ? shape.absorb * 0.42 : 0;
    const scale = shape.state === "absorbing" ? Math.max(0.1, 1 - shape.absorb * 0.88) : 1;

    ctx.save();
    ctx.translate(shape.x, shape.y);
    ctx.rotate(shape.angle);
    ctx.scale(scale, scale);

    buildAmbientPath(shape, shape.radius, wobble);
    ctx.fillStyle = shape.color;
    ctx.fill();

    ctx.lineWidth = 3;
    ctx.strokeStyle = shape.accent;
    ctx.stroke();
    ctx.restore();
  }

  function drawParticles() {
    scene.particles.forEach((particle) => {
      const progress = particle.age / particle.life;
      const alpha = 1 - progress;

      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation + progress * 2.4);

      if (particle.kind === "move") {
        ctx.strokeStyle = `rgba(104, 200, 255, ${alpha * 0.55})`;
        ctx.lineWidth = 1.6;
        ctx.strokeRect(
          -particle.scale * progress,
          -particle.scale * progress,
          particle.scale * 2 * progress,
          particle.scale * 2 * progress
        );
        ctx.beginPath();
        ctx.arc(0, 0, particle.scale * progress * 0.8, 0, Math.PI * 2);
        ctx.stroke();
      } else if (particle.kind === "click") {
        ctx.strokeStyle = `rgba(124, 255, 203, ${alpha * 0.8})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let index = 0; index < 6; index += 1) {
          const angle = (Math.PI * 2 * index) / 6;
          const radius = particle.scale * progress * (index % 2 === 0 ? 1 : 0.68);
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        ctx.stroke();
      } else if (particle.kind === "shard") {
        ctx.globalAlpha = alpha * 0.9;
        ctx.fillStyle = particle.color;
        ctx.fillRect(-particle.scale * 0.5, -particle.scale * 0.5, particle.scale, particle.scale);
      }

      ctx.restore();
    });
  }

  function render() {
    drawBackground();
    drawBlackHole();

    scene.shapes.forEach((shape) => {
      if (shape.state === "gone") {
        return;
      }

      if (shape.kind === "portal") {
        drawPortalShape(shape);
      } else {
        drawAmbientShape(shape);
      }
    });

    drawParticles();
  }

  function tick(timestamp) {
    const dt = Math.min(0.032, (timestamp - (scene.lastTs || timestamp)) / 1000 || 0.016);
    scene.lastTs = timestamp;
    update(dt);
    render();
    window.requestAnimationFrame(tick);
  }

  preloadPortalIcons();
  resizeScene();
  window.requestAnimationFrame(() => {
    syncPanelMetrics();
  });
  window.requestAnimationFrame(tick);
})();
