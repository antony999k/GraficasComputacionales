let renderer = null,
    scene = null,
    camera = null;

let root = null;
let playerGroup = null;
let game = null;
let level = null;
let player = null;
let hud = null

let duration = 1000; // ms
let currentTime = Date.now();

let loader2 = new THREE.FBXLoader();

function main(canvas) {
    /****************************************************************************
     * Scene
     */
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true
    });
    // Set the viewport size
    renderer.setSize(canvas.width, canvas.height);
    // Create a new Three.js scene
    scene = new THREE.Scene();
    // Set the background color 
    scene.background = new THREE.Color("rgb(224,248,249)");
    // scene.background = new THREE.Color( "rgb(100, 100, 100)" );

    /****************************************************************************
     * Camera
     */
    // Add  a camera so we can view the scene
    //PerspectiveCamera( fov : Number, aspect : Number, near : Number, far : Number )
    camera = new THREE.PerspectiveCamera(45, canvas.width / canvas.height, 0.5, 4000);
    //camera = new THREE.OrthographicCamera( canvas.width / - 2, canvas.width / 2, canvas.height / 2, canvas.height / - 2, 0.5, 2000 );
    camera.position.set(3, 4, 8);
    camera.rotation.x = -0.4;
    camera.rotation.y = 0.0;
    scene.add(camera);

    /****************************************************************************
     * Light
     */
    // Add a directional light to show off the objects
    let light = new THREE.DirectionalLight(0xffffff, 2.0);
    // let light = new THREE.DirectionalLight( "rgb(255, 255, 100)", 1.5);

    // Position the light out from the scene, pointing at the origin
    light.position.set(1, 3, 0);
    light.target.position.set(0, 0, 0);
    scene.add(light);

    // This light globally illuminates all objects in the scene equally.
    // Cannot cast shadows
    let ambientLight = new THREE.AmbientLight(0xffccaa, 0.5);
    scene.add(ambientLight);

    /****************************************************************************
     * Game
     */
    // Create a group to hold all the objects
    root = new THREE.Object3D;
    game = new Game()
    level = new Level(game.levelsData[game.level]);
    player = new Player();
    hud = new HUD();

    // Now add the group to our scene
    scene.add(root);

    /****************************************************************************
     * Events
     */
    // add mouse handling so we can rotate the scene
    gameEvents(game, level, player);
    /****************************************************************************
     * Run the loop
     */
    run();
}

function _update() {
    let now = Date.now();
    let deltat = now - currentTime;
    currentTime = now;
    let fract = deltat / duration;

    game.update();
    level.update();
    player.update(deltat);
    /*
        if (dancers.length > 0) {
            for (dancer_i of dancers)
                dancer_i.mixer.update((deltat) * 0.001);
        }
    */
}

function run() {
    requestAnimationFrame(() => run());
    // Render the scene
    renderer.render(scene, camera);

    _update();
    // Update the animations
    TWEEN.update();
}

class Game {
    constructor() {
        if (!!Game.instance) return Game.instance;
        Game.instance = this;

        this.loaded = false;
        this.state = "start";
        this.gameOver = false;
        this.playing = false;
        this.level = 0;
        this.commands = []
        this.levelsData = [{
                level: "sfffe",
                buttons: {
                    DragFront: 2,
                    DragLeft: 0,
                    DragRight: 0
                }
            },
            {
                level: "sfflfe",
                buttons: {
                    DragFront: 3,
                    DragLeft: 1,
                    DragRight: 0
                }
            },
        ]
        this.ambienAudio = document.createElement("audio");
        this.ambienAudio.src = "src/bg.mp3";
        //this.ambienAudio.volume = 0.25;
        this.ambienAudio.volume = 0.0;
        return this;
    }

    update() {
        if (!this.loaded && level.loaded && player.loaded) {
            let loader = document.getElementById("startGame")
            loader.disabled = false;
            loader.innerHTML = 'Start Game'
        }

        if(this.state == "game" && this.playing){
            if(!player.inAction){ 
                if(this.commands.length <= 0) {
                    this.playing = false;
                    return;
                }
                this.commands.pop()
                player.playTweenAnimation()
            }
        }
    }

    togglePlaySound() {
        if (this.ambienAudio.paused) {
            this.ambienAudio.play();
            return true;
        } else {
            this.ambienAudio.pause();
            return false;
        }
    }

    playLevel() {
        console.log("play level")
        this.state = "game";
        if (this.ambienAudio.paused) this.togglePlaySound();
        level.show();
        player.show();

        hud.toggleDragAndDrop(true)
        this.loaded = true;
    }

    playTurn() {
        console.log(this.commands)
        this.playing = true;
        //playAnimations()
        //player.playTweenAnimation()
    }

    resetLevel(){
        this.gameOver = false;
        this.playing = false;
        this.commands = []
        player.reset();
        hud.resetDragAndDrop()
    }
}

class Level {
    constructor(levelData) {
        // s: start, f: front, e:end
        this.loaded = false;
        this.level = levelData.level;
        this.buttons = levelData.buttons;
        this.tiles = []
        this.getTiles()
        return this;
    }

