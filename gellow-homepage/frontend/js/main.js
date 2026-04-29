(function initHomeScene() {
  const canvas = document.getElementById("scene-canvas");
  const linkedCount = document.getElementById("linked-count");
  const ambientCount = document.getElementById("ambient-count");
  const sinkCount = document.getElementById("sink-count");
  const statusLabel = document.getElementById("scene-status-label");
  const shakeFieldButton = document.getElementById("shake-field-btn");

  if (!canvas) {
    return;
  }

  const ctx = canvas.getContext("2d");
  const PORTALS = [
    {
      label: "GITHUB",
      url: "https://github.com/11gellow",
      color: "#0f172c",
      accent: "#68c8ff",
      textColor: "#f6fbff",
      iconSrc: "https://www.google.com/s2/favicons?domain=github.com&sz=128",
      mask: "circle",
      fallback: "GH",
    },
    {
      label: "STEAM",
      url: "https://steamcommunity.com/profiles/76561198444114302/",
      color: "#111a34",
      accent: "#8ab4ff",
      textColor: "#f4f8ff",
      iconSrc: "https://www.google.com/s2/favicons?domain=steamcommunity.com&sz=128",
      mask: "circle",
      fallback: "ST",
    },
    {
      label: "BILIBILI",
      url: "https://space.bilibili.com/518863790",
      color: "#24102f",
      accent: "#ff78c8",
      textColor: "#fff2fb",
      iconSrc: "https://www.google.com/s2/favicons?domain=bilibili.com&sz=128",
      mask: "rounded-square",
      fallback: "BI",
    },
    {
      label: "BLOG",
      url: "https://blog.gellow.top",
      color: "#2c250d",
      accent: "#ffe780",
      textColor: "#fffbe0",
      iconSrc: "https://www.google.com/s2/favicons?domain=blog.gellow.top&sz=128",
      mask: "hex",
      fallback: "BL",
    },
    {
      label: "RS.GELLOW.TOP",
      url: "https://rs.gellow.top",
      color: "#10231e",
      accent: "#7cffcb",
      textColor: "#effff8",
      iconSrc: "https://www.google.com/s2/favicons?domain=rs.gellow.top&sz=128",
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
    sinks: 0,
    shapes: [],
    particles: [],
    cloudDots: [],
    pointer: {
      x: 0,
      y: 0,
      down: false,
      dragId: null,
      offsetX: 0,
      offsetY: 0,
      vx: 0,
      vy: 0,
      lastMoveTs: 0,
      lastRippleTs: 0,
    },
    hole: {
      x: 138,
      y: 122,
      radius: 66,
      core: 38,
      influence: 220,
      spin: 0,
    },
  };

  function showFeedback(message, title, variant) {
    if (window.GellowFeedback?.showToast) {
      window.GellowFeedback.showToast(message, title, variant);
    }
  }

  function setStatus(text) {
    if (statusLabel) {
      statusLabel.textContent = text;
    }
  }

  function preloadPortalIcons() {
    PORTALS.forEach((portal) => {
      const image = new Image();
      image.decoding = "async";
      image.src = portal.iconSrc;
      portal.iconImage = image;
      portal.iconReady = false;
      image.addEventListener("load", () => {
        portal.iconReady = true;
      });
      image.addEventListener("error", () => {
        portal.iconReady = false;
      });
    });
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

  function createShape(spec, kind, index) {
    const radius = spec.radius || (kind === "portal" ? 88 + Math.random() * 12 : 36 + Math.random() * 56);
    const spawnX = scene.width * (0.54 + Math.random() * 0.4);
    const spawnY = -Math.random() * scene.height * 0.75 - index * 52;

    return {
      id: `${kind}-${index}-${Math.random().toString(16).slice(2, 7)}`,
      kind,
      label: spec.label || "",
      url: spec.url || "",
      color: spec.color,
      accent: spec.accent,
      textColor: spec.textColor || spec.accent,
      fallback: spec.fallback || "",
      geometry: spec.geometry,
      mask: spec.mask || "circle",
      iconImage: spec.iconImage || null,
      iconReady: Boolean(spec.iconReady),
      radius,
      x: spawnX,
      y: spawnY,
      vx: (Math.random() - 0.5) * 110,
      vy: 80 + Math.random() * 140,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 2.4,
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
    scene.shapes = PORTALS.map((portal, index) => createShape(portal, "portal", index));

    for (let index = 0; index < AMBIENT_TOTAL; index += 1) {
      scene.shapes.push(createShape(createAmbientSpec(), "ambient", index));
    }
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

    scene.hole.x = Math.min(138, scene.width * 0.14);
    scene.hole.y = Math.min(122, scene.height * 0.17);
    scene.hole.radius = scene.width < 700 ? 56 : 66;
    scene.hole.core = scene.width < 700 ? 30 : 38;
    scene.hole.influence = scene.width < 700 ? 188 : 220;
    scene.cloudDots = createCloudDots();

    if (!scene.shapes.length) {
      rebuildShapes();
      return;
    }

    scene.shapes.forEach((shape) => {
      shape.x = Math.min(Math.max(shape.radius + 10, shape.x), scene.width - shape.radius - 10);
      shape.y = Math.min(Math.max(shape.radius + 10, shape.y), scene.height - shape.radius - 10);
    });
  }

  function updateMetrics() {
    if (linkedCount) {
      linkedCount.textContent = String(PORTALS.length);
    }
    if (ambientCount) {
      const ambient = scene.shapes.filter((shape) => shape.kind === "ambient" && shape.state !== "gone").length;
      ambientCount.textContent = String(ambient);
    }
    if (sinkCount) {
      sinkCount.textContent = String(scene.sinks);
    }
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

  function hitTest(x, y) {
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
    scene.pointer.dragId = scene.pointer.dragId === shape.id ? null : scene.pointer.dragId;

    if (shape.url && !shape.triggered) {
      shape.triggered = true;
      const variant = /(^|\.)gellow\.top$/i.test(new URL(shape.url).hostname) ? "nav" : "open";
      showFeedback(`${shape.label} portal armed`, "Singularity Route", variant);
      setStatus(`ROUTING ${shape.label}`);
    }
  }

  function respawnAmbientShape(shape) {
    const replacement = createShape(createAmbientSpec(), "ambient", Math.floor(Math.random() * 10000));
    Object.assign(shape, replacement);
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

  function updatePointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    const nextX = event.clientX - rect.left;
    const nextY = event.clientY - rect.top;
    const dt = Math.max(16, event.timeStamp - (scene.pointer.lastMoveTs || event.timeStamp));

    scene.pointer.vx = ((nextX - scene.pointer.x) / dt) * 1000;
    scene.pointer.vy = ((nextY - scene.pointer.y) / dt) * 1000;
    scene.pointer.x = nextX;
    scene.pointer.y = nextY;
    scene.pointer.lastMoveTs = event.timeStamp;
  }

  canvas.addEventListener("pointerdown", (event) => {
    updatePointerPosition(event);
    emitPointerRipple(scene.pointer.x, scene.pointer.y, "click");
    scene.pointer.down = true;

    const shape = hitTest(scene.pointer.x, scene.pointer.y);
    if (!shape) {
      setStatus("FIELD STABLE");
      return;
    }

    scene.pointer.dragId = shape.id;
    scene.pointer.offsetX = scene.pointer.x - shape.x;
    scene.pointer.offsetY = scene.pointer.y - shape.y;
    shape.state = "dragging";
    shape.vx = 0;
    shape.vy = 0;
    moveShapeToFront(shape);
    setStatus(shape.label ? `DRAG ${shape.label}` : "DRAG DEBRIS");
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointermove", (event) => {
    updatePointerPosition(event);

    if (event.timeStamp - scene.pointer.lastRippleTs > 38) {
      emitPointerRipple(scene.pointer.x, scene.pointer.y, "move");
      scene.pointer.lastRippleTs = event.timeStamp;
    }

    if (!scene.pointer.dragId) {
      return;
    }

    const shape = scene.shapes.find((entry) => entry.id === scene.pointer.dragId);
    if (!shape) {
      return;
    }

    shape.x = scene.pointer.x - scene.pointer.offsetX;
    shape.y = scene.pointer.y - scene.pointer.offsetY;
    shape.angle += 0.06;

    const dx = scene.hole.x - shape.x;
    const dy = scene.hole.y - shape.y;
    const dist = Math.hypot(dx, dy);
    if (dist < scene.hole.radius + shape.radius * 0.65) {
      beginAbsorb(shape);
      emitShards(shape);
    }
  });

  function releaseDrag(pointerId) {
    const shape = scene.shapes.find((entry) => entry.id === scene.pointer.dragId);
    scene.pointer.down = false;

    if (!shape) {
      scene.pointer.dragId = null;
      return;
    }

    if (shape.state !== "absorbing") {
      shape.state = "free";
      shape.vx = scene.pointer.vx * 0.28;
      shape.vy = scene.pointer.vy * 0.28;

      const dx = scene.hole.x - shape.x;
      const dy = scene.hole.y - shape.y;
      if (Math.hypot(dx, dy) < scene.hole.radius + shape.radius * 0.9) {
        beginAbsorb(shape);
        emitShards(shape);
      }
    }

    scene.pointer.dragId = null;
    setStatus("FIELD STABLE");

    if (canvas.hasPointerCapture(pointerId)) {
      canvas.releasePointerCapture(pointerId);
    }
  }

  canvas.addEventListener("pointerup", (event) => {
    releaseDrag(event.pointerId);
  });

  canvas.addEventListener("pointercancel", (event) => {
    releaseDrag(event.pointerId);
  });

  function shakeField() {
    scene.shapes.forEach((shape) => {
      if (shape.state !== "free") {
        return;
      }

      shape.vx += (Math.random() - 0.5) * 880;
      shape.vy += -180 - Math.random() * 360;
      shape.spin += (Math.random() - 0.5) * 4.4;
    });

    emitPointerRipple(scene.width * 0.76, 72, "click");
    setStatus("FIELD SHAKEN");
  }

  shakeFieldButton?.addEventListener("click", shakeField);
  window.addEventListener("resize", resizeScene);

  function updateFreeShape(shape, dt) {
    const drag = Math.exp(-1.18 * dt);
    shape.vx *= drag;
    shape.vy *= drag;
    shape.vy += 860 * dt;

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
      shape.spin *= 0.985;
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

    scene.sinks += 1;
    updateMetrics();

    if (shape.kind === "portal") {
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
    updateMetrics();
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

    ctx.save();
    ctx.translate(hole.x, hole.y);

    for (let ring = 4; ring >= 1; ring -= 1) {
      ctx.beginPath();
      ctx.fillStyle = `rgba(47, 124, 255, ${0.05 * ring})`;
      ctx.arc(0, 0, hole.radius + ring * 20 + Math.sin(scene.time * 2 + ring) * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.rotate(scene.time * 0.6);
    ctx.strokeStyle = "rgba(255, 120, 200, 0.36)";
    ctx.lineWidth = 3;
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

    for (let index = 0; index < 8; index += 1) {
      const angle = scene.time * (0.8 + index * 0.06) + index * 0.8;
      const orbit = hole.radius + 16 + Math.sin(scene.time * 2 + index) * 6;
      ctx.fillStyle = index % 2 === 0 ? "rgba(255, 231, 128, 0.85)" : "rgba(104, 200, 255, 0.85)";
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * orbit, Math.sin(angle) * orbit * 0.52, 2.3, 0, Math.PI * 2);
      ctx.fill();
    }

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
        ctx.ellipse(0, 0, radius * (1 + wobble * 0.4), radius * (1 - wobble * 0.2), 0, 0, Math.PI * 2);
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

    if (shape.iconImage && shape.iconImage.complete && shape.iconReady) {
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
  updateMetrics();
  setStatus("FIELD STABLE");
  window.requestAnimationFrame(tick);
})();
