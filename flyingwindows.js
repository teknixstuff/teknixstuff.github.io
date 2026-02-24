async function drawFlyingWindows(elem) {
    const COLORS = ['#666c2b', 'teal', 'aqua', 'lime', 'purple', 'gray', 'white', 'red', 'maroon', 'green', 'blue'];

    const getRandomColor = function() {
        return COLORS[Math.floor(Math.random() * COLORS.length)];
    }

    let counter = 0;
    const getRandomPosition = function(minX, minY, maxX, maxY) {
        //return {x: (maxX / 4) * (Math.random() > 0.5 ? 1 : 3), y: Math.floor((Math.random() * (maxY/2)) + (maxY/2))};
        if (counter++ % 3 === 0) {
            // sometimes, bias it a little more towards the center
            const fourthX = Math.abs(minX - maxX) / 4;
            const fourthY = Math.abs(minY - maxY) / 4;

            return {
                x: Math.floor((Math.random() * (maxX - (fourthX * 2))) + fourthX),
                y: Math.floor((Math.random() * (maxY - (fourthY * 2))) + fourthY),
            };
        } else {
            return {
                x: Math.floor((Math.random() * maxX) + minX),
                y: Math.floor((Math.random() * maxY) + minY)
            };
        }
    }

    const APPROX_FRAMES_PER_SECOND = 60;
    const TIME_SLICE = 1000 / APPROX_FRAMES_PER_SECOND;

    const adjustStartingPosition = function(pos, sw, sh) {
        /*
        const MAGIC_SIZE_CONSTANT = 0.22;
        const cx = sw / 2;
        const cy = sh / 2;
        let {x, y} = pos;

        if (y < cy) {
            return pos;
        }

        if (x < cx) {
            let xmax = cy - (y - cy);
            xmax -= (MAGIC_SIZE_CONSTANT * Math.abs(xmax - cx)) / 2;
            x = x > xmax ? xmax : x;
        } else {
            let xmin = sw - (cy - (y - cy));
            xmin += (MAGIC_SIZE_CONSTANT * Math.abs(xmin - cx)) / 2;
            x = x < xmin ? xmin : x;
        }

        pos.x = x;
        */
        return pos;
    }

    const getRandomValidPosition = function(sw, sh) {
        return adjustStartingPosition(getRandomPosition(0, 0, sw, sh), sw, sh);
    }

    const WindowsLogo = class {
        constructor(x, y, speed, color) {
            this.recycle(x, y, speed, color);
        }

        recycle(x, y, speed, color) {
            this.x = x;
            this.y = y;
            this.speed = speed;
            this.color = color;
        }
    }

    const WindowLogoFactory = {    
        createRandomLogo(speed, screenWidth, screenHeight) {
            const { x, y } = getRandomValidPosition(screenWidth, screenHeight);
            const color = getRandomColor();
            return new WindowsLogo(x, y, speed, color);
        },

        recycleLogo(logo, screenWidth, screenHeight) {
            const { x, y } = getRandomValidPosition(screenWidth, screenHeight);
            const color = getRandomColor();
            logo.recycle(x, y, logo.speed, color);
        }
    };

    const ScreenSaver = class {
        constructor(canvas, imageFactory) {
            this.canvas = canvas;
            this.context = this.canvas.getContext('2d');

            this.logos = [];
            this.imageFactory = imageFactory
            this.lastTick = 0;
        }

        _updateState(timeSinceLastTick) {
            const MAGIC_SIZE_CONSTANT = 0.22; // just seems to work

            const cx = this.canvas.width / 2;
            const cy = this.canvas.height / 2;

            const timeMultiplier = timeSinceLastTick / 1000;

            for (const windowsLogo of this.logos) {
                // move out away from center
                windowsLogo.x += ((windowsLogo.x - cx) * windowsLogo.speed) * timeMultiplier;
                windowsLogo.y += ((windowsLogo.y - cy) * windowsLogo.speed) * timeMultiplier;

                const logoWidth = MAGIC_SIZE_CONSTANT * Math.abs(windowsLogo.x - cx);
                const logoHeight = MAGIC_SIZE_CONSTANT * Math.abs(windowsLogo.y - cy);

                // if the logo is out of frame, recycle it
                if (windowsLogo.x > this.canvas.width + logoWidth || windowsLogo.x < -logoWidth ||
                    windowsLogo.y > this.canvas.height + logoHeight || windowsLogo.y < -logoHeight) {

                    WindowLogoFactory.recycleLogo(windowsLogo, this.canvas.width, this.canvas.height);
                }
            }
        }

        _renderContent() {
            const MAGIC_CONSTANT= 0.205;

            // paint black background
            //this.context.fillStyle = "black";
            //this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

            const cx = this.canvas.width / 2;
            const cy = this.canvas.height / 2;
        
            // paint windows
            for (const windowsLogo of this.logos) {
                const img = this.imageFactory.getColorImage(windowsLogo.color);

                const width = img.naturalWidth;
                const height = img.naturalHeight;

                const distFromCenter = Math.sqrt(
                    Math.pow(cx - windowsLogo.x, 2) + Math.pow(cy - windowsLogo.y, 2)
                );

                const radius = Math.max(this.canvas.width, this.canvas.height);

                let endpoint = radius + Math.max(width, height);

                const proportion = (distFromCenter / endpoint) * MAGIC_CONSTANT;

                this.context.drawImage(
                    img, windowsLogo.x, windowsLogo.y, width * proportion, height * proportion
                );
            }
        }

        _advanceWorld(elapsedTime) {
            const timeSinceLastTick = elapsedTime - this.lastTick;

            if (timeSinceLastTick >= TIME_SLICE && document.body.classList.contains("uiexperiments")) {
                this.lastTick = elapsedTime;
                this._updateState(timeSinceLastTick);
                this._renderContent();
            }

            window.requestAnimationFrame(this._advanceWorld.bind(this));
        }

        start(windowsCount, speed) {
            for (let i = 0; i < windowsCount; i++) {
                const newLogo = WindowLogoFactory.createRandomLogo(speed, this.canvas.width, this.canvas.height); 
                this.logos.push(newLogo);
            }

            this._advanceWorld();
        }
    }

    // Used to load/cache the Windows Logo SVG in the colors provided by the caller.
    // Once it has been initialized, getting the tinted image is a simple hashmap lookup. 
    const ImageFactory = class {
        constructor() {
            this.imageMap = {};
        }

        async init(colors) {
            const res = await fetch('/header-tile.svg');
            const svgXml = await res.text();

            await Promise.all(colors.map((c) => {
                const img = new Image();

                // I could not find an easy way to draw an SVG image on the canvas with a color tint,
                // so this hack is the easiest workaround. Performs a text replace in the SVG DOM to replace
                // the color black with the color of our choosing
                const coloredSvgXml = svgXml.replace(/#000000/g, c);
                img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(coloredSvgXml);

                return new Promise((resolve) => {
                    img.onload = () => {
                        this.imageMap[c] = img;
                        resolve();
                    };
                });
            }));
        }

        getColorImage(colorHex) {
            return this.imageMap[colorHex];
        }
    }

    const imageFactory = new ImageFactory();

    await imageFactory.init(COLORS);
    const screenSaver = new ScreenSaver(elem, imageFactory);

    const numberWindows = 20;
    const magicVelocityNumber = 0.4; //1.2 just trial and error to the value that I think looked good

    screenSaver.start(numberWindows, magicVelocityNumber);
}