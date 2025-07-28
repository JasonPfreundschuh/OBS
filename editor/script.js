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

class Chip {
	/**
	 * Creates a new chip with the given properties.
	 * @param {String} name - The name of the chip.
	 * @param {String} code - The code for the chip.
	 * @param {Pin[]} inputPins - The input pins for the chip.
	 * @param {Pin[]} outputPins - The output pins for the chip.
	 * @param {Number} id - The ID of the chip.
	 * @param {String} color - The color of the chip (default is white).
	 * @param {Number} radius - The radius of the chip (default is 7).
	 * @param {Number} innerRadius - The inner radius of the chip (default is 21).
	 * @param {Number} x - The x position of the chip.
	 * @param {Number} y - The y position of the chip.
	 * @param {Number} width - The width of the chip.
	 * @param {Number} height - The height of the chip.
	 */
	constructor(name, code, inputPins, outputPins, inputPinContainer, outputPinContainer, id, color, radius, innerRadius, x, y, width, height) {
		this.name = name
		this.inputPins = inputPins
		this.outputPins = outputPins
		this.inputPinContainer = inputPinContainer || []
		this.outputPinContainer = outputPinContainer || []
		this.code = code
		this.id = id
		this.color = color || "#ffffff"
		this.radius = radius || 7
		this.innerRadius = innerRadius || 21
		this.x = x
		this.y = y
		this.lastPos = {
			x: null,
			y: null
		}
		this.width = width || 50
		this.height = height || 50
		this.move = false
		this.borderColor = "rgba(255, 255, 255, 0.2)"
		this.createPins()
	}

	/**
	 * Creates a new array of Pin objects for the chip's input and output pins.
	 */
	createPins() {
		let state = false
		let set = false
		let isMainChipPin = false

		this.inputPins.forEach((pin, index) => {
			let newPin = new Pin(pin.name, index, "in", pin.color, pin.radius, state, set, this, isMainChipPin)
			this.inputPins[index] = newPin
		})

		this.outputPins.forEach((pin, index) => {
			let newPin = new Pin(pin.name, index, "out", pin.color, pin.radius, state, set, this, isMainChipPin)
			this.outputPins[index] = newPin
		})
	}

	/**
	 * Renders the chip on the canvas by drawing its background, border, shadow, and name.
	 * The chip's dimensions and position are determined by its properties.
	 * The chip's pins are also drawn around its perimeter.
	 */
	draw() {
		let h = this.height
		let fontSize = 20 * zoom
		ctx.font = `${fontSize}px "Cousine`
		let textWidth = ctx.measureText(this.name).width
		let width = textWidth + 2 * 15 * zoom
		this.width = width / zoom
		let screenPos = simToScreen(this.x, this.y)
		
		this.drawPins()

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

		this.drawChipShadow()
		this.drawBorder()
	}

	/**
	 * Draws the input and output pins of the chip at their positions determined by
	 * the chip's dimensions and the pin's properties.
	 * The pins are drawn as circles with their respective colors and radii, and their
	 * positions are calculated based on the chip's width and height.
	 */
	drawPins() {
		let h = this.height
		let screenCords = simToScreen(this.x, this.y)
		let chipOffsetX = this.width / 2 * zoom
		let chipOffsetY = h / 2 * zoom
		let inp = this.inputPins
		let out = this.outputPins
		let radii = {
			in: inp.map(pin => pin.radius),
			out: out.map(pin => pin.radius)
		}
		let pinSpacing = {
			in: (h - inp.reduce((sum, pin) => sum + pin.radius, 0) * 2) / (inp.length * 2),
			out: (h - out.reduce((sum, pin) => sum + pin.radius, 0) * 2) / (out.length * 2),
		}

		inp.forEach(pin => {
			let x = screenCords.x - chipOffsetX
			let pinY = pin.radius + pinSpacing.in

			for (let i = 0; i < pin.id; i++) {
				pinY += (radii.in[i] + pinSpacing.in) * 2
			}

			let y = screenCords.y - chipOffsetY + pinY * zoom

			pin.draw(x, y)
		})

		out.forEach(pin => {
			let x = screenCords.x + chipOffsetX
			let pinY = pin.radius + pinSpacing.out

			for (let i = 0; i < pin.id; i++) {
				pinY += (radii.out[i] + pinSpacing.out) * 2
			}

			let y = screenCords.y - chipOffsetY + pinY * zoom

			pin.draw(x, y)
		})
	}

