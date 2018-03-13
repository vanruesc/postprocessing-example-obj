import {
	Clock,
	BoxBufferGeometry,
	FogExp2,
	Group,
	HemisphereLight,
	LoadingManager,
	Mesh,
	MeshPhongMaterial,
	Object3D,
	OBJLoader,
	PerspectiveCamera,
	Scene,
	SpotLight,
	WebGLRenderer
} from "three";

import { DeltaControls } from "delta-controls";
import { EffectComposer, FilmPass, RenderPass } from "postprocessing";

/**
 * A clock.
 *
 * @type {Clock}
 * @private
 */

let clock;

/**
 * An effect composer.
 *
 * @type {EffectComposer}
 * @private
 */

let composer;

/**
 * The main camera.
 *
 * @type {Camera}
 * @private
 */

let camera;

/**
 * The main objects.
 *
 * @type {Group}
 * @private
 */

let objects;

/**
 * the background particle cloud.
 *
 * @type {Group}
 * @private
 */

let particles;

/**
 * Produces a random number.
 *
 * @param {Number} min The lowest possible value.
 * @param {Number} max The highest possible value.
 * @return {Number} The random number.
 */

function random(min, max) {

	return Math.random() * (max - min) + min;

}

/**
 * Creates a particle cloud made of boxes.
 *
 * @param {Number} n The amount boxes.
 * @return {Group} The particle cloud.
 */

function createParticleCloud(n) {

	const particles = new Group();

	const geometry = new BoxBufferGeometry(0.35, 0.35, 0.35);
	const material = new MeshPhongMaterial({
		shininess: 100
	});

	let i;

	for(i = 0; i < n; ++i){
	
		var mesh = new Mesh(geometry, material);
		var aG = random(0, Math.PI * 2);
		var rG = random(120, 140);
		var yG = random(-60, 100);

		mesh.position.set(rG * Math.cos(aG), yG, rG * Math.sin(aG));
		mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

		particles.add(mesh);

	}

	return particles;
	
}

/**
 * Handles browser resizing.
 *
 * @private
 * @param {Event} event - An event.
 */

const onResize = (function() {

	let id = 0;

	function handleResize(event) {

		const width = event.target.innerWidth;
		const height = event.target.innerHeight;

		composer.setSize(width, height);
		camera.aspect = width / height;
		camera.updateProjectionMatrix();

		id = 0;

	}

	return function onResize(event) {

		if(id === 0) {

			id = setTimeout(handleResize, 66, event);

		}

	};

}());

/**
 * Loads scene assets.
 *
 * @param {Map} assets - A collection to be filled with assets.
 * @return {Promise} A promise that will be fulfilled as soon as all assets have been loaded.
 */

function load(assets) {

	const loadingManager = new LoadingManager();
	const objLoader = new OBJLoader(loadingManager);

	return new Promise((resolve, reject) => {

		loadingManager.onError = reject;
		loadingManager.onProgress = (item, loaded, total) => {

			if(loaded === total) {

				resolve();

			}

		};

		for(let i = 0; i < 4; ++i) {

			// https://threejs.org/examples/models/obj/male02/male02.obj
			objLoader.load("models/object" + i + ".obj", function(obj) {

				console.log("Loaded object " + i);

				assets.set("object" + i, obj);

			});

		}

	});

}

/**
 * Creates the scene.
 *
 * @private
 * @param {Map} assets - A collection of preloaded assets.
 */

function initialize(assets) {

	const viewport = document.getElementById("viewport");
	const width = window.innerWidth;
	const height = window.innerHeight;
	const aspect = width / height;

	// Clock, Scene, Renderer and Composer.

	clock = new Clock();

	const scene = new Scene();
	scene.fog = new FogExp2(0xf4f4f4, 0.005);

	const renderer = new WebGLRenderer({
		antialias: false,
		alpha: true
	});

	renderer.shadowMap.enabled = false;
	renderer.setSize(width, height);
	renderer.setClearColor(scene.fog.color);
	viewport.appendChild(renderer.domElement);

	composer = new EffectComposer(renderer);

	// Particles.

	particles = createParticleCloud(2000);

	scene.add(particles);

	// Objects.

	objects = new Group();

	let angle = 0.0;
	let i, obj;

	for(i = 0; i < 4; ++i) {

		obj = assets.get("object" + i);
		obj.position.x = -100.0 * Math.cos(angle);
		obj.position.z = -100.0 * Math.sin(angle);
		objects.add(obj);

		angle += (Math.PI * 2.0) / 4.0;

	}

	scene.add(objects);

	// Camera and Controls.

	camera = new PerspectiveCamera(45, aspect, 0.1, 1000);
	camera.position.set(0, 10, 0);

	const controls = new DeltaControls(objects.position, objects.quaternion, renderer.domElement);
	controls.settings.pointer.lock = false;
	controls.settings.translation.enabled = false;
	controls.settings.rotation.minPolarAngle = Math.PI / 2;
	controls.settings.rotation.maxPolarAngle = Math.PI / 2;
	controls.settings.zoom.enabled = false;
	controls.lookAt(scene.position);

	// Lights.

	const spotLight = new SpotLight(0xffffff);
	spotLight.position.set(0, 200, 0);
	spotLight.intensity = 0.8;

	scene.add(new HemisphereLight(0xff0000, 0x340000, 0.5));
	scene.add(spotLight);

	// Passes.

	const renderPass = new RenderPass(scene, camera);
	const filmPass = new FilmPass({
		vignette: true,
		eskil: true,
		scanlines: false,
		noise: true,
		noiseIntensity: 1.0,
		vignetteOffset: 1.0,
		vignetteDarkness: 1.8
	});

	filmPass.renderToScreen = true;

	composer.addPass(renderPass);
	composer.addPass(filmPass);

	// Handle resize events.
	window.addEventListener("resize", onResize);

}

/**
 * The main render loop.
 *
 * @private
 * @param {DOMHighResTimeStamp} now - The current time.
 */

function render(now) {

	requestAnimationFrame(render);

	const delta = clock.getDelta();
	const children = objects.children;

	let i, l;

	for(i = 0, l = children.length; i < l; ++i) {

		children[i].rotation.y += delta * 0.5;

	}

	particles.rotation.y += delta * 0.01;

	composer.render(delta);

}

/**
 * Starts the program.
 *
 * @private
 * @param {Event} event - An event.
 */

window.addEventListener("load", function main(event) {

	// Clean up.
	this.removeEventListener("load", main);

	const assets = new Map();

	load(assets).then(() => initialize(assets)).then(render)
		.catch((e) => console.error(e));

});