    update() {
        if (this.tiles.length > 0 && !this.loaded) {
            if (this.tiles.every(this.isTileLoad)) this.loaded = true;
        }
    }

    isTileLoad(tile) {
        return (tile.loaded)
    }

    getTiles() {
        for (let i = 0; i < this.level.length; i++) {
            let tile = new Tile({
                x: i,
                y: 0,
                z: 0
            });
            this.tiles.push(tile);
        }
        //this.loaded = true;
    }

    show() {
        if (this.loaded) {
            this.tiles.forEach(tile => {
                root.add(tile.obj);
            });
        }
    }
    
}

class Tile {
    constructor(pos) {
        this.loaded = false;
        this.resourceUrl = 'src/tileB.fbx';
        this.material = new THREE.MeshStandardMaterial({
            color: 0xffffff
        });
        this.obj = null;
        this.loader = new THREE.FBXLoader();
        this.loader.load(
            // resource URL
            this.resourceUrl,
            // called when the resource is loaded
            (tileObj) => this.updloadSuccess(tileObj, pos),
            // called while loading is progressing
            (xhr) => this.uploadProcessing(xhr),
            // called when loading has errors
            (error) => this.uploadError(error)
        );
        return this;
    }

    updloadSuccess(tileObj, pos) {
        tileObj.children[0].material = this.material;
        tileObj.scale.set(0.01, 0.01, 0.01);
        tileObj.position.set(pos.x, pos.y, pos.z)
        this.obj = tileObj;
        this.loaded = true;
    }

    uploadProcessing(xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded tile');
    }

    uploadError(error) {
        console.log('An error happened');
        console.log(error)
    }
}

class Player {
    constructor() {
        // General
        this.loaded = false;
        this.inAction = false;
        this.action = 'idle'
        this.obj = null;
        //Resources
        this.resourceUrl = 'src/robot.fbx';
        this.textureUrl = 'src/robotTexture.png';
        this.texture = new THREE.TextureLoader().load(this.textureUrl);
        this.textureEm = new THREE.TextureLoader().load('src/robotEmissive.png');
        this.material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            map: this.texture,
            emissive: 0xffffff,
            emissiveMap: this.textureEm
        });
        // Animation
        this.actionAnim = null;
        this.durationTween = 2; // sec
        this.positionTween = null;
        this.tweenFront = true;

        // Loader
        this.loader = new THREE.FBXLoader();
        this.loader.load(
            // resource URL
            this.resourceUrl,
            // called when the resource is loaded
            (robotObj) => this.updloadSuccess(robotObj),
            // called while loading is progressing
            (xhr) => this.uploadProcessing(xhr),
            // called when loading has errors
            (error) => this.uploadError(error)
        );
    }

    update(deltat) {
        if (this.loaded){
            if(this.obj.mixer != null) this.obj.mixer.update((deltat) * 0.001);

        } 

    }

    show() {
        playerGroup = new THREE.Object3D;
        playerGroup.add(this.obj)
        root.add(playerGroup);
    }

    reset(){
        this.inAction = false;
        this.action = 'idle'
        if(this.positionTween) this.positionTween.stop()
        playerGroup.position.set(0,0,0)
        console.log(this)
    }

    updloadSuccess(robotObj) {
        robotObj.children[0].material = this.material;
        //console.log(robotObj.children[0].material)

        robotObj.mixer = new THREE.AnimationMixer(scene);
        robotObj.scale.set(0.01, 0.01, 0.01);
        robotObj.rotation.y = Math.PI / 2;

        if (robotObj.animations.length > 0) {
            this.actionAnim = robotObj.mixer.clipAction(robotObj.animations[0], robotObj);
            this.actionAnim.play();
        }

        this.obj = robotObj;
        //dancers.push(robotObj);
        this.loaded = true;
        console.log(this)
    }

    uploadProcessing(xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    }

    uploadError(error) {
        console.log('An error happened');
        console.log(error)
    }

    playTweenAnimation() {
        if(this.inAction) return;
        this.inAction = true;
        this.action = 'front';
        // override tween animation
        if (this.positionTween) this.positionTween.stop();  

        if (this.tweenFront) {
            this.positionTween =
                new TWEEN.Tween(playerGroup.position).to({
                    x: playerGroup.position.x + 1,
                    y: 0,
                    z: 0
                }, this.durationTween * 1000)
                .interpolation(TWEEN.Interpolation.Linear)
                .delay(0)
                .easing(TWEEN.Easing.Quadratic.InOut)
                .repeat(0)
                .start()
                .onComplete(() => {
                    this.inAction = false;
                    this.action = 'idle';
                })
        }
    }
}

class HUD{
    constructor(){
        this.dragAndDrop = document.getElementById("dragAndDrop");
        this.dropzone = document.getElementById("dropzone");
        this.startBtn = document.getElementById("startGame")
        this.playBtn = document.getElementById("playTurn");
    }

    toggleDragAndDrop(visible){
        if(visible) dragAndDrop.style.opacity = 1;
        else dragAndDrop.style.opacity = 0;
    }

    resetDragAndDrop(){
        while(this.dropzone.firstChild) this.dropzone.removeChild(this.dropzone.lastChild);
        this.playBtn.disabled = true;
    }
}