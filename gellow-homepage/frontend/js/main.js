(function initHomeScene() {
  const canvas = document.getElementById("scene-canvas");
  const linkedCount = document.getElementById("linked-count");
  const ambientCount = document.getElementById("ambient-count");
  const sinkCount = document.getElementById("sink-count");
  const statusLabel = document.getElementById("scene-status-label");

  if (!canvas) {
    return;
  }

  const ctx = canvas.getContext("2d");
  const PORTALS = [
    {
      label: "GITHUB",
      url: "https://github.com/11gellow",
      color: "#68c8ff",
      accent: "#dff3ff",
      geometry: "square",
    },
    {
      label: "STEAM",
      url: "https://steamcommunity.com/profiles/76561198444114302/",
      color: "#2f7cff",
      accent: "#d9e7ff",
      geometry: "hex",
    },
    {
      label: "BILIBILI",
      url: "https://space.bilibili.com/518863790",
      color: "#ff78c8",
      accent: "#ffe6f5",
      geometry: "diamond",
    },
    {
      label: "BLOG",
      url: "https://blog.gellow.top",
      color: "#ffe780",
      accent: "#fff8d5",
      geometry: "triangle",
    },
    {
      label: "RS.GELLOW.TOP",
      url: "https://rs.gellow.top",
      color: "#7cffcb",
      accent: "#e9fff7",
      geometry: "circle",
    },
  ];
  const AMBIENT_TOTAL = 11;
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
      x: 168,
      y: 170,
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

  function createCloudDots() {
    const dots = [];
    const count = Math.max(90, Math.floor(scene.width / 18));

    for (let index = 0; index < count; index += 1) {
      dots.push({
        x: scene.width * (0.32 + Math.random() * 0.66),
        y: scene.height * (0.08 + Math.random() * 0.84),
        radius: 1 + Math.random() * 2.6,
        phase: Math.random() * Math.PI * 2,
        speed: 0.25 + Math.random() * 0.8,
      });
    }

    return dots;
  }

  function createShape(spec, kind, index) {
    const radius = spec.radius || (kind === "portal" ? 44 + Math.random() * 6 : 18 + Math.random() * 28);
    const spawnX = scene.width * (0.56 + Math.random() * 0.38);
    const spawnY = -Math.random() * scene.height * 0.55 - index * 36;

    return {
      id: `${kind}-${index}-${Math.random().toString(16).slice(2, 7)}`,
      kind,
      label: spec.label || "",
      url: spec.url || "",
      color: spec.color,
      accent: spec.accent,
      geometry: spec.geometry,
      radius,
      x: spawnX,
      y: spawnY,
      vx: (Math.random() - 0.5) * 110,
      vy: 60 + Math.random() * 120,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 1.9,
      mass: radius * radius,
      state: "free",
      absorb: 0,
      triggered: false,
      navigated: false,
    };
  }

  function createAmbientSpec() {
    const palette = [
      { color: "#1d2751", accent: "#68c8ff", geometry: "square" },
      { color: "#131d3a", accent: "#7cffcb", geometry: "triangle" },
      { color: "#291942", accent: "#ff78c8", geometry: "diamond" },
      { color: "#192443", accent: "#ffe780", geometry: "hex" },
      { color: "#1a2140", accent: "#8ab4ff", geometry: "circle" },
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
    scene.hole.radius = scene.width < 700 ? 54 : 66;
    scene.hole.core = scene.width < 700 ? 30 : 38;
    scene.hole.influence = scene.width < 700 ? 180 : 220;
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
      life: kind === "move" ? 0.5 : 0.95,
      rotation: Math.random() * Math.PI * 2,
      scale: kind === "move" ? 14 + Math.random() * 14 : 28 + Math.random() * 34,
      color: kind === "move" ? "#68c8ff" : "#7cffcb",
    });
  }

  function emitShards(shape) {
    const pieces = shape.kind === "portal" ? 14 : 9;
    for (let index = 0; index < pieces; index += 1) {
      scene.particles.push({
        kind: "shard",
        x: shape.x,
        y: shape.y,
        age: 0,
        life: 0.7 + Math.random() * 0.35,
        vx: (Math.random() - 0.5) * 180,
        vy: (Math.random() - 0.5) * 180,
        pull: 160 + Math.random() * 140,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 8,
        scale: 4 + Math.random() * 7,
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
    shape.spin = (shape.spin >= 0 ? 1 : -1) * (3.4 + Math.random() * 1.6);
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
    shape.angle += 0.04;

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

  window.addEventListener("resize", resizeScene);

  function updateFreeShape(shape, dt) {
    const drag = Math.exp(-1.2 * dt);
    shape.vx *= drag;
    shape.vy *= drag;
    shape.vy += 880 * dt;

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
    const bounce = 0.78;

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
      shape.spin *= 0.98;
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
    const pull = 5.5 + shape.absorb * 9;
    shape.x += (scene.hole.x - shape.x) * Math.min(1, dt * pull);
    shape.y += (scene.hole.y - shape.y) * Math.min(1, dt * pull);
    shape.angle += shape.spin * (1 + shape.absorb * 3.8) * dt;

    if (shape.absorb > 0.82 && !shape._burst) {
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

  function buildShapePath(shape, radius, wobble) {
    const stepsByGeometry = {
      triangle: 3,
      square: 4,
      diamond: 4,
      hex: 6,
    };

    if (shape.geometry === "circle") {
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * (1 + wobble * 0.4), radius * (1 - wobble * 0.2), 0, 0, Math.PI * 2);
      return;
    }

    const steps = stepsByGeometry[shape.geometry] || 6;
    const startAngle = shape.geometry === "triangle" ? -Math.PI / 2 : Math.PI / 4;

    ctx.beginPath();
    for (let index = 0; index < steps; index += 1) {
      const angle = startAngle + (Math.PI * 2 * index) / steps;
      let pointRadius = radius;

      if (shape.geometry === "diamond" && index % 2 === 1) {
        pointRadius *= 0.64;
      }

      const distortion = 1 + wobble * Math.sin(angle * 3 + scene.time * 14 + radius);
      const x = Math.cos(angle) * pointRadius * distortion;
      const y = Math.sin(angle) * pointRadius * distortion;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
  }

  function drawShape(shape) {
    if (shape.state === "gone") {
      return;
    }

    const wobble = shape.state === "absorbing" ? shape.absorb * 0.45 : 0;
    const scale = shape.state === "absorbing" ? Math.max(0.12, 1 - shape.absorb * 0.88) : 1;

    ctx.save();
    ctx.translate(shape.x, shape.y);
    ctx.rotate(shape.angle);
    ctx.scale(scale, scale);

    buildShapePath(shape, shape.radius, wobble);
    ctx.fillStyle = shape.color;
    ctx.fill();

    ctx.lineWidth = 3;
    ctx.strokeStyle = shape.accent;
    ctx.stroke();

    if (shape.kind === "portal") {
      ctx.fillStyle = shape.accent;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `700 ${Math.max(11, Math.min(18, shape.radius * 0.34))}px "Courier New", monospace`;
      ctx.fillText(shape.label, 0, 1);
    }

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
        ctx.strokeRect(-particle.scale * progress, -particle.scale * progress, particle.scale * 2 * progress, particle.scale * 2 * progress);
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
        ctx.fillStyle = particle.color.replace("rgb", "rgba");
        ctx.globalAlpha = alpha * 0.9;
        ctx.fillRect(-particle.scale * 0.5, -particle.scale * 0.5, particle.scale, particle.scale);
      }

      ctx.restore();
    });
  }

  function render() {
    drawBackground();
    drawBlackHole();
    scene.shapes.forEach(drawShape);
    drawParticles();
  }

  function tick(timestamp) {
    const dt = Math.min(0.032, (timestamp - (scene.lastTs || timestamp)) / 1000 || 0.016);
    scene.lastTs = timestamp;
    update(dt);
    render();
    window.requestAnimationFrame(tick);
  }

  resizeScene();
  updateMetrics();
  setStatus("FIELD STABLE");
  window.requestAnimationFrame(tick);
})();
