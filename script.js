var allProjects = []
var currentProject = {}
var pages = [
    document.getElementById("homeScreen"),
    document.getElementById("createNewProject"),
    document.getElementById("loadProject"),
    document.getElementById("settings"),
    document.getElementById("about")
]

/**
 * 
 * @param {Number} page 
 */

function openPage(page) {
    pages.forEach(currentPage => {
        currentPage.style.display = "none"
    })

    newProjectName.value = ""
    newProjectNameOnInput(document.getElementById("newProjectName"))
    pages[page].style.display = "grid"
    if (page == 1) newProjectName.focus()
}

/**
 * 
 * @param {String} name 
 */

function newProjectNameOnInput(name) {
    if (name.value == '') {
        document.getElementById('pleaseEnterNamePrompt').style.color = 'rgb(241, 76, 76)'
        document.getElementById('createNewProjectButton').classList.add('blocked')
    } else {
        document.getElementById('pleaseEnterNamePrompt').style.color = 'transparent'
        document.getElementById('createNewProjectButton').classList.remove('blocked')
    }
}

/**
 * 
 * @param {String} name 
 * @param {[{}]} otherProjects 
 */

function createNewProject(name, otherProjects) {
    let newProject = {
        name: name,
        chips: [
            {
                name: "AND",
                usesCode: true,
                inputPins: [{
                    id: 0,
                    name: "PIN 1",
                    color: "Red"
                },
                {
                    id: 1,
                    name: "PIN 2",
                    color: "Red"
                }],
                outputPins: [{
                    id: 0,
                    name: "PIN 3",
                    color: "Red"
                }],
                code: () => {
                    this.outputPins[0].state = this.inputPins[0].state && this.inputPins[1].state
                }
            },
            {
                name: "NOT",
                usesCode: true,
                inputPins: [{
                    id: 0,
                    name: "PIN 1",
                    color: "Red"
                }],
                outputPins: [{
                    id: 0,
                    name: "PIN 2",
                    color: "Red"
                }],
                code: () => {
                    this.outputPins[0].state = !this.inputPins[0].state
                }
            }
        ],
        starredChips: ["AND", "NOT"]
    }
    convertChipCodesToString(newProject)
    otherProjects.push(newProject)
    localStorage.projects = JSON.stringify(otherProjects)
}

/**
 * 
 * @param {{}} project 
 */

function convertChipCodesToString(project) {
    project.chips.forEach(chip => {
        if (!chip.usesCode) return
        chip.code = chip.code.toString()
    })
}

/**
 * 
 * @param {{}} project 
 */

function convertChipCodesToFuncs(project) {
    project.chips.forEach(chip => {
        if (!chip.usesCode) return
        chip.code = eval(chip.code)
    })
}

openPage(0)