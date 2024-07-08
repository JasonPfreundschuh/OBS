const newProjectName = document.getElementById("newProjectName")
const renameProjectName = document.getElementById("renameProjectName")
const copyProjectName = document.getElementById("copyProjectName")
const pages = [
    document.getElementById("homeScreen"),
    document.getElementById("createNewProject"),
    document.getElementById("loadProject"),
    document.getElementById("settings"),
    document.getElementById("about")
]
var allProjects = getAllProjects()
var currentProject = {}
var allProjectCards = []
var selectedProjectCard = NaN
var characterColor = 0

async function switchColorOfCharacters() {
    await new Promise(resolve => setTimeout(resolve, 3000))
    characterColor++
    if (characterColor > 2) characterColor = 0
    let words = document.getElementById("gameName").children
    for (let i = 0; i < words.length; i++) {
        let characters = words[i].children
        for (let j = 0; j < characters.length; j++) {
            let srcTemp = characters[j].src.split("/")
            srcTemp.pop()
            srcTemp.push(characterColor + ".png")
            src = srcTemp.join("/")
            characters[j].src = src

            await new Promise(resolve => setTimeout(resolve, 100))
        }
    }
    switchColorOfCharacters()
}

/**
 * 
 * @param {Number} page 
 */
function openPage(page) {
    pages.forEach(currentPage => {
        currentPage.style.display = "none"
    })

    pages[page].style.display = "grid"

    newProjectName.value = ""
    newProjectNameOnInput()
    if (page == 1) newProjectName.focus()

    selectedProjectCard = NaN
    let children = document.getElementById("loadProject").lastElementChild.children
    for (let i = 1; i < children.length; i++) {
        children[i].classList.add("blocked")
    }
}

/**
 * 
 * @param {String} name 
 */
function doesProjectExist(name) {
    for (let i = 0; i < allProjects.length; i++) {
        if (name == allProjects[i].name) return true
    }
}

function newProjectNameOnInput() {
    if (newProjectName.value == "") {
        document.getElementsByClassName('pleaseEnterNamePrompt')[0].innerHTML = "Please enter a name for your project."
        document.getElementsByClassName('pleaseEnterNamePrompt')[0].style.color = "rgb(241, 76, 76)"
        document.getElementById('createNewProjectButton').classList.add("blocked")
        return
    }
    document.getElementsByClassName('pleaseEnterNamePrompt')[0].style.color = "transparent"
    document.getElementById('createNewProjectButton').classList.remove("blocked")

    if (doesProjectExist(newProjectName.value)) {
        document.getElementsByClassName('pleaseEnterNamePrompt')[0].innerHTML = "A project with this name already exists."
        document.getElementsByClassName('pleaseEnterNamePrompt')[0].style.color = "rgb(241, 76, 76)"
        document.getElementById('createNewProjectButton').classList.add("blocked")
    }
}

/**
 * 
 * @param {String} name [optional] 
 * @param {{}} newProject [optional] 
 */
