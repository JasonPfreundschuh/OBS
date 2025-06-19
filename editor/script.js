const displayWidth = window.innerWidth
const displayHeight = window.innerHeight * 0.945

const canvas = document.getElementById("canvas")
canvas.width = displayWidth
canvas.height = displayHeight
const ctx = canvas.getContext("2d")
const offset = {
    x: displayWidth / 2,
    y: displayHeight / 2
}

var isPanning = false
const panPos = {
    x: 0,
    y: 0
}

const panOffset = {
    x: 0,
    y: 0
}

const diffMouseChipPos = {
    x: 0,
    y: 0
}

const simulationLoop = setInterval(simulateCurrentChip, 1)
const Simulation = {
    time: 0,
    clockIsHigh(frequency) {
        switch (frequency) {
            case 0:
                return this.time % 1 >= 0.5
            case 1:
                return this.time % 0.5 >= 0.25
            case 2:
                return this.time % 2 >= 1
            case 3:
                return this.time % 4 >= 2
            default:
                return false
        }
    }
}

class Pin {
    /**
     * Creates a new pin with the given properties.
     * @param {String} name - The name of the pin.
     * @param {Number} id - The ID of the pin.
     * @param {String} type - The type of the pin (in or out).
     * @param {String} color - The color of the pin.
     * @param {Boolean} state - The state of the pin (true or false).
     * @param {Boolean} set - Whether the pin is settable (true or false).
     */
    constructor(name, id, type, color, state, set) {
        this.name = name
        this.id = id
        this.type = type
        this.color = color
        this.state = state
        this.set = set
    }

    /**
     * Draws the pin on the canvas, at the position determined by the parent chip.
     * The pin is drawn as a black circle with a radius of 7 pixels (scaled by zoom).
     * The x and y coordinates of the pin are calculated based on the position of the parent chip.
     * @param {Chip} parent - The parent chip of the pin.
     * @method draw
     */
    draw(parent) {
        let r = parent.r
        let h = parent.height
        let PL = this.type == "in" ? parent.inputPins.length : parent.outputPins.length
        let fontSize = 20 * zoom
        ctx.font = `${fontSize}px "Cousine"`
        let textWidth = ctx.measureText(parent.name).width
        let width = textWidth + 2 * 15 * zoom

        this.x = this.type == "in" ? parent.x * zoom + offset.x - width / 2 : parent.x * zoom + offset.x + width / 2
        this.y =
            parent.y * zoom +
            offset.y -
            (h * zoom) / 2 +
            (r +
                (h - PL * 2 * r) / PL / 2 +
                (2 * r + (h - PL * 2 * r) / PL) * this.id) *
                zoom

        ctx.beginPath()
        ctx.fillStyle = "black"
        ctx.arc(this.x, this.y, r * zoom, 0, 2 * Math.PI)
        ctx.fill()
        ctx.closePath()
    }
}

class Chip {
    /**
     * Creates a new chip with the given properties.
     * @param {String} name - The name of the chip.
     * @param {Boolean} usesCode - Whether the chip uses code.
     * @param {String} code - The code for the chip.
     * @param {Pin[]} inputPins - The input pins for the chip.
     * @param {Pin[]} outputPins - The output pins for the chip.
     * @param {Number} id - The ID of the chip.
     * @param {String} color - The color of the chip.
     * @param {Number} x - The x position of the chip.
     * @param {Number} y - The y position of the chip.
     * @param {Number} width - The width of the chip.
     * @param {Number} height - The height of the chip.
     */
    constructor(name, usesCode, code, inputPins, outputPins, id, color, x, y, width, height) {
        this.name = name
        this.usesCode = usesCode
        this.tempInputPins = inputPins
        this.tempOutputPins = outputPins
        this.inputPins = []
        this.outputPins = []
        this.code = code
        this.id = id
        this.color = color
        this.x = x
        this.y = y
        this.lastPos = {
            x: this.x,
            y: this.y
        }
        this.width = 50
        this.height = 50
        this.move = false
        this.r = 7
        this.inputPinShadows = []
        this.outputPinShadows = []
        this.setPinState()
        this.createPins()
        this.createShadowPins()
    }

