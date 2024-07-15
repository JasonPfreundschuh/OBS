const displayWidth = window.innerWidth
const displayHeight = window.innerHeight * 0.945

const canvas = document.getElementById("canvas")
canvas.width = displayWidth
canvas.height = displayHeight
const ctx = canvas.getContext("2d")
const offset = {
    x: canvas.width / 2,
    y: canvas.height / 2
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

class Chip {
    constructor(name, usesCode, inputPins, outputPins, code, id, color, x, y, width, height) {
        this.name = name
        this.usesCode = usesCode
        this.inputPins = inputPins
        this.outputPins = outputPins
        this.code = code
        this.id = id
        this.color = color
        this.x = x
        this.y = y
        this.lastPos = {
            x: this.x,
            y: this.y
        }
        this.width = width
        this.height = height
        this.move = false
        this.setState()
    }
    
    setState() {
        this.inputPins.forEach(pin => {
            pin.state = false
            pin.set = false
        })
    }

    draw() {
        ctx.beginPath()
        ctx.rect((this.x - this.width / 2) * zoom + offset.x, (this.y - this.height / 2) * zoom + offset.y, this.width * zoom, this.height * zoom)
        ctx.fillStyle = this.color
        ctx.fill()
        ctx.closePath()
    }
}

var zoom = 1
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

// Test Example

// addChip("NOT", 50, 50)
// addChip("CLOCK", 100, 100)
// currentChip.connections.push({
//     from: currentChip.inputPins[0],
//     to: currentChip.subChips[0],
//     toChipPin: 0
// })
// currentChip.connections.push({
//     from: currentChip.subChips[0].outputPins[0],
//     to: currentChip.subChips[1],
//     toChipPin: 0
// })
// currentChip.connections.push({
//     from: currentChip.subChips[1].outputPins[0],
//     to: currentChip,
//     toChipPin: 0
// })

/**
 * 
 * @param {Project} project 
*/
function convertChipCodesToFuncs(project) {
    project.chips.forEach(chip => {
        if (!chip.usesCode) return
        chip.code = new Function(chip.code)
    })
}

/**
 * 
 * @param {String} id 
 */
function addChip(name, x, y) {
    console.log(name)
    if (typeof name == "String" && name != "") return
    let chip = currentProject.chips.find(chip => chip.name == name)
    currentChip.subChips.push(new Chip(
        chip.name,
        chip.usesCode,
        chip.inputPins,
        chip.outputPins,
        chip.code,
        currentChip.subChips.length,
        chip.color,
        x,
        y,
        chip.width != undefined ? chip.width : 50,
        chip.height != undefined ? chip.height : 50
    ))
}

function addChipsToStarredList() {
    document.getElementById("starredChipsList").innerHTML = ""
    currentProject.starredChips.forEach(starredChip => {
        if (!currentProject.chips.some(chip => chip.name == starredChip)) return
        let chip = document.createElement("div")
        chip.classList.add("starredChip")
        chip.innerText = starredChip
        chip.setAttribute("onclick", `addChip("${starredChip.name}")`)
        document.getElementById("starredChipsList").appendChild(chip)
    })
}

function openCloseMenu() {
    document.getElementById("menu").style.display = document.getElementById("menu").style.display == "block" ? "none" : "block"
}

function simulateCurrentChip() {
    Simulation.time += 0.01
    simulateChip(currentChip)
    ctx.beginPath()
    ctx.fillStyle = "rgb(43, 43, 43)"
    ctx.rect(0, 0, displayWidth, displayHeight)
    ctx.fill()
    ctx.closePath()
    // Test Example

    // if (true) {
    //     ctx.beginPath()
    //     ctx.arc(offset.x, offset.y, 5 * zoom, 0, 2 * Math.PI)
    //     ctx.fillStyle = "green"
    //     ctx.fill()
    //     ctx.closePath()
    // }
    currentChip.subChips.forEach(chip => chip.draw())
    console.log(currentChip.outputPins[0].state)
}

/**
 * 
 * @param {Chip} chip 
 */
function simulateChip(chip) {
    if (chip.usesCode) return chip.code()
    chip.inputPins.forEach(pin => executeChipFromConnectionOfPin(chip, pin))
}

/**
 * 
 * @param {Chip} originChip 
 * @param {Pin} pin 
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
 * 
 * @param {Event} e 
 * @param {Chip} chip 
 * @returns {Boolean}
 */
function isMouseOnChip(e, chip) {
    return (e.pageX - offset.x > (chip.x - chip.width / 2) * zoom &&
            e.pageX - offset.x < (chip.x + chip.width / 2) * zoom &&
            e.pageY - offset.y > (chip.y - chip.height / 2) * zoom &&
            e.pageY - offset.y < (chip.y + chip.height / 2) * zoom)
}

window.addEventListener("mousedown", e => {
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
})

window.addEventListener("mousemove", e => {
    currentChip.subChips.some(chip => {
        if (chip.move) {
            chip.x = (e.pageX - offset.x) / zoom + diffMouseChipPos.x
            chip.y = (e.pageY - offset.y) / zoom + diffMouseChipPos.y
            return true
        }
        return false
    })
})

window.addEventListener("mousewheel", e => {
    if (e.deltaY < 0) zoom *= 2
    if (e.deltaY > 0) zoom /= 2
})

addChipsToStarredList()