	/**
	 * Draws the shadow of the chip on the canvas, around the chip's box.
	 * The shadow is a 2 pixel (scaled by zoom) wide rectangle around the chip's box.
	 * The color of the shadow is a darker version of the chip's color.
	 * @method drawChipShadow
	 */
	drawChipShadow() {
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

	/**
	 * Draws a border around the chip, only if the chip is currently being moved.
	 * The border is a filled rectangle with the chip's border color and is
	 * slightly larger than the chip itself.
	 * @method drawBorder
	 */
	drawBorder() {
		if (!this.move) return
		let h = (this.height + this.r * 2) * zoom
		let w = (this.width + this.r * 3) * zoom
		let screenPos = simToScreen(this.x, this.y)

		ctx.beginPath()
		ctx.fillStyle = this.borderColor
		ctx.rect(
			screenPos.x - w / 2,
			screenPos.y - h / 2,
			w,
			h
		)
		ctx.fill()
		ctx.closePath()
	}
}

class Pin {
	/**
	 * Creates a new pin with the given properties.
	 * @param {String} name - The name of the pin.
	 * @param {Number} id - The ID of the pin.
	 * @param {String} type - The type of the pin (in or out).
	 * @param {String} color - The color of the pin.
	 * @param {Number} radius - The radius of the pin (default is 7).
	 * @param {Boolean} state - The state of the pin (true or false).
	 * @param {Boolean} set - Whether the pin has been set (true or false).
	 * @param {Chip} parent - The parent chip of the pin.
	 */
	constructor(name, id, type, color, radius, state, set, parent, isMainChipPin) {
		this.name = name || "Pin"
		this.id = id
		this.type = type
		this.color = color || "#ffffff"
		this.radius = radius || 7
		this.state = state || false
		this.set = set || false
		this.parent = parent
		this.isMainChipPin = isMainChipPin || false
	}

	/**
	 * Draws the pin on the canvas at the specified coordinates.
	 * The pin is drawn as a circle with a black fill and a radius
	 * scaled by the zoom factor. It also draws the shadow of the pin
	 * after drawing the pin itself. 
	 * @param {Number} x - The x-coordinate where the pin should be drawn.
	 * @param {Number} y - The y-coordinate where the pin should be drawn.
	 */
	draw(x, y) {
		this.x = x
		this.y = y
		ctx.beginPath()
		ctx.fillStyle = "black"
		ctx.arc(this.x, this.y, this.radius * zoom, 0, 2 * Math.PI)
		ctx.fill()
		ctx.closePath()

		this.drawShadowPin()
	}

	/**
	 * Updates the properties of the pin with the given options object.
	 * If any of the properties in the options object are undefined,
	 * the property will not be updated.
	 * If the pin has a shadow pin, it will be updated with the options
	 * object as well.
	 * The pin will also be redrawn with the draw() method after being updated.
	 * @param {Object} options - An object containing the properties to update.
	 */
	update(options) {
		this.name = options?.name
		this.id = options?.id
		this.type = options?.type
		this.color = options?.color
		this.radius = options?.radius
		this.x = options?.x
		this.y = options?.y
		this.state = options?.state
		this.set = options?.set
		this.parent = options?.parent
		if (this.shadowPin) this.shadowPin.update(options)

		this.draw(this.x, this.y)
		this.drawShadowPin()
	}

	/**
	 * Creates a new shadow pin with the same properties as this pin.
	 * The shadow pin is an invisible pin that is drawn on top of the pin,
	 * allowing the pin to be connected to other pins when clicked.
	 * The shadow pin is necessary because the pin is drawn on the canvas
	 * and cannot be clicked directly.
	 */
	createShadowPin() {
		let shadow = new Shadow_Pin(this.name, this.id, this.type, this.color, this.radius, this.parent, this, this.isMainChipPin)
		shadow.create()
		this.shadowPin = shadow
	}