    /**
     * Resets the state and set properties of all input pins to false.
     * This ensures that all pins start in a default unactivated state
     * before any operations or connections are applied.
     */
    setPinState() {
        this.inputPins.forEach(pin => {
            pin.state = false
            pin.set = false
        })
    }

    /**
     * Creates input and output pin objects from the tempInputPins and tempOutputPins
     * properties and assigns them to the inputPins and outputPins properties
     * respectively.
     */
    createPins() {
        this.tempInputPins.forEach((pin, index) => {
            let newPin = new Pin(pin.name, index, "in", pin.color, pin.state, pin.set)
            this.inputPins.push(newPin)
        })

        this.tempOutputPins.forEach((pin, index) => {
            let newPin = new Pin(pin.name, index, "out", pin.color, pin.state, pin.set)
            this.outputPins.push(newPin)
        })
    }

    /**
     * Creates shadow elements for each input and output pin, enabling interactive
     * visual feedback for connections on the canvas. Shadows respond to click events
     * to initiate or complete temporary connection lines, facilitating the drawing
     * of lines between pins. These shadows are also appended to the document body
     * for rendering.
     */
    createShadowPins() {
        this.inputPins.forEach(pin => {
            let shadow = document.createElement("div")
            shadow.classList.add("pinShadow")
            shadow.id = `inShadow-${this.id}-${pin.id}`

            shadow.addEventListener("click", () => {
                if (tempConnectionLine != null) {
                    if (tempConnectionLine.to != null) return tempConnectionLine.posCords.pop()
                    tempConnectionLine.to = pin
                    tempConnectionLine.posCords.pop()
                    let connection = new ConnectionLine(tempConnectionLine.from, tempConnectionLine.to, tempConnectionLine.posCords)
                    currentChip.connections.push(connection)
                    tempConnectionLine = null
                    return
                }

                tempConnectionLine = {
                    from: null,
                    to: pin,
                    posCords: [],
                    coursor: {
                        x: pin.x,
                        y: pin.y
                    },
                    draw: () => {
                        if (!tempConnectionLine.from && !tempConnectionLine.to) return
    
                        let start = tempConnectionLine.to
    
                        let startX = start.x
                        let startY = start.y
    
                        ctx.beginPath()
                        ctx.lineWidth = 5 * zoom
                        ctx.strokeStyle = start.state ? start.color : "black"
                        ctx.moveTo(startX, startY)
    
                        for (let i = 0; i < tempConnectionLine.posCords.length; i++) {
                            const point = tempConnectionLine.posCords[i]
                            ctx.lineTo(point.x * zoom + offset.x, point.y * zoom + offset.y)
                        }
    
                        let end = tempConnectionLine.coursor
                        ctx.lineTo(end.x, end.y)
    
                        ctx.stroke()
                        ctx.closePath()
                    }
                }
            })

            this.inputPinShadows.push(shadow)
            document.body.appendChild(shadow)
        })

        this.outputPins.forEach(pin => {
            let shadow = document.createElement("div")
            shadow.classList.add("pinShadow")
            shadow.id = `outShadow-${this.id}-${pin.id}`

            shadow.addEventListener("click", () => {
                if (tempConnectionLine != null) {
                    if (tempConnectionLine.from != null) return tempConnectionLine.posCords.pop()
                    tempConnectionLine.from = pin
                    tempConnectionLine.posCords.pop()
                    tempConnectionLine.posCords.reverse()
                    let connection = new ConnectionLine(tempConnectionLine.from, tempConnectionLine.to, tempConnectionLine.posCords)
                    currentChip.connections.push(connection)
                    tempConnectionLine = null
                    return
                }

                tempConnectionLine = {
                    from: pin,
                    to: null,
                    posCords: [],
                    coursor: {
                        x: pin.x,
                        y: pin.y
                    },
                    draw: () => {
                        if (!tempConnectionLine.from && !tempConnectionLine.to) return
    
                        let start = tempConnectionLine.from
    
                        let startX = start.x
                        let startY = start.y
    
                        ctx.beginPath()
                        ctx.lineWidth = 5 * zoom
                        ctx.strokeStyle = start.state ? start.color : "black"
                        ctx.moveTo(startX, startY)
    
                        for (let i = 0; i < tempConnectionLine.posCords.length; i++) {
                            const point = tempConnectionLine.posCords[i]
                            ctx.lineTo(point.x * zoom + offset.x, point.y * zoom + offset.y)
                        }
    
                        let end = tempConnectionLine.coursor
                        ctx.lineTo(end.x, end.y)
    
                        ctx.stroke()
                        ctx.closePath()
                    }
                }
            })

            this.outputPinShadows.push(shadow)
            document.body.appendChild(shadow)
        })
    }

