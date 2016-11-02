﻿/*
* Audio Visualizer using Canvas and WebGL
*/

var visualizer;

$(document).ready(function () {
    visualizer = new AudioVisualizer();
    visualizer.initialize();
    visualizer.createBars();
    visualizer.setupAudioProcessing();
    visualizer.handleDrop();  

    var context = document.getElementById("page").getContext('2d');
    var hue = 0;
    function bgcolor() {
        hue = hue + Math.random() * 3 ;
        context.fillStyle = 'hsl(' + hue + ', 100%, 50%)';
        context.fillRect(0, 0, context.canvas.width, context.canvas.height);
    }
    setInterval(bgcolor, 20 );
});

function AudioVisualizer() {
    //constants
    this.numberOfBars = 60;

    //Rendering
    this.scene;
    this.camera;
    this.renderer;
    this.controls;

    //bars
    this.bars = new Array();

    //audio
    this.javascriptNode;
    this.audioContext;
    this.sourceBuffer;
    this.analyser;
}

//initialize the visualizer elements
AudioVisualizer.prototype.initialize = function () {
    //generate a ThreeJS Scene
    this.scene = new THREE.Scene();

    //get the width and height
    var WIDTH = window.innerWidth,
        HEIGHT = window.innerHeight;

    //get the renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(WIDTH, HEIGHT);

    //append the rederer to the container
    document.getElementById("container").appendChild(this.renderer.domElement);

    //create and add camera
    this.camera = new THREE.PerspectiveCamera(40, WIDTH / HEIGHT, 0.1, 20000);
    this.camera.position.set(-15, 30, 30);
    this.scene.add(this.camera);

    var that = this;

    //update renderer size, aspect ratio and projection matrix on resize
    window.addEventListener('resize', function () {
        var WIDTH = window.innerWidth,
            HEIGHT = window.innerHeight;

        that.renderer.setSize(WIDTH, HEIGHT);

        that.camera.aspect = WIDTH / HEIGHT;
        that.camera.updateProjectionMatrix();
    });

    //background color of the scene
    //this.renderer.setClearColor(0x607D8B, 1);

    //create a light and add it to the scene
    var light = new THREE.HemisphereLight(0xF5F5F5, 0x424242, 0.8);
    this.scene.add(light);

    //Add interation capability to the scene
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
};

//create the bars required to show the visualization
AudioVisualizer.prototype.createBars = function () {

    //iterate and create bars
    for (var i = 0; i < this.numberOfBars; i++) {

        //create a bar
        var barGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);

        //create a material
        var material = new THREE.MeshPhongMaterial({
            color: this.getRandomColor(),
            emissive: 0x000000,
            specular: 0x111111,
            shininess: 100
        });

        //create the geometry and set the initial position
        this.bars[i] = new THREE.Mesh(barGeometry, material);
        this.bars[i].position.set(i - this.numberOfBars/2, 0, 0);

        //add the created bar to the scene
        this.scene.add(this.bars[i]);
    }
};

AudioVisualizer.prototype.setupAudioProcessing = function () {
    //get the audio context
    this.audioContext = new AudioContext();

    //create the javascript node
    this.javascriptNode = this.audioContext.createScriptProcessor(2048, 1, 1);
    this.javascriptNode.connect(this.audioContext.destination);

    //create the source buffer
    this.sourceBuffer = this.audioContext.createBufferSource();

    //create the analyser node
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.smoothingTimeConstant = 0.3;
    this.analyser.fftSize = 512;

    //connect source to analyser
    this.sourceBuffer.connect(this.analyser);

    //analyser to speakers
    this.analyser.connect(this.javascriptNode);

    //connect source to analyser
    this.sourceBuffer.connect(this.audioContext.destination);

    var that = this;

    //this is where we animates the bars
    this.javascriptNode.onaudioprocess = function () {

        // get the average for the first channel
        var array = new Uint8Array(that.analyser.frequencyBinCount);
        that.analyser.getByteFrequencyData(array);

        //render the scene and update controls
        visualizer.renderer.render(visualizer.scene, visualizer.camera);
        visualizer.controls.update();

        var step = Math.round(array.length / visualizer.numberOfBars);

        //Iterate through the bars and scale the z axis
        for (var i = 0; i < visualizer.numberOfBars; i++) {
            var value = array[i * step] / 4;
            value = value < 1 ? 1 : value;
            visualizer.bars[i].scale.z = value;
        }
    }

};

//start the audio processing
AudioVisualizer.prototype.start = function (buffer) {
    this.audioContext.decodeAudioData(buffer, decodeAudioDataSuccess, decodeAudioDataFailed);
    var that = this;

    function decodeAudioDataSuccess(decodedBuffer) {
        that.sourceBuffer.buffer = decodedBuffer
        that.sourceBuffer.start(0);
    }

    function decodeAudioDataFailed() {
        debugger
    }
};

//util method to get random colors to make stuff interesting
AudioVisualizer.prototype.getRandomColor = function () {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
};

AudioVisualizer.prototype.handleDrop = function () {
    //drag over
    document.body.addEventListener("dragover", function (e) {
        e.stopPropagation();
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }, false);

    //drop
    document.body.addEventListener("drop", function (e) {
        e.stopPropagation();

        e.preventDefault();

        //get the file
        var file = e.dataTransfer.files[0];
        var fileName = file.name;

        $("#guide").text("Playing " + fileName);

        var fileReader = new FileReader();

        fileReader.onload = function (e) {
            var fileResult = e.target.result;
            visualizer.start(fileResult);
        };

        fileReader.onerror = function (e) {
          debugger
        };
       
        fileReader.readAsArrayBuffer(file);
    }, false);
}