	/**
	 * Ensures that the shadow pin is created and draws it at the specified coordinates.
	 * If the shadow pin does not exist, it will be created before being drawn.
	 * The shadow pin is drawn at the same coordinates as the pin itself.
	 */
	drawShadowPin() {
		if (!this.shadowPin) this.createShadowPin()
		this.shadowPin.draw(this.x, this.y)
	}
}

class Shadow_Pin {
	/**
	 * Constructs a new Shadow_Pin object with the specified properties.
	 * @param {String} name - The name of the shadow pin.
	 * @param {Number} id - The ID of the shadow pin.
	 * @param {String} type - The type of the shadow pin (in or out).
	 * @param {String} color - The color of the shadow pin.
	 * @param {Number} radius - The radius of the shadow pin (default is 7).
	 * @param {Chip} parent - The parent chip of the shadow pin.
	 * @param {Pin} parentPin - The parent pin associated with the shadow pin.
	 */
	constructor(name, id, type, color, radius, parent, parentPin, isMainChipPin) {
		this.name = name || "Pin"
		this.id = id
		this.type = type
		this.color = color || "#ffffff"
		this.radius = radius || 7
		this.parent = parent
		this.parentPin = parentPin
		this.isChipOnAnyChipPin = isMainChipPin || false
		this.secretType = isMainChipPin ? this.type == "in" ? "out" : "in" : this.type
	}

