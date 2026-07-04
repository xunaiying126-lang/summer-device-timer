import { useEffect, useRef, type PointerEvent } from "react";
import * as THREE from "three";

type Position = {
  readonly row: number;
  readonly col: number;
};

type Direction = "up" | "down" | "left" | "right";

type ThreeSnakeSceneProps = {
  readonly boardSize: number;
  readonly food: Position;
  readonly onDirectionChange?: (direction: Direction) => void;
  readonly obstacles: readonly Position[];
  readonly phase: string;
  readonly snake: readonly Position[];
};

type SceneRefs = {
  readonly camera: THREE.PerspectiveCamera;
  readonly foodMesh: THREE.Mesh;
  readonly glowMesh: THREE.Mesh;
  readonly obstacleGroup: THREE.Group;
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly snakeGroup: THREE.Group;
};

const CELL_SIZE = 0.78;
const BOARD_HEIGHT = 0.08;
const SNAKE_BASE_Y = 0.38;
const SNAKE_HEAD_Y = 0.48;
const SWIPE_THRESHOLD_PX = 22;

type SceneState = Omit<ThreeSnakeSceneProps, "onDirectionChange">;
type PointerStart = {
  readonly x: number;
  readonly y: number;
};

function cssColor(element: HTMLElement, name: string, fallback: string): string {
  const value = window.getComputedStyle(element).getPropertyValue(name).trim();
  return value || fallback;
}

function toWorld(position: Position, boardSize: number): THREE.Vector3 {
  const centerOffset = (boardSize - 1) / 2;
  return new THREE.Vector3(
    (position.col - centerOffset) * CELL_SIZE,
    0,
    (position.row - centerOffset) * CELL_SIZE,
  );
}

function resizeRenderer(container: HTMLElement, renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera) {
  const { width, height } = container.getBoundingClientRect();
  const nextWidth = Math.max(1, Math.floor(width));
  const nextHeight = Math.max(1, Math.floor(height));

  renderer.setSize(nextWidth, nextHeight, false);
  camera.aspect = nextWidth / nextHeight;
  camera.updateProjectionMatrix();
}

function disposeMaterial(material: THREE.Material, disposedMaterials: Set<THREE.Material>) {
  if (disposedMaterials.has(material)) {
    return;
  }

  disposedMaterials.add(material);
  material.dispose();
}

function disposeObject(
  object: THREE.Object3D,
  disposedMaterials = new Set<THREE.Material>(),
  disposedGeometries = new Set<THREE.BufferGeometry>(),
) {
  object.traverse((child) => {
    const disposable = child as THREE.Object3D & {
      geometry?: THREE.BufferGeometry;
      material?: THREE.Material | THREE.Material[];
    };

    if (disposable.geometry && !disposedGeometries.has(disposable.geometry)) {
      disposedGeometries.add(disposable.geometry);
      disposable.geometry.dispose();
    }

    if (disposable.material) {
      const materials = Array.isArray(disposable.material) ? disposable.material : [disposable.material];
      materials.forEach((material) => disposeMaterial(material, disposedMaterials));
    }
  });
}

function clearGroup(group: THREE.Group) {
  const disposedMaterials = new Set<THREE.Material>();
  const disposedGeometries = new Set<THREE.BufferGeometry>();
  [...group.children].forEach((child) => {
    disposeObject(child, disposedMaterials, disposedGeometries);
    group.remove(child);
  });
}

function createEye(position: THREE.Vector3): THREE.Mesh {
  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.038, 12, 8),
    new THREE.MeshStandardMaterial({ color: "#f8fcff", roughness: 0.18 }),
  );
  eye.position.copy(position);
  return eye;
}

function getHeadingYaw(snake: readonly Position[]): number {
  const head = snake[0];
  const neck = snake[1];
  if (!head || !neck) {
    return Math.PI / 2;
  }

  const rowDelta = head.row - neck.row;
  const colDelta = head.col - neck.col;
  if (colDelta > 0) {
    return Math.PI / 2;
  }
  if (colDelta < 0) {
    return -Math.PI / 2;
  }
  if (rowDelta < 0) {
    return Math.PI;
  }
  return 0;
}

