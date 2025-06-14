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

    for (let i = 0; i < allProjectCards.length; i++) scrollingNameAnimation(i)
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
 * @param {Project} newProject [optional] 
 */
function createNewProject(name = newProjectName.value, newProject) {
    if (name == "") return
    let date = new Date()
    newProject = newProject != undefined ? structuredClone(newProject) : {
        name: name,
        updatedAt: `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`,
        chips: [
            {
                name: "AND",
                usesCode: true,
                inputPins: [{
                    id: 0,
                    name: "In 0",
                    color: "red"
                },
                {
                    id: 1,
                    name: "In 1",
                    color: "red"
                }],
                outputPins: [{
                    id: 0,
                    name: "Out",
                    color: "red"
                }],
                code: "this.outputPins[0].state = this.inputPins[0].state && this.inputPins[1].state",
                color: "dodgerblue"
            },
            {
                name: "NOT",
                usesCode: true,
                inputPins: [{
                    id: 0,
                    name: "In",
                    color: "red"
                }],
                outputPins: [{
                    id: 0,
                    name: "Out",
                    color: "red"
                }],
                code: "this.outputPins[0].state = !this.inputPins[0].state",
                color: "red"
            },
            {
                name: "CLOCK",
                usesCode: true,
                inputPins: [
                    {
                        id: 0,
                        name: "Freq 0",
                        color: "red"
                    },
                    {
                        id: 1,
                        name: "Freq 1",
                        color: "red"
                    }
                ],
                outputPins: [
                    {
                        id: 0,
                        name: "Out",
                        color: "red"
                    }
                ],
                code: "this.outputPins[0].state = Simulation.clockIsHigh(Number(this.inputPins[0].state) + (Number(this.inputPins[1].state) << 1))",
                color: "black"
            }
        ],
        starredChips: ["AND", "NOT", "CLOCK"]
    }
    currentProject = newProject
    allProjects.push(newProject)
    localStorage.projects = JSON.stringify(allProjects)
    renameProject(allProjects.length - 1, name)
}

function getAllProjects() {
    return localStorage.projects == undefined ? [] : JSON.parse(localStorage.projects)
}

function loadAllProjects() {
    document.getElementById("projectList").replaceChildren()
    allProjectCards = []
    allProjects.forEach((project, i) => {
        let projectCard = document.createElement("div")
        let projectCardName = document.createElement("p")
        let projectCardTime = document.createElement("p")
        let nameWrapper = document.createElement("div")

        projectCardName.innerText = project.name
        projectCardTime.innerText = project.updatedAt

        projectCardName.classList.add("scrolling-text")
        projectCardTime.classList.add("rightAligned")
        nameWrapper.classList.add("scrolling-text-wrapper")

        nameWrapper.appendChild(projectCardName)
        projectCard.appendChild(nameWrapper)
        projectCard.appendChild(projectCardTime)

        projectCard.id = i
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
        } else {
            card.classList.remove("selected")
            let cardName = card.querySelector(".scrolling-text-wrapper").querySelector(".scrolling-text")
            cardName.style.animation = ""
        }
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
        document.getElementById("renameProjectName").value = allProjects[selectedProjectCard].name
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

/**
 * 
 * @param {Number} id 
 * @param {String} name 
 */
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

/**
 * 
 * @param {Number} id 
 */
function openProject(id = selectedProjectCard) {
    if (isNaN(id)) return
    window.location.href = `${window.location.origin}/editor/?project=${id}`
}

function scrollingNameAnimation(i) {
    let nameWrapper = allProjectCards[i].querySelector(".scrolling-text-wrapper")
    let projectCardName = nameWrapper.querySelector(".scrolling-text")

    let availableWidth = nameWrapper.clientWidth
    let nameWidth = projectCardName.scrollWidth

    if (nameWidth > availableWidth) {
        let scrollingAnimationStyle = document.createElement("style")
        scrollingAnimationStyle.innerHTML = `
            @keyframes scrolling-text-${i} {
                0% {
                    transform: translateX(0px)
                }
            
                100% {
                    transform: translateX(-${nameWidth}px)
                }
            }
        `
        document.head.appendChild(scrollingAnimationStyle)

        allProjectCards[i].addEventListener("mouseenter", (e) => {
            const speed = 200
            const duration = (nameWidth + availableWidth) / speed
            projectCardName.style.animation = `scrolling-text-${i} ${duration}s linear infinite`
        })
        allProjectCards[i].addEventListener("mouseleave", (e) => {
            if (e.target.id == selectedProjectCard) return
            projectCardName.style.animation = ""
        })
    }
}

openPage(0)
loadAllProjects()
switchColorOfCharacters()