	/**
	 * Creates a new HTML element representing the shadow pin and attaches event listeners.
	 * The element responds to mouse events, allowing for interaction with connection lines.
	 * When clicked, the shadow pin can initiate or complete a connection line based on the
	 * pin type (in or out). The connection line's properties and position are updated
	 * accordingly, and the element is appended to the document body.
	 */
	create() {
		let element = document.createElement("div")
		element.classList.add("pinShadow")
		element.id = `${this.type}Shadow-${this.parent.id}-${this.id}`

		element.onmouseover = () => {
			element.style.cursor = "pointer"
			element.style.backgroundColor = (this.secretType == "in" ? tempConnectionLine?.to != null : tempConnectionLine?.from != null) ? "gray" : "white"
		}

		element.onmouseleave = () => {
			element.style.cursor = "default"
			element.style.backgroundColor = "transparent"
		}

		element.addEventListener("click", e => {
			if (tempConnectionLine != null) {
				if (!isMouseOnAnyChip(e)) tempConnectionLine.posCords.pop()
				if (this.secretType == "in" ? tempConnectionLine.to != null : tempConnectionLine.from != null) return
				this.secretType == "in" ? tempConnectionLine.to = this.parentPin : tempConnectionLine.from = this.parentPin
				if (this.secretType == "out") tempConnectionLine.posCords.reverse()
				let connection = new ConnectionLine(tempConnectionLine.from, tempConnectionLine.to, tempConnectionLine.posCords)
				currentChip.connections.push(connection)
				tempConnectionLine = null
				return
			}

			tempConnectionLine = {
				from: this.secretType == "out" ? this.parentPin : null,
				to: this.secretType == "in" ? this.parentPin : null,
				posCords: [],
				coursor: {
					x: this.parentPin.x,
					y: this.parentPin.y
				},
				draw: () => {
					if (!tempConnectionLine.from && !tempConnectionLine.to) return

					let start = this.secretType == "in" ? tempConnectionLine.to : tempConnectionLine.from

					let startX = start.x
					let startY = start.y

					ctx.beginPath()
					ctx.lineWidth = 5 * zoom
					ctx.strokeStyle = this.secretType == "out" ? start.state ? start.color : "black" : "black"
					ctx.lineCap = "round"
					ctx.lineJoin = "round"
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

		this.element = element
		document.body.appendChild(this.element)
	}

	/**
	 * Draws the shadow pin on the canvas at the specified coordinates.
	 * If the HTML element for the shadow pin does not exist, it will be created.
	 * The element is then positioned and styled based on the pin's properties.
	 * @param {Number} x - The x position of the shadow pin.
	 * @param {Number} y - The y position of the shadow pin.
	 */
	draw(x, y) {
		this.x = x
		this.y = y
		if (!this.element) this.create()

		this.element.style.left = `${this.x - this.radius * zoom}px`
		this.element.style.top = `${this.y - this.radius * zoom}px`
		this.element.style.width = `${this.radius * 2 * zoom}px`
		this.element.style.height = `${this.radius * 2 * zoom}px`
	}

	/**
	 * Updates the properties of the shadow pin and redraws it on the canvas.
	 * @param {Object} options - An object containing the properties to update.
	 * @prop {String} [name] - The name of the shadow pin.
	 * @prop {Number} [id] - The ID of the shadow pin.
	 * @prop {String} [type] - The type of the shadow pin (in or out).
	 * @prop {String} [color] - The color of the shadow pin.
	 * @prop {Number} [radius] - The radius of the shadow pin.
	 * @prop {Number} [x] - The x position of the shadow pin.
	 * @prop {Number} [y] - The y position of the shadow pin.
	 * @prop {Chip} [parent] - The parent chip of the shadow pin.
	 */
	update(options) {
		this.name = options?.name
		this.id = options?.id
		this.type = options?.type
		this.color = options?.color
		this.radius = options?.radius
		this.x = options?.x
		this.y = options?.y
		this.parent = options?.parent

		this.draw(this.x, this.y)
	}
}

class Current_Chip_Pin_Container {
	/**
	 * Creates a new pin container for the current chip.
	 * @param {String} name - The name of the pin container.
	 * @param {Number} id - The ID of the pin container.
	 * @param {String} type - The type of the pin container (in or out).
	 * @param {Number} x - The x position of the pin container.
	 * @param {Number} y - The y position of the pin container.
	 * @param {String} color - The color of the pin container.
	 * @param {Number} radius - The radius of the pin container.
	 * @param {Number} innerRadius - The inner radius of the pin container.
	 * @param {Boolean} state - The state of the pin container.
	 * @param {Boolean} set - Whether the pin container has been set.
	 * @param {CurrentChip} parent - The parent chip of the pin container.
	 */
	constructor(name, id, type, x, y, color, radius, innerRadius, state, set, parent) {
		this.name = name
		this.id = id
		this.type = type
		this.x = x
		this.y = y
		this.color = color
		this.state = state
		this.set = set
		this.parent = parent
		this.radius = radius || 7
		this.innerRadius = innerRadius || 21
		this.neckHeight = radius * 0.8
	}

	/**
	 * Creates a new pin from the pin container and adds it to the current chip's pins.
	 * The pin is created with the same properties as the pin container.
	 * The pin is then stored in the pin container's pin property for later use.
	 */
	createPin() {
		currentChip[this.type == "in" ? "inputPins" : "outputPins"].push(new Pin(
			this.name,
			this.id,
			this.type,
			this.color,
			this.radius,
			this.state,
			this.set,
			this.parent,
			true
		))
		this.pin = currentChip[this.type == "in" ? "inputPins" : "outputPins"][this.id]
	}

	/**
	 * Draws the pin container on the canvas.
	 */
	draw() {
		let screenPos = simToScreen(this.x, this.y)
		let simPos = { x: this.x, y: this.y }
		this.x = screenPos.x
		this.y = screenPos.y

		this.drawNeck()
		this.drawFrame()
		this.drawStateWindow()
		this.drawPin()

		this.x = simPos.x
		this.y = simPos.y
	}

	/**
	 * Draws the neck of the pin container on the canvas.
	 * The neck is a vertical rectangle that connects the pin container to the pin.
	 * The neck is drawn from the center of the pin container to the center of the pin 
	 * and is filled with a black color.
	 */
	drawNeck() {
		ctx.beginPath()
		ctx.rect(
			this.x,
			this.y - this.neckHeight / 2 * zoom,
			(this.type == "in" ? +1 : -1) * (this.innerRadius + this.radius * 3) * zoom,
			this.neckHeight * zoom
		)
		ctx.fillStyle = "black"
		ctx.fill()
		ctx.closePath()
	}

	/**
	 * Draws the frame of the pin container on the canvas.
	 * The frame is a black filled circle that serves as a border around the state window.
	 */
	drawFrame() {
		ctx.beginPath()
		ctx.arc(this.x, this.y, this.innerRadius * zoom, 0, 2 * Math.PI)
		ctx.fillStyle = "black"
		ctx.fill()
		ctx.closePath()
	}

	/**
	 * Draws the state window on the canvas. The state window is a circle
	 * centered at the pin's coordinates, with a radius scaled by the zoom factor.
	 * The fill color of the circle indicates the state of the pin: if the state
	 * is true, the pin's color is used; otherwise, gray is used.
	 */
	drawStateWindow() {
		ctx.beginPath()
		ctx.arc(this.x, this.y, (this.innerRadius * 0.85) * zoom, 0, 2 * Math.PI)
		ctx.fillStyle = this.state ? this.color : "gray"
		ctx.fill()
		ctx.closePath()
	}

	/**
	 * Draws the pin at the end of the neck, taking into account the direction
	 * of the pin container (in or out) and the zoom level. If the pin has not been
	 * created yet, it is created before being drawn.
	 */
	drawPin() {
		if (!this.pin) this.createPin()
		this.pin.draw(this.x + (this.type == "in" ? +1 : -1) * (this.innerRadius + this.radius * 3) * zoom, this.y)
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
	 * Draws the connection line between the two pins on the canvas.
	 * The connection line is drawn as a line with rounded ends and joins.
	 * The color of the connection line is determined by the state of the starting pin.
	 * If the starting pin is true, the connection line is drawn with the starting pin's color.
	 * If the starting pin is false, the connection line is drawn with a dimmed version of the starting pin's color.
	 * The connection line is also drawn with a gray color if the ending pin is null.
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
	code: null,
	subChips: [],
	connections: [],
	inputPins: [],
	outputPins: [],
	inputPinContainer: [],
	outputPinContainer: [],
	name: "Current Chip",
	radius: 7,
	innerRadius: 21
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
		if (chip.code == null) return
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
		chip.code,
		chip.inputPins,
		chip.outputPins,
		chip.inputPinContainer,
		chip.outputPinContainer,
		currentChip.subChips.length == 0 ? 0 : currentChip.subChips,
		chip.color,
		chip.radius,
		chip.innerRadius,
		x,
		y,
		chip.width,
		chip.height
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
 * Adds an input or output pin to the current chip at the specified position.
 * @param {String} type - The type of pin to add, either "in" or "out".
 * @param {Number} x - The x-coordinate for the position of the new pin.
 * @param {Number} y - The y-coordinate for the position of the new pin.
 */
function addPinsToCurrentChip(type, x, y) {
	let pinArray = type == "in" ? currentChip.inputPinContainer : currentChip.outputPinContainer
	pinArray.push(
		new Current_Chip_Pin_Container(
			type, 
			pinArray.length,
			type,
			x,
			y,
			"#ff0000",
			currentChip.radius,
			currentChip.innerRadius,
			false,
			false,
			currentChip
		)
	)
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
 * Draws the input and output pins of the current chip on the canvas.
 * Each pin is rendered based on its position and state within the
 * current chip's configuration.
 */
function drawCurrentChipPins() {
	currentChip.inputPinContainer.forEach(pin => pin.draw())
	currentChip.outputPinContainer.forEach(pin => pin.draw())
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
	drawCurrentChipPins()

	currentChip.subChips.forEach(chip => {
		if (chip.move && isChipOnAnyChip(chip)) chip.borderColor = "rgba(255, 0, 0, 0.3)"
		else chip.borderColor = "rgba(255, 255, 255, 0.2)"
		chip.draw()
	})
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
		if (sub.code != null) sub.code()
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
		if (sub.code != null) sub.code()
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

		if (!graph.has(source) || !graph.has(target)) return

		graph.get(target).add(source)
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

/**
 * Checks if the mouse is currently on any chip in the currentChip's subChips array.
 * @param {MouseEvent} e - The event to check.
 * @returns {Boolean} - Whether the mouse is on any chip.
 */
function isMouseOnAnyChip(e) {
	return currentChip.subChips.some(chip => isMouseOnChip(e, chip))
}

/**
 * Checks if one chip is on top of another.
 * @param {Chip} chip1 - The first chip.
 * @param {Chip} chip2 - The second chip.
 * @returns {Boolean} - Whether chip1 is on top of chip2.
 */
function isChipOnChip(chip1, chip2) {
	return (chip1.x - chip1.width / 2) * zoom < (chip2.x + chip2.width / 2) * zoom &&
			(chip1.x + chip1.width / 2) * zoom > (chip2.x - chip2.width / 2) * zoom &&
			(chip1.y - chip1.height / 2) * zoom < (chip2.y + chip2.height / 2) * zoom &&
			(chip1.y + chip1.height / 2) * zoom > (chip2.y - chip2.height / 2) * zoom
}

/**
 * Checks if one chip is on top of any chip in the currentChip's subChips array.
 * @param {Chip} chip - The chip to check.
 * @returns {Boolean} - Whether the chip is on top of any chip.
 */
function isChipOnAnyChip(chip) {
	return currentChip.subChips.some(chip2 => chip2 != chip ? isChipOnChip(chip, chip2) : false)
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
			if (!isChipOnAnyChip(chip)) chip.move = false
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

	currentChip.subChips.forEach(chip => {
		if (chip.move && isChipOnAnyChip(chip) && (chip.lastPos.x != undefined || chip.lastPos.y != undefined)) {
			chip.x = chip.lastPos.x
			chip.y = chip.lastPos.y
		}
		if (!isChipOnAnyChip(chip)) chip.move = false
	})
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