function createNewProject(name = newProjectName.value, newProject) {
    if (name == "") return
    newProject = newProject != undefined ? structuredClone(newProject) : {
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
    currentProject = newProject
    convertChipCodesToString(newProject)
    allProjects.push(newProject)
    localStorage.projects = JSON.stringify(allProjects)
    renameProject(allProjects.length - 1, name)
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

function getAllProjects() {
    return localStorage.projects == undefined ? [] : JSON.parse(localStorage.projects)
}

function loadAllProjects() {
    document.getElementById("projectList").replaceChildren()
    allProjectCards = []
    allProjects.forEach((project, i) => {
        let projectCard = document.createElement("p")
        projectCard.id = i
        projectCard.innerText = project.name
        projectCard.classList.add("projectCard")
        projectCard.setAttribute("onclick", "selectProjectCard(Number(this.id))")
        allProjectCards.push(projectCard)
        document.getElementById("projectList").appendChild(projectCard)
    })
}

/**
 * 
 * @param {Number} id 
 */
function selectProjectCard(id) {
    allProjectCards.forEach((card, i) => {
        if (i == id) {
            card.classList.add("selected")
            selectedProjectCard = id
        } else card.classList.remove("selected")
    })

    let children = document.getElementById("loadProject").lastElementChild.children
    for (let i = 1; i < children.length; i++) {
        children[i].classList.remove("blocked")
    }
}

/**
 * 
 * @param {Boolean} show 
 */
function openCloseRenameContainer(show) {
    if (isNaN(selectedProjectCard)) return
    if (show) {
        document.getElementById("renameContainer").style.display = "grid"
        renameProjectName.focus()
    } else {
        document.getElementById("renameContainer").style.display = "none"
        renameProjectName.value = ""
    }
}

function renameProjectNameOnInput() {
    if (renameProjectName.value == "") {
        document.getElementsByClassName('pleaseEnterNamePrompt')[1].innerHTML = "Please enter a name for your project."
        document.getElementsByClassName('pleaseEnterNamePrompt')[1].style.color = "rgb(241, 76, 76)"
        document.getElementById('renameProjectButton').classList.add("blocked")
        return
    }
    document.getElementsByClassName('pleaseEnterNamePrompt')[1].style.color = "transparent"
    document.getElementById('renameProjectButton').classList.remove("blocked")

    if (doesProjectExist(renameProjectName.value)) {
        document.getElementsByClassName('pleaseEnterNamePrompt')[1].innerHTML = "A project with this name already exists."
        document.getElementsByClassName('pleaseEnterNamePrompt')[1].style.color = "rgb(241, 76, 76)"
        document.getElementById('renameProjectButton').classList.add("blocked")
    }
}

function renameProject(id = selectedProjectCard, name = renameProjectName.value) {
    if (isNaN(id)) return
    if (name == "") return
    if (doesProjectExist(name)) return
    allProjects[id].name = name
    localStorage.projects = JSON.stringify(allProjects)
    loadAllProjects()
    renameProjectName.value = ""
    renameProjectNameOnInput()
    document.getElementById("renameContainer").style.display = "none"
}

/**
 * 
 * @param {Boolean} show 
 */
function openCloseDeleteContainer(show) {
    if (isNaN(selectedProjectCard)) return
    document.getElementById("deleteContainer").style.display = show ? "grid" : "none"
}

function deleteProject() {
    if (isNaN(selectedProjectCard)) return
    allProjects.splice(selectedProjectCard, 1)
    localStorage.projects = JSON.stringify(allProjects)
    loadAllProjects()
    document.getElementById("deleteContainer").style.display = "none"
}


/**
 * 
 * @param {Boolean} show 
 */
function openCloseCopyContainer(show) {
    if (isNaN(selectedProjectCard)) return
    if (show) {
        document.getElementById("copyContainer").style.display = "grid"
        copyProjectName.focus()
    } else {
        document.getElementById("copyContainer").style.display = "none"
        copyProjectName.value = ""
    }
}

function copyProjectNameOnInput() {
    if (copyProjectName.value == "") {
        document.getElementsByClassName('pleaseEnterNamePrompt')[2].innerHTML = "Please enter a name for your project."
        document.getElementsByClassName('pleaseEnterNamePrompt')[2].style.color = "rgb(241, 76, 76)"
        document.getElementById('copyProjectButton').classList.add("blocked")
        return
    }
    document.getElementsByClassName('pleaseEnterNamePrompt')[2].style.color = "transparent"
    document.getElementById('copyProjectButton').classList.remove("blocked")

    if (doesProjectExist(copyProjectName.value)) {
        document.getElementsByClassName('pleaseEnterNamePrompt')[2].innerHTML = "A project with this name already exists."
        document.getElementsByClassName('pleaseEnterNamePrompt')[2].style.color = "rgb(241, 76, 76)"
        document.getElementById('copyProjectButton').classList.add("blocked")
    }
}

function copyProject() {
    if (isNaN(selectedProjectCard)) return
    if (copyProjectName.value == "") return
    if (doesProjectExist(copyProjectName.value)) return
    createNewProject(copyProjectName.value, allProjects[selectedProjectCard])
    loadAllProjects()
    copyProjectName.value = ""
    copyProjectNameOnInput()
    document.getElementById("copyContainer").style.display = "none"
}

openPage(0)
loadAllProjects()
switchColorOfCharacters()