function makeSnakeMaterial(isHead: boolean, root: HTMLElement): THREE.MeshStandardMaterial {
  const primary = cssColor(root, "--primary", "#087f8c");
  const primaryStrong = cssColor(root, "--primary-strong", "#006d77");
  const green = cssColor(root, "--green", "#2fad58");

  return new THREE.MeshStandardMaterial({
    color: isHead ? primaryStrong : green,
    emissive: primary,
    emissiveIntensity: isHead ? 0.14 : 0.08,
    metalness: isHead ? 0.24 : 0.18,
    roughness: isHead ? 0.26 : 0.34,
  });
}

function rebuildGameObjects(sceneRefs: SceneRefs, state: SceneState) {
  const root = document.documentElement;
  const { foodMesh, glowMesh, obstacleGroup, snakeGroup } = sceneRefs;
  const headingYaw = getHeadingYaw(state.snake);

  clearGroup(snakeGroup);
  clearGroup(obstacleGroup);

  state.snake.forEach((part, index) => {
    const isHead = index === 0;
    const radius = isHead ? 0.34 : Math.max(0.22, 0.31 - index * 0.01);
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, isHead ? 28 : 20, isHead ? 20 : 16),
      makeSnakeMaterial(isHead, root),
    );
    mesh.position.copy(toWorld(part, state.boardSize));
    mesh.position.y = isHead ? SNAKE_HEAD_Y : SNAKE_BASE_Y;
    mesh.rotation.y = headingYaw;
    mesh.userData.baseY = mesh.position.y;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    if (isHead) {
      mesh.add(
        createEye(new THREE.Vector3(-0.11, 0.1, 0.27)),
        createEye(new THREE.Vector3(0.11, 0.1, 0.27)),
      );
    }

    snakeGroup.add(mesh);
  });

  const obstacleColor = cssColor(root, "--game-obstacle", "#60788a");
  state.obstacles.forEach((obstacle, index) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.72, 0.5),
      new THREE.MeshStandardMaterial({
        color: obstacleColor,
        metalness: 0.16,
        roughness: 0.54,
      }),
    );
    mesh.position.copy(toWorld(obstacle, state.boardSize));
    mesh.position.y = 0.32;
    mesh.rotation.y = (index % 4) * 0.22;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    obstacleGroup.add(mesh);
  });

  foodMesh.position.copy(toWorld(state.food, state.boardSize));
  foodMesh.position.y = 0.5;
  glowMesh.position.copy(foodMesh.position);
  glowMesh.position.y = 0.09;
}

