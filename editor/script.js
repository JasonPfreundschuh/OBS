const simulationLoop = setInterval(simulateCurrentChip, 10)
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
    constructor(name, usesCode, inputPins, outputPins, code, id, color, x, y) {
        this.name = name
        this.usesCode = usesCode
        this.inputPins = inputPins
        this.outputPins = outputPins
        this.code = code
        this.id = id
        this.color = color
        this.x = x
        this.y = y
        this.setState()
    }
    
    setState() {
        this.inputPins.forEach(pin => {
            pin.state = false
            pin.set = false
        })
    }
}

var currentProject = JSON.parse(localStorage.projects)[Number(window.location.search.split("=")[1])]
convertChipCodesToFuncs(currentProject)
var currentChip = {
    usesCode: false,
    subChips: [],
    connections: [],
    inputPins: [],
    outputPins: []
}

/**
 * 
 * @param {{}} project 
*/
function convertChipCodesToFuncs(project) {
    project.chips.forEach(chip => {
        if (!chip.usesCode) return
        chip.code = new Function(chip.code)
    })
}

function addChip(id = NaN) {
    if (isNaN(id)) return
    currentChip.subChips.push(new Chip(
        currentProject.chips[id].name,
        currentProject.chips[id].usesCode,
        currentProject.chips[id].inputPins,
        currentProject.chips[id].outputPins,
        currentProject.chips[id].code,
        currentChip.subChips.length,
        currentProject.chips[id].color,
        0,
        0
    ))
}

function simulateCurrentChip() {
    Simulation.time += 0.01
    simulateChip(currentChip)
    console.log(currentChip.outputPins[0].state)
}

function simulateChip(chip) {
    if (chip.usesCode) return chip.code()
    chip.inputPins.forEach(pin => executeChipFromConnectionOfPin(chip, pin))
}

function executeChipFromConnectionOfPin(chip, pin) {
    chip.connections.filter(connection => {
        if (connection.from == pin) {
            if (connection.to == chip) {
                connection.to.outputPins[connection.toChipPin].state = pin.state
                connection.to.outputPins[connection.toChipPin].set = true
                return
            }
            connection.to.inputPins[connection.toChipPin].state = pin.state
            connection.to.inputPins[connection.toChipPin].set = true
            for (let i = 0; i < connection.to.inputPins.length; i++) {
                if (connection.to.inputPins[i].set) continue
                if (chip.connections.find(subChipConnection => {
                    subChipConnection.to.inputPins[subChipConnection.toChipPin] == connection.to.inputPins[i]
                })) return
            }
            simulateChip(connection.to)
            connection.to.outputPins.forEach(outPin => executeChipFromConnectionOfPin(chip, outPin))
        }
    })
}