    /**
     * Draws the chip on the canvas, including its pins and their shadows.
     * Also draws the chip's name on the canvas.
     * @method draw
     */
    draw() {
        let r = this.r
        let h = this.height
        let iPL = this.inputPins.length
        let oPL = this.outputPins.length
        let fontSize = 20 * zoom
        ctx.font = `${fontSize}px "Cousine`
        let textWidth = ctx.measureText(this.name).width
        let width = textWidth + 2 * 15 * zoom
        this.width = width / zoom

        this.inputPins.forEach(pin => pin.draw(this))
        this.outputPins.forEach(pin => pin.draw(this))

        this.inputPinShadows.forEach((shadow, i) => {
            shadow.style.left = `${this.inputPins[i].x - r * zoom}px`
            shadow.style.top = `${this.inputPins[i].y - r * zoom}px`
            shadow.style.width = `${r * 2 * zoom}px`
            shadow.style.height = `${r * 2 * zoom}px`
        })
        this.outputPinShadows.forEach((shadow, i) => {
            shadow.style.left = `${this.outputPins[i].x - r * zoom}px`
            shadow.style.top = `${this.outputPins[i].y - r * zoom}px`
            shadow.style.width = `${r * 2 * zoom}px`
            shadow.style.height = `${r * 2 * zoom}px`
        })

        ctx.beginPath()
        ctx.rect(
            this.x * zoom + offset.x - width / 2,
            this.y * zoom + offset.y - h * zoom / 2,
            width,
            h * zoom
        )
        ctx.fillStyle = this.color
        ctx.fill()
        ctx.closePath()
        
        ctx.beginPath()
        ctx.fillStyle = chooseForeground(this.color)
        ctx.fillText(
            this.name,
            this.x * zoom + offset.x - textWidth / 2,
            this.y * zoom + offset.y + fontSize / 3,
        )
        ctx.fill()
        ctx.closePath()

        this.drawShadow()
    }

    /**
     * Draws the shadow of the chip on the canvas, around the chip's box.
     * The shadow is a 2 pixel (scaled by zoom) wide rectangle around the chip's box.
     * The color of the shadow is a darker version of the chip's color.
     * @method drawShadow
     */
    drawShadow() {
        let h = this.height
        let fontSize = 20 * zoom
        ctx.font = `${fontSize}px "Cousine`
        let textWidth = ctx.measureText(this.name).width
        let width = textWidth + 2 * 15 * zoom

        ctx.beginPath()
        let ogcolor = hexToRgb(this.color)
        ogcolor = [ogcolor.r, ogcolor.g, ogcolor.b, 1]
        let dimmcolor = [0, 0, 0, 0.4]
        let endcolor = combineRGBA(...ogcolor, ...dimmcolor)
        ctx.fillStyle = `rgba(${endcolor[0]}, ${endcolor[1]}, ${endcolor[2]}, ${endcolor[3]})`
        ctx.rect(
            this.x * zoom + offset.x - width / 2,
            this.y * zoom + offset.y - h * zoom / 2,
            width,
            2 * zoom
        )
        ctx.rect(
            this.x * zoom + offset.x - width / 2,
            this.y * zoom + offset.y + h * zoom / 2 - 2 * zoom,
            width,
            2 * zoom
        )
        ctx.rect(
            this.x * zoom + offset.x - width / 2,
            this.y * zoom + offset.y - h * zoom / 2,
            2 * zoom,
            h * zoom - 2 * zoom
        )
        ctx.rect(
            this.x * zoom + offset.x + width / 2 - 2 * zoom,
            this.y * zoom + offset.y - h * zoom / 2,
            2 * zoom,
            h * zoom - 2 * zoom
        )
        ctx.fill()
        ctx.closePath()
    }
}