export function ThreeSnakeScene({ boardSize, food, obstacles, onDirectionChange, phase, snake }: ThreeSnakeSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const refs = useRef<SceneRefs | null>(null);
  const latestState = useRef<SceneState>({ boardSize, food, obstacles, phase, snake });
  const pointerStart = useRef<PointerStart | null>(null);

  useEffect(() => {
    latestState.current = { boardSize, food, obstacles, phase, snake };
  }, [boardSize, food, obstacles, phase, snake]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) {
      return () => undefined;
    }

    const primaryStrong = cssColor(document.documentElement, "--primary-strong", "#006d77");
    const orange = cssColor(document.documentElement, "--orange", "#ef8f25");
    const boardColor = cssColor(document.documentElement, "--game-board-3d", "#dff5ec");
    const gridColor = cssColor(document.documentElement, "--game-grid", "#8fcfc1");
    const lineColor = cssColor(document.documentElement, "--line", "#d7e3ec");

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      canvas,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xeef7fb, 13, 24);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
    camera.position.set(0, 9.2, 10.8);
    camera.lookAt(0, 0, 0);

    const boardWidth = boardSize * CELL_SIZE;
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(boardWidth + 0.42, BOARD_HEIGHT, boardWidth + 0.42),
      new THREE.MeshStandardMaterial({
        color: boardColor,
        metalness: 0.08,
        roughness: 0.58,
      }),
    );
    board.position.y = -0.08;
    board.receiveShadow = true;
    scene.add(board);

    const grid = new THREE.GridHelper(boardWidth, boardSize, gridColor, lineColor);
    grid.position.y = 0.01;
    scene.add(grid);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(boardWidth * 0.71, 0.045, 8, 96),
      new THREE.MeshStandardMaterial({ color: primaryStrong, roughness: 0.4 }),
    );
    rim.position.y = 0.08;
    rim.rotation.x = Math.PI / 2;
    scene.add(rim);

    const glowMesh = new THREE.Mesh(
      new THREE.CircleGeometry(0.44, 32),
      new THREE.MeshBasicMaterial({
        color: orange,
        opacity: 0.18,
        transparent: true,
      }),
    );
    glowMesh.rotation.x = -Math.PI / 2;
    scene.add(glowMesh);

    scene.add(new THREE.HemisphereLight(0xe9f8ff, 0xb9dfca, 2.2));

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(4.5, 10, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 28;
    keyLight.shadow.camera.left = -9;
    keyLight.shadow.camera.right = 9;
    keyLight.shadow.camera.top = 9;
    keyLight.shadow.camera.bottom = -9;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xa7e5ff, 0.92);
    fillLight.position.set(-7, 6, -4);
    scene.add(fillLight);

    const snakeGroup = new THREE.Group();
    const obstacleGroup = new THREE.Group();
    scene.add(snakeGroup, obstacleGroup);

    const foodMesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.28, 1),
      new THREE.MeshStandardMaterial({
        color: orange,
        emissive: orange,
        emissiveIntensity: 0.16,
        metalness: 0.12,
        roughness: 0.32,
      }),
    );
    foodMesh.castShadow = true;
    scene.add(foodMesh);

    refs.current = { camera, foodMesh, glowMesh, obstacleGroup, renderer, scene, snakeGroup };
    rebuildGameObjects(refs.current, latestState.current);
    resizeRenderer(container, renderer, camera);

    const resizeObserver = new ResizeObserver(() => resizeRenderer(container, renderer, camera));
    resizeObserver.observe(container);

    let frameId = 0;
    const animate = () => {
      const state = latestState.current;
      const head = state.snake[0];
      const headWorld = head ? toWorld(head, state.boardSize) : new THREE.Vector3(0, 0, 0);
      const pulse = Math.sin(performance.now() / 280) * 0.045;

      foodMesh.rotation.y += 0.035;
      foodMesh.rotation.x += 0.018;
      foodMesh.position.y = 0.52 + Math.sin(performance.now() / 180) * 0.08;
      glowMesh.scale.setScalar(1 + Math.sin(performance.now() / 240) * 0.09);
      snakeGroup.children.forEach((child, index) => {
        const baseY = typeof child.userData.baseY === "number" ? child.userData.baseY : SNAKE_BASE_Y;
        const bodyWave = Math.sin(performance.now() / 340 - index * 0.55) * 0.012;
        child.position.y = baseY + (index === 0 && state.phase === "playing" ? pulse : bodyWave);
      });

      camera.position.x += (headWorld.x * 0.24 - camera.position.x) * 0.035;
      camera.position.z += (10.8 + headWorld.z * 0.16 - camera.position.z) * 0.035;
      camera.lookAt(headWorld.x * 0.28, 0.18, headWorld.z * 0.2);
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      refs.current = null;
      clearGroup(snakeGroup);
      clearGroup(obstacleGroup);
      disposeObject(scene);
      scene.clear();
      renderer.dispose();
    };
  }, [boardSize]);

  useEffect(() => {
    const sceneRefs = refs.current;
    if (!sceneRefs) {
      return;
    }

    rebuildGameObjects(sceneRefs, { boardSize, food, obstacles, phase, snake });
  }, [boardSize, food, obstacles, phase, snake]);

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    pointerStart.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start || !onDirectionChange) {
      return;
    }

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < SWIPE_THRESHOLD_PX) {
      return;
    }

    onDirectionChange(Math.abs(deltaX) > Math.abs(deltaY) ? (deltaX > 0 ? "right" : "left") : deltaY > 0 ? "down" : "up");
  };

  return (
    <div className="snake-3d-stage" ref={containerRef}>
      <canvas
        className="snake-canvas"
        ref={canvasRef}
        aria-label="3D 贪吃蛇游戏场景"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      />
    </div>
  );
}
