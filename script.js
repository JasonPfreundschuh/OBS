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
var standardChips = [
    {
        name: "AND",
        usesCode: true,
        inputPins: [{
            id: 0,
            name: "In 0",
        },
        {
            id: 1,
            name: "In 1",
        }],
        outputPins: [{
            id: 0,
            name: "Out",
            color: "#ff0000"
        }],
        code: "this.outputPins[0].state = this.inputPins[0].state && this.inputPins[1].state",
        color: "#1e90ff"
    },
    {
        name: "NOT",
        usesCode: true,
        inputPins: [{
            id: 0,
            name: "In",
        }],
        outputPins: [{
            id: 0,
            name: "Out",
            color: "#ff0000"
        }],
        code: "this.outputPins[0].state = !this.inputPins[0].state",
        color: "#ff0000"
    },
    {
        name: "CLOCK",
        usesCode: true,
        inputPins: [
            {
                id: 0,
                name: "Freq 0",
            },
            {
                id: 1,
                name: "Freq 1",
            }
        ],
        outputPins: [
            {
                id: 0,
                name: "Out",
                color: "#ff0000"
            }
        ],
        code: "this.outputPins[0].state = Simulation.clockIsHigh(Number(this.inputPins[0].state) + (Number(this.inputPins[1].state) << 1))",
        color: "#000000"
    }
]

/**
 * Switches the color of the characters in the title of the game every 3 seconds. The order of the colors is red, green, blue.
 * @async
 */
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
 * Switches the currently open page to the given page index.
 * @param {Number} page The index of the page to switch to.
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

    loadAllProjects()
}

/**
 * Checks if a project with the given name already exists
 * @param {String} name The name to check
 * @returns {Boolean} True if the project exists, false otherwise
 */
function doesProjectExist(name) {
    for (let i = 0; i < allProjects.length; i++) {
        if (name == allProjects[i].name) return true
    }
}

/**
 * Called whenever the user types in the "Create New Project" name input
 * 
 * If the input is empty, shows a red "Please enter a name for your project." message and disables the "Create" button
 * Otherwise, shows a transparent message and enables the "Create" button
 * If a project with the same name exists, shows a red "A project with this name already exists." message and disables the "Create" button
 */
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
 * Creates a new project with the given name and adds it to the list of projects
 * If newProject is given, it will be used as the project data
 * Otherwise, a new project with the given name and default chips will be created
 * @param {String} name (optional) The name of the new project
 * @param {Project} newProject (optional) The project to be created
 */
function createNewProject(name = newProjectName.value, newProject) {
    if (name == "") return
    let date = new Date()
    newProject = newProject != undefined ? structuredClone(newProject) : {
        name: name,
        chips: standardChips,
        starredChips: ["AND", "NOT", "CLOCK"]
    }
    newProject.updatedAt = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
    currentProject = newProject
    allProjects.push(newProject)
    localStorage.projects = JSON.stringify(allProjects)
    renameProject(allProjects.length - 1, name)
}

/**
 * Gets all projects from localStorage and parses them as JSON
 * If localStorage.projects is undefined, returns an empty array
 * @returns {Project[]} The array of all projects
 */
function getAllProjects() {
    return localStorage.projects == undefined ? [] : JSON.parse(localStorage.projects)
}

/**
 * Loads all projects from the projects array into the project list, and sets up the click event for each project card
 * Also starts the scrolling name animation
 */
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

    scrollingNameAnimation()
}

/**
 * Highlights the project card at index {@code id} in the project list, and removes the highlight from all other cards.
 * Also enables all buttons in the bottom bar, and stops the scrolling name animation on all cards except the selected one.
 * @param {number} id The index of the project card to be selected
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
 * Shows or hides the rename container based on the given boolean, and updates the input text with the name of the currently selected project.
 * If the selected project card is NaN, does nothing.
 * @param {Boolean} show Whether the rename container should be shown or hidden
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

/**
 * Checks if the input for renaming a project is valid
 * If the input is empty, shows a red "Please enter a name for your project." message and disables the "Rename" button
 * If a project with the same name exists, shows a red "A project with this name already exists." message and disables the "Rename" button
 */
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
 * Renames the project at index {@code id} to the given name.
 * If the new name is empty, or if a project with the same name already exists, does nothing.
 * Updates the project list and selects the newly renamed project in the list.
 * @param {number} id The index of the project to be renamed
 * @param {String} name The new name of the project
 */
function renameProject(id = selectedProjectCard, name = renameProjectName.value) {
    if (isNaN(id)) return
    if (name == "") return
    if (doesProjectExist(name)) return
    allProjects[id].name = name
    localStorage.projects = JSON.stringify(allProjects)
    loadAllProjects()
    selectProjectCard(id)
    renameProjectName.value = ""
    renameProjectNameOnInput()
    document.getElementById("renameContainer").style.display = "none"
}

/**
 * Shows or hides the delete container based on the given boolean.
 * If the selected project card is NaN, does nothing.
 * @param {Boolean} show Whether the delete container should be shown or hidden
 */

function openCloseDeleteContainer(show) {
    if (isNaN(selectedProjectCard)) return
    document.getElementById("deleteContainer").style.display = show ? "grid" : "none"
}

/**
 * Deletes the project at index {@code selectedProjectCard} from the projects array.
 * Updates the project list, deselects the deleted project and hides the delete container.
 * If the selected project card is NaN, does nothing.
 */
function deleteProject() {
    if (isNaN(selectedProjectCard)) return
    allProjects.splice(selectedProjectCard, 1)
    selectedProjectCard = NaN
    localStorage.projects = JSON.stringify(allProjects)
    loadAllProjects()
    document.getElementById("deleteContainer").style.display = "none"

    let children = document.getElementById("loadProject").lastElementChild.children
    for (let i = 1; i < children.length; i++) {
        children[i].classList.add("blocked")
    }
}

/**
 * Shows or hides the copy container based on the given boolean.
 * If the selected project card is NaN, does nothing.
 * @param {Boolean} show Whether the copy container should be shown or hidden
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

/**
 * Checks if the input for copying a project is valid
 * If the input is empty, shows a red "Please enter a name for your project." message and disables the "Copy" button
 * If a project with the same name exists, shows a red "A project with this name already exists." message and disables the "Copy" button
 */
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

/**
 * Copies the project at index {@code selectedProjectCard} to a new project with the given name.
 * If the selected project card is NaN, does nothing.
 * If the input is empty, does nothing.
 * If a project with the same name already exists, does nothing.
 * Updates the project list, selects the newly copied project in the list, and hides the copy container.
 * @param {Number} id The index of the project to be copied
 */
function copyProject() {
    if (isNaN(selectedProjectCard)) return
    if (copyProjectName.value == "") return
    if (doesProjectExist(copyProjectName.value)) return
    createNewProject(copyProjectName.value, allProjects[selectedProjectCard])
    loadAllProjects()
    selectProjectCard(allProjects.length - 1)
    copyProjectName.value = ""
    copyProjectNameOnInput()
    document.getElementById("copyContainer").style.display = "none"
}

/**
 * Opens the project editor for the project at the given index.
 * If the index is NaN, does nothing.
 * Redirects the browser to the editor page with the project's index as a query parameter.
 * @param {Number} id The index of the project to open (optional, defaults to selectedProjectCard).
 */
function openProject(id = selectedProjectCard) {
    if (isNaN(id)) return
    window.location.href = `${window.location.origin}/editor/?project=${id}`
}

/**
 * Animates the scrolling text effect for project names in the project list.
 * Removes any existing scrolling text styles and adds new styles for each project card
 * where the project name is wider than its container. Sets up mouseenter and mouseleave
 * event listeners to start and stop the animation for each project card.
 */
function scrollingNameAnimation() {
    let styles = document.getElementsByTagName("style")

    for (let i = 0; i < styles.length; i++) {
        if (styles[i].innerHTML.includes("scrolling-text")) {
            document.head.removeChild(styles[i])
        }
    }

    for (let i = 0; i < allProjectCards.length; i++) {
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

                    5% {
                        transform: translateX(0px)
                    }

                    95% {
                        transform: translateX(-${nameWidth - availableWidth}px)
                    }
                
                    100% {
                        transform: translateX(-${nameWidth - availableWidth}px)
                    }
                }
            `
            document.head.appendChild(scrollingAnimationStyle)

            allProjectCards[i].addEventListener("mouseenter", () => addAnimation())

            allProjectCards[i].addEventListener("mouseleave", (e) => removeAnimation(e))

            if (i == selectedProjectCard) addAnimation()

            function addAnimation() {
                const speed = 200
                const duration = (nameWidth + availableWidth) / speed
                projectCardName.style.animation = `scrolling-text-${i} ${duration}s linear infinite`
            }

            function removeAnimation(e) {
                if (e.target.id == selectedProjectCard) return
                projectCardName.style.animation = ""
            }
        }
    }
}

openPage(0)
switchColorOfCharacters()