import { useEffect } from 'react';

const FOCAL_LENGTH = 620;

function project(point) {
  const z = point.z + 900;
  const scale = FOCAL_LENGTH / z;

  return {
    x: point.x * scale,
    y: -point.y * scale,
  };
}

function rotateY(point, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return {
    x: point.x * cos + point.z * sin,
    y: point.y,
    z: -point.x * sin + point.z * cos,
  };
}

function rotateX(point, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return {
    x: point.x,
    y: point.y * cos - point.z * sin,
    z: point.y * sin + point.z * cos,
  };
}

function getCssVariable(name) {
  return (
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    '#d9262e'
  );
}

function buildCubeEdges(x1, x2, y1, y2, z1, z2) {
  return [
    [
      { x: x1, y: y1, z: z1 },
      { x: x2, y: y1, z: z1 },
    ],
    [
      { x: x2, y: y1, z: z1 },
      { x: x2, y: y1, z: z2 },
    ],
    [
      { x: x2, y: y1, z: z2 },
      { x: x1, y: y1, z: z2 },
    ],
    [
      { x: x1, y: y1, z: z2 },
      { x: x1, y: y1, z: z1 },
    ],
    [
      { x: x1, y: y2, z: z1 },
      { x: x2, y: y2, z: z1 },
    ],
    [
      { x: x2, y: y2, z: z1 },
      { x: x2, y: y2, z: z2 },
    ],
    [
      { x: x2, y: y2, z: z2 },
      { x: x1, y: y2, z: z2 },
    ],
    [
      { x: x1, y: y2, z: z2 },
      { x: x1, y: y2, z: z1 },
    ],
    [
      { x: x1, y: y1, z: z1 },
      { x: x1, y: y2, z: z1 },
    ],
    [
      { x: x2, y: y1, z: z1 },
      { x: x2, y: y2, z: z1 },
    ],
    [
      { x: x2, y: y1, z: z2 },
      { x: x2, y: y2, z: z2 },
    ],
    [
      { x: x1, y: y1, z: z2 },
      { x: x1, y: y2, z: z2 },
    ],
  ];
}

function buildStand(kind) {
  const width = kind === 'tower' ? 180 : 300;
  const depth = kind === 'tower' ? 180 : 200;
  const deckHeight = kind === 'flat' ? 90 : 140;
  const roofHeight = kind === 'flat' ? 90 : 240;
  const step = 40;
  const lines = [];
  const dots = [];

  const frame = [
    [
      { x: -width, y: 0, z: -depth },
      { x: width, y: 0, z: -depth },
    ],
    [
      { x: width, y: 0, z: -depth },
      { x: width, y: 0, z: depth },
    ],
    [
      { x: width, y: 0, z: depth },
      { x: -width, y: 0, z: depth },
    ],
    [
      { x: -width, y: 0, z: depth },
      { x: -width, y: 0, z: -depth },
    ],
  ];

  frame.forEach((line) => lines.push({ points: line, color: '#e3dbc9', width: 1 }));

  for (let x = -width + step; x < width; x += step) {
    lines.push({
      points: [
        { x, y: 0, z: -depth },
        { x, y: 0, z: depth },
      ],
      color: 'rgba(245,241,234,0.08)',
      width: 0.5,
    });
  }

  for (let z = -depth + step; z < depth; z += step) {
    lines.push({
      points: [
        { x: -width, y: 0, z },
        { x: width, y: 0, z },
      ],
      color: 'rgba(245,241,234,0.08)',
      width: 0.5,
    });
  }

  [
    [-width, -depth],
    [width, -depth],
    [width, depth],
    [-width, depth],
  ].forEach(([x, z]) => {
    lines.push({
      points: [
        { x, y: 0, z },
        { x, y: roofHeight, z },
      ],
      color: 'rgba(245,241,234,0.5)',
      width: 1.2,
    });
  });

  if (kind !== 'flat') {
    lines.push({
      points: [
        { x: -width, y: deckHeight, z: -depth },
        { x: width, y: deckHeight, z: -depth },
      ],
      color: 'rgba(245,241,234,0.4)',
      width: 1,
    });
    lines.push({
      points: [
        { x: width, y: deckHeight, z: -depth },
        { x: width, y: deckHeight, z: depth },
      ],
      color: 'rgba(245,241,234,0.4)',
      width: 1,
    });
    lines.push({
      points: [
        { x: width, y: deckHeight, z: depth },
        { x: -width, y: deckHeight, z: depth },
      ],
      color: 'rgba(245,241,234,0.4)',
      width: 1,
    });
    lines.push({
      points: [
        { x: -width, y: deckHeight, z: depth },
        { x: -width, y: deckHeight, z: -depth },
      ],
      color: 'rgba(245,241,234,0.4)',
      width: 1,
    });

    for (let x = -width + step; x < width; x += step * 2) {
      lines.push({
        points: [
          { x, y: deckHeight, z: -depth },
          { x, y: deckHeight + 20, z: -depth },
        ],
        color: 'rgba(245,241,234,0.25)',
        width: 0.8,
      });
    }
  }

  [
    [
      { x: -width, y: roofHeight, z: -depth },
      { x: width, y: roofHeight, z: -depth },
    ],
    [
      { x: width, y: roofHeight, z: -depth },
      { x: width, y: roofHeight, z: depth },
    ],
    [
      { x: width, y: roofHeight, z: depth },
      { x: -width, y: roofHeight, z: depth },
    ],
    [
      { x: -width, y: roofHeight, z: depth },
      { x: -width, y: roofHeight, z: -depth },
    ],
  ].forEach((line) =>
    lines.push({
      points: line,
      color: 'rgba(245,241,234,0.55)',
      width: 1.2,
    })
  );

  const wallY1 = 20;
  const wallY2 = roofHeight - 30;
  const wallX1 = -width + 60;
  const wallX2 = width - 60;
  const accentA = getCssVariable('--accent-a');

  [
    [
      { x: wallX1, y: wallY1, z: -depth + 8 },
      { x: wallX2, y: wallY1, z: -depth + 8 },
    ],
    [
      { x: wallX2, y: wallY1, z: -depth + 8 },
      { x: wallX2, y: wallY2, z: -depth + 8 },
    ],
    [
      { x: wallX2, y: wallY2, z: -depth + 8 },
      { x: wallX1, y: wallY2, z: -depth + 8 },
    ],
    [
      { x: wallX1, y: wallY2, z: -depth + 8 },
      { x: wallX1, y: wallY1, z: -depth + 8 },
    ],
  ].forEach((line) => lines.push({ points: line, color: accentA, width: 2 }));

  for (let i = 1; i < 8; i += 1) {
    const x = wallX1 + (wallX2 - wallX1) * (i / 8);
    lines.push({
      points: [
        { x, y: wallY1, z: -depth + 8 },
        { x, y: wallY2, z: -depth + 8 },
      ],
      color: 'rgba(217,38,46,0.25)',
      width: 0.6,
    });
  }

  for (let i = 1; i < 4; i += 1) {
    const y = wallY1 + (wallY2 - wallY1) * (i / 4);
    lines.push({
      points: [
        { x: wallX1, y, z: -depth + 8 },
        { x: wallX2, y, z: -depth + 8 },
      ],
      color: 'rgba(217,38,46,0.25)',
      width: 0.6,
    });
  }

  if (kind !== 'tower') {
    const podWidth = 44;
    const podHeight = 60;
    const podDepth = 40;
    const podColor = getCssVariable('--accent-b');
    const podPositions = [
      { x: -width + 80, z: 60 },
      { x: -width + 80, z: -40 },
      { x: width - 80, z: 60 },
      { x: width - 80, z: -40 },
    ];

    podPositions.forEach((pod) => {
      buildCubeEdges(
        pod.x - podWidth / 2,
        pod.x + podWidth / 2,
        0,
        podHeight,
        pod.z - podDepth / 2,
        pod.z + podDepth / 2
      ).forEach((edge) => {
        lines.push({ points: edge, color: podColor, width: 1.4 });
      });
    });
  }

  if (kind !== 'tower') {
    const demoColor = getCssVariable('--accent-c');
    const discPositions = [
      { x: 0, z: 80 },
      { x: 0, z: -60 },
    ];

    discPositions.forEach((disc) => {
      const radius = 40;
      const segments = 20;

      for (let i = 0; i < segments; i += 1) {
        const a1 = (i / segments) * Math.PI * 2;
        const a2 = ((i + 1) / segments) * Math.PI * 2;

        lines.push({
          points: [
            {
              x: disc.x + Math.cos(a1) * radius,
              y: 2,
              z: disc.z + Math.sin(a1) * radius,
            },
            {
              x: disc.x + Math.cos(a2) * radius,
              y: 2,
              z: disc.z + Math.sin(a2) * radius,
            },
          ],
          color: demoColor,
          width: 1.5,
        });
      }

      dots.push({ point: { x: disc.x, y: 2, z: disc.z }, color: demoColor, radius: 3 });
    });
  }

  const deskWidth = 80;
  const deskHeight = 40;
  [
    [
      { x: -deskWidth, y: 0, z: depth - 30 },
      { x: deskWidth, y: 0, z: depth - 30 },
    ],
    [
      { x: deskWidth, y: 0, z: depth - 30 },
      { x: deskWidth, y: deskHeight, z: depth - 30 },
    ],
    [
      { x: deskWidth, y: deskHeight, z: depth - 30 },
      { x: -deskWidth, y: deskHeight, z: depth - 30 },
    ],
    [
      { x: -deskWidth, y: deskHeight, z: depth - 30 },
      { x: -deskWidth, y: 0, z: depth - 30 },
    ],
  ].forEach((line) => lines.push({ points: line, color: '#b8c7cc', width: 1.5 }));

  if (kind === 'tower') {
    const bannerWidth = 60;
    const bannerHeight = 90;

    lines.push({
      points: [
        { x: 0, y: roofHeight - 20, z: 0 },
        { x: 0, y: roofHeight + 80, z: 0 },
      ],
      color: accentA,
      width: 2,
    });

    buildCubeEdges(
      -bannerWidth,
      bannerWidth,
      roofHeight + 10,
      roofHeight + bannerHeight,
      0,
      0
    ).forEach((edge) => {
      lines.push({ points: edge, color: accentA, width: 1.5 });
    });
  }

  return { lines, dots };
}

export function useStandPreview() {
  useEffect(() => {
    const root = document.getElementById('stand-root');
    const stage = document.getElementById('stand3d-stage');

    if (!root || !stage) {
      return undefined;
    }

    let angleY = -0.6;
    let angleX = 0.28;
    let speed = 0.6;
    let previousTime = performance.now();
    let kind = 'double';
    let geometry = buildStand(kind);
    let paused = false;
    let disposed = false;
    let frameId = 0;

    function render() {
      const fragments = [];

      geometry.lines.forEach((line) => {
        const a = project(rotateX(rotateY(line.points[0], angleY), angleX));
        const b = project(rotateX(rotateY(line.points[1], angleY), angleX));

        fragments.push(
          `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${line.color}" stroke-width="${line.width}" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`
        );
      });

      geometry.dots.forEach((dot) => {
        const point = project(rotateX(rotateY(dot.point, angleY), angleX));

        fragments.push(
          `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="${dot.radius}" fill="${dot.color}" opacity="0.9"/>`
        );
      });

      root.innerHTML = fragments.join('');
    }

    function loop(time) {
      if (disposed) {
        return;
      }

      const delta = (time - previousTime) / 1000;
      previousTime = time;

      if (!paused) {
        angleY += speed * delta;
      }

      render();
      frameId = requestAnimationFrame(loop);
    }

    const buttons = Array.from(document.querySelectorAll('.stand3d-ctrl button'));
    const buttonCleanups = buttons.map((button) => {
      function handleClick() {
        buttons.forEach((item) => item.classList.remove('on'));
        button.classList.add('on');

        const nextSpeed = button.dataset.spd;
        if (nextSpeed === 'pause') {
          paused = true;
          return;
        }

        paused = false;
        speed = nextSpeed === 'slow' ? 0.2 : nextSpeed === 'fast' ? 1.6 : 0.6;
      }

      button.addEventListener('click', handleClick);
      return () => button.removeEventListener('click', handleClick);
    });

    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startAngleY = 0;
    let startAngleX = 0;

    function handlePointerDown(event) {
      dragging = true;
      paused = true;
      startX = event.clientX;
      startY = event.clientY;
      startAngleY = angleY;
      startAngleX = angleX;
    }

    function handlePointerMove(event) {
      if (!dragging) {
        return;
      }

      angleY = startAngleY + (event.clientX - startX) * 0.008;
      angleX = Math.max(-0.8, Math.min(0.8, startAngleX - (event.clientY - startY) * 0.006));
    }

    function handlePointerUp() {
      dragging = false;
    }

    stage.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    const previousStandApi = window.__stand3d;
    window.__stand3d = {
      setSpeed(value) {
        speed = value;
        if (value > 0) {
          paused = false;
        }
      },
      setKind(value) {
        kind = value;
        geometry = buildStand(kind);
      },
      refresh() {
        geometry = buildStand(kind);
      },
    };

    frameId = requestAnimationFrame(loop);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      buttonCleanups.forEach((cleanup) => cleanup());
      stage.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      root.innerHTML = '';

      if (previousStandApi) {
        window.__stand3d = previousStandApi;
      } else {
        delete window.__stand3d;
      }
    };
  }, []);
}
