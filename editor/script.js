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

/**
 * Wandelt Bildschirmkoordinaten (z. B. Mausposition) in Simulatorkoordinaten um.
 * @param {number} screenX - X-Position auf dem Bildschirm (z. B. Maus).
 * @param {number} screenY - Y-Position auf dem Bildschirm.
 * @returns {{x: number, y: number}} - Position im Simulator.
 */
function screenToSim(screenX, screenY) {
	return {
		x: (screenX - offset.x) / zoom,
		y: (screenY - offset.y) / zoom
	}
}

/**
 * Wandelt Simulatorkoordinaten in Bildschirmkoordinaten um.
 * @param {number} simX - X-Position im Simulationsraum.
 * @param {number} simY - Y-Position im Simulationsraum.
 * @returns {{x: number, y: number}} - Position auf dem Bildschirm.
 */
function simToScreen(simX, simY) {
	return {
		x: simX * zoom + offset.x,
		y: simY * zoom + offset.y
	}
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
	isClockHigh() {
		return this.time % 1 >= 0.5
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
	constructor(name, id, type, color, state, set, parent) {
		this.name = name
		this.id = id
		this.type = type
		this.color = color
		this.state = state
		this.set = set
		this.parent = parent
	}

	/**
	 * Draws the pin on the canvas, at the position determined by the parent chip.
	 * The pin is drawn as a black circle with a radius of 7 pixels (scaled by zoom).
	 * The x and y coordinates of the pin are calculated based on the position of the parent chip.
	 * @param {Chip} parent - The parent chip of the pin.
	 * @method draw
	 */
	draw() {
		let r = this.parent.r
		let h = this.parent.height
		let PL = this.type == "in" ? this.parent.inputPins.length : this.parent.outputPins.length
		let fontSize = 20 * zoom
		ctx.font = `${fontSize}px "Cousine"`
		let textWidth = ctx.measureText(this.parent.name).width
		let width = textWidth + 2 * 15 * zoom

		this.x = this.type == "in" ? this.parent.x * zoom + offset.x - width / 2 : this.parent.x * zoom + offset.x + width / 2
		this.y =
			this.parent.y * zoom +
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
		this.createPins()
		this.createShadowPins()
	}

	/**
	 * Creates input and output pin objects from the tempInputPins and tempOutputPins
	 * properties and assigns them to the inputPins and outputPins properties
	 * respectively.
	 */
	createPins() {
		this.tempInputPins.forEach((pin, index) => {
			let newPin = new Pin(pin.name, index, "in", pin.color, false, false, this)
			this.inputPins.push(newPin)
		})

		this.tempOutputPins.forEach((pin, index) => {
			let newPin = new Pin(pin.name, index, "out", pin.color, false, false, this)
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
			shadow.onmouseover = () => {
				shadow.style.cursor = "pointer"
				shadow.style.backgroundColor = tempConnectionLine?.to != null ? "gray" : "white"
			}

			shadow.onmouseleave = () => {
				shadow.style.cursor = "default"
				shadow.style.backgroundColor = "transparent"
			}

			shadow.id = `inShadow-${this.id}-${pin.id}`

			shadow.addEventListener("click", e => {
				if (tempConnectionLine != null) {
					if (tempConnectionLine.to != null) return tempConnectionLine.posCords.pop()
					tempConnectionLine.to = pin
					if (!isMouseOnChip(e, pin.parent)) tempConnectionLine.posCords.pop()
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
						ctx.lineCap = "round"
						ctx.lineJoin = 'round'
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
			shadow.onmouseover = () => {
				shadow.style.cursor = "pointer"
				shadow.style.backgroundColor = tempConnectionLine?.from != null ? "gray" : "white"
			}

			shadow.onmouseleave = () => {
				shadow.style.cursor = "default"
				shadow.style.backgroundColor = "transparent"
			}

			shadow.id = `outShadow-${this.id}-${pin.id}`

			shadow.addEventListener("click", e => {
				if (tempConnectionLine != null) {
					if (tempConnectionLine.from != null) return tempConnectionLine.posCords.pop()
					tempConnectionLine.from = pin
					if (!isMouseOnChip(e, pin.parent)) tempConnectionLine.posCords.pop()
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
						ctx.lineCap = "round"
						ctx.lineJoin = 'round'
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
		let fontSize = 20 * zoom
		ctx.font = `${fontSize}px "Cousine`
		let textWidth = ctx.measureText(this.name).width
		let width = textWidth + 2 * 15 * zoom
		this.width = width / zoom
		let screenPos = simToScreen(this.x, this.y)

		this.inputPins.forEach(pin => pin.draw())
		this.outputPins.forEach(pin => pin.draw())

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
			screenPos.x - width / 2,
			screenPos.y - h * zoom / 2,
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
			screenPos.x - textWidth / 2,
			screenPos.y + fontSize / 3,
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
		let screenPos = simToScreen(this.x, this.y)

		ctx.beginPath()
		let ogcolor = hexToRgb(this.color)
		ogcolor = [ogcolor.r, ogcolor.g, ogcolor.b, 1]
		let dimmcolor = [0, 0, 0, 0.4]
		let endColor = combineRGBA(...ogcolor, ...dimmcolor)
		ctx.fillStyle = `rgba(${endColor[0]}, ${endColor[1]}, ${endColor[2]}, ${endColor[3]})`
		ctx.rect(
			screenPos.x - width / 2,
			screenPos.y - h * zoom / 2,
			width,
			2 * zoom
		)
		ctx.rect(
			screenPos.x - width / 2,
			screenPos.y + h * zoom / 2 - 2 * zoom,
			width,
			2 * zoom
		)
		ctx.rect(
			screenPos.x - width / 2,
			screenPos.y - h * zoom / 2,
			2 * zoom,
			h * zoom - 2 * zoom
		)
		ctx.rect(
			screenPos.x + width / 2 - 2 * zoom,
			screenPos.y - h * zoom / 2,
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
		
		let ogcolor = hexToRgb(start.color)
		ogcolor = [ogcolor.r, ogcolor.g, ogcolor.b, 1]
		let dimmcolor = [0, 0, 0, 0.8]
		let endColor = combineRGBA(...ogcolor, ...dimmcolor)
		endColor = `rgba(${endColor[0]}, ${endColor[1]}, ${endColor[2]}, ${endColor[3]})`

		ctx.beginPath()
		ctx.lineWidth = 5 * zoom
		ctx.strokeStyle = start.state ? start.color : endColor
		ctx.lineCap = "round"
		ctx.lineJoin = 'round'
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
		name: 0,
		id: 0,
		type: "in",
		color: "#00ff00",
		state: false,
		set: true
	}],
	outputPins: [{
		name: 0,
		id: 0,
		type: "out",
		color: "#00ff00",
		state: false,
		set: true
	}]
}
currentChip.inputPins[0].parent = currentChip
currentChip.outputPins[0].parent = currentChip

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

	simulateChipHybrid(currentChip)
	ctx.beginPath()
	ctx.fillStyle = "rgb(47, 47, 53)"
	ctx.rect(0, 0, displayWidth, displayHeight)
	ctx.fill()
	ctx.closePath()

	drawGrid()
	currentChip.connections.forEach(connection => connection.draw())
	if (tempConnectionLine != null) tempConnectionLine.draw()

	currentChip.subChips.forEach(chip => chip.draw())
}

/**
 * Simulates the behavior of a given chip by executing code associated with its sub-chips.
 * The function first constructs a dependency graph of the chip's sub-chips and detects any
 * cycles within it. Connections between pins are set based on the current state of the chip.
 * A topological sort is performed on the acyclic components of the graph, and the associated
 * code is executed for each sub-chip. For chips involved in cycles, an iterative stabilization
 * process is performed, recalculating states until no further changes occur or a maximum number
 * of iterations is reached. Finally, the function updates the states of connections based on
 * the latest changes.
 * 
 * @param {Chip} chip - The chip to be simulated.
 */
function simulateChipHybrid(chip) {
	const graph = buildDependencyGraph(chip)
	const cycleChips = detectCycles(graph)

	// Set connections
	chip.connections.forEach(conn => {
		conn.to.state = conn.from.state
	})
	
	// New filtered graph copy only with acyclic chips
	const filteredGraph = new Map()
	for (const [node, deps] of graph.entries()) {
		if (!cycleChips.has(node)) {
			filteredGraph.set(node, new Set([...deps].filter(d => !cycleChips.has(d))))
		}
	}
	
	// TopoSort on non-cyclic subgraphs
	const sorted = topoSort(filteredGraph)
	
	for (const sub of sorted) {
		if (sub.usesCode) sub.code()
		else simulateChipHybrid(sub)

		// Right after: set connections
		chip.connections.forEach(conn => {
			if (conn.from.parent === sub && !cycleChips.has(conn.to.parent)) {
				conn.to.state = conn.from.state
			}
		})
	}

	// Normal chip simulation for chips in cycles
	for (const sub of cycleChips) {
		if (sub.usesCode) sub.code()
		else simulateChipHybrid(sub)
	}
}

/**
 * Builds a directed graph of dependencies from a given chip.
 * Each sub-chip is a node in the graph, and each connection is a directed edge
 * from the source sub-chip to the target sub-chip.
 * @param {Chip} chip - The chip whose dependency graph is to be built.
 * @returns {Map<Chip, Set<Chip>>} - The dependency graph of the given chip.
 */
function buildDependencyGraph(chip) {
	const graph = new Map()
	chip.subChips.forEach(sub => graph.set(sub, new Set()))

	chip.connections.forEach(conn => {
		const source = conn.from.parent
		const target = conn.to.parent
		if (source !== target) {
			graph.get(target).add(source)
		}
	})

	return graph
}

/**
 * Detects cycles in a directed graph.
 * @param {Map<Node, Set<Node>>} graph - The graph to search for cycles in.
 * @returns {Set<Node>} - The set of nodes that are part of a cycle.
 */
function detectCycles(graph) {
	const visited = new Set()
	const stack = new Set()
	const inCycle = new Set()

	function dfs(node) {
		if (stack.has(node)) {
			// Zyklus entdeckt
			inCycle.add(node)
			return
		}
		if (visited.has(node)) return

		visited.add(node)
		stack.add(node)

		for (const neighbor of graph.get(node)) {
			dfs(neighbor)
			if (inCycle.has(neighbor)) inCycle.add(node)
		}

		stack.delete(node)
	}

	for (const node of graph.keys()) {
		dfs(node)
	}

	return inCycle
}

/**
 * Topological sorting of a directed acyclic graph (DAG)
 * @param {Map<string, Set<string>>} graph - The graph to sort
 * @returns {string[]} - The nodes in a topologically sorted order
 */
function topoSort(graph) {
	const sorted = []
	const visited = new Set()

	function visit(node, stack = new Set()) {
		if (stack.has(node)) return
		if (visited.has(node)) return

		stack.add(node)
		graph.get(node).forEach(dep => visit(dep, stack))
		stack.delete(node)

		visited.add(node)
		sorted.push(node)
	}

	for (let node of graph.keys()) {
		visit(node)
	}

	return sorted
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

function isMouseOnAnyChip(e) {
	return currentChip.subChips.some(chip => isMouseOnChip(e, chip))
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
		if (tempConnectionLine != null) {
			if (tempConnectionLine.posCords.length == 0) return tempConnectionLine = null
			return tempConnectionLine.posCords.pop()
		}

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
	}

	if (e.button == 0) {
		let simPos = screenToSim(e.pageX, e.pageY)
		if (tempConnectionLine != null) {
			if (isMouseOnAnyChip(e)) return
			tempConnectionLine.posCords.push({
				x: simPos.x,
				y: simPos.y
			})
			return
		}

		currentChip.subChips.some(chip => {
			if (isMouseOnChip(e, chip) && !chip.move) {
				diffMouseChipPos.x = chip.x - simPos.x
				diffMouseChipPos.y = chip.y - simPos.y
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

	let simPos = screenToSim(e.pageX, e.pageY)
	currentChip.subChips.some(chip => {
		if (chip.move) {
			chip.x = simPos.x + diffMouseChipPos.x
			chip.y = simPos.y + diffMouseChipPos.y
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