class ConnectionLine {
    /**
     * Initializes a new ConnectionLine instance to represent a connection
     * between two points (from and to) on the canvas.
     * @param {Pin} from - The starting point of the connection.
     * @param {Pin} to - The ending point of the connection.
     * @param {Array} posCords - An array of position coordinates for the connection path.
     */
    constructor(from, to, posCords) {
        this.from = from
        this.to = to
        this.posCords = posCords
    }

    /**
     * Draws the connection line on the canvas, taking into account the
     * position of the start and end points, as well as any intermediate
     * points specified in the posCords array. The line is drawn with a
     * thickness of 5 pixels (scaled by zoom) and a color determined by
     * the state of the start point (if true, the start point's color is
     * used; otherwise, black is used). The line is drawn using the
     * 2D drawing context's lineTo() method.
     */
    draw() {
        if (!this.from || !this.to) return

        const start = this.from
        const end = this.to

        ctx.beginPath()
        ctx.lineWidth = 5 * zoom
        ctx.strokeStyle = start.state ? start.color : "black"
        ctx.moveTo(start.x, start.y)

        for (let i = 0; i < this.posCords.length; i++) {
            const point = this.posCords[i]
            ctx.lineTo(point.x * zoom + offset.x, point.y * zoom + offset.y)
        }

        ctx.lineTo(end.x, end.y)

        ctx.stroke()
        ctx.closePath()
    }
}

var tempConnectionLine = null
var selectedChip = null
var zoom = 1
var gridSettings = {
    standardSpacing: 50,
    nanoSpacing: 10,
    axisWeight: 1,
    standardWeight: 0.5,
    nanoWeight: 0.25,
    axisColorX: "rgba(0, 50, 255, 1)",
    axisColorY: "rgba(255, 0, 0, 1)",
    standardColor: "rgba(255, 255, 255, 0.5)",
    nanoColor: "rgba(255, 255, 255, 0.3)"
}
var showGrid = false
var gridStateChange = false
var currentProject = JSON.parse(localStorage.projects)[Number(window.location.search.split("=")[1])]
convertChipCodesToFuncs(currentProject)
var currentChip = {
    usesCode: false,
    subChips: [],
    connections: [],
    inputPins: [{
        name: "In",
        color: "red",
        state: false,
        set: true
    }],
    outputPins: [{
        name: "Out",
        color: "red",
        state: false,
        set: false
    }]
}

/**
 * Combine two rgba colors using the source-over operator.
 * @param {number} r1 - Red component of the base color.
 * @param {number} g1 - Green component of the base color.
 * @param {number} b1 - Blue component of the base color.
 * @param {number} a1 - Alpha component of the base color.
 * @param {number} r2 - Red component of the added color.
 * @param {number} g2 - Green component of the added color.
 * @param {number} b2 - Blue component of the added color.
 * @param {number} a2 - Alpha component of the added color.
 * @returns {number[]} - An array of the combined color's r, g, b, and a components.
 */
function combineRGBA(r1, g1, b1, a1, r2, g2, b2, a2,) {
    let base = [r1, g1, b1, a1]
    let added = [r2, g2, b2, a2]
    
    let mix = [];
    mix[3] = 1 - (1 - added[3]) * (1 - base[3])
    mix[0] = Math.round((added[0] * added[3] / mix[3]) + (base[0] * base[3] * (1 - added[3]) / mix[3]))
    mix[1] = Math.round((added[1] * added[3] / mix[3]) + (base[1] * base[3] * (1 - added[3]) / mix[3]))
    mix[2] = Math.round((added[2] * added[3] / mix[3]) + (base[2] * base[3] * (1 - added[3]) / mix[3]))
    
    return mix
}

/**
 * Converts a given hex color string to an rgb object with r, g, and b properties.
 * @param {string} hex - The hex color string to convert.
 * @returns {Object} An object with r, g, and b properties each representing the amount of red, green, and blue in the color, respectively. null if the input is not a valid hex color string.
 */
function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
    } : null
}

/**
 * Calculates the relative luminance of a given hex color string, using the W3C algorithm.
 * @param {string} clr - The hex color string to calculate the luminance of.
 * @returns {number} The relative luminance of the color, ranging from 0 (black) to 1 (white).
 */
function getLuminance(clr) {
    clr = clr.replace(/#/, "").match(/.{1,2}/g)
    for (let x = 0; x < clr.length; x++) {
        clr[x] = parseInt(clr[x], 16) / 255
        clr[x] =
            clr[x] <= 0.03928
                ? clr[x] / 12.92
                : ((clr[x] + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * clr[0] + 0.7152 * clr[1] + 0.0722 * clr[2]
}

/**
 * Given a background color, returns a foreground color that is easily readable.
 * Based on the W3C's algorithm for calculating relative luminance.
 * @param {string} bkg - The background color in hex.
 * @returns {string} The foreground color, either "#000000" or "#ffffff".
 */
function chooseForeground(bkg) {
    let relativeLuminance = getLuminance(bkg)
    let chooseBlack = (relativeLuminance + 0.05) / 0.05
    let chooseWhite = 1.05 / (relativeLuminance + 0.05)
    return chooseBlack > chooseWhite ? "#000000" : "#ffffff"
}

/**
 * Converts the code strings of all chips in a project to functions
 * @param {Project} project - The project to convert the chips of
 */
function convertChipCodesToFuncs(project) {
    project.chips.forEach(chip => {
        if (!chip.usesCode) return
        chip.code = new Function(chip.code)
    })
}

/**
 * Adds a chip to the current chip's subChips array based on the given name.
 * If the name is not a valid string, the function exits early.
 * The new chip is created with its properties copied from the project chip with the matching name.
 * The position of the new chip is set to the specified x and y coordinates.
 * 
 * @param {String} name - The name of the chip to be added.
 * @param {Number} x - The x-coordinate for the position of the new chip.
 * @param {Number} y - The y-coordinate for the position of the new chip.
 */
function addChip(name, x, y) {
    if (typeof name == "String" && name != "") return

    let chip = currentProject.chips.find(chip => chip.name == name)
        currentChip.subChips.push(new Chip(
        chip.name,
        chip.usesCode,
        chip.code,
        chip.inputPins,
        chip.outputPins,
        currentChip.subChips.length == 0 ? 0 : currentChip.subChips,
        chip.color,
        x,
        y,
        chip.width != undefined ? chip.width : 50,
        chip.height != undefined ? chip.height : 50
    ))
}

/**
 * Updates the starred chips list in the UI by clearing the current list and
 * repopulating it with clickable elements representing each starred chip. 
 * Clicking on a starred chip adds it to the current chip's subChips and 
 * makes it movable.
 */
function addChipsToStarredList() {
    document.getElementById("starredChipsList").innerHTML = ""

    currentProject.starredChips.forEach(starredChip => {
        if (!currentProject.chips.some(chip => chip.name == starredChip)) return

        let chip = document.createElement("div")
        chip.classList.add("starredChip")
        chip.innerText = starredChip
        chip.onclick = e => {
            addChip(starredChip, e.pageX - offset.x, e.pageY - offset.y)
            currentChip.subChips.forEach(chip => chip.move = false)
            currentChip.subChips[currentChip.subChips.length - 1].move = true
        }
        document.getElementById("starredChipsList").appendChild(chip)
    })
}

/**
 * Toggles the visibility of the menu in the bottom left of the editor screen.
 * If the menu is currently visible, it becomes hidden, and vice versa.
 */
function openCloseMenu() {
    document.getElementById("menu").style.display = document.getElementById("menu").style.display == "block" ? "none" : "block"
}

/**
 * Draws the grid lines and two axes lines (if the grid is being moved) onto the canvas.
 * The grid lines are drawn with two different spacings and colors, specified by the
 * gridSettings object. The axes lines are drawn with a third color and weight, also
 * specified in gridSettings.
 * @param {boolean} showGrid Whether to draw the grid or not.
 */
function drawGrid() {
    if (!showGrid) return

    ctx.beginPath()
    ctx.strokeStyle = gridSettings.nanoColor
    ctx.lineWidth = gridSettings.nanoWeight

    let spacing = gridSettings.nanoSpacing * zoom

    let startX = offset.x % spacing
    let startY = offset.y % spacing

    for (let x = startX; x < displayWidth; x += spacing) {
        ctx.moveTo(x, 0)
        ctx.lineTo(x, displayHeight)
    }

    for (let y = startY; y < displayHeight; y += spacing) {
        ctx.moveTo(0, y)
        ctx.lineTo(displayWidth, y)
    }

    ctx.stroke()
    ctx.closePath()

    ctx.beginPath()
    ctx.strokeStyle = gridSettings.standardColor
    ctx.lineWidth = gridSettings.standardWeight

    spacing = gridSettings.standardSpacing * zoom

    startX = offset.x % spacing
    startY = offset.y % spacing

    for (let x = startX; x < displayWidth; x += spacing) {
        ctx.moveTo(x, 0)
        ctx.lineTo(x, displayHeight)
    }

    for (let y = startY; y < displayHeight; y += spacing) {
        ctx.moveTo(0, y)
        ctx.lineTo(displayWidth, y)
    }

    ctx.stroke()
    ctx.closePath()

    if (offset.y > 0 && offset.y < displayHeight) {
        ctx.beginPath()
        ctx.strokeStyle = gridSettings.axisColorY
        ctx.lineWidth = gridSettings.axisWeight
        ctx.moveTo(0, offset.y)
        ctx.lineTo(displayWidth, offset.y)
        ctx.stroke()
        ctx.closePath()
    }

    if (offset.x > 0 && offset.x < displayWidth) {
        ctx.beginPath()
        ctx.strokeStyle = gridSettings.axisColorX
        ctx.lineWidth = gridSettings.axisWeight
        ctx.moveTo(offset.x, 0)
        ctx.lineTo(offset.x, displayHeight)
        ctx.stroke()
        ctx.closePath()
    }
}

/**
 * This function is called every frame to simulate the current chip. It clears
 * the canvas, draws the grid if it is enabled, and then simulates the current
 * chip, drawing each of its subChips afterward. It also increments the
 * Simulation.time variable.
 */
function simulateCurrentChip() {
    Simulation.time += 0.01

    simulateChip(currentChip)
    ctx.beginPath()
    ctx.fillStyle = "rgb(47, 47, 53)"
    ctx.rect(0, 0, displayWidth, displayHeight)
    ctx.fill()
    ctx.closePath()

    drawGrid()
    currentChip.connections.forEach(connection => connection.draw())
    if (tempConnectionLine != null) tempConnectionLine.draw()

    currentChip.subChips.forEach(chip => chip.draw())
    console.log(currentChip.outputPins[0].state)
}

/**
 * Simulates the behavior of a given chip. If the chip uses code, it executes
 * the chip's code function. Otherwise, it processes each input pin by executing
 * the chip from the connection of the pin.
 * @param {Chip} chip - The chip to simulate.
 */
function simulateChip(chip) {
    if (chip.usesCode) return chip.code()
    chip.inputPins.forEach(pin => executeChipFromConnectionOfPin(chip, pin))
}

/**
 * Executes a chip from a given connection of a given pin. It sets the state of
 * the pin on the other end of the connection and recursively calls itself on
 * the chip on the other end of the connection if all of the input pins of the
 * chip are set.
 * @param {Chip} originChip - The chip from which to execute the connection.
 * @param {Pin} pin - The pin from which to execute the connection.
 */
function executeChipFromConnectionOfPin(originChip, pin) {
    originChip.connections.filter(connection => {
        if (connection.from == pin) {
            if (connection.to == originChip) {
                connection.to.outputPins[connection.toChipPin].state = pin.state
                connection.to.outputPins[connection.toChipPin].set = true
                return
            }

            connection.to.inputPins[connection.toChipPin].state = pin.state
            connection.to.inputPins[connection.toChipPin].set = true

            // Check if all the input pins are set
            // If not, don't execute chip
            if (connection.to.inputPins.some(inputPin => {
                if (inputPin.set) return false
                return originChip.connections.some(subChipConnection => {
                    return subChipConnection.to.inputPins[subChipConnection.toChipPin] == inputPin
                })
            })) return

            simulateChip(connection.to)
            connection.to.outputPins.forEach(outPin => executeChipFromConnectionOfPin(originChip, outPin))
        }
    })
}

/**
 * Checks if the mouse is currently on the given chip.
 * @param {MouseEvent} e - The event to check.
 * @param {Chip} chip - The chip to check against.
 * @returns {Boolean} - Whether the mouse is on the chip.
 */
function isMouseOnChip(e, chip) {
    return (e.pageX - offset.x > (chip.x - chip.width / 2) * zoom &&
            e.pageX - offset.x < (chip.x + chip.width / 2) * zoom &&
            e.pageY - offset.y > (chip.y - chip.height / 2) * zoom &&
            e.pageY - offset.y < (chip.y + chip.height / 2) * zoom)
}

window.addEventListener("mousedown", e => {
    e.preventDefault()
    if (e.button == 1) {
        isPanning = true
        panPos.x = e.pageX
        panPos.y = e.pageY
        panOffset.x = offset.x
        panOffset.y = offset.y
        return
    }

    if (e.button == 2) {
        currentChip.subChips.forEach((chip, index) => {
            if (isMouseOnChip(e, chip)) {
                document.getElementById("chipMenu").style.display = "block"
                document.getElementById("chipMenu").style.left = e.pageX * zoom + offset.x + "px"
                document.getElementById("chipMenu").style.top = e.pageY * zoom + offset.y + "px"
                
                selectedChip = index
                return true
            }
            return false
        })
        return
    }

    if (e.button == 0) {
        if (tempConnectionLine != null) {
            tempConnectionLine.posCords.push({
                x: (e.pageX - offset.x) / zoom,
                y: (e.pageY - offset.y) / zoom
            })
            return
        }

        currentChip.subChips.some(chip => {
            if (isMouseOnChip(e, chip) && !chip.move) {
                diffMouseChipPos.x = chip.x - (e.pageX - offset.x) / zoom
                diffMouseChipPos.y = chip.y - (e.pageY - offset.y) / zoom
                chip.lastPos.x = chip.x
                chip.lastPos.y = chip.y
                chip.move = true
                return true
            }
            chip.move = false
            return false
        })
    }
})

window.addEventListener("mousemove", e => {
    if (tempConnectionLine != null) tempConnectionLine.coursor = { x: e.pageX, y: e.pageY }

    if (isPanning) {
        offset.x = e.pageX - panPos.x + panOffset.x
        offset.y = e.pageY - panPos.y + panOffset.y
        return
    }

    currentChip.subChips.some(chip => {
        if (chip.move) {
            chip.x = (e.pageX - offset.x) / zoom + diffMouseChipPos.x
            chip.y = (e.pageY - offset.y) / zoom + diffMouseChipPos.y
            return true
        }
        return false
    })
})

window.addEventListener("mouseup", e => {
    e.preventDefault()
    if (e.button == 1) {
        isPanning = false
        return
    }

    currentChip.subChips.forEach(chip => chip.move = false)
})

window.addEventListener("mousewheel", e => {
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.90
    const newZoom = zoom * zoomFactor

    if (newZoom < 0.09 || newZoom > 30) return

    const mouseX = e.pageX
    const mouseY = e.pageY

    const worldX = (mouseX - offset.x) / zoom
    const worldY = (mouseY - offset.y) / zoom

    zoom = newZoom

    offset.x = mouseX - worldX * zoom
    offset.y = mouseY - worldY * zoom
})

window.addEventListener("keydown", e => {
    if (e.ctrlKey) gridStateChange = true
})

window.addEventListener("keyup", e => {
    if (!e.ctrlKey && gridStateChange) {
        gridStateChange = false
        showGrid = !showGrid
    }
})

window.addEventListener("contextmenu", e => {
    if (!e.ctrlKey) e.preventDefault()
})

addChipsToStarredList()