var pages = [
    document.getElementById("homeScreen"),
    document.getElementById("createNewProject"),
    document.getElementById("loadProject"),
    document.getElementById("settings"),
    document.getElementById("about")
]

function openPage(page) {
    pages.forEach(currentPage => {
        currentPage.style.display = "none"
    })

    newProjectName.value = ""
    newProjectNameOnInput(document.getElementById("newProjectName"))
    pages[page].style.display = "grid"
    if (page == 1) newProjectName.focus()
}

function newProjectNameOnInput(name) {
    if (name.value == '') {
        document.getElementById('pleaseEnterNamePrompt').style.color = 'rgb(241, 76, 76)'
        document.getElementById('createNewProjectButton').classList.add('blocked')
    } else {
        document.getElementById('pleaseEnterNamePrompt').style.color = 'transparent'
        document.getElementById('createNewProjectButton').classList.remove('blocked')
    }
}